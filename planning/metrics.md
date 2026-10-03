# Delivery metrics and reviewer baseline

Playbook Step 1 (baseline) and Step 3 (record the §8 metrics for each slice), from
[`docs/process/ai-delivery-playbook.html`](../docs/process/ai-delivery-playbook.html) §6 and §8. Add a row when a slice
merges. Numbers are measured, not estimated, unless marked ≈.

## Metrics per slice

| Slice | PR | Items marked done that are not (found after merge) | First-push CI | Product lines | Independent reviews | Process context | Pre-merge findings fixed | Escaped defects | Time (first commit → merge) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H1 auth hardening | #10 | 3 (G4 and G5 only partly fixed; G7 missed) | pass | 154 | 0 before merge (reviewed after, in Step 2) | — | 0 | 3 → became H1b | 20 min |
| Step 2 context diet | #11 | 0 | pass | 460 | 0 (process change) | — | — | 0 so far | 45 min |
| H1b auth hardening | #12 | 0 so far | pass | 549 | 3 (claims, security, test) | — | 6 | 0 so far | 35 min |
| S-001 orgs + tenant context | #13 | 0 so far | pass | 539 | 3 (claims, security, test) | ≈8.5k tokens | 4 security, 2 test gaps, 1 wrong SC ID, 4 doc gaps | 0 so far | 4 h 21 min (incl. a usage-limit pause) |

Targets (§8): items marked done that are not = 0 at merge · first-push CI pass ≥ 9 in 10 · PR ≤ 800 product
lines · at least one independent review plus your merge · ≈7k process tokens · escaped defects tracked, each one
turned into a gate · under a day per slice, verified and deployed.

How each column is measured:
- **First-push CI:** the first `ci.yml` run on the PR's `pull_request` event.
- **Product lines:** `scripts/check-pr-size.mjs` rules (tests, docs, planning, migrations and generated code excluded).
- **Process context:** characters / 4 of root `AGENTS.md`, the folder `AGENTS.md` files touched, `NOW.md`, the
  brief and one skill, plus ≈2.5k for cited contract sections.
- **Escaped defects:** found after merge. "0 so far" means none yet; update the row if one turns up.

Not yet met: **deployed**. Staging cannot deploy until the staging secrets exist (task.md G1), so no slice has
reached the "verified and deployed" target.

## Reviewer baseline: what independent review found that the persona flow missed

**Before the loop (persona sprints, PRs #5–#8).** The audit of 2026-10-02 found six items marked complete that were
not (G1–G6 in `task.md`):
- staging deploy green while skipping every step;
- Sentry helpers that were no-op stubs;
- coverage thresholds not enforced;
- auth rate limiting missing;
- timing enumeration on auth routes;
- non-atomic refresh rotation.

The persona reviewers (`role-security-engineer`, `role-sdet-architect`) had signed off on all of them.

**H1, the first slice through the loop.** The reviewer agents ran after merge and reopened two of the three fixes:
- **G4 rate limiting:** limits spoofable via `X-Forwarded-For`, no per-email limit, memory only.
- **G5 timing enumeration:** register, resend and forgot still leaked timing.
- **G7, found new:** verification and reset tokens reusable under concurrency (5 of 5 resets succeeded with one
  token); refresh treated any DB error as token reuse.

**H1b.** Review before merge found six defects; each got a failing test first:
- `TRUST_PROXY=true` trusting client headers on the deployed config;
- an unreachable Redis hanging auth for ~40 s;
- a race test that might never overlap;
- a mail-failure test that proved too little;
- a throwing mailer giving a 500 only for existing accounts;
- tokens printed in production logs.

**S-001.** Review before merge found nothing exploitable on the shipped routes. It found four guard weaknesses
that later routes would have copied:
- a multi-method route enforced only one role;
- routes not spelled `:orgId` skipped the guard;
- roles were not re-checked at write time;
- a NUL in an id gave a 500.

It also found two tests that survived mutation (CSRF, check order), a wrong SC ID and four doc claims without
proof.

**Patterns, each turned into a gate.**

| Pattern | Seen in | Gate |
| --- | --- | --- |
| Self-reported "done" without proof | G1–G6 | Agents never mark `[x]`; a merged PR with green required checks does (AGENTS.md) |
| Race tests that do not prove the requests overlapped | H1b, and S-001's ownership race before review | apps/api/AGENTS.md: a concurrency test holds every request at a barrier past the pre-check and asserts the arrival count |
| Protections tested only on the happy path | S-001 CSRF and check order | security-reviewer and test-auditor run mutations on each guard |
| Deployed config differing from the tested one | H1b `TRUST_PROXY` | Env schema rejects unsafe values at startup |
