// ESLint 10 flat config for the whole monorepo (P02-S04).
// Boundary rules implement AGENTS.md §4 and ADR-006 (no @prisma/client outside packages/db).
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const PRISMA_IMPORTS = {
  group: ["@prisma/*", "**/generated/prisma/**"],
  message: "Import database access from @testpulse/db (tenant-scoped client), never Prisma directly (ADR-006).",
};
const NO_CROSS_PACKAGE_RELATIVE = {
  group: ["../../packages/*", "../../../packages/*", "../../apps/*", "../../../apps/*"],
  message: "Import workspace packages by name (@testpulse/*), not by relative path.",
};
const SERVER_ONLY = {
  group: ["ioredis", "bullmq", "pg", "@testpulse/db", "@testpulse/db/*"],
  message: "Server-only module: not allowed in browser-safe code.",
};

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/src/generated/**",
      "**/next-env.d.ts",
      ".pg-dev/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      // Async functions without await legitimately implement Promise-returning interfaces; real async
      // bugs are covered by no-floating-promises / no-misused-promises.
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-expect-error": "allow-with-description" }],
      "@typescript-eslint/no-non-null-assertion": "error",
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["info", "warn", "error"] }],
      "no-restricted-imports": ["error", { patterns: [PRISMA_IMPORTS, NO_CROSS_PACKAGE_RELATIVE] }],
    },
  },

  // Plain JS/MJS config files and scripts: no type information.
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...tseslint.configs.disableTypeChecked,
  },

  // packages/db owns Prisma.
  {
    files: ["packages/db/**/*.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [NO_CROSS_PACKAGE_RELATIVE] }] },
  },

  // packages/shared must stay isomorphic (browser-safe).
  {
    files: ["packages/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            PRISMA_IMPORTS,
            NO_CROSS_PACKAGE_RELATIVE,
            SERVER_ONLY,
            { group: ["node:*"], message: "@testpulse/shared must be browser-safe: no Node built-ins." },
            {
              group: ["@testpulse/ui", "@testpulse/api", "@testpulse/web"],
              message: "shared cannot depend on other workspaces.",
            },
          ],
        },
      ],
    },
  },

  // Web app and UI library: browser-facing, never server-only modules.
  {
    files: ["apps/web/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks, "@next/next": nextPlugin },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off",
      "no-restricted-imports": ["error", { patterns: [PRISMA_IMPORTS, NO_CROSS_PACKAGE_RELATIVE, SERVER_ONLY] }],
    },
  },

  // Tests may use console and looser unsafe-* rules for fixtures.
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/test/**/*.ts"],
    rules: { "no-console": "off" },
  },

  prettier,
);
