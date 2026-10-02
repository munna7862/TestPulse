# Phase 07 — Sprint 05: Webhook System for Custom Integrations

## Sprint Objective

Build a generic webhook delivery system that allows customers to receive TestPulse events at their own endpoints.

## Dependencies

P07-S04 GitHub integration.

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Add the `Webhook` and `WebhookDelivery` models per master plan §5. Secrets are encrypted at rest (AES-256-GCM with `WEBHOOK_SECRET_ENCRYPTION_KEY`) and shown once.
2. Webhook CRUD under `/api/v1/projects/:projectId/webhooks` (Admin+), including secret rotation.
3. Delivery: consume domain events → per-webhook delivery jobs. Payload `{ id, type, createdAt, data }`; headers `X-TestPulse-Event`, `X-TestPulse-Delivery`, `X-TestPulse-Timestamp`, `X-TestPulse-Signature` (HMAC-SHA256 over `timestamp.body`).
4. SSRF protection: https only; resolve DNS and block private, loopback, link-local, and metadata ranges at connect time; no redirects; 10 s timeout; capped response read.
5. Retry with exponential backoff (max 5 attempts). Auto-disable after 20 consecutive failures and notify project admins.
6. Delivery log (30-day retention) with status, response code, and latency, plus a redeliver action.
7. Test-event endpoint.
8. Webhook management UI in project settings, including a signature verification snippet.

## Expected Files / Areas

`apps/api/src/modules/webhooks/`, `apps/api/src/jobs/webhook-delivery.ts`, `apps/web/src/features/settings/webhooks/`, `docs/integrations/webhooks.md`

## Testing & Verification

Integration tests for delivery, retry, auto-disable, and signature verification. SSRF tests (private IPs, DNS rebinding, redirects, IPv6). Admin-only RBAC tests.

## Acceptance Criteria

- [ ] Webhooks can be created with a target URL and event filters.
- [ ] Events are delivered reliably, with retries and HMAC signatures that consumers can verify.
- [ ] Requests to internal or private addresses are blocked.
- [ ] Delivery logs show status and response details, and deliveries can be retried manually.
- [ ] A test event can be sent from the management UI.

## Risks / Guardrails

SSRF via webhook URLs or DNS rebinding; slow endpoints blocking the queue (timeouts and concurrency limits); secret leakage; missing event filtering causing spam.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 07 — Sprint 05: Webhook System for Custom Integrations.
Act as: role-backend-engineer + role-frontend-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/07-phase-notifications-integrations.md
4. planning/sprints/P07-S05-webhook-system.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P07_S05.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P07-S05.md and update task.md.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] New or changed screens have loading, empty and error states and pass the axe-core check in light and dark themes.
- [ ] Acceptance criteria verified.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
