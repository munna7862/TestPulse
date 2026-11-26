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
const PROJ_1 = "01950000-0000-7000-8000-000000000101";

test.describe("Accept invitation flow (/invitations/accept)", () => {
  test("[SC-E2E-004] [SC-ORG-011] [SC-ORG-012] [SC-ORG-013] [SC-AUTH-021] [SC-UX-004] [SC-UX-005] handles manual token submit, signup/login returnTo & error states, single-accept, verification, wrong email, workspace landing, error codes, XSS & axe", async ({
    page,
  }) => {
    test.slow();
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    const token = "invite-token-valid-123456";
    const manualToken = "manual-token-000123";
    const hostileOrgName = "<img src=x onerror=alert(1)>";
    let userState: "anon" | "unverified" | "wrong-email" | "verified" = "anon";
    let meFails = false;
    let registerFails = true;
    let loginFails = true;
    let resendFails = true;
    let logoutFails = true;
    let acceptOutcome: "ok" | "expired" | "revoked" | "invalid" | "conflict" | "rate" | "unverified-api" = "ok";
    let joinedOrgActive = false;
    let holdMe = false;
    let releaseMe!: () => void;
    const acceptRequests: Array<{ token: string }> = [];

    const orgDto = {
      id: ORG_1,
      name: hostileOrgName,
      slug: "joined-org",
      planTier: "FREE" as const,
      role: "VIEWER" as const,
      createdAt: "2026-10-01T00:00:00.000Z",
    };

    await page.route("**/api/v1/auth/me", async (route) => {
      if (holdMe) {
        await new Promise<void>((r) => {
          releaseMe = r;
        });
      }
      if (meFails) {
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Me error" } },
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

    await page.route("**/api/v1/auth/register", (route) => {
      if (registerFails) {
        registerFails = false;
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Register outage" } },
        });
      }
      return route.fulfill({ status: 202, json: ok({ registered: true, message: "Verification email sent." }) });
    });

    await page.route("**/api/v1/auth/login", (route) => {
      if (loginFails) {
        loginFails = false;
        return route.fulfill({
          status: 401,
          json: { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } },
        });
      }
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

    await page.route("**/api/v1/auth/resend-verification", (route) => {
      if (resendFails) {
        resendFails = false;
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Mail down" } },
        });
      }
      return route.fulfill({ status: 202, json: ok({ message: "Verification email sent." }) });
    });

    await page.route("**/api/v1/auth/logout", (route) => {
      userState = "anon";
      if (logoutFails) {
        logoutFails = false;
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Logout hiccup" } },
        });
      }
      return route.fulfill({ json: ok({ loggedOut: true }) });
    });

    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok(joinedOrgActive ? [orgDto] : []) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) =>
      route.fulfill({
        json: ok([
          {
            id: PROJ_1,
            orgId: ORG_1,
            name: "Joined API",
            slug: "joined-api",
            description: null,
            defaultBranch: "main",
            slaDays: 14,
            retentionDays: 30,
            flakyWindow: 10,
            flakyThreshold: 3,
            trackedBranches: ["main"],
            role: "VIEWER",
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-01T00:00:00.000Z",
          },
        ]),
      }),
    );

    await page.route("**/api/v1/invitations/accept", (route) => {
      const body = route.request().postDataJSON() as { token: string };
      acceptRequests.push(body);
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
      if (acceptOutcome === "unverified-api") {
        return route.fulfill({
          status: 403,
          json: { success: false, error: { code: "EMAIL_NOT_VERIFIED", message: "Verify first" } },
        });
      }
      if (userState === "wrong-email") {
        return route.fulfill({
          status: 403,
          json: { success: false, error: { code: "FORBIDDEN", message: "Different email" } },
        });
      }
      joinedOrgActive = true;
      return route.fulfill({ json: ok(orgDto) });
    });

    // 1. Missing token -> manual form submit cleanly posts token once & accepts -> Open workspace
    userState = "verified";
    await page.goto("/invitations/accept");
    await expect(page.getByRole("heading", { name: "Accept invitation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept invitation" })).toBeDisabled();
    await expectNoAxeViolations(page);

    await page.getByLabel("Invitation token").fill(`  ${manualToken}  `);
    await page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(page.getByRole("heading", { name: "Invitation accepted!" })).toBeVisible();
    expect(acceptRequests).toEqual([{ token: manualToken }]);
    await expect(page.getByRole("link", { name: "Open workspace" })).toHaveAttribute("href", "/runs");

    // 2. Signed-out invitee -> /login?returnTo -> /register?returnTo (fail then submit) -> Return to Sign in -> /login?returnTo (fail then login) -> single accept -> /runs shows joined VIEWER project only
    userState = "anon";
    acceptRequests.length = 0;
    joinedOrgActive = false;
    holdMe = true;
    await page.goto(`/invitations/accept?token=${token}`);
    await expect(page.getByRole("heading", { name: "Accepting invitation" })).toBeVisible();
    await expectNoAxeViolations(page);
    holdMe = false;
    releaseMe();

    await expect(page.getByRole("heading", { name: "Sign in to accept your invitation" })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/register\?returnTo=/);

    await page.getByLabel("Full name").fill("Sam Invitee");
    await page.getByLabel("Work email").fill("invitee@example.com");
    await page.getByLabel("Password").fill("ValidPassword123!");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("Register outage");

    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await page.getByRole("link", { name: "Return to Sign in" }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);

    await page.getByLabel("Email address").fill("invitee@example.com");
    await page.getByLabel("Password").fill("WrongPassword1!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("Invalid email or password.");

    await page.getByLabel("Password").fill("ValidPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(new RegExp(`/invitations/accept\\?token=${token}`));
    await expect(page.getByRole("heading", { name: "Invitation accepted!" })).toBeVisible();
    expect(acceptRequests).toEqual([{ token }]);
    await expect(page.getByText(hostileOrgName)).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem("testpulse-active-org-id"))).toBe(ORG_1);
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Open workspace" }).click();
    await expect(page).toHaveURL(/\/runs$/);
    await expect(page.getByRole("button", { name: "Switch organization or project" })).toContainText("Joined API");
    await expect(page.getByRole("button", { name: "Create project" })).toHaveCount(0);

    // 3. Unverified state (also triggered via EMAIL_NOT_VERIFIED API 403), resend error fallback -> resend 202 -> check verification succeeds
    userState = "verified";
    acceptOutcome = "unverified-api";
    await page.goto(`/invitations/accept?token=${token}`);
    await expect(page.getByRole("heading", { name: "Verify your email first" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Resend verification email" }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText("Couldn't send a verification email");
    await page.getByRole("button", { name: "Resend verification email" }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText("Verification email sent.");
    acceptOutcome = "ok";
    await page.getByRole("button", { name: "Check verification status" }).click();
    await expect(page.getByRole("heading", { name: "Invitation accepted!" })).toBeVisible();

    // 4. Wrong account email (403) + Back to workspace href + Sign out switch account even when /logout returns 500
    userState = "wrong-email";
    await page.goto(`/invitations/accept?token=${token}`);
    await expect(page.getByRole("heading", { name: "Wrong account signed in" })).toBeVisible();
    await expect(page.getByText("other@example.com")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to workspace" })).toHaveAttribute("href", "/runs");
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Sign out to switch account" }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    expect(pageErrors).toEqual([]);

    // 5. Non-401 /me error -> "Invitation unavailable" + "Go to workspace" -> /runs
    meFails = true;
    await page.goto(`/invitations/accept?token=${token}`);
    await expect(page.getByRole("heading", { name: "Invitation unavailable" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("couldn't accept");
    await expect(page.getByRole("link", { name: "Go to workspace" })).toHaveAttribute("href", "/runs");
    meFails = false;

    // 6. Expired, Revoked, Invalid, Conflict, Rate-limited error alerts
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

    // 7. Hostile returnTo on /login falls back cleanly to /runs
    await page.goto("/login?returnTo=//evil.example/steal");
    await page.getByLabel("Email address").fill("invitee@example.com");
    await page.getByLabel("Password").fill("ValidPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/runs$/);
  });
});
