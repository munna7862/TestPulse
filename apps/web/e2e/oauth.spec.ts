import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * OAuth web UI (P03-S02). No real provider or API is contacted: the API's `/api/v1/...` responses and the
 * provider's consent screen are mocked with Playwright routing. Server-side OAuth behavior is covered by
 * `apps/api/test/auth/oauth.int.test.ts` (MSW-mocked providers against a real database).
 */

async function expectNoAxeViolations(page: Page): Promise<void> {
  const light = await new AxeBuilder({ page }).analyze();
  expect(light.violations).toEqual([]);

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(250);
  const dark = await new AxeBuilder({ page }).analyze();
  expect(dark.violations).toEqual([]);
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
}

const ok = (data: unknown) => ({ success: true, data });

const linkedAccountsRoute = "**/api/v1/me/oauth-accounts";

test.describe("OAuth: social sign-in buttons", () => {
  for (const path of ["/login", "/register"]) {
    test(`[SC-AUTH-026] ${path} shows Google and GitHub buttons that start the API flow`, async ({ page }) => {
      await page.goto(path);

      const google = page.getByRole("link", { name: "Continue with Google" });
      const github = page.getByRole("link", { name: "Continue with GitHub" });
      await expect(google).toBeVisible();
      await expect(github).toBeVisible();
      await expect(google).toHaveAttribute("href", "/api/v1/auth/oauth/google/start");
      await expect(github).toHaveAttribute("href", "/api/v1/auth/oauth/github/start");

      await expectNoAxeViolations(page);
    });
  }

  test("[SC-AUTH-026] the email form still works alongside the social buttons", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in to TestPulse");
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});

test.describe("OAuth: mocked provider journeys", () => {
  async function mockProvider(page: Page, callbackTarget: { approved: string; denied: string }) {
    // API + provider: /start hands the browser to the (mock) provider consent screen. The consent screen
    // is served directly because Chromium does not re-run route handlers for a fulfilled redirect target.
    await page.route("**/api/v1/auth/oauth/github/start", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<!doctype html><html lang="en"><head><title>Mock provider</title></head><body>
          <main><h1>Authorize TestPulse?</h1>
          <a href="/api/v1/auth/oauth/github/callback?code=mock-code&state=mock-state">Approve</a>
          <a href="/api/v1/auth/oauth/github/callback?error=access_denied&state=mock-state">Deny</a></main>
        </body></html>`,
      }),
    );
    // API: /callback redirects back into the web app.
    await page.route("**/api/v1/auth/oauth/github/callback**", (route) => {
      const denied = new URL(route.request().url()).searchParams.get("error") === "access_denied";
      return route.fulfill({
        status: 302,
        headers: { location: denied ? callbackTarget.denied : callbackTarget.approved },
      });
    });
  }

  test("[SC-AUTH-026] approving at the provider lands on the app", async ({ page }) => {
    await mockProvider(page, {
      approved: "/runs",
      denied: "/oauth/error?code=ACCESS_DENIED&provider=github",
    });

    await page.goto("/login");
    await page.getByRole("link", { name: "Continue with GitHub" }).click();
    await expect(page.getByRole("heading", { name: "Authorize TestPulse?" })).toBeVisible();
    await page.getByRole("link", { name: "Approve" }).click();

    await page.waitForURL("**/runs");
    await expect(page.getByRole("heading", { level: 1, name: "Test Runs" })).toBeVisible();
    // No token or code ever appears in the final URL.
    expect(page.url()).not.toMatch(/token|code=|state=/);
  });

  test("[SC-AUTH-026] denying at the provider shows the friendly error page", async ({ page }) => {
    await mockProvider(page, {
      approved: "/runs",
      denied: "/oauth/error?code=ACCESS_DENIED&provider=github",
    });

    await page.goto("/login");
    await page.getByRole("link", { name: "Continue with GitHub" }).click();
    await page.getByRole("link", { name: "Deny" }).click();

    await page.waitForURL("**/oauth/error**");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign-in cancelled");
    await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
  });
});

test.describe("OAuth: error page", () => {
  const cases: Array<{ query: string; title: string; text: RegExp; secondary?: boolean }> = [
    { query: "code=ACCESS_DENIED&provider=google", title: "Sign-in cancelled", text: /cancelled the request/ },
    {
      query: "code=INVALID_STATE&provider=google",
      title: "This sign-in attempt has expired",
      text: /within 10 minutes/,
    },
    {
      query: "code=PROVIDER_ERROR&provider=github",
      title: "We couldn't complete sign-in with GitHub",
      text: /try again in a moment/,
    },
    {
      query: "code=PROVIDER_NOT_CONFIGURED&provider=google",
      title: "Google sign-in isn't available",
      text: /hasn't turned on/,
    },
    {
      query: "code=EMAIL_UNVERIFIED&provider=github",
      title: "Your GitHub email isn't verified",
      text: /verified/,
    },
    {
      query: "code=EMAIL_CONFLICT&provider=google",
      title: "An account with this email already exists",
      text: /link Google from Settings/,
    },
    {
      query: "code=ACCOUNT_ALREADY_LINKED&provider=github",
      title: "That GitHub account can't be linked",
      text: /already connected/,
      secondary: true,
    },
    { query: "code=ACCOUNT_DISABLED", title: "This account is unavailable", text: /deactivated/ },
  ];

  for (const { query, title, text, secondary } of cases) {
    test(`[SC-AUTH-026] ${query} shows a friendly message and passes axe`, async ({ page }) => {
      await page.goto(`/oauth/error?${query}`);

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.getByRole("main").getByRole("alert")).toContainText(text);
      await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
      if (secondary) {
        await expect(page.getByRole("link", { name: "Go to profile settings" })).toHaveAttribute(
          "href",
          "/settings/profile",
        );
      }
      await expectNoAxeViolations(page);
    });
  }

  test("[SC-AUTH-026] unknown or hostile query values show the generic message and are never rendered", async ({
    page,
  }) => {
    await page.goto("/oauth/error?code=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E&provider=gitlab");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't sign you in");
    await expect(page.locator("img")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("onerror");
    await expectNoAxeViolations(page);
  });

  test("[SC-AUTH-026] a missing code shows the generic message", async ({ page }) => {
    await page.goto("/oauth/error");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't sign you in");
  });
});

test.describe("OAuth: linked accounts in profile settings", () => {
  test("[SC-AUTH-026] /settings redirects to the profile page", async ({ page }) => {
    await page.route(linkedAccountsRoute, (route) => route.fulfill({ json: ok({ accounts: [], hasPassword: true }) }));
    await page.goto("/settings");
    await page.waitForURL("**/settings/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Profile settings" })).toBeVisible();
  });

  test("[SC-AUTH-026] shows a loading state, then the empty state with connect buttons", async ({ page }) => {
    await page.route(linkedAccountsRoute, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({ json: ok({ accounts: [], hasPassword: true }) });
    });

    await page.goto("/settings/profile");
    await expect(page.getByTestId("linked-accounts-loading")).toBeVisible();
    await expectNoAxeViolations(page);

    await expect(page.getByText("No social accounts are linked yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect GitHub" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("[SC-AUTH-026] shows linked accounts, supports disconnecting, and refreshes the list", async ({ page }) => {
    let accounts = [{ id: "acc-1", provider: "github", createdAt: "2026-10-01T10:00:00.000Z" }];
    let deleted: string | undefined;
    await page.route(linkedAccountsRoute, (route) => route.fulfill({ json: ok({ accounts, hasPassword: true }) }));
    await page.route("**/api/v1/me/oauth-accounts/acc-1", async (route) => {
      expect(route.request().method()).toBe("DELETE");
      deleted = "acc-1";
      accounts = [];
      await route.fulfill({ json: ok({ unlinked: true }) });
    });

    await page.goto("/settings/profile");
    await expect(page.getByRole("button", { name: "Disconnect GitHub" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Google" })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Disconnect GitHub" }).click();
    await expect(page.getByRole("button", { name: "Connect GitHub" })).toBeVisible();
    expect(deleted).toBe("acc-1");
  });

  test("[SC-AUTH-026] explains why the last sign-in method cannot be removed", async ({ page }) => {
    await page.route(linkedAccountsRoute, (route) =>
      route.fulfill({
        json: ok({
          accounts: [{ id: "acc-9", provider: "google", createdAt: "2026-10-01T10:00:00.000Z" }],
          hasPassword: false,
        }),
      }),
    );
    await page.route("**/api/v1/me/oauth-accounts/acc-9", (route) =>
      route.fulfill({
        status: 409,
        json: {
          success: false,
          error: { code: "CONFLICT", message: "You cannot remove your only way to sign in." },
        },
      }),
    );

    await page.goto("/settings/profile");
    await expect(page.getByText("You sign in only with social accounts.")).toBeVisible();
    await page.getByRole("button", { name: "Disconnect Google" }).click();

    await expect(page.getByRole("main").getByRole("alert")).toContainText("only way to sign in");
    await expect(page.getByRole("button", { name: "Disconnect Google" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("[SC-AUTH-026] connecting starts the provider flow", async ({ page }) => {
    await page.route(linkedAccountsRoute, (route) => route.fulfill({ json: ok({ accounts: [], hasPassword: true }) }));
    await page.route("**/api/v1/me/oauth-accounts/github/link", (route) => {
      expect(route.request().method()).toBe("POST");
      return route.fulfill({ json: ok({ authorizationUrl: "http://localhost:3000/mock-provider/link" }) });
    });
    await page.route("**/mock-provider/link", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>Mock</title><h1>Provider</h1>",
      }),
    );

    await page.goto("/settings/profile");
    await page.getByRole("button", { name: "Connect GitHub" }).click();
    await page.waitForURL("**/mock-provider/link");
    await expect(page.getByRole("heading", { name: "Provider" })).toBeVisible();
  });

  test("[SC-AUTH-026] shows a success notice after returning from a link flow", async ({ page }) => {
    await page.route(linkedAccountsRoute, (route) =>
      route.fulfill({
        json: ok({
          accounts: [{ id: "acc-1", provider: "github", createdAt: "2026-10-01T10:00:00.000Z" }],
          hasPassword: true,
        }),
      }),
    );
    await page.goto("/settings/profile?linked=github");
    await expect(page.getByRole("status").filter({ hasText: "GitHub is now linked" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("[SC-AUTH-026] shows an error state with retry when the list cannot load", async ({ page }) => {
    let calls = 0;
    await page.route(linkedAccountsRoute, (route) => {
      calls += 1;
      if (calls === 1) {
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Something went wrong" } },
        });
      }
      return route.fulfill({ json: ok({ accounts: [], hasPassword: true }) });
    });

    await page.goto("/settings/profile");
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Something went wrong");
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("button", { name: "Connect Google" })).toBeVisible();
  });
});
