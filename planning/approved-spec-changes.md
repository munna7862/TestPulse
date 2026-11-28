# Approved spec changes

Committed `*.acceptance.test.ts` files are the approved spec, and an agent hook blocks edits to them.
When the user approves a change to one, record it here first (one line per file, path relative to the repo
root), so the approval is visible in the PR diff. Remove the line in the same PR once the edit is done.

| File | Approved by / when | Why |
| --- | --- | --- |
| packages/db/test/run-storage.acceptance.test.ts | Owner, 2026-11-28 | Supply the existing audit target type and assert PostgreSQL uniqueness using Prisma's adapter error shape. |
