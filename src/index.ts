import { type HookFilter, type Plugin } from "rolldown";
import { withMagicString } from "rolldown-string";
import { Visitor, type ESTree, type VisitorObject } from "rolldown/utils";

/** Map exports types to their corresponding AST node types */
const exportsToType = {
  variable: "VariableDeclaration",
  function: "FunctionDeclaration",
  class: "ClassDeclaration",
} as const;

/**
 * A Vite plugin to generate accessors for private fields to allow testing them.
 * This plugin will generate getter and setter methods for private fields and methods, allowing you to access them in your tests.
 * For example, if you have a private field `#foo`, the plugin will generate `fooPrivate` getter and setter.
 * Also automatically exports all top-level variables, functions, and classes in the module, allowing you to import them in your tests without needing to use `export` in your source code.
 * @param options - Options for the plugin.
 * @returns 
 */
export default function AccessPrivates({
  exports = true,
  classMembers = true,
  suffix = "Private",
  idFilter = /\.[jt]sx?$/,
}: {
  /**
   * Whether to export all top-level variables, functions, and classes in the module. 
   * Can be an array of "variable", "function", and "class", or a function that will be called with the module ID and AST node of each variable, function, or class declaration.
   * @default true
   */
  exports?: ("variable" | "function" | "class")[] | boolean | ((id: string, astNode: ESTree.VariableDeclaration | ESTree.Function | ESTree.Class) => boolean) | undefined;
  /**
   * Which class members to generate accessors for.
   * Can be an array of "method", "get", "set", and "property", or a function that will be called with the module ID and AST node of each method or property definition.
   * @default true
   */
  classMembers?: ("method" | "get" | "set" | "property")[] | boolean | ((id: string, astNode: ESTree.MethodDefinition | ESTree.PropertyDefinition) => boolean) | undefined;
  /**
   * The suffix to use for the generated accessors.
   * For example, if you have a private field `#foo`, the plugin will generate `fooPrivate` getter and setter.
   * @default "Private"
   */
  suffix?: string | ((name: string) => string) | undefined;
  /**
   * Filter for which modules the plugin should apply.
   * Can be a string, a RegExp, an array of strings and RegExps, or an object with an `include` and `exclude` property, each of which can be a string, a RegExp, or an array of strings and RegExps.
   * The filter will be applied to the module ID.
   * @default /\.[jt]sx?$/
   */
  idFilter?: HookFilter["id"] | undefined;
} = {}): Plugin {
  // Calculate which code path can be optimized.
  const canNotExport = exports === false || (Array.isArray(exports) && exports.length === 0);
  const canNotPropertyDefinition = classMembers === false || (Array.isArray(classMembers) && (classMembers.length === 0 || !classMembers.includes("property")));
  const canNotMethodDefinition = classMembers === false || (Array.isArray(classMembers) && (classMembers.length === 0 || !classMembers.some(m => m === "method" || m === "get" || m === "set")));
  // Transform filters in to a unified format
  if (typeof exports === "boolean") {
    const shouldExport = exports;
    exports = () => shouldExport;
  } else if (Array.isArray(exports)) {
    const mappedExports: ESTree.Node["type"][] = exports.map(e => exportsToType[e]);
    exports = (_id, astNode) => mappedExports.includes(astNode.type);
  }
  if (typeof classMembers === "boolean") {
    const shouldGenerate = classMembers;
    classMembers = () => shouldGenerate;
  } else if (Array.isArray(classMembers)) {
    const members = classMembers;
    classMembers = (_id, astNode) => {
      if (astNode.type === "PropertyDefinition") return members.includes("property");
      if (astNode.type === "MethodDefinition") {
        if (astNode.kind === "method") return members.includes("method");
        if (astNode.kind === "get") return members.includes("get");
        if (astNode.kind === "set") return members.includes("set");
      }
      return false;
    };
  }
  if (typeof suffix === "string") {
    const suffixString = suffix;
    suffix = (name) => name + suffixString;
  }
  // Definition of the Plugin
  return {
    name: "rolldown-plugin-access-privates",
    transform: {
      // Filters to optimize the plugin by skipping modules that don't need to be transformed.
      filter: {
        id: idFilter,
        // if there is no need to add exports, we only need to process modules that have private class members.
        ...(canNotExport ? { code: "#" } : {}),
      },
      // Function implementing the transformation logic.
      handler: withMagicString(function (code, id, meta) {
        // If ast is provided in meta, use it. Otherwise, parse the code with the appropriate language based on the file extension.
        let ast = meta.ast !== undefined ? meta.ast : this.parse(code.original, { lang: id.endsWith('.tsx') ? 'tsx' : id.endsWith('.ts') ? 'ts' : id.endsWith('.jsx') ? 'jsx' : 'js' });
        const visitors: VisitorObject = {};
        // only add the visitors needed.
        if (!canNotExport) {
          // Visitor to add export keyword to top-level variable, function, and class declarations.
          visitors.Program = function (node) {
            for (const child of node.body) {
              if (child.type !== "VariableDeclaration" && child.type !== "FunctionDeclaration" && child.type !== "ClassDeclaration" || child.declare) continue;
              if (!exports(id, child)) continue;
              code.appendLeft(child.start, "export ");
            }
          };
        }
        if (!canNotPropertyDefinition) {
          // Visitor to add getter and setter for private fields defined with PropertyDefinition.
          visitors.PropertyDefinition = function (node) {
            if (node.type !== "PropertyDefinition" || node.key.type !== "PrivateIdentifier" || node.declare || node.override) return;
            if (!classMembers(id, node)) return;
            const name = suffix(node.key.name);
            code.appendRight(node.end, `\n${node.static ? "static " : ""}get ["${name}"]() {return this.#${node.key.name};}`);
            code.appendRight(node.end, `\n${node.static ? "static " : ""}set ["${name}"](value) {this.#${node.key.name} = value;}`);
          };
        }
        if (!canNotMethodDefinition) {
          // Visitor to add getter and setter for private fields defined with MethodDefinition.
          visitors.MethodDefinition = function (node) {
            if (node.type !== "MethodDefinition" || node.key.type !== "PrivateIdentifier" || node.override) return;
            if (!classMembers(id, node)) return;
            const name = suffix(node.key.name);
            switch (node.kind) {
              case "method":
                code.appendRight(node.end, `\n${node.static ? "static " : ""}get ["${name}"]() {return this.#${node.key.name};}`);
                code.appendRight(node.end, `\n${node.static ? "static " : ""}set ["${name}"](value) {this.#${node.key.name} = value;}`);
                break;
              case "get":
                code.appendRight(node.end, `\n${node.static ? "static " : ""}get ["${name}"]() {return this.#${node.key.name};}`);
                break;
              case "set":
                code.appendRight(node.end, `\n${node.static ? "static " : ""}set ["${name}"](value) {this.#${node.key.name} = value;}`);
                break;
            }
          };
        }
        // Walk the AST with the defined visitors to apply the transformations.
        new Visitor(visitors).visit(ast);
      }),
    },
  };
}