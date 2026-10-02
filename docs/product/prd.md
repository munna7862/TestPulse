# TestPulse — Product Requirements Document (v1 / MVP)

> **Sprint:** P01-S01 · **Owner:** `role-product-owner` · **Status:** Draft for review (2026-10)
> **Canonical contracts** (API, data model, RBAC, limits, NFRs) live in the [master plan](../../planning/master/TestPulse_Master_Plan.md). This PRD describes **what** and **why**; it references those sections rather than restating them. Every requirement has an `FR-*` ID in the [feature catalog](feature-catalog.md).

---

## 1. Problem & Vision

Engineering teams with more than a few dozen automated tests share the same three questions after every CI run: **"What broke? Is it flaky? Who's looking at it?"**

Today the answers are spread across CI logs, after-the-fact HTML reports, and Slack threads. Flaky tests are retried until green, muted ad hoc, or tracked in spreadsheets nobody owns. The cost is real: slower merges, ignored red builds, and lost trust in the test suite.

**TestPulse** shows test results **live while CI runs**, flags flaky tests automatically, and gives teams a structured, SLA-backed **quarantine** workflow with clear ownership.

### Product principles

1. **Live by default.** Results appear while tests execute, not after.
2. **Never break the customer's CI.** TestPulse problems (outage, quota, network) never change a CI outcome.
3. **Trust the data.** Statuses mean exactly one thing (§5); nothing is hidden or silently rewritten.
4. **Accountability, not blame.** Every quarantined test has an owner, a reason, and a deadline.
5. **Ten minutes to value.** A new team sees its first live run within 10 minutes of signing up.

---

## 2. Personas

| Persona | Role & context | Jobs to be done | Primary screens |
| :--- | :--- | :--- | :--- |
| **Sam — SDET** (primary) | Owns the automation framework for 2–3 product teams; usually an org **Member** | Watch runs live and spot new failures immediately · tell flaky from real failures · quarantine flaky tests with a reason and owner · drive flaky fixes to closure | Live run, run list, test case detail, quarantine dashboard |
| **Quinn — QA Lead** | Leads QA for a product area; usually an **Admin** | Set team SLAs and detection settings · make sure quarantines don't rot · onboard teammates and manage API keys | Quarantine dashboard, project settings, members |
| **Morgan — Engineering Manager** | Manages several teams; usually a **Viewer** or Member | See whether test health is improving · know which tests cost the most time · verify flaky work is owned | Project dashboard, analytics, leaderboards |
| **CI pipeline** (system actor) | Playwright or Vitest running in GitHub Actions, GitLab CI, Jenkins, or CircleCI | Report results reliably with zero impact on build outcome or duration | Reporter, API key |

---

## 3. User Journeys

Each journey lists its acceptance criteria and the scenarios that prove it ([scenario catalog](../testing/scenario-catalog.md)).

### J1 — Sign up to first live run (golden path, Sam)

1. Sign up with email or GitHub/Google → verify email (FR-AUTH-01/02/07).
2. Onboarding checklist: create organization → create project (FR-ORG-01/05/06).
3. Generate an API key; copy the ready-made reporter snippet (FR-KEY-01).
4. `npm i -D @testpulse/reporter`; add it to `playwright.config.ts`; set `TESTPULSE_API_KEY` in CI (FR-REP-01).
5. Push → watch results stream into the dashboard while CI runs (FR-DASH-01).

**Acceptance:** a first-time user completes J1 in ≤ 10 minutes (median), with no support and no doc pages beyond the quickstart. Proven by SC-E2E-001 and SC-GTM-002.

### J2 — Live monitoring (Sam, Quinn)

1. Open the project → a running run is highlighted with live counters.
2. Open the live run → failures pinned at the top, with a progress bar based on the expected test count.
3. Expand a failure → error and stack trace, copyable; a "new failure" vs. "known (quarantined)" label.

**Acceptance:** results visible within the §10 latency target; teammates in other browsers see identical state; a reconnect shows correct state. Proven by SC-E2E-002, SC-RT-005, and SC-RT-007.

### J3 — Flaky triage & quarantine (Sam)

1. A test is badged **Suspected flaky** or **Flaky**, with the reason (retry flake / same-commit disagreement / unstable history).
2. Sam opens test case detail → history timeline confirms it → **Quarantine** with a reason and assignee.
3. The assignee moves it to **Investigating**, comments, @mentions a teammate.
4. A fix lands → the quarantine is resolved with a closing note.

**Acceptance:** every step is visible live to all viewers; the audit trail records actor and time; Viewers can't change anything. Proven by SC-E2E-003 and SC-QUA-001…006.

### J4 — SLA follow-through (Quinn)

1. At 80% of the SLA, the assignee is warned (in-app + email per preferences).
2. At 100%, the quarantine is marked **Escalated**, and the assignee and project admins are notified.
3. At 200%, it is flagged **Overdue** on the quarantine dashboard for review.

