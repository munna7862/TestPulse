# Phase 07 — Sprint 05: Webhook System for Custom Integrations

## Sprint Objective

Build a generic webhook delivery system that allows customers to receive TestPulse events at their own endpoints.

## Dependencies

P07-S04 GitHub integration.

## Scope

### Granular Implementation Tasks

1. Create Webhook Prisma model (id, projectId, url, secret, events, active, createdAt).
2. Create webhook management API (CRUD endpoints).
3. Implement webhook delivery via background job (BullMQ).
4. Sign webhook payloads with HMAC-SHA256 for verification.
5. Implement retry with exponential backoff (max 5 retries).
6. Create webhook delivery log (status, response code, latency).
7. Add webhook testing endpoint (send a test event).
8. Create webhook management UI in project settings.

## Expected Files / Areas

`apps/api/src/modules/webhooks/`, `apps/web/src/features/settings/webhooks/`

## Testing & Verification

Integration tests for webhook delivery and retry logic. Security tests for HMAC signature verification.

## Acceptance Criteria

- [ ] Webhooks can be created with target URL and event filters.
- [ ] Events are delivered to webhook URLs reliably.
- [ ] HMAC signatures are included for verification.
- [ ] Failed deliveries are retried with backoff.
- [ ] Delivery logs show status and response details.
- [ ] Test event can be sent from the management UI.

## Risks / Guardrails

Webhook endpoint SSRF attacks; delivery timeout blocking the job queue; missing event filtering causing spam.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 07, Sprint 05: Webhook System for Custom Integrations.

OBJECTIVE:
Build a generic webhook delivery system that allows customers to receive TestPulse events at their own endpoints.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create Webhook Prisma model (id, projectId, url, secret, events, active, createdAt).
2. Create webhook management API (CRUD endpoints).
3. Implement webhook delivery via background job (BullMQ).
4. Sign webhook payloads with HMAC-SHA256 for verification.
5. Implement retry with exponential backoff (max 5 retries).
6. Create webhook delivery log (status, response code, latency).
7. Add webhook testing endpoint (send a test event).
8. Create webhook management UI in project settings.

TEST:
Integration tests for webhook delivery and retry logic. Security tests for HMAC signature verification.

ACCEPTANCE:
- [ ] Webhooks can be created with target URL and event filters.
- [ ] Events are delivered to webhook URLs reliably.
- [ ] HMAC signatures are included for verification.
- [ ] Failed deliveries are retried with backoff.
- [ ] Delivery logs show status and response details.
- [ ] Test event can be sent from the management UI.

GUARDRAILS:
Webhook endpoint SSRF attacks; delivery timeout blocking the job queue; missing event filtering causing spam.

At completion:
- Run the relevant verification commands.
- Report changed files.
- Report tests executed and results.
- Report known limitations.
- Do not suppress or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Tests added or updated for changed behavior.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Relevant tests pass.
- [ ] Build passes when applicable.
- [ ] Acceptance criteria verified.
- [ ] Git diff reviewed.
- [ ] Documentation updated when behavior or architecture changed.
- [ ] Sprint can be handed to the next sprint without hidden manual steps.
