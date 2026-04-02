import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    ignorePatterns: ["/mise/"],
    options: {
      typeAware: true,
      typeCheck: true,
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
});