**Acceptance:** each step happens exactly once, even after the server slept (free tier). Proven by SC-QUA-009…011 and SC-E2E-005.

### J5 — Team onboarding (Quinn)

Invite by email with a role → the invitee signs up/verifies → accepts → sees the org's projects with exactly that role. Proven by SC-E2E-004.

### J6 — Health review (Morgan)

The project dashboard shows pass-rate and duration trends, the flakiest/slowest/most-failing tests, quarantine MTTR, and open quarantines by age. Data can be exported to CSV/JSON. Proven by SC-ANL-001…006.

---

## 4. Functional Requirements (summary)

The authoritative list, with IDs, sprints, and status, is the [feature catalog](feature-catalog.md). Key product rules per area:

| Area | Key rules |
| :--- | :--- |
| **Auth** (FR-AUTH) | Email verification is required before accepting invitations or linking OAuth. Sessions use first-party cookies. Responses never reveal whether an email exists. |
| **Orgs & projects** (FR-ORG) | Roles are org-level (§7 of the master plan). Exactly one Owner, who changes only via transfer. Pending invites count toward the member limit. |
| **API keys** (FR-KEY) | Project-scoped; usable only for ingestion and reading that project's quarantine list; the plaintext is shown once. |
| **Ingestion & reporter** (FR-ING, FR-REP) | Results stream in batches while tests run. Shards of one CI run form one TestPulse run. Retries are idempotent. The reporter **never** changes the CI exit code because of TestPulse. |
| **Dashboard** (FR-DASH, FR-QRY, FR-RT) | Live views patch in place. After any disconnect the UI refetches authoritative state. Stack traces load on demand. |
| **Flaky detection** (FR-FLK) | Signals: retry flake, same-commit disagreement, unstable history on tracked branches. A consistent regression is **never** labeled flaky. |
| **Quarantine** (FR-QUA) | Member+ can quarantine, assign, and close. Reason required to quarantine or dismiss; closing note required to resolve. One open quarantine per test. See §6 for CI semantics. |
| **Annotations** (FR-ANN) | Comments with restricted Markdown; @mentions only resolve to org members. |
| **Notifications** (FR-NOT) | In-app plus email per preferences. SLA escalations are never delayed by digests. Security emails can't be unsubscribed. |
| **Integrations** (FR-GH, FR-WH) | GitHub reporting runs inside CI with `GITHUB_TOKEN`. Webhooks are signed and cannot target private networks. |
| **Analytics** (FR-ANL) | Daily UTC aggregates; exports are authenticated and capped; no public share links. |
| **Plans** (FR-PLAN) | Quotas only (master plan §8). Over-limit UX = friendly modal with contact/waitlist; CI is never affected. |

---

## 5. Status Semantics (must be consistent everywhere)

### 5.1 Test result status (one per test case per run)

| Status | Meaning | Shown as |
| :--- | :--- | :--- |
| `PASSED` | Passed on the first attempt | Green check |
| `FAILED` | Failed on the final attempt | Red ✕ |
| `SKIPPED` | Skipped or not run (annotations such as `test.skip`, `fixme`) | Gray dash |
| `FLAKY` | Failed at least once, then **passed on retry** in the same run | Amber ⚠ "Flaky (passed on retry N)" |

A failed result of a test with an **open quarantine** keeps status `FAILED`, plus a **"Known — quarantined"** label (§6).

### 5.2 Run status

| Status | Meaning |
| :--- | :--- |
| `RUNNING` | At least one shard has started and not all shards have completed |
| `PASSED` | All shards completed and no result is `FAILED` (`FLAKY` and `SKIPPED` allowed) |
| `FAILED` | All shards completed and at least one result is `FAILED`, including quarantined ones. The UI distinguishes "N new failures" from "M known (quarantined)" |
| `CANCELLED` | The reporter reported an interrupted run (e.g. the CI job was cancelled) |
| `TIMED_OUT` | No activity for 30 minutes while `RUNNING` (stale-run reaper) |

### 5.3 Flaky state (per test case)

`STABLE` → `SUSPECTED` → `FLAKY`, and back to `STABLE` after 20 consecutive clean passes on tracked branches. The rules are in Phase 06 and P06-S01. The UI always shows **why** (which signal fired) and **when**.

### 5.4 Quarantine state (per quarantine record)

`ACTIVE` → `INVESTIGATING` → `RESOLVED` | `DISMISSED`. SLA progress is shown as **markers**, not states: *Warned* (80%), *Escalated* (100%), *Overdue* (200%). A closed record is never reopened; quarantining again creates a new record.

---

## 6. Quarantine CI Semantics (closes Open Decision Q1)

**Decision: quarantine is advisory by default, with an opt-in non-blocking mode in the reporter.**

