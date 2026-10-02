# 06 — Settings & Global States

## Project settings › API keys (Admin+)

```text
API keys                                                        [+ Create key]
┌──────────────┬──────────────┬────────────┬─────────────┬─────────┐
│ Name         │ Key          │ Created by │ Last used   │         │
├──────────────┼──────────────┼────────────┼─────────────┼─────────┤
│ github-ci    │ tp_live_8f2c…│ @quinn     │ 4 min ago   │ [Revoke]│
│ nightly      │ tp_live_1a9d…│ @quinn     │ 3 days ago  │ [Revoke]│
└──────────────┴──────────────┴────────────┴─────────────┴─────────┘
Create → dialog shows the full key ONCE + reporter snippet + "I've stored it" confirm.
Revoke → confirm dialog: "CI jobs using this key will stop reporting immediately."
```

## Project settings › Detection & SLA (Viewer read-only, Admin edit)

```text
Quarantine SLA        ( ) 7  (•) 14  ( ) 30  ( ) 60 days
Flaky detection       Window [10] runs   Threshold [3] transitions   Tracked branches [main ✕][+]
Retention             [30] days → effective 7 days on the Free plan  ⓘ
[Save]                (disabled for Viewer/Member: "Only admins can change these settings")
```

## Org settings › Members (Admin+ manage, others read)

```text
Members (3 of 3 on Free)                                        [+ Invite]
@quinn  Owner      —
@sam    Admin  ▾   [Remove]
@lee    Member ▾   [Remove]
Pending: morgan@acme.com  Viewer  expires in 6 d   [Resend] [Revoke]
```

## Plan-limit modal (403 PLAN_LIMIT_REACHED)

```text
┌ You've reached the Free plan limit ─────────────────────────────┐
│ Free includes 2 projects per organization. You're using 2.       │
│ Pro gives unlimited projects, 25 members, 10,000 runs/month.     │
│ Paid plans are coming soon.                                      │
│ [Contact us]  [Join the Pro waitlist]          [Not now]         │
└──────────────────────────────────────────────────────────────────┘
```

## Global states

```text
Waking (free tier)  ┌───────────────────────────────────────────────┐
                    │ ◌ Waking up the server… this can take ~1 min.  │
                    │   (automatic retry — no action needed)         │
                    └───────────────────────────────────────────────┘
Reconnecting        Header pill: ● Reconnecting… ; live panels: "Updates paused"
Degraded (polling)  Banner: "Live updates unavailable — refreshing every 5 s."  [Retry live]
Error               "Something went wrong loading runs. [Try again]  (ref: req_8a7f…)"
404                 "We couldn't find that page." (also used for other tenants' resources)
Over quota          Banner: "Monthly run limit reached — new runs aren't recorded until <date>."
Read-only           Inline hint where actions would be: "You have view-only access."
```
