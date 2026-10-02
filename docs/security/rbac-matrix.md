# RBAC Matrix

> **Sprint:** P01-S04 · Canonical summary: master plan §7. This is the action-level map that becomes `@testpulse/shared/src/permissions.ts` (P03-S04). Routes are in [`docs/api/rest-api.md`](../api/rest-api.md).
> Roles are **organization-level** and apply to all projects in the org. Non-members get **404** for everything in the org. Members below the required role get **403**.

| Action ID | Description | Owner | Admin | Member | Viewer |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `org.read` | View org, members list, usage | ✅ | ✅ | ✅ | ✅ |
| `org.update` | Rename org, org settings | ✅ | ✅ | ❌ | ❌ |
| `org.delete` | Delete org | ✅ | ❌ | ❌ | ❌ |
| `org.transferOwnership` | Transfer to an existing Admin | ✅ | ❌ | ❌ | ❌ |
| `org.audit.read` | View audit log | ✅ | ✅ | ❌ | ❌ |
| `member.invite` | Create, resend, revoke invitations | ✅ | ✅ | ❌ | ❌ |
| `member.changeRole` | Change role among Admin, Member, Viewer (never to or from Owner) | ✅ | ✅ | ❌ | ❌ |
| `member.remove` | Remove another member (never the Owner) | ✅ | ✅ | ❌ | ❌ |
| `member.leave` | Leave the org (Owner must transfer first) | ❌ | ✅ | ✅ | ✅ |
| `project.read` | View project, runs, results, tests, flaky, quarantines, analytics | ✅ | ✅ | ✅ | ✅ |
| `project.create` | Create a project (plan limit applies) | ✅ | ✅ | ❌ | ❌ |
| `project.update` | Edit settings (SLA, retention, flaky thresholds, tracked branches) | ✅ | ✅ | ❌ | ❌ |
| `project.delete` | Delete a project | ✅ | ✅ | ❌ | ❌ |
| `apiKey.manage` | Create, list, revoke API keys | ✅ | ✅ | ❌ | ❌ |
| `webhook.manage` | Webhook CRUD, rotate secret, test, redeliver | ✅ | ✅ | ❌ | ❌ |
| `notificationDefaults.manage` | Project notification defaults | ✅ | ✅ | ❌ | ❌ |
| `quarantine.create` | Quarantine a test | ✅ | ✅ | ✅ | ❌ |
| `quarantine.transition` | Move to Investigating, resolve, dismiss, assign (incl. bulk) | ✅ | ✅ | ✅ | ❌ |
| `annotation.create` | Comment, @mention | ✅ | ✅ | ✅ | ❌ |
| `annotation.editOwn` | Edit or delete own comments | ✅ | ✅ | ✅ | ❌ |
| `annotation.deleteAny` | Delete anyone's comment (moderation) | ✅ | ✅ | ❌ | ❌ |
| `label.manage` | Apply or remove labels on test cases | ✅ | ✅ | ✅ | ❌ |
| `export.read` | CSV/JSON exports | ✅ | ✅ | ✅ | ✅ |
| `realtime.joinProject` | Join a project room | ✅ | ✅ | ✅ | ✅ |

**Self-service (any authenticated user, not tenant-scoped):** own profile, own sessions, linked accounts, notification preferences, notifications, theme.

**API key (machine actor):** `ingest.write` and `ingest.readQuarantine` for its own project only. It has no other permissions and never inherits a user role.

## Rules

1. **Owner invariants:** exactly one Owner per org. The Owner role changes only through `org.transferOwnership` (the previous Owner becomes Admin).
2. **Assignee eligibility:** quarantine assignees must be Members or above in the project's org.
3. **Escalation recipients:** "project admins" means all org members with the Owner or Admin role.
4. **Removal side effects:** a removed member's sessions remain valid for other orgs. Their quarantine assignments in this org are unassigned, and their sockets are evicted from this org's rooms.
5. **UI parity:** the UI hides or disables controls using the same `can(role, action)` function. The API remains the enforcement point.

## Test mapping

- SC-ORG-016: every cell of this table is asserted by a unit test of the permission map.
- SC-SEC-002: every route is exercised with each role below its minimum → 403.
