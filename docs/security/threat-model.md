# Threat Model (STRIDE)

> **Sprint:** P01-S04 · Reviewed again in P03-S06 and P10-S04. The mitigations reference the [security model](security-model.md) and scenario IDs.

## 1. Trust boundaries

```text
[Internet users] ──HTTPS──> [Web (Vercel)] ──/api rewrite──> [API (Fastify)] ──> [PostgreSQL]
[Customer CI]    ──HTTPS + API key──────────────────────────> [API]         ──> [Redis]
[Browsers]       ──WSS + ticket─────────────────────────────> [Gateway]
[API/Workers]    ──HTTPS──> [Customer webhook URLs] (untrusted destinations)
[API]            ──HTTPS──> [OAuth providers, Email provider, Sentry]
```

Untrusted inputs: every HTTP body, header, and query; CI-reported data (titles, errors, stacks, paths); comments; webhook URLs; OAuth profile data.

## 2. STRIDE analysis of critical flows

| # | Flow | Threat (STRIDE) | Scenario | Mitigation | Verified by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T1 | Any tenant read | **I**nformation disclosure | Missing tenant filter returns another org's runs or stack traces | ADR-006 five layers; 404 policy | SC-SEC-001…004 |
| T2 | Ingestion | **S**poofing / **T**ampering | Stolen API key writes fake results; a key for project A targets project B | Hashed keys, revocation, key → project binding, per-key rate limits, audit of key usage (`lastUsedAt`) | SC-KEY-004…007 |
| T3 | OAuth sign-in | **S**poofing | Attacker pre-registers the victim's email, then the victim's OAuth login is linked (account pre-hijacking) | Link only when both emails are verified; email verification required for privileged actions | SC-AUTH-015/016 |
| T4 | Sessions | **S**poofing | Stolen refresh token reused | Rotation + family revocation on reuse; `HttpOnly`; short access TTL | SC-AUTH-008/009 |
| T5 | Cookie mutations | **T**ampering (CSRF) | Cross-site form posts a quarantine change | `SameSite=Lax` + `Origin` check | SC-AUTH-018 |
| T6 | Rendering CI data and comments | **T**ampering / **E**levation (XSS) | `<script>` in a test title, ANSI escape tricks, `javascript:` links in comments | Render as text, strip ANSI, sanitized restricted Markdown, CSP with nonces | SC-SEC-008 |
| T7 | Webhooks | **I**nformation disclosure / **E**levation (SSRF) | Webhook URL targets cloud metadata or internal services; DNS rebinding | https only; DNS resolve + IP block lists at connect time; no redirects; timeouts; response caps | SC-SEC-009 |
| T8 | Webhook consumers | **S**poofing | A third party forges TestPulse events to the customer | HMAC signature over `timestamp.body`, timestamp tolerance, documented verification | SC-WH-002 |
| T9 | Invitations | **E**levation | Forwarded invite link accepted by the wrong person | Token bound to the invited email; verified email must match; single use; 7-day expiry | SC-ORG-011…013 |
| T10 | Role management | **E**levation | Member promotes self; Admin grants Owner | Shared permission map; Owner invariants | SC-ORG-014, SC-ORG-006, SC-ORG-016 |
| T11 | Login / register / reset | **I**nformation disclosure (enumeration), **D**oS (credential stuffing) | Probe which emails exist; brute force | Generic responses with similar timing; per-IP and per-account limits; argon2id | SC-AUTH-002, SC-AUTH-007, SC-AUTH-011, SC-AUTH-017 |
| T12 | Ingestion volume | **D**enial of service | Huge batches or request floods exhaust DB or Redis (worse on free tiers) | 1,000 items / 5 MB caps; rate limits; monthly quotas; gzip limits; reaper | SC-ING-006, SC-KEY-007, SC-ING-013 |
| T13 | WebSocket rooms | **I**nformation disclosure | Joining another org's project room; removed member keeps receiving events | Room membership check; eviction; single-use tickets | SC-RT-001…006 |
| T14 | Logs and errors | **I**nformation disclosure | Tokens, keys, or passwords in logs; DB errors returned to clients | pino redaction; central error mapping | SC-SEC-006 |
| T15 | Exports | **T**ampering (CSV injection) | Formula payload in a test title executes in the viewer's spreadsheet | Prefix dangerous cells with `'` | SC-SEC-010 |
| T16 | Supply chain | **T**ampering | Malicious dependency or leaked secret in the repo | `npm audit --audit-level=high`, gitleaks, Dependabot, lockfile, npm provenance for the reporter | SC-SEC-011 |
| T17 | Audit trail | **R**epudiation | "I didn't revoke that key / change that role" | `AuditEvent` for security-relevant actions; `QuarantineTransition` for triage | SC-SEC-007, SC-QUA-004 |
| T18 | Secrets in CI output | **I**nformation disclosure | Customer test logs include tokens, which are stored in TestPulse | Opt-in reporter redaction; size caps; retention; documentation warnings | SC-REP-009 |

## 3. Top risks (ranked) and owners

| Rank | Risk | Likelihood × Impact | Owner | Primary controls |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Cross-tenant data exposure (T1, T13) | Medium × Critical | Security + Backend | ADR-006, isolation meta-test |
| 2 | Account takeover via auth flaws (T3, T4, T11) | Medium × High | Security + Backend | ADR-005, auth test suite |
| 3 | XSS via untrusted CI content or comments (T6) | Medium × High | Frontend | Text rendering, sanitizer, CSP |
| 4 | SSRF via webhooks (T7) | Medium × High | Backend | Connect-time IP checks |
| 5 | Abuse or DoS exhausting free-tier resources (T12) | High × Medium | Backend + DevOps | Caps, rate limits, quotas, monitoring |

## 4. Out of scope for v1

DDoS beyond provider defaults, insider threats at hosting providers, enterprise compliance programs (SOC 2), and customer-managed encryption keys. Revisit with the paid migration (P10-S06) and enterprise demand.
