# Test Cases Catalog — Phase 02 Sprint 04: Developer Tooling & Code Quality

## 1. Metadata & Traceability
- **Sprint:** P02-S04: Developer Tooling and Code Quality
- **Phase:** Phase 02: Project Bootstrap & DevOps
- **Feature Traceability:** `FR-DEV-01` (Developer tooling, linting, formatting, type checking, boundary enforcement)
- **Scenario Traceability:** `SC-DEV-001`, `SC-DEV-002`, `SC-DEV-003`, `SC-DEV-004`, `SC-DEV-005`, `SC-DEV-006`
- **Lead Persona:** `role-devops-engineer`
- **Reviewer Personas:** `role-fullstack-architect`, `role-sdet-architect`

---

## 2. Test Scenarios Register

### [SC-DEV-001] Monorepo Lint Quality Gate
- **Given:** The monorepo packages (`apps/api`, `apps/web`, `packages/db`, `packages/shared`, `packages/ui`, `packages/reporter`)
- **When:** `npm run lint` is executed
- **Then:** ESLint 10 evaluates all files using the flat config (`eslint.config.mjs`) and typescript-eslint recommended type-checked rules; completes with 0 errors and 0 warnings.
- **Level:** Unit / Tooling (`U`)
- **Automated By:** `apps/api/test/dev-tooling.test.ts` & Turborepo quality pipeline

### [SC-DEV-002] Architectural Boundary Enforcement
- **Given:** Architecture boundaries codified in `eslint.config.mjs` per AGENTS.md §4 and ADR-006:
  1. No direct `@prisma/*` or `**/generated/prisma/**` outside `packages/db`.
  2. No relative cross-package imports (`../../packages/*`, `../../apps/*`).
  3. No server-only modules (`ioredis`, `bullmq`, `pg`, `@testpulse/db`) in browser contexts (`apps/web`, `packages/ui`).
  4. No Node built-ins (`node:*`) or internal workspace dependencies in `@testpulse/shared`.
- **When:** Forbidden imports are attempted in the respective workspace files
- **Then:** ESLint rejects the files with `no-restricted-imports` and prints explicit architectural guidance messages.
- **Level:** Unit / Tooling (`U`)
- **Automated By:** `apps/api/test/dev-tooling.test.ts` & deliberate violation tests

### [SC-DEV-003] Prettier Formatting Consistency & ESLint Harmony
- **Given:** Monorepo files across TypeScript, JavaScript, JSON, CSS, and Markdown
- **When:** `npm run format:check` is executed
- **Then:** Prettier verifies code style (120 print width, 2 spaces, double quotes, LF line endings) with zero formatting drift, and `eslint-config-prettier` prevents any conflicting formatting rules.
- **Level:** Unit / Tooling (`U`)
- **Automated By:** `apps/api/test/dev-tooling.test.ts` & `npm run format:check`

### [SC-DEV-004] TypeScript Strict Mode Enforcement
- **Given:** Root `tsconfig.base.json` and workspace `tsconfig.json` configurations
- **When:** `npm run typecheck` is executed
- **Then:** TypeScript compiler evaluates all workspaces under `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noImplicitAny: true`, and exits with 0 errors.
- **Level:** Unit / Tooling (`U`)
- **Automated By:** `apps/api/test/dev-tooling.test.ts` & `npm run typecheck`

### [SC-DEV-005] Husky Pre-commit & Commitlint Conventional Commits
- **Given:** Git hook configuration in `.husky/pre-commit` and `.husky/commit-msg`
- **When:** A commit is prepared and created:
  1. `lint-staged` runs on staged files, formatting and linting them before committing.
  2. `commitlint` validates the commit message against Conventional Commits specification with allowed monorepo scopes: `[web, api, shared, db, ui, reporter, infra, planning, docs, tracking, deps, ci]`.
- **Then:** Invalid commit messages (empty type, empty subject, or unapproved scope) are rejected with clear error messages, and unlinted code is automatically linted/formatted.
- **Level:** Unit / Tooling (`U`)
- **Automated By:** `apps/api/test/dev-tooling.test.ts` & git hook integration

### [SC-DEV-006] VS Code Workspace Integration
- **Given:** Repository settings in `.vscode/settings.json` and `.vscode/extensions.json`
- **When:** A developer opens the workspace in VS Code
- **Then:** Editor automatically formats on save via Prettier, runs ESLint code action fixes on save, uses the workspace TypeScript SDK, and prompts to install essential extensions.
- **Level:** Manual / Review (`M`)
- **Automated By:** Verified by settings contract inspection in `apps/api/test/dev-tooling.test.ts`
