# 05 — Quarantine Dashboard (Journeys J3, J4)

```text
Quarantine                                  Open (9)  |  Closed (41)        [Export CSV]
[Status ▾ Active, Investigating] [Assignee ▾] [x] Overdue only  [ ] Escalated only  [Search]
┌──┬──────────────────────────────┬──────────────┬──────────┬────────────────────────┬───────┐
│☐ │ Test                         │ Status       │ Assignee │ SLA                    │ Age   │
├──┼──────────────────────────────┼──────────────┼──────────┼────────────────────────┼───────┤
│☐ │ checkout › applies coupon    │ Investigating│ @sam     │ due in 3 d   Warned    │ 11 d  │
│☐ │ auth › refresh rotates       │ Active       │ —        │ ⚠ ESCALATED 2 d over   │ 16 d  │
│☐ │ search › filters results     │ Active       │ @lee     │ ⛔ OVERDUE (review)    │ 30 d  │
└──┴──────────────────────────────┴──────────────┴──────────┴────────────────────────┴───────┘
Selected: 2   [Assign ▾] [Move to Investigating] [Resolve…] [Dismiss…]      (Member+ only)

Bulk result toast:  "Resolved 8 of 10. 2 failed: 'search › filters' (already closed), …"  [Details]
```

- Rows open the test case detail. The **timeline** drawer shows transitions and comments in time order.
- Escalation markers come from the SLA job (Warned / Escalated / Overdue) and are displayed as badges, not statuses.
- **Empty:** "No open quarantines. Flaky tests you quarantine will appear here." with a link to Flaky tests.
- **Viewer:** checkboxes and the bulk bar are hidden.
- **Health strip** (top, P06-S05): Open 9 · Escalated 2 · MTTR 4.2 d · Resolved within SLA 78%.
