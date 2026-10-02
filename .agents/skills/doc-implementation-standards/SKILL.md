---
name: doc-implementation-standards
description: Documentation standards for TestPulse architecture, API contracts, testing, UX, and release evidence.
---

# Universal Documentation Implementation Standards for TestPulse

Every completed feature must be thoroughly documented in the repository **`docs/`** directory before a pull request can be merged or a sprint story closed.

---

### 1. Required Documentation by Change Type

Update the corresponding `docs/` subdirectories when making system modifications:

- **Architecture (`docs/architecture/`):** Document high-level designs, data flow diagrams, and architectural decisions.
- **API Contracts (`docs/api/`):** Document new endpoints, request/response schemas, and WebSocket event types.
- **Database Schema (`docs/database/`):** Document new models, relationships, and index strategies.
- **Testing (`docs/testing/`):** Commit Test Cases Catalogs (`test_cases_catalog_PXX_SYY.md`) and regression test suites.
- **User Experience (`docs/ux/`):** Document user flows, component behavior, and theme tokens.
- **Deployment & Ops (`docs/ops/`):** Document environment variables, CI/CD pipelines, background jobs, and runbooks.
- **Integrations (`docs/integrations/`):** Document setup instructions for CI reporters and webhooks.

---

### 2. Mandatory Discipline: No Fake Artifacts

Do NOT generate irrelevant, placeholder, or fabricated documentation:

- Do not document database schemas that do not exist in the Prisma schema.
- Do not publish performance benchmarks or test reports without real, measured execution numbers.
- Ensure all API documentation matches the actual Zod validation schemas.

---

### 3. Sprint Walkthrough (`walkthrough.md`)

Meaningful user-facing sprints must produce a concise `walkthrough.md` in the sprint directory containing:

- **Feature Purpose:** What problem was solved.
- **Changed Behavior:** Clear breakdown of user-facing or architectural changes.
- **Verification Steps:** How to manually and automatically verify the changes.
- **Executed Tests:** Actual pass/fail results from local test runs.
- **Known Limitations:** Any edge cases deferred to subsequent sprints.

_(Do not claim manual verification unless actually performed)._

---

### 4. Technical Best Practices

- **Language Tags:** Ensure all code blocks use precise language tags (`typescript`, `json`, `bash`, `prisma`).
- **Visual Diagrams:** Embed native **Mermaid.js** diagrams for data flows, system architecture, and entity relationships.
- **Relative Links:** Use relative links for internal documentation references to ensure they work on GitHub and local markdown viewers.
