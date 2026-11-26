import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function waitForTransitions(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  await waitForTransitions(page);
  const light = await new AxeBuilder({ page }).analyze();
  expect(light.violations).toEqual([]);

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(page.locator("html")).toHaveClass(/dark/);
  await waitForTransitions(page);
  const dark = await new AxeBuilder({ page }).analyze();
  expect(dark.violations).toEqual([]);

  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await waitForTransitions(page);
}

const ok = (data: unknown) => ({ success: true, data });
const ORG_1 = "01950000-0000-7000-8000-000000000001";

test.describe("Accept invitation flow (/invitations/accept)", () => {
  test("[SC-E2E-004] [SC-ORG-011] [SC-ORG-012] [SC-ORG-013] [SC-AUTH-021] [SC-UX-004] [SC-UX-005] handles loading, manual form, returnTo redirects, unverified, wrong-email, error codes, XSS & axe", async ({
    page,
  }) => {
    test.slow();
    const token = "invite-token-valid-123456";
    const hostileOrgName = "<img src=x onerror=alert(1)>";
    let userState: "anon" | "unverified" | "wrong-email" | "verified" = "anon";
    let acceptOutcome: "ok" | "expired" | "revoked" | "invalid" | "conflict" | "rate" = "ok";
    let holdMe = false;
    let releaseMe!: () => void;

    await page.route("**/api/v1/auth/me", async (route) => {
      if (holdMe) {
        await new Promise<void>((r) => {
          releaseMe = r;
        });
      }
      if (userState === "anon") {
        return route.fulfill({
          status: 401,
          json: { success: false, error: { code: "UNAUTHENTICATED", message: "No session" } },
        });
      }
      return route.fulfill({
        json: ok({
          user: {
            id: "01950000-0000-7000-8000-000000000055",
            email: userState === "wrong-email" ? "other@example.com" : "invitee@example.com",
            name: "Sam Invitee",
            emailVerifiedAt: userState === "unverified" ? null : "2026-11-26T00:00:00.000Z",
            createdAt: "2026-11-26T00:00:00.000Z",
          },
        }),
      });
    });

    await page.route("**/api/v1/auth/login", (route) => {
      userState = "verified";
      return route.fulfill({
        json: ok({
          user: {
            id: "01950000-0000-7000-8000-000000000055",
            email: "invitee@example.com",
            name: "Sam Invitee",
            emailVerifiedAt: "2026-11-26T00:00:00.000Z",
            createdAt: "2026-11-26T00:00:00.000Z",
          },
        }),
      });
    });

    await page.route("**/api/v1/auth/resend-verification", (route) =>
      route.fulfill({ status: 202, json: ok({ message: "Verification email sent." }) }),
    );
    await page.route("**/api/v1/auth/logout", (route) => {
      userState = "anon";
      return route.fulfill({ json: ok({ loggedOut: true }) });
    });
    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok([]) }));

    await page.route("**/api/v1/invitations/accept", (route) => {
      if (acceptOutcome === "expired") {
        return route.fulfill({
          status: 400,
          json: { success: false, error: { code: "INVITATION_EXPIRED", message: "Expired" } },
        });
      }
      if (acceptOutcome === "revoked") {
        return route.fulfill({
          status: 400,
          json: { success: false, error: { code: "INVITATION_REVOKED", message: "Revoked" } },
        });
      }
      if (acceptOutcome === "invalid") {
        return route.fulfill({
          status: 400,
          json: { success: false, error: { code: "INVALID_TOKEN", message: "Invalid" } },
        });
      }
      if (acceptOutcome === "conflict") {
        return route.fulfill({ status: 409, json: { success: false, error: { code: "CONFLICT", message: "Used" } } });
      }
      if (acceptOutcome === "rate") {
        return route.fulfill({
          status: 429,
          json: { success: false, error: { code: "RATE_LIMITED", message: "Slow down" } },
        });
      }
      if (userState === "wrong-email") {
        return route.fulfill({
          status: 403,
          json: { success: false, error: { code: "FORBIDDEN", message: "Different email" } },
        });
      }
      return route.fulfill({
        json: ok({
          id: ORG_1,
          name: hostileOrgName,
          slug: "joined-org",
          planTier: "FREE",
          role: "MEMBER",
          createdAt: "2026-10-01T00:00:00.000Z",
        }),
      });
    });

    // 1. Missing token -> manual form + axe
    await page.goto("/invitations/accept");
    await expect(page.getByRole("heading", { name: "Accept invitation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept invitation" })).toBeDisabled();
    await expectNoAxeViolations(page);

    // 2. Signed-out user -> loading state + axe -> anon prompt + axe -> /register?returnTo -> /login?returnTo -> accept
    holdMe = true;
    await page.goto(`/invitations/accept?token=${token}`);
    await expect(page.getByRole("heading", { name: "Accepting invitation" })).toBeVisible();
    await expectNoAxeViolations(page);
    holdMe = false;
    releaseMe();

    await expect(page.getByRole("heading", { name: "Sign in to accept your invitation" })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/register\?returnTo=/);
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    await page.getByLabel("Email address").fill("invitee@example.com");
    await page.getByLabel("Password").fill("ValidPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(new RegExp(`/invitations/accept\\?token=${token}`));
    await expect(page.getByRole("heading", { name: "Invitation accepted!" })).toBeVisible();
    await expect(page.getByText(hostileOrgName)).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem("testpulse-active-org-id"))).toBe(ORG_1);
    await expectNoAxeViolations(page);

    // 3. Unverified account -> resend + verify status check
    userState = "unverified";
    await page.goto(`/invitations/accept?token=${token}`);
    await expect(page.getByRole("heading", { name: "Verify your email first" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Resend verification email" }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText("Verification email sent.");
    userState = "verified";
    await page.getByRole("button", { name: "Check verification status" }).click();
    await expect(page.getByRole("heading", { name: "Invitation accepted!" })).toBeVisible();

    // 4. Wrong email (403) + Sign out switch account -> navigates to /login?returnTo=...
    userState = "wrong-email";
    await page.goto(`/invitations/accept?token=${token}`);
    await expect(page.getByRole("heading", { name: "Wrong account signed in" })).toBeVisible();
    await expect(page.getByText("other@example.com")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Sign out to switch account" }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);

    // 5. Expired, Revoked, Invalid, Conflict, Rate-limited error alerts
    userState = "verified";
    for (const [mode, substr] of [
      ["expired", "expired"],
      ["revoked", "revoked"],
      ["invalid", "invalid"],
      ["conflict", "already been accepted"],
      ["rate", "Too many invitation acceptance attempts"],
    ] as const) {
      acceptOutcome = mode;
      await page.goto(`/invitations/accept?token=${token}`);
      await expect(page.getByRole("main").getByRole("alert")).toContainText(substr);
    }
    await expectNoAxeViolations(page);

    // 6. Hostile returnTo on /login falls back cleanly to /runs
    await page.goto("/login?returnTo=//evil.example/steal");
    await page.getByLabel("Email address").fill("invitee@example.com");
    await page.getByLabel("Password").fill("ValidPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/runs$/);
  });
});
