# Contributing to TestPulse

This guide applies to humans and AI agents alike. Read [`AGENTS.md`](AGENTS.md) first; it contains the non-negotiable rules.

## 1. Workflow

1. Pick the active sprint from [`task.md`](task.md). Read its sprint file, the phase blueprint, and the [master plan](planning/master/TestPulse_Master_Plan.md).
2. Create a short-lived branch from `main`:
   - `feat/PXX-SYY-<short-description>` for code sprints
   - `docs/PXX-SYY-<short-description>` for documentation-only work
   - `fix/<issue-number>-<short-description>` for bug fixes outside a sprint
3. Before coding: write the sprint test catalog (`docs/testing/test_cases_catalog_PXX_SYY.md`) using the `FR-*`/`SC-*` IDs (see [`docs/README.md`](docs/README.md)).
4. Implement, test, and document in the same branch.
5. Open a PR using the template. CI must be green; at least one human review is required on `main`.
6. Squash-merge. Delete the branch.

**Trunk-based:** `main` is always releasable. No long-lived branches. Release tags (`v1.0.0`) are cut from `main`; a `release/v1.0.0` branch is created only if a stabilization period needs it (P10-S07).

## 2. Commit messages (Conventional Commits, enforced by commitlint)

```text
<type>(<scope>): <summary in imperative mood, ≤ 72 chars>

<body: what and why, wrapped at 100>

Refs: PXX-SYY, FR-…, SC-…
```

- **Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `revert`.
- **Scopes:** `web`, `api`, `shared`, `db`, `ui`, `reporter`, `infra`, `planning`, `docs`.
- **Breaking changes:** a `!` after the type/scope and a `BREAKING CHANGE:` footer. The ingestion API and reporter are public interfaces (ADR-007).

## 3. Pull requests

- Keep each PR to one sprint or one fix, with a reviewable size (aim for < 600 changed lines, excluding generated files).
- The PR description lists the FR and SC IDs, the verification output, and the checklist from `.github/pull_request_template.md`.
- Contract changes (master plan §0) need an ADR plus a master plan update in the same PR.
- UI changes include screenshots in light and dark themes.

## 4. Local setup (summary; full guide in P02-S03 docs)

- Node 24 LTS (`.nvmrc`), npm.
- PostgreSQL 16: a native install or a personal Neon branch. Redis is optional (needed only for `test:contract`).
- `npm install` → copy the `.env.example` files → `npm run db:migrate` → `npm run db:seed` → `npm run dev`.
- Everything must work in Windows PowerShell; never add bash-only scripts.

## 5. Definition of done

Each sprint file has its own Definition of Done. In addition, every PR must:
- pass all CI gates (no skipped or `.only` tests, no lowered thresholds);
- keep tenant isolation intact (404/403 tests for new routes);
- update the feature and scenario catalogs;
- leave no hidden manual steps.

## 6. Reporting bugs and proposing changes

Use the issue templates in `.github/ISSUE_TEMPLATE/`. Bugs name the affected `FR-*` ID, and every fix adds or extends an `SC-*` scenario that reproduces the bug.
