import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // Base JS rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // Disable rules that conflict with Prettier
  prettierConfig,

  // Global ignores
  {
    ignores: [
      "node_modules/",
      "dist/",
      "web-build/",
      ".expo/",
      "android/",
      "ios/",
      "server/",
      "scripts/",
      "metro.config.js",
      "babel.config.js",
      "docs/",
      "*.js",
    ],
  },

  // Project-specific rules for frontend TypeScript
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-require-imports": "off",

      // Code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-duplicate-imports": "error",
      "no-template-curly-in-string": "warn",
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
    },
  }
);
