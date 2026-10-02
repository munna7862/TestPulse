# 04 — Test Case Detail (Journey J3)

```text
Acme › web-app › Tests › checkout.spec.ts › applies coupon
checkout › cart › applies coupon                     ⚠ FLAKY (score 72)   🛡 Quarantined — Investigating
tests/checkout.spec.ts · project: chromium · tags: @smoke · labels: [payments ✕] [+ label]   [Copy path]

┌ Why flaky? ───────────────────────────────────────────────────────────────────┐
│ • Passed on retry in 3 of the last 10 runs (retry flake)                       │
│ • Same commit 5d4c3b2 both passed and failed (runs #479, #480)                 │
│ Last flaky: 2 h ago                                                            │
└────────────────────────────────────────────────────────────────────────────────┘
┌ History (last 20 · branch: [main ▾]) ─────────────────────────────────────────┐
│ ✓ ✓ ⚠ ✓ ✕ ✓ ✓ ⚠ ✓ ✓ ✕ ✓ ✓ ✓ ⚠ ✓ ✓ ✓ ✕ ✓     (each cell → run; hover = run, date)│
│ Duration  ▁▂▂▃▂▅▂▂▃▂▂▇▂▂▃▂▂▂▃▂   avg 1.1s · p95 2.4s                          │
└────────────────────────────────────────────────────────────────────────────────┘
┌ Latest failure (#482) ─────────────────────────────────────────────────────────┐
│ Error: expect(received).toBe(expected) …            [Copy] [Open run #482 →]   │
└────────────────────────────────────────────────────────────────────────────────┘
┌ Quarantine ────────────────────────────────────────────────────────────────────┐
│ Investigating · assignee @sam · reason "race on coupon API mock"               │
│ SLA: due in 3 days (14-day SLA)  ▓▓▓▓▓▓▓▓▓░░  Warned ✓                          │
│ [Resolve…] [Dismiss…] [Reassign ▾]           Timeline: created → investigating │
└────────────────────────────────────────────────────────────────────────────────┘
┌ Discussion (live) ─────────────────────────────────────────────────────────────┐
│ @quinn · 1 h ago   Looks like the mock server responds late on CI runners.     │
│ @sam   · 20 m ago  Repro'd locally with network throttling, fix in #1234.      │
│ [ Write a comment… (@ to mention, Markdown: **bold**, `code`, links) ] [Post]  │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Not quarantined:** the quarantine panel shows "[Quarantine this test]" (Member+) with a short explanation of what quarantine means (advisory by default, PRD §6).
- **Viewer:** the action buttons and comment box are hidden, replaced by "You have view-only access".
- **Empty history:** "This test has run once so far."
- **Dialogs:** *Quarantine* (reason required, assignee optional, SLA shown) · *Resolve* (closing note required) · *Dismiss* (reason required).
