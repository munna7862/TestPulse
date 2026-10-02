# Phase 10 — Sprint 06: Paid Production Infrastructure Decision & Migration

## Sprint Objective

Decide on the paid production setup now that the product is feature-complete (decision gate, master plan D-14 / Q3), build the production environment, and re-verify the master plan §10 targets on real infrastructure before any user is onboarded.

## Dependencies

P10-S05 free-tier staging validation (its list of observed free-tier limitations is the input to this decision).

## Personas

- **Lead:** `role-devops-engineer`, `role-product-owner`
- **Reviewers / sign-off:** `role-fullstack-architect`, `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. **Decision gate (Product Owner + DevOps):** compare candidate setups (e.g. Render paid, Railway, Fly.io for the API/worker; Vercel Pro or an alternative for web; Neon paid; a fixed-price Redis) on monthly cost, cold starts, WebSockets, sticky sessions, backups, and region. Choose one, or explicitly decide to stay on the free profile for a longer beta. Record the outcome as an ADR-003 amendment, close Q3, and update master plan §4.4/§11.
2. Register the production domain, and configure `app.<domain>` and `api.<domain>` (same registrable domain) with TLS.
3. Provision production services: an always-on API (N ≥ 2 if affordable), a separate worker service (`RUN_WORKERS_IN_PROCESS=false`), persistent Redis, and a paid PostgreSQL plan with point-in-time recovery.
4. Switch cookie and CORS configuration to the paid profile (shared registrable domain, `COOKIE_DOMAIN`), and configure sticky sessions or the websocket-only transport for multiple gateway instances.
5. Verify the email sending domain (SPF, DKIM, DMARC) for production.
6. Production secrets management (provider secret store), and rotate every secret used during the free period.
7. Monitoring and alerting: uptime checks, Sentry alert rules, queue-depth and worker-heartbeat alerts, and database storage and connection alerts.
8. Backup and restore drill: restore the production database to a branch and verify it.
9. Re-run the P10-S03 load tests against the production-like environment and record the results against master plan §10.
10. Update `docs/ops/` (environment catalog, deployment runbook, cost sheet) and retire the free-tier-only workarounds that are no longer needed (keep them working via configuration).

## Expected Files / Areas

`docs/architecture/adr-003-*.md` (amended), `docs/ops/production-environment.md`, `docs/ops/cost-sheet.md`, `docs/ops/deployment-runbook.md`, `docs/testing/performance-baselines.md`, deployment config (`render.yaml` or the chosen provider's config)

## Testing & Verification

Full E2E suite against the production environment (with a dedicated test org that is removed afterwards), load tests against master plan §10, a multi-instance WebSocket exactly-once check, a restore drill, and failover of one API instance.

## Acceptance Criteria

- [ ] The hosting decision is recorded (ADR-003 amendment, Q3 closed) with an approved monthly cost.
- [ ] The production environment runs on the paid profile with custom domains and TLS.
- [ ] Master plan §10 targets are met and measured on production infrastructure.
- [ ] Backups are verified by a successful restore drill.
- [ ] Alerts fire for downtime, error spikes, queue backlog, and worker loss.
- [ ] Every secret from the free period has been rotated.

## Risks / Guardrails

Cost surprises (set billing alerts); data loss when migrating staging data (production starts clean; migrate nothing except intentional seed); cookie and CORS breakage when switching profiles (test login, refresh, and sockets first); vendor lock-in through provider-specific features.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10 — Sprint 06: Paid Production Infrastructure Decision & Migration.
Act as: role-devops-engineer + role-product-owner (load .agents/skills/role-devops-engineer/SKILL.md, .agents/skills/role-product-owner/SKILL.md). Reviewers: role-fullstack-architect, role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §4.4 deployment profiles, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/10-phase-quality-engineering-release.md
4. planning/sprints/P10-S06-paid-production-migration.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE ACTING:
1. Confirm the sprint's dependencies are [x] in task.md; if not, stop and report.
2. Present the hosting comparison and recommendation to the human owner. Any purchase, domain registration, or plan upgrade requires explicit human approval — never provision paid resources yourself.
3. Produce an implementation plan naming every config, environment variable, and document that will change.

IMPLEMENT every task under "Granular Implementation Tasks" after the decision is approved.

VERIFY by running: the E2E suite and load tests against production-like infrastructure, the restore drill, and the alert checks. Record real outputs.

AT COMPLETION:
- Report the decision, the monthly cost, the changed configuration and documents, and the verification results.
- Write docs/walkthroughs/walkthrough-P10-S06.md and update task.md.
- Update the FR status in docs/product/feature-catalog.md and the "Automated by" column in docs/testing/scenario-catalog.md; automated tests carry their [SC-*] ID in the test title.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Hosting decision approved by the human owner and recorded (ADR-003 amendment, master plan §4.4/§11/§12 updated).
- [ ] Production environment provisioned and verified (E2E, load tests, WebSocket exactly-once, restore drill) — output observed, not assumed.
- [ ] Alerts and monitoring are live.
- [ ] Docs updated (`docs/ops/`, performance baselines); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