| Aspect | Default (advisory) | Opt-in non-blocking mode (`quarantineMode: "non-blocking"`) |
| :--- | :--- | :--- |
| Customer CI exit code | **Unchanged.** A failing quarantined test still fails the job | If **every** failure in the run belongs to a test with an open quarantine, the reporter marks the run as passed in the test runner (Playwright: `onEnd` status override). Any non-quarantined failure still fails the job |
| Stored result status | `FAILED` | `FAILED` (TestPulse never hides a failure) |
| Run status in TestPulse | `FAILED`, with a "known (quarantined)" breakdown | Same |
| Dashboard | "3 failed — 1 new, 2 known (quarantined)"; quarantined failures grouped separately | Same, plus a "CI unblocked by quarantine" badge on the run |
| GitHub summary / check | Lists new failures first and quarantined failures separately | Same; check run conclusion follows the CI outcome |
| Data source | — | `GET /api/v1/ingest/quarantined-tests`, fetched once at run start (fail-open: if unavailable, behave as advisory) |
| Runner support | All | **Playwright in v1.** Vitest support only if P04-S05 confirms a supported way to override the outcome; otherwise documented as unsupported |

**Rationale:** advisory is safe and predictable: TestPulse never silently turns red builds green. Teams that want quarantine to unblock merges can opt in explicitly, per pipeline, and always see what was unblocked.

**Implications:**
- `TestRun` gains a `quarantinedFailedCount` counter (master plan §5).
- New features FR-QUA-08 (known-failure labeling) and FR-REP-08 (opt-in mode), with scenarios SC-QUA-013, SC-REP-010, and SC-REP-012.

---

## 7. Plans & Limits UX

Limits are defined in master plan §8 (quota-only, no payment flow in v1).

| Situation | User experience |
| :--- | :--- |
| Creating a project or inviting a member beyond the limit | Friendly modal: what the limit is, the current usage, "Contact us / join the Pro waitlist". No raw error text. |
| Monthly run quota at 80% | Dismissible banner for Admin+ on the project dashboard |
| Monthly run quota exceeded | Persistent banner; new runs are rejected (`429 QUOTA_EXCEEDED`); the reporter logs one warning and **CI is unaffected** |
| Retention | Settings show the effective retention (`min(project setting, plan max)`) with an explanation |

---

## 8. Non-Functional Requirements

Adopted from master plan §10 without change: dashboard LCP, real-time latency, WebSocket concurrency, ingestion throughput, API latency, availability, WCAG 2.1 AA, coverage, CI safety, and cross-platform scripts. During the free-tier period, performance targets are verified locally or in CI (master plan §4.4).

Additional product-level expectations:
- **Accessibility:** status is never conveyed by color alone; every key flow works keyboard-only.
- **Time zones:** timestamps are stored in UTC and displayed in the viewer's local time, with UTC on hover. Daily analytics buckets are UTC and labeled as such.
- **Browsers:** current and previous major versions of Chrome, Edge, Firefox, and Safari.
- **Privacy:** product analytics contain no customer content or personal data (growth skill taxonomy).

---

## 9. Out of Scope for v1

As listed in master plan §1 "Non-MVP Exclusions", plus the deferred features in the catalog (FR-NOT-07 quiet hours/volume indicator, FR-ANL-06 public share links). Rationale:

| Excluded | Why |
| :--- | :--- |
| Billing / checkout / feature gating | Validate value before monetizing; quotas suffice for fair use |
| Reporters beyond Playwright/Vitest | Focus on the two runners with the cleanest reporter APIs; the REST API stays open for others |
| Server-side GitHub App | CI-side `GITHUB_TOKEN` covers PR feedback with no stored GitHub credentials |
| AI failure diagnosis, Slack bots, SSO, self-hosting, artifact storage | Significant scope; revisit with design-partner feedback |

---

## 10. Success Metrics (measured from P11-S04 analytics)

| Metric | Definition | v1 target |
| :--- | :--- | :--- |
| Time to first value | Median `first_run_received − user_signed_up` | ≤ 10 minutes |
| Activation | % of new orgs with ≥ 1 run in the first 7 days | ≥ 40% |
| Triage adoption | % of active projects with ≥ 1 quarantine created in 30 days | ≥ 30% |
| Quarantine hygiene | % of quarantines closed within their SLA | ≥ 70% |
| Reliability | Ingestion availability (paid profile) | 99.9% |

These targets are hypotheses to validate with design partners during the private beta (P10-S07); adjust them after.

---

## 11. Open Questions

| Question | Owner | Due |
| :--- | :--- | :--- |
| Vitest outcome override for non-blocking mode — supported API? | `role-backend-engineer` | P04-S05 |
| Paid hosting provider and budget | `role-product-owner` + `role-devops-engineer` | P10-S06 (Q3) |
| Should resolved quarantines auto-suggest closure after N clean runs? | `role-product-owner` | Post-MVP backlog |
