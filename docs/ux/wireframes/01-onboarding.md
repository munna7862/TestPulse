# 01 — Sign-up & Onboarding (Journey J1)

## Sign up

```text
┌──────────────────────────────── TestPulse ───────────────────────────────┐
│                    See your tests. In real time.                          │
│  [ Continue with GitHub ]   [ Continue with Google ]                      │
│  ───────────────────────────── or ───────────────────────────────         │
│  Work email   [______________________]                                    │
│  Password     [______________________]  (min. 10 characters)              │
│  [ Create account ]                                                       │
│  Already have an account? Log in                                          │
└──────────────────────────────────────────────────────────────────────────┘
After submit (always the same message): "Check your inbox to verify your email."
```

## Onboarding wizard (`/onboarding`)

```text
Step 1 of 3 ● ○ ○   Name your organization
  Organization name  [ Acme Inc            ]   URL: testpulse.app/o/acme
  [ Continue ]

Step 2 of 3 ● ● ○   Create your first project
  Project name   [ web-app ]     Default branch [ main ]
  [ Create project ]
  (Plan limit reached → modal from 06-settings-and-states.md)

Step 3 of 3 ● ● ●   Connect your CI                        Runner: (•) Playwright ( ) Vitest
  1. Install            npm i -D @testpulse/reporter                         [Copy]
  2. Add the reporter   playwright.config.ts                                 [Copy]
       reporter: [['list'], ['@testpulse/reporter']],
  3. Add a CI secret    TESTPULSE_API_KEY = tp_live_8f2c…  (shown once)      [Copy]
       ⚠ Store it now — you won't be able to see this key again.
  [ I've pushed my changes → ]          Skip for now
```

## Waiting for the first run (project overview, empty state)

```text
┌ Waiting for your first run… ◌ ──────────────────────────────────────────┐
│ We'll switch to the live view automatically when your CI starts.         │
│ Checklist:  ✓ Project created   ✓ API key created   ◌ First run received │
│ Not seeing anything after a few minutes?  Troubleshooting guide →         │
└──────────────────────────────────────────────────────────────────────────┘
```

States: loading (skeleton steps) · error (inline, retry) · waking (free tier: "Waking up the server…").
