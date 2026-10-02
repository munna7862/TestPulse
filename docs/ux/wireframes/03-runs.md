# 03 — Runs (Journey J2)

## Run list (`/runs`)

```text
Runs                                    [Status ▾] [Branch ▾] [Last 7 days ▾] [Search SHA/branch]
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◌ #482 main        a1b2c3d  Running 1,204/1,850   ✕3 (1 new)   4m   [CI ↗]   │  ← live
│ ✓ #480 main        77aa1c0  1,850 ✓ · 2 ⚠ · 12 –   6m 12s  1 h   [CI ↗][Compare]│
│ ✕ #479 main        5d4c3b2  3 ✕ (2 known) · 1,835 ✓ 6m 40s  3 h   [CI ↗][Compare]│
│ ⏱ #478 feat/x      0e9d8c7  Timed out after 30 min idle        5 h            │
└──────────────────────────────────────────────────────────────────────────────┘
                                 (infinite scroll · filters persist in the URL)
```

## Live run detail (`/runs/482`)

```text
Acme › web-app › Runs › #482        main · a1b2c3d · GitHub Actions [CI ↗]    ◌ Running 4m 12s
████████████████░░░░░░░░  1,204 / 1,850 (65%)    ✓ 1,190  ✕ 3  ⚠ 2  – 9   Shards 2/4 done
┌ Failures (pinned) ──────────────────────────────┐┌ Details ─────────────────────────────┐
│ ✕ checkout › applies coupon        NEW   1.2s   ││ checkout › applies coupon             │
│ ✕ auth › refresh rotates      KNOWN 🛡  0.8s    ││ tests/checkout.spec.ts · chromium     │
│ ✕ cart › removes item              NEW   2.0s   ││ Error: expect(received).toBe(…)       │
├ All results (virtualized) ──────────────────────┤│ ┌ stack (text, ANSI stripped) ─────┐ │
│ ✓ home › renders hero              0.4s          ││ │ at checkout.spec.ts:42:17 …      │ │
│ ⚠ search › filters   Flaky (retry 1)  3.1s       ││ └──────────────────────────────────┘ │
│ ✓ …                                              ││ [Copy error] [Open test case →]      │
└──────────────────────────────────────────────────┘│ [Quarantine] (Member+)               │
                                                    └──────────────────────────────────────┘
```

- Results update in place; failures move into the pinned section as they arrive. There is no scroll jumping while the user is reading.
- Details are fetched on demand when a row is selected (never carried in the live event).
- Completion transitions to the static header: "✕ Failed — 1 new, 2 known (quarantined) · 6m 31s". In non-blocking mode, a badge reads "CI unblocked by quarantine".
- States: "Waiting for first results…" (run started, no batches yet) · "Updates paused — reconnecting" · Timed out / Cancelled banner with the last-activity time.

## Compare with previous run (secondary)

A side panel lists "newly failing", "newly passing", and "still failing" tests versus the previous completed run on the same branch.
