# TestPulse Documentation Map

Everything an engineer or agent needs to build TestPulse correctly, and to keep features and tests from drifting apart.

## Start here

| If you need… | Read |
| :--- | :--- |
| What we're building, the canonical contracts, and decisions | [`planning/master/TestPulse_Master_Plan.md`](../planning/master/TestPulse_Master_Plan.md) |
| Rules every agent and engineer must follow | [`AGENTS.md`](../AGENTS.md) |
| What to do next | [`task.md`](../task.md) → the sprint file it links to |
| Every feature and its status | [`product/feature-catalog.md`](product/feature-catalog.md) (`FR-*` IDs) |
| Every behavior we must keep proving | [`testing/scenario-catalog.md`](testing/scenario-catalog.md) (`SC-*` IDs) |
| How staging runs for free, and its limits | [`ops/free-tier-deployment.md`](ops/free-tier-deployment.md) |

## Directory layout

Defined by [`doc-implementation-standards`](../.agents/skills/doc-implementation-standards/SKILL.md). Most of these files are produced by specific sprints. If a file is not here yet, the sprint that creates it is listed.

| Path | Contents | Created / maintained by |
| :--- | :--- | :--- |
| `product/feature-catalog.md` | Feature register (`FR-*`) | Seeded in planning; refined in P01-S01; updated every sprint |
| `product/prd.md`, `product/glossary.md` | Requirements, personas, journeys, terminology | P01-S01 |
| `ux/` | Information architecture, wireframes, design tokens, accessibility | P01-S02, P02-S06, P09 |
| `architecture/` | System overview and ADRs | P01-S03, P01-S04, P10-S06 |
| `api/` | REST, ingestion, and real-time contracts; error codes | P01-S03, then every API sprint |
| `database/` | Schema notes, ER diagram, query plans, local setup | P01-S03, P02-S03, P04-S01 |
| `security/` | Security model, RBAC matrix, threat model, audits | P01-S04, P03-S06, P10-S04 |
| `testing/scenario-catalog.md` | Master scenario list (`SC-*`) | Seeded in planning; refined in P01-S05; updated every sprint |
| `testing/test_cases_catalog_PXX_SYY.md` | Per-sprint test cases referencing `SC-*` | Each code sprint, before implementation |
| `testing/testing-strategy.md`, `coverage-audit.md`, `performance-baselines.md` | Strategy and measurements | P01-S05, P04-S06, P10-S01, P10-S03 |
| `ops/` | Environment catalog, free-tier runbook, deployment runbook, release plan | P02-S05, P10-S05–S07 |
| `integrations/` | Reporter, GitHub, and webhook setup | P04-S05, P07-S04, P07-S05 |
| `walkthroughs/walkthrough-PXX-SYY.md` | What each completed sprint delivered, with real test output | Each code sprint, at completion |
| `launch/` | GTM materials | Phase 11 |

## Traceability workflow (master plan D-15)

```text
Requirement (PRD) ──> FR-* in feature-catalog ──> SC-* in scenario-catalog
                                                       │
           Sprint catalog (test_cases_catalog_PXX_SYY) references SC-*
                                                       │
           Automated test title contains [SC-*]  ──>  "Automated by" column filled
                                                       │
           CI traceability check (P02-S05) keeps the catalog and tests in sync
```

1. **Before implementing a sprint:** find its FRs in the feature catalog (Sprint(s) column) and their scenarios in the scenario catalog. Write the sprint test catalog referencing those `SC-*` IDs, and add new scenarios to the master catalog.
2. **While implementing:** name tests with their ID, e.g. `it("[SC-QUA-003] concurrent quarantine creates one record", ...)`. One test may cover several IDs.
3. **At completion:** fill "Automated by" for each automated scenario, set FR status (`Done` only when all its scenarios are automated and green), and list FR and SC IDs in the PR description.
4. **Bugs:** a bug report names the FR it breaks. The fix PR adds or extends an `SC-*` scenario that reproduces it, so the regression stays covered.
5. **Changing behavior:** update the FR row and its scenarios in the same PR. Never silently change what a passing scenario means; add a new scenario, and strike through the old one with a reason.

## Writing conventions

- Write documentation as the work happens, not afterwards, and never invent results. Performance numbers and test counts must come from real command output (see `doc-implementation-standards` §3).
- Use relative links, tagged code blocks, and Mermaid for diagrams.
- Files are UTF-8 without BOM, with LF line endings (`.gitattributes`).
