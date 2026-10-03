# Approved spec changes

Committed `*.acceptance.test.ts` files are the approved spec, and an agent hook blocks edits to them.
When the user approves a change to one, record it here first (one line per file, path relative to the repo
root), so the approval is visible in the PR diff. Remove the line in the same PR once the edit is done.

| File | Approved by / when | Why |
| --- | --- | --- |
| apps/api/test/auth/auth-hardening.acceptance.test.ts | Owner, in chat, 2026-10-03 | Simulate client IPs with `remoteAddress` instead of the spoofable X-Forwarded-For header (review F1); assert exactly one refresh success and family revocation (review T1). |
