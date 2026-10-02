# Test Cases Catalog — Phase 02 Sprint 05: CI/CD Pipeline & Deployment Targets

## 1. Metadata & Traceability
- **Sprint:** P02-S05: CI/CD Pipeline and Deployment Targets
- **Phase:** Phase 02: Project Bootstrap & DevOps
- **Feature Traceability:**
  - `FR-OPS-02` (Free-tier deployment profile: same-origin `/api` proxy, in-process workers)
  - `FR-OPS-04` (CI quality gates including traceability check)
  - `FR-SEC-06` (Dependency audit and secret scanning in CI)
- **Scenario Traceability:**
  - `SC-OPS-002` (Free-profile staging: same-origin proxy and first-party cookies)
  - `SC-OPS-003` (Worker in-process vs separate process configuration)
  - `SC-OPS-005` (Traceability check validation between scenario catalog and automated tests)
  - `SC-OPS-007` (GitHub Actions CI workflow execution: verify + e2e)
  - `SC-OPS-008` (Staging deployment automation: migrations + Render deploy hook)
  - `SC-SEC-011` (Security scanning: gitleaks and high-severity audit in CI)
- **Lead Persona:** `role-devops-engineer`
- **Reviewer Personas:** `role-sdet-architect`, `role-security-engineer`

---

## 2. Test Scenarios Register

### [SC-OPS-002] Free-Profile Staging /api Proxy & First-Party Cookies
- **Given:** Web application running with Next.js rewrite configuration (`apps/web/next.config.ts`) targeting `API_INTERNAL_URL`
- **When:** Browser issues requests to `/api/*`
- **Then:** Next.js proxies the call to the API server; responses preserve set-cookie headers as first-party on the web domain.
- **Level:** End-to-End / Integration (`E` / `I`)
- **Automated By:** `apps/web/e2e/smoke.spec.ts`

### [SC-OPS-003] Worker In-Process Configuration (`RUN_WORKERS_IN_PROCESS`)
- **Given:** Fastify API server startup logic
- **When:** Started with `RUN_WORKERS_IN_PROCESS=true`, BullMQ worker listeners start inside the same Node.js process; when `false`, HTTP and Socket.IO start without spawning workers.
- **Then:** Server operates according to the free vs paid deployment profile without code changes.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/app.int.test.ts` & `apps/api/test/ci-pipeline.test.ts`

### [SC-OPS-005] Automated Traceability Verification (`check-traceability.mjs`)
- **Given:** Master scenario catalog in `docs/testing/scenario-catalog.md` and repository test files
- **When:** `scripts/check-traceability.mjs` runs
- **Then:** Every scenario with an automated test path is verified to have an actual test title matching `[SC-*]`. If a scenario is marked automated without a corresponding test, the script exits with code 1.
- **Level:** Unit / Tooling (`U`)
- **Automated By:** `scripts/check-traceability.mjs` & `apps/api/test/ci-pipeline.test.ts`

### [SC-OPS-007] GitHub Actions CI Pipeline Quality Gate
- **Given:** CI workflow definition in `.github/workflows/ci.yml`
- **When:** Triggered on pull request or push to `main`
- **Then:**
  1. Concurrency prevents redundant parallel runs (`cancel-in-progress: true`).
  2. `verify` job boots PostgreSQL 16 and Redis 7 service containers, executes `npm ci`, `lint`, `typecheck`, `format:check`, `check:traceability`, `test` (with coverage), `test:contract`, and `build`.
  3. `e2e` job boots services and runs the Playwright smoke suite, archiving traces on failure.
- **Level:** CI / Pipeline (`I`)
- **Automated By:** `.github/workflows/ci.yml` & `apps/api/test/ci-pipeline.test.ts`

### [SC-OPS-008] Staging Deployment Blueprint & Automation
- **Given:** `render.yaml` blueprint and `.github/workflows/deploy-staging.yml`
- **When:** Changes merge into `main`
- **Then:** Database migrations execute against the direct database URL (`DIRECT_URL`), and the Render API deploy hook triggers deployment of the free-tier service with `/health` check.
- **Level:** Operations / Review (`M`)
- **Automated By:** `apps/api/test/ci-pipeline.test.ts`

### [SC-SEC-011] Secret Scanning & Security Hygiene in CI
- **Given:** Commits and dependencies in the pull request
- **When:** CI `verify` job executes
- **Then:** Secret scanning with Gitleaks detects any accidental credentials, and dependency checks flag unaddressed vulnerabilities.
- **Level:** Security / Pipeline (`M`)
- **Automated By:** `.github/workflows/ci.yml`
