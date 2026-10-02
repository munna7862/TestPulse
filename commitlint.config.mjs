/** Conventional Commits, see CONTRIBUTING.md §2. */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      ["web", "api", "shared", "db", "ui", "reporter", "infra", "planning", "docs", "tracking", "deps", "ci"],
    ],
    "body-max-line-length": [1, "always", 100],
  },
};
