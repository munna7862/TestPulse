---
name: doc-implementation-standards
description: Documentation standards for TestPulse architecture, API contracts, testing, UX, and release evidence.
---

# Universal Documentation Implementation Standards for TestPulse

Every architectural change, API contract, and completed feature sprint must be documented in the repository before a pull request can be merged or a sprint story closed.

---

### 1. Required Documentation Directory Structure

Maintain the repository `docs/` structure:

- **`docs/architecture/`**: High-level designs, module boundaries, system flows, and Architecture Decision Records (ADRs).
- **`docs/api/`**: OpenAPI/REST specifications, Zod schemas, error codes, and WebSocket event dictionaries.
- **`docs/database/`**: Prisma schema notes, ER diagrams, indexing strategies, and migration guides.
- **`docs/testing/`**: Test strategy, coverage metrics, and pre-implementation Test Cases Catalogs (`test_cases_catalog_PXX_SYY.md`).
- **`docs/ux/`**: User journey flows, wireframes, design system tokens, and accessibility notes.
- **`docs/ops/`**: Environment variable catalogs, deployment runbooks, and disaster recovery plans.
- **`docs/integrations/`**: Setup documentation for `@testpulse/reporter`, GitHub Actions, and webhooks.

---

### 2. Standardized Templates

#### A. Architecture Decision Record (ADR) Template
Save to `docs/architecture/adr-XXX-<title>.md`:

```markdown
# ADR-001: [Title of Decision]

## Status
[Proposed | Accepted | Superseded | Deprecated]

## Context
[What is the business or technical context driving this decision?]

## Decision
[What architecture or technology decision was made?]

## Consequences
- **Positive:** [What benefits are gained?]
- **Negative / Trade-offs:** [What compromises or complexities are introduced?]
- **Mitigation:** [How will the trade-offs be managed?]
```

#### B. Pre-Implementation Test Cases Catalog Template
Save to `docs/testing/test_cases_catalog_PXX_SYY.md`:

```markdown
# Test Cases Catalog: Phase XX — Sprint YY ([Sprint Title])

## 1. Positive Test Scenarios (Happy Path)
- [ ] **TC-P01:** [Description of valid operation and expected outcome]
- [ ] **TC-P02:** [Description of valid operation and expected outcome]

## 2. Negative Test Scenarios (Error Handling)
- [ ] **TC-N01:** [Invalid payload triggers Zod 400 Bad Request]
- [ ] **TC-N02:** [Missing or expired JWT triggers 401 Unauthorized]

## 3. Boundary & Edge Case Scenarios
- [ ] **TC-B01:** [Empty list / 0 items returns 200 with empty array]
- [ ] **TC-B02:** [Batch payload at maximum threshold (10,000 items)]

## 4. Multi-Tenant Security Scenarios
- [ ] **TC-S01:** [Tenant A cannot read Tenant B test runs (404/403)]
- [ ] **TC-S02:** [Project API key cannot access organization membership endpoints]
```

#### C. Sprint Walkthrough Template
Save to `docs/walkthroughs/walkthrough-PXX-SYY.md`:

```markdown
# Sprint Walkthrough: Phase XX — Sprint YY ([Sprint Title])

## 1. Feature Purpose
[Brief summary of what problem was solved and for whom]

## 2. Changed Behavior
- [Component/Module]: [What changed]
- [API/Route]: [New or modified endpoints]

## 3. Verification Steps
1. Run command: `npm run test`
2. Expected output: [Describe observed test results]

## 4. Executed Tests & Real Results
- Test Suite: `apps/api/test/ingestion.spec.ts`
- Tests Run: 14 passed, 0 failed
- Duration: 1.24s

## 5. Known Limitations & Deferred Work
- [Any edge cases explicitly deferred to future sprints]
```

---

### 3. Mandatory Discipline: No Fake Artifacts

Do NOT generate irrelevant, placeholder, or fabricated documentation:
- Do not document database models or fields that do not exist in the Prisma schema.
- Do not publish performance benchmarks or test reports without real, measured command outputs.
- Ensure all API documentation matches the actual Zod validation schemas in `@testpulse/shared`.

---

### 4. Technical Documentation Best Practices

- **Code Blocks:** Always provide language tags (`typescript`, `json`, `bash`, `powershell`, `prisma`, `mermaid`).
- **Native Mermaid Diagrams:** Use Mermaid diagrams for architecture, sequence flows, and state machines:

```mermaid
sequenceDiagram
    participant CI as CI Runner (@testpulse/reporter)
    participant API as Fastify API
    participant DB as PostgreSQL
    participant Redis as Redis Pub/Sub
    participant Client as Web Client

    CI->>API: POST /api/v1/projects/:id/runs
    API->>DB: Persist Run & Results
    API->>Redis: PUBLISH run:result
    Redis->>Client: Socket.IO broadcast
```

- **Relative Links:** Use relative markdown links so links resolve correctly in GitHub and local editors.
