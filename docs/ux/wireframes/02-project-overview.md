# 02 — Project Overview (Journeys J2, J6)

Answers the four dashboard questions: what is running now, how healthy the suite is, what just failed, and whether a failure is new or known.

```text
Acme › web-app › Overview                                         ● Live   🔔 2
┌ Running now ───────────────────────────────────────────────────────────────┐
│ ◌ #482  main · a1b2c3d  ████████████░░░░░░  1,204 / 1,850   ✕ 3 (1 new)  [Open]│
│ ◌ #481  feat/login · 9f8e7d6   ███░░░░░░░  310 / 1,850       ✓ 0 failed  [Open]│
└────────────────────────────────────────────────────────────────────────────┘
┌ Pass rate (30d) ─┐ ┌ Flaky tests ─────┐ ┌ Open quarantines ┐ ┌ Runs this month ┐
│ 96.8%  ▲ 1.2 pts │ │ 14  (▲ 2 new)    │ │ 9 · 2 escalated  │ │ 212 / 500 (Free)│
│ ▁▂▃▅▆▆▇ sparkline│ │ View →           │ │ MTTR 4.2 d  →    │ │ Usage →         │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └─────────────────┘
┌ Recent failures (new first) ───────────────────────────────────────────────┐
│ ✕ checkout › applies coupon        #482  NEW        2 min ago   [Details] │
│ ✕ auth › refresh token rotates     #482  KNOWN 🛡    2 min ago   [Details] │
│ ⚠ search › filters results         #480  FLAKY (passed on retry)           │
└────────────────────────────────────────────────────────────────────────────┘
┌ Recent runs ──────────────────────────────────────────── View all runs → ──┐
│ ✓ #480 main  1,850 passed · 2 flaky · 6m 12s · 1 h ago                     │
│ ✕ #479 main  3 failed (2 known) · 6m 40s · 3 h ago                         │
└────────────────────────────────────────────────────────────────────────────┘
```

States:
- **Empty:** the "Waiting for your first run" panel (01-onboarding).
- **Loading:** skeleton cards.
- **Over quota:** a banner above "Running now" ("Monthly run limit reached — new runs aren't being recorded. Contact us…").
- **Viewer:** identical view; no actions are hidden here because the overview has none that need write access.
- **Offline:** the header pill shows Reconnecting/Offline; live sections show "Updates paused".
