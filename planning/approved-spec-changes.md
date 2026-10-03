# Approved spec changes

Committed `*.acceptance.test.ts` files are the approved spec, and an agent hook blocks edits to them.
When the user approves a change to one, record it here first (one line per file, path relative to the repo
root), so the approval is visible in the PR diff. Remove the line in the same PR once the edit is done.

| File | Approved by / when | Why |
| --- | --- | --- |
| apps/api/test/orgs/s001-review.acceptance.test.ts | User, 2026-10-03 (chat) | F4 case: ids over the router's 100-character parameter limit get 414 from Fastify before any tenant check; expect 414, not 404 |
| packages/shared/src/plans.acceptance.test.ts | User, 2026-10-03 (chat) | Retag titles from SC-ORG-007 (an S-002 project scenario) to the new SC-ORG-017 plan-limits row |
