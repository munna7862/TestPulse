# Information Architecture & Route Map

> **Sprint:** P01-S02 · **Owners:** `role-product-owner`, `role-frontend-engineer` · **Status:** Draft for review (2026-10)
> Wireframes for each screen are in [`wireframes/`](wireframes/README.md). Product rules come from the [PRD](../product/prd.md).

## 1. Navigation model

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Header: [Org ▾] / [Project ▾]   breadcrumbs …      ● Live   🔔 3   (avatar)│
├──────────────┬─────────────────────────────────────────────────────────────┤
│ Sidebar      │                                                             │
│  Overview    │   Page content                                              │
│  Runs        │                                                             │
│  Tests       │                                                             │
│  Flaky       │                                                             │
│  Quarantine  │                                                             │
│  Analytics   │                                                             │
│  ─────────   │                                                             │
│  Settings    │                                                             │
│  (Getting    │                                                             │
│   started ✓) │                                                             │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

- **Two-level context:** org switcher, then project switcher, both in the header. Everything under the sidebar is project-scoped. Org settings and account settings are reached from the switcher and avatar menus.
- **Breadcrumbs:** `Org › Project › Section › Item` (e.g. `Acme › web-app › Runs › #482`).
- **Connection pill** (Live / Connecting / Reconnecting / Offline) and **notification bell** sit in fixed header slots (from P02-S06).
- **Getting-started checklist** stays in the sidebar until all steps are done (or dismissed).
- **Keyboard:** `g o` Overview · `g r` Runs · `g t` Tests · `g q` Quarantine · `/` search · `?` shortcut help.

## 2. Route map (web)

URLs use **slugs** for readability. The web app resolves slugs to IDs via the API; API routes always use IDs (see [`docs/api/rest-api.md`](../api/rest-api.md)).

### Public

| Route | Screen | Notes |
| :--- | :--- | :--- |
| `/` | Landing page | P11-S01 |
| `/pricing` | Pricing | Generated from shared plan limits |
| `/docs/*` | Docs portal | P11-S02 |
| `/signup`, `/login` | Auth | Email/password + Google/GitHub buttons |
| `/verify-email?token=` | Email verification result | |
| `/forgot-password`, `/reset-password?token=` | Password reset | Generic messages |
| `/invite?token=` | Invitation acceptance | Asks the user to sign in or sign up with the invited email |
| `/auth/error?code=` | OAuth error | Friendly message per code |

### App (authenticated)

| Route | Screen | Min role | Sprint |
| :--- | :--- | :--- | :--- |
| `/onboarding` | Create org → create project → API key → reporter snippet | — | P03-S03, P03-S05 |
| `/o/[org]` | Redirect to the last-used project, or the project list | Viewer | P03-S03 |
| `/o/[org]/projects` | Project list + create (Admin+) | Viewer | P03-S03 |
| `/o/[org]/p/[project]` | **Project overview** (live runs, health cards) | Viewer | P05-S04, P06-S05, P08 |
| `/o/[org]/p/[project]/runs` | Run list | Viewer | P05-S04 |
| `/o/[org]/p/[project]/runs/[runNumber]` | Run detail (live or completed) | Viewer | P05-S03 |
| `/o/[org]/p/[project]/tests` | Test case list (search, filters, labels) | Viewer | P04-S03, P05-S05 |
| `/o/[org]/p/[project]/tests/[testCaseId]` | Test case detail | Viewer | P05-S05, P06 |
| `/o/[org]/p/[project]/flaky` | Flaky tests | Viewer | P06-S01 |
| `/o/[org]/p/[project]/quarantine` | Quarantine dashboard | Viewer | P06-S04 |
| `/o/[org]/p/[project]/analytics` | Trends, leaderboards, MTTR, exports | Viewer | P08 |
| `/o/[org]/p/[project]/settings` | General · Detection & SLA · Retention | Viewer (read) / Admin (edit) | P03-S03, P06 |
| `/o/[org]/p/[project]/settings/api-keys` | API keys | Admin | P03-S05 |
| `/o/[org]/p/[project]/settings/webhooks` | Webhooks + delivery log | Admin | P07-S05 |
| `/o/[org]/p/[project]/settings/notifications` | Project notification defaults | Admin | P07-S03 |
| `/o/[org]/settings` | Org general · Danger zone (Owner) | Viewer (read) / Admin | P03-S03 |
| `/o/[org]/settings/members` | Members + invitations | Viewer (read) / Admin | P03-S04 |
| `/o/[org]/settings/usage` | Plan, quotas, usage | Viewer | P04-S06 |
| `/account` | Profile · Security (sessions, linked accounts) · Theme | — | P03, P09-S02 |
| `/account/notifications` | Personal notification preferences | — | P07-S03 |
| `/notifications` | Full notification list | — | P07-S01 |

