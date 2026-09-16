import { defineConfig } from "vite-plus";

export default defineConfig((_env) => {
  return {
    pack: {
      entry: ["./src/index.ts"],
      dts: true,
      exports: true,
      platform: "node",
      format: ["esm"],
      failOnWarn: true,
    },
    lint: {
      jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
      rules: { "vite-plus/prefer-vite-plus-imports": "error" },
      ignorePatterns: ["/**/mise/", "/**/declarations.d.ts"],
      options: {
        typeAware: true,
        typeCheck: true,
        denyWarnings: true,
      },
    },
    fmt: {
      ignorePatterns: ["/mise/"],
      sortImports: true,
      printWidth: 300,
      jsdoc: {
        descriptionWithDot: true,
        lineWrappingStyle: "balance",
      },
    },
  };
});
