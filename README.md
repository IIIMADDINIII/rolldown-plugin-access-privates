# rolldown-plugin-access-privates

A [Rolldown](https://rolldown.rs/) plugin that enables access to class private
members (`#field`, `#method()`) during bundling by transforming matched modules.
This might be useful to set up a specific condition for testing (for example
with [vitest](https://vitest.dev/)).

## Installation

```bash
# npm
npm install -D rolldown-plugin-access-privates
# pnpm
pnpm add -D rolldown-plugin-access-privates
# yarn
yarn add -D rolldown-plugin-access-privates
```

## Usage with vitest

This setup ensures that the plugin is only active during testing.

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import accessPrivates from 'rolldown-plugin-access-privates';

export default defineConfig(({mode}) => {
  plugins: mode === 'test' ? [accessPrivates()] : [],
});
```

## Options

An optional object to configure the plugin's behavior. All options are optional
and have sensible defaults.

````ts
type options = {
  /**
   * Whether to export all top-level variables, functions, and classes in the module.
   * Can be an array of "variable", "function", and "class", or a function that will
   * be called with the module ID and AST node of each variable, function, or class
   * declaration.
   * @default true
   */
  exports?: ("variable" | "function" | "class")[] | boolean | ((id: string, astNode: ESTree.VariableDeclaration | ESTree.Function | ESTree.Class) => boolean) | undefined;
  /**
   * Which class members to generate accessors for.
   * Can be an array of "method", "get", "set", and "property", or a function that will
   * be called with the module ID and AST node of each method or property definition.
   * @default true
   */
  classMembers?: ("method" | "get" | "set" | "property")[] | boolean | ((id: string, astNode: ESTree.MethodDefinition | ESTree.PropertyDefinition) => boolean) | undefined;
  /**
   * The suffix to use for the generated accessors.
   * For example, if you have a private field `#foo`, the plugin will generate
   * `fooPrivate` getter and setter.
   * @default "Private"
   */
  suffix?: string | ((name: string) => string) | undefined;
  /**
   * Filter for which modules the plugin should apply.
   * Can be a string, a RegExp, an array of strings and RegExps, or an object with an
   * `include` and `exclude` property, each of which can be a string, a RegExp, or an
   * array of strings and RegExps.
   * The filter will be applied to the module ID.
   * @default /\.[jt]sx?$/
   */
  idFilter?: HookFilter["id"] | undefined;
};

/**
 * From Rolldown:
 * A filter based on the module `id`.
 *
 * If the value is a string, it is treated as a glob pattern.
 * The string type is not available for {@linkcode Plugin.resolveId | resolveId} hook.
 *
 * @example
 * Include all `id`s that contain `node_modules` in the path.
 * ```js
 * { id: '**'+'/node_modules/**' }
 * ```
 * @example
 * Include all `id`s that contain `node_modules` or `src` in the path.
 * ```js
 * { id: ['**'+'/node_modules/**', '**'+'/src/**'] }
 * ```
 * @example
 * Include all `id`s that start with `http`
 * ```js
 * { id: /^http/ }
 * ```
 * @example
 * Exclude all `id`s that contain `node_modules` in the path.
 * ```js
 * { id: { exclude: '**'+'/node_modules/**' } }
 * ```
 * @example
 * Formal pattern to define includes and excludes.
 * ```js
 * { id : {
 *   include: ['**'+'/foo/**', /bar/],
 *   exclude: ['**'+'/baz/**', /qux/]
 * }}
 * ```
 */
type GeneralHookFilter =
  | string
  | RegExp
  | (string | RegExp)[]
  | {
      include?: string | RegExp | (string | RegExp)[];
      exclude?: string | RegExp | (string | RegExp)[];
    };
````

## Example

With the default configuration, the plugin will transform code like this:

```js
let globalCounter = 0;
function reset() {
  globalCounter = 0;
}
class Counter {
  #value = 0;
  #reset() {
    this.#value = 0;
  }
  inc() {
    this.#value++;
    globalCounter++;
  }
}
```

Into this:

```js
export let globalCounter = 0;
export function reset() {
  globalCounter = 0;
}
export class Counter {
  static get #globalCounter() {
    return globalCounter;
  }
  static get globalCounterPrivate() {
    return this.#globalCounter;
  }
  #value = 0;
  get valuePrivate() {
    return this.#value;
  }
  set valuePrivate(value) {
    this.#value = value;
  }
  #reset() {
    this.#value = 0;
  }
  get resetPrivate() {
    return this.#reset;
  }
  inc() {
    this.#value++;
    globalCounter++;
  }
}
```
