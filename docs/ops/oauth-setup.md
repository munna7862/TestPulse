# OAuth Setup — Google & GitHub

TestPulse signs users in with **Authorization Code + PKCE (S256) + `state`**, implemented in `apps/api` (ADR-005, no Auth.js). Providers are optional: a provider whose client ID **and** secret are not both set is simply unavailable, and users who click it land on the friendly "isn't available" page.

> **Secrets:** client secrets are server-only (`apps/api`). Never commit them, never expose them as `NEXT_PUBLIC_*`, never paste them in tickets. The API sends them to the provider only as HTTP Basic credentials on the token request.

## 1. How the redirect URL is built

The provider redirects the browser back to:

```text
<OAUTH_REDIRECT_BASE_URL or WEB_ORIGIN>/api/v1/auth/oauth/<provider>/callback
```

In the free profile the web app proxies `/api/*` to the API (same-origin rewrite), so the callback goes **through the web origin**. That keeps the state cookie and session cookies first-party (`HttpOnly; Secure; SameSite=Lax`, host-only). `OAUTH_REDIRECT_BASE_URL` is only needed if a deployment calls the API on its own host (paid profile option, decided in P10-S06); leave it unset otherwise.

| Environment | Web origin | Callback URL to register |
| :--- | :--- | :--- |
| Local development | `http://localhost:3000` | `http://localhost:3000/api/v1/auth/oauth/google/callback` and `http://localhost:3000/api/v1/auth/oauth/github/callback` |
| Free-tier staging | `https://<web>.vercel.app` | `https://<web>.vercel.app/api/v1/auth/oauth/<provider>/callback` |
| Production (after P10-S06) | `https://<production domain>` | `https://<production domain>/api/v1/auth/oauth/<provider>/callback` |

The registered URL must match **exactly** (scheme, host, port, path). A mismatch shows up as a provider-side "redirect_uri_mismatch" error page, before TestPulse is involved.

Use **separate OAuth apps per environment** (local, staging, production) so a leaked local secret cannot sign anyone in to production.

## 2. Google

1. Open the [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → OAuth consent screen**. Choose *External*, add the app name and support email, and add the scopes `openid`, `email`, `profile` (all non-sensitive, so no verification review is needed). While in *Testing* mode, add developers as test users.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.**
3. Under **Authorized redirect URIs** add the callback URL(s) from the table above. No JavaScript origins are needed (the server performs the exchange).
4. Copy the client ID and secret into the API environment:

```powershell
GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<secret>
```

TestPulse reads `sub`, `email`, `email_verified`, `name` and `picture` from the OpenID Connect `userinfo` endpoint. The email is only trusted when Google reports `email_verified = true`.

## 3. GitHub

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App** (a GitHub *App* is not required).
2. Set **Homepage URL** to the web origin and **Authorization callback URL** to the callback from the table above (GitHub allows one per OAuth app, which is another reason to use one app per environment).
3. Generate a client secret and set:

```powershell
GITHUB_CLIENT_ID=<client id>
GITHUB_CLIENT_SECRET=<secret>
```

Scopes requested: `read:user` and `user:email`. TestPulse **ignores the profile `email` field** and calls `GET /user/emails`, accepting only the address that is both **primary and verified**. A GitHub account with no verified primary email cannot sign in (the user sees "Your GitHub email isn't verified").

## 4. Environment variables (API)

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | unset | Both required to enable Google |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | unset | Both required to enable GitHub |
| `OAUTH_REDIRECT_BASE_URL` | `WEB_ORIGIN` | Origin used to build the provider callback URL |
| `OAUTH_PROVIDER_TIMEOUT_MS` | `10000` | Upper bound for each outbound provider call (token exchange, profile) |
| `OAUTH_RATE_LIMIT_PER_MINUTE` | `30` | Per-IP limit shared by `/start` and `/callback` (security model §5). Set `TRUST_PROXY=true` behind Render/Vercel so the real client IP is used |

Restart the API after changing credentials. On Render, set them as environment secrets (never in `render.yaml`).

## 5. Sign-in behavior (what to expect)

| Situation | Result |
| :--- | :--- |
| Provider account already linked | Signed in to that user |
| New provider account, provider-verified email, no local user | New verified user created; signed in |
| Provider email matches a local user whose email is **verified** | Provider linked to that user; signed in |
| Provider email matches a local user whose email is **unverified** | Refused (`EMAIL_CONFLICT`): sign in with the existing method, verify the email, then link from **Settings → Profile** |
| Provider email missing or not verified by the provider | Refused (`EMAIL_UNVERIFIED`) |
| User denies consent | "Sign-in cancelled" page |
| `state` missing, wrong, expired (> 10 min) or PKCE verifier mismatch | "This sign-in attempt has expired" page; no session |

After a successful sign-in the browser is redirected to `WEB_ORIGIN` + an **allow-listed** path (`/runs…` or `/settings…`; anything else falls back to `/runs`). No token is ever placed in a URL.

Users can also link and unlink providers from **Settings → Profile → Linked accounts**. The last remaining sign-in method cannot be removed.

## 6. Verifying a configuration manually

No automated test calls a real provider (CI never makes real OAuth requests). After configuring a new environment:

1. Open `/login` and click **Continue with Google** (then GitHub).
2. Approve the consent screen. You should land on `/runs` signed in, and `GET /api/v1/auth/me` should return your email.
3. In **Settings → Profile** confirm the provider shows as linked; disconnect/reconnect works.
4. Click the button, then deny consent: you should see the "Sign-in cancelled" page.

## 7. Troubleshooting

| Symptom | Likely cause |
| :--- | :--- |
| Provider page says `redirect_uri_mismatch` / "redirect URI is not associated" | Registered callback differs from `WEB_ORIGIN`/`OAUTH_REDIRECT_BASE_URL` + path (check scheme, port, trailing slash) |
| "`<Provider>` sign-in isn't available" | Client ID or secret missing for that provider in the API environment |
| "This sign-in attempt has expired" right after approving | The state cookie did not come back: callback hit a different host than `/start`, third-party cookie blocking, or the flow took over 10 minutes |
| "We couldn't complete sign-in" | The API could not exchange the code or load the profile (wrong secret, provider outage, or timeout). Check API logs for `OAuth provider exchange failed` (no secrets are logged) |
| HTTP 429 on `/start` or `/callback` | Per-IP limit exceeded (or `TRUST_PROXY` is off so every user shares the proxy's IP) |
