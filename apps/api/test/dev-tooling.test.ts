import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(__dirname, "../../..");

describe("Developer Tooling & Code Quality [FR-DEV-01]", () => {
  it("[SC-DEV-001] defines npm scripts for linting and code quality in root package.json", () => {
    const pkgPath = resolve(rootDir, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(pkg.scripts["lint"]).toBe("turbo run lint");
    expect(pkg.scripts["lint:fix"]).toBe("eslint . --fix");
    expect(pkg.scripts["format"]).toBe("prettier --write .");
    expect(pkg.scripts["format:check"]).toBe("prettier --check .");
    expect(pkg.scripts["typecheck"]).toBe("turbo run typecheck");

    expect(pkg.devDependencies["eslint"]).toBeDefined();
    expect(pkg.devDependencies["prettier"]).toBeDefined();
    expect(pkg.devDependencies["typescript"]).toBeDefined();
    expect(pkg.devDependencies["typescript-eslint"]).toBeDefined();
    expect(pkg.devDependencies["husky"]).toBeDefined();
    expect(pkg.devDependencies["lint-staged"]).toBeDefined();
    expect(pkg.devDependencies["@commitlint/cli"]).toBeDefined();
  });

  it("[SC-DEV-002] codifies architecture boundary rules in eslint.config.mjs", () => {
    const eslintConfigPath = resolve(rootDir, "eslint.config.mjs");
    expect(existsSync(eslintConfigPath)).toBe(true);

    const content = readFileSync(eslintConfigPath, "utf-8");

    // Boundary rule 1: No Prisma outside packages/db
    expect(content).toContain("PRISMA_IMPORTS");
    expect(content).toContain("@prisma/*");
    expect(content).toContain("Import database access from @testpulse/db");

    // Boundary rule 2: No cross-package relative paths
    expect(content).toContain("NO_CROSS_PACKAGE_RELATIVE");
    expect(content).toContain("../../packages/*");

    // Boundary rule 3: Server-only packages blocked in browser contexts
    expect(content).toContain("SERVER_ONLY");
    expect(content).toContain("ioredis");
    expect(content).toContain("bullmq");
    expect(content).toContain("@testpulse/db");

    // Boundary rule 4: packages/shared is browser-safe
    expect(content).toContain("@testpulse/shared must be browser-safe: no Node built-ins.");
    expect(content).toContain("shared cannot depend on other workspaces.");
  });

  it("[SC-DEV-003] defines Prettier formatting configuration and ignores", () => {
    const prettierRcPath = resolve(rootDir, ".prettierrc.json");
    const prettierIgnorePath = resolve(rootDir, ".prettierignore");

    expect(existsSync(prettierRcPath)).toBe(true);
    expect(existsSync(prettierIgnorePath)).toBe(true);

    const config = JSON.parse(readFileSync(prettierRcPath, "utf-8")) as Record<string, unknown>;
    expect(config["printWidth"]).toBe(120);
    expect(config["semi"]).toBe(true);
    expect(config["singleQuote"]).toBe(false);
    expect(config["trailingComma"]).toBe("all");
    expect(config["endOfLine"]).toBe("lf");

    const ignoreContent = readFileSync(prettierIgnorePath, "utf-8");
    expect(ignoreContent).toContain("**/dist/");
    expect(ignoreContent).toContain("**/.next/");
    expect(ignoreContent).toContain("*.md");
  });

  it("[SC-DEV-004] enforces TypeScript strict mode and flags via tsconfig.base.json", () => {
    const baseTsconfigPath = resolve(rootDir, "tsconfig.base.json");
    expect(existsSync(baseTsconfigPath)).toBe(true);

    const baseConfig = JSON.parse(readFileSync(baseTsconfigPath, "utf-8")) as {
      compilerOptions: Record<string, unknown>;
    };

    expect(baseConfig.compilerOptions["strict"]).toBe(true);
    expect(baseConfig.compilerOptions["noUncheckedIndexedAccess"]).toBe(true);
    expect(baseConfig.compilerOptions["noImplicitOverride"]).toBe(true);
    expect(baseConfig.compilerOptions["noImplicitAny"]).toBe(true);
    expect(baseConfig.compilerOptions["noFallthroughCasesInSwitch"]).toBe(true);
    expect(baseConfig.compilerOptions["noEmit"]).toBe(true);

    // Verify workspaces extend tsconfig.base.json
    const workspaces = ["apps/api", "apps/web", "packages/db", "packages/shared"];
    for (const ws of workspaces) {
      const wsTsconfigPath = resolve(rootDir, ws, "tsconfig.json");
      expect(existsSync(wsTsconfigPath)).toBe(true);
      const wsConfig = JSON.parse(readFileSync(wsTsconfigPath, "utf-8")) as { extends?: string };
      expect(wsConfig.extends).toContain("tsconfig.base.json");
    }
  });

  it("[SC-DEV-005] configures Husky hooks and commitlint with monorepo scopes", () => {
    const preCommitPath = resolve(rootDir, ".husky/pre-commit");
    const commitMsgPath = resolve(rootDir, ".husky/commit-msg");
    const commitlintPath = resolve(rootDir, "commitlint.config.mjs");

    expect(existsSync(preCommitPath)).toBe(true);
    expect(existsSync(commitMsgPath)).toBe(true);
    expect(existsSync(commitlintPath)).toBe(true);

    const preCommitContent = readFileSync(preCommitPath, "utf-8");
    expect(preCommitContent).toContain("lint-staged");

    const commitMsgContent = readFileSync(commitMsgPath, "utf-8");
    expect(commitMsgContent).toContain("commitlint");

    const commitlintContent = readFileSync(commitlintPath, "utf-8");
    expect(commitlintContent).toContain("@commitlint/config-conventional");
    expect(commitlintContent).toContain("scope-enum");
    for (const scope of ["web", "api", "shared", "db", "ui", "reporter", "infra", "ci"]) {
      expect(commitlintContent).toContain(`"${scope}"`);
    }
  });

  it("[SC-DEV-006] provides VS Code workspace settings and extension recommendations", () => {
    const settingsPath = resolve(rootDir, ".vscode/settings.json");
    const extensionsPath = resolve(rootDir, ".vscode/extensions.json");

    expect(existsSync(settingsPath)).toBe(true);
    expect(existsSync(extensionsPath)).toBe(true);

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
    expect(settings["editor.defaultFormatter"]).toBe("esbenp.prettier-vscode");
    expect(settings["editor.formatOnSave"]).toBe(true);
    expect(settings["typescript.tsdk"]).toBe("node_modules/typescript/lib");

    const extensions = JSON.parse(readFileSync(extensionsPath, "utf-8")) as {
      recommendations: string[];
    };
    expect(extensions.recommendations).toContain("dbaeumer.vscode-eslint");
    expect(extensions.recommendations).toContain("esbenp.prettier-vscode");
    expect(extensions.recommendations).toContain("prisma.prisma");
  });
});