Cross-tenant or unknown IDs render the **404** page (matching the API's 404 policy), never a "forbidden" page that would reveal existence.

## 3. Screen inventory & required states

Every screen implements every applicable state. `R/O` is the Viewer read-only state; `Limit` is the plan-limit / over-quota state.

| Screen | Loading | Empty | Error | R/O | Limit | Live | Waking |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Onboarding | ✓ | — | ✓ | — | ✓ (project limit) | — | ✓ |
| Project overview | ✓ skeleton cards | ✓ "No runs yet — set up the reporter" | ✓ | ✓ | ✓ banner | ✓ | ✓ |
| Run list | ✓ | ✓ | ✓ | ✓ | ✓ banner | ✓ new runs | ✓ |
| Run detail | ✓ | ✓ "Waiting for first results…" | ✓ | ✓ | — | ✓ streaming | ✓ |
| Test case list | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Test case detail | ✓ | ✓ (no history) | ✓ | ✓ (actions hidden) | — | ✓ comments, quarantine | ✓ |
| Flaky tests | ✓ | ✓ "No flaky tests detected 🎉" | ✓ | ✓ | — | ✓ | ✓ |
| Quarantine dashboard | ✓ | ✓ | ✓ | ✓ (bulk bar hidden) | — | ✓ | ✓ |
| Analytics | ✓ chart skeletons | ✓ "Not enough data yet" | ✓ | ✓ | — | refresh on run completion | ✓ |
| Settings pages | ✓ | ✓ (no keys / webhooks) | ✓ | ✓ (disabled form + hint) | ✓ (members) | — | ✓ |
| Notifications | ✓ | ✓ "You're all caught up" | ✓ | — | — | ✓ | ✓ |

**Waking:** in the free deployment profile, the first request after idle can take ~30–60 s. Show "Waking up the server…" with a spinner and retry, never an error page (FR-DASH-04).

## 4. Golden path & onboarding checklist (J1, target ≤ 10 min)

| Step | Screen | Est. time | Checklist item |
| :--- | :--- | :--- | :--- |
| 1 | `/signup` → verify email | 1–2 min | ✓ Account created |
| 2 | `/onboarding`: org name → project name | 1 min | ✓ Create your project |
| 3 | API key generated in onboarding; snippet shown with copy buttons (`npm i -D @testpulse/reporter`, config lines, CI secret name) | 2 min | ✓ Connect CI |
| 4 | User commits the config and pushes | 2–3 min | — |
| 5 | Project overview shows "Waiting for your first run…", which turns into the live run automatically | 1–2 min | ✓ First run received 🎉 |
| 6 | Optional: invite a teammate | 1 min | ✓ Invite your team |

Estimated total: **7–10 minutes**. P11-S02 measures this with real users (SC-GTM-002).

## 5. Notification center

- The bell shows the unread count (capped at "99+"). Clicking it opens a popover with the latest 20 notifications, grouped as Today / Earlier, with "Mark all read".
- Each item shows an icon by type, a one-line title, a project label, and relative time; clicking it opens `linkPath` and marks it read.
- New notifications arrive live (`notification:new`). A polite live region announces "New notification: …" at most once every 10 s.
- "View all" opens `/notifications` (filter: unread / all / by project). Settings links to `/account/notifications`.

## 6. Responsive behavior

| Breakpoint | Layout |
| :--- | :--- |
| ≥ 1280 px (desktop) | Full sidebar, multi-column overview cards, side-by-side run detail (list + details panel) |
| 768–1279 px (tablet) | Collapsible icon sidebar; details panel becomes a slide-over; tables keep key columns |
| < 768 px (mobile, read-mostly) | Bottom tab bar (Overview, Runs, Quarantine, Notifications); tables become stacked cards; monitoring and commenting supported; bulk actions and settings editing show a "use a larger screen" hint |

## 7. Visual language for status (shared tokens, P02-S06)

| Meaning | Icon | Color token | Label |
| :--- | :--- | :--- | :--- |
| Passed | ✓ check | `status-passed` | "Passed" |
| Failed (new) | ✕ cross | `status-failed` | "Failed" |
| Failed (known/quarantined) | ✕ with shield | `status-quarantined` | "Known — quarantined" |
| Flaky result | ⚠ triangle | `status-flaky` | "Flaky (passed on retry)" |
| Skipped | – dash | `status-skipped` | "Skipped" |
| Running | ◌ spinner/pulse | `status-running` | "Running" |
| Timed out / cancelled | ⏱ / ⦸ | `status-neutral` | "Timed out" / "Cancelled" |

Icon + label are always present; color is never the only signal.
