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

interface MockOrg {
  id: string;
  name: string;
  slug: string;
  planTier: "FREE" | "PRO" | "ENTERPRISE";
  role: "VIEWER" | "MEMBER" | "ADMIN" | "OWNER";
  createdAt: string;
}

interface MockMember {
  userId: string;
  name: string;
  email: string;
  role: "VIEWER" | "MEMBER" | "ADMIN" | "OWNER";
  joinedAt: string;
}

interface MockInvitation {
  id: string;
  orgId: string;
  email: string;
  role: "VIEWER" | "MEMBER" | "ADMIN";
  invitedById: string;
  invitedByName: string;
  expiresAt: string;
  createdAt: string;
}

const ORG_1 = "01950000-0000-7000-8000-000000000001";
const PROJ_1 = "01950000-0000-7000-8000-000000000101";
const OWNER_ID = "01950000-0000-7000-8000-000000000010";
const ADMIN_ID = "01950000-0000-7000-8000-000000000011";
const MEMBER_ID = "01950000-0000-7000-8000-000000000012";
const VIEWER_ID = "01950000-0000-7000-8000-000000000013";
const INV_1 = "01950000-0000-7000-8000-000000000021";

const buildOrg = (overrides: Partial<MockOrg> = {}): MockOrg => ({
  id: ORG_1,
  name: "Acme QA",
  slug: "acme-qa",
  planTier: "FREE",
  role: "ADMIN",
  createdAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const buildProject = () => ({
  id: PROJ_1,
  orgId: ORG_1,
  name: "Checkout Web",
  slug: "checkout-web",
  description: null,
  defaultBranch: "main",
  slaDays: 14,
  retentionDays: 30,
  flakyWindow: 10,
  flakyThreshold: 3,
  trackedBranches: ["main"],
  role: "ADMIN" as const,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
});

test.describe("Members & invitations settings (/settings/members)", () => {
  test("[SC-ORG-010] [SC-UX-004] [SC-UX-005] handles org load/error/empty states, nav links, PRO/ENTERPRISE quota, getMe fallback, and InviteMemberDialog edge states", async ({
    page,
  }) => {
    test.slow();
    let orgMode: "empty" | "pro" | "enterprise" = "pro";
    let orgAttempts = 0;
    let releaseOrgs!: () => void;
    const orgsGate = new Promise<void>((r) => {
      releaseOrgs = r;
    });
    let meFails = false;
    let invitePostCount = 0;
    let holdInvite = false;
    let releaseInvite!: () => void;
    let inviteConflict = true;

    const proOrg = buildOrg({ planTier: "PRO", role: "OWNER" });
    const entOrg = buildOrg({ planTier: "ENTERPRISE", role: "OWNER" });
    const members: MockMember[] = [
      {
        userId: OWNER_ID,
        name: "Olive Owner",
        email: "owner@example.com",
        role: "OWNER",
        joinedAt: "2026-10-01T00:00:00.000Z",
      },
      {
        userId: ADMIN_ID,
        name: "Alice Admin",
        email: "admin@example.com",
        role: "ADMIN",
        joinedAt: "2026-10-02T00:00:00.000Z",
      },
    ];
    let invitations: MockInvitation[] = [];

    await page.route("**/api/v1/auth/me", (route) => {
      if (meFails)
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Me down" } },
        });
      return route.fulfill({
        json: ok({
          user: {
            id: OWNER_ID,
            email: "owner@example.com",
            name: "Olive Owner",
            emailVerifiedAt: "2026-10-01T00:00:00.000Z",
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        }),
      });
    });
    await page.route("**/api/v1/me/oauth-accounts", (route) =>
      route.fulfill({ json: ok({ accounts: [], hasPassword: true }) }),
    );
    await page.route("**/api/v1/orgs", async (route) => {
      orgAttempts += 1;
      if (orgAttempts === 1) {
        await orgsGate;
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Org stack" } },
        });
      }
      if (orgMode === "empty") return route.fulfill({ json: ok([]) });
      return route.fulfill({ json: ok([orgMode === "enterprise" ? entOrg : proOrg]) });
    });
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) => route.fulfill({ json: ok([buildProject()]) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/members`, (route) => route.fulfill({ json: ok(members) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/invitations`, async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: ok(invitations) });
      invitePostCount += 1;
      if (holdInvite) {
        await new Promise<void>((r) => {
          releaseInvite = r;
        });
      }
      if (inviteConflict) {
        inviteConflict = false;
        return route.fulfill({
          status: 409,
          json: { success: false, error: { code: "CONFLICT", message: "Duplicate" } },
        });
      }
      const body = route.request().postDataJSON() as { email: string; role: MockInvitation["role"] };
      const created: MockInvitation = {
        id: INV_1,
        orgId: ORG_1,
        email: body.email,
        role: body.role,
        invitedById: OWNER_ID,
        invitedByName: "Olive Owner",
        expiresAt: "2026-12-10T00:00:00.000Z",
        createdAt: "2026-12-03T00:00:00.000Z",
      };
      invitations = [created];
      return route.fulfill({ status: 201, json: ok(created) });
    });

    // Outer org loading skeleton -> org error + retry (passes axe in all states)
    await page.goto("/settings/members");
    await expect(page.getByTestId("members-loading")).toBeVisible();
    await expectNoAxeViolations(page);
    releaseOrgs();

    await expect(page.getByRole("main").getByRole("alert")).not.toContainText("Org stack");
    await expectNoAxeViolations(page);

    // Retry into initial no-org empty state & test Create organization CTA
    orgMode = "empty";
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("No organization selected")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("main").getByRole("button", { name: "Create organization" }).click();
    await expect(page.getByRole("dialog", { name: "Create organization" })).toBeVisible();
    await page.keyboard.press("Escape");

    // Navigate from /settings/profile via Members tab (with PRO quota & OWNER caller: no Leave button)
    orgMode = "pro";
    await page.goto("/settings/profile");
    await page.getByRole("navigation", { name: "Settings navigation" }).getByRole("link", { name: "Members" }).click();
    await expect(page).toHaveURL(/\/settings\/members$/);
    await expect(
      page.getByRole("navigation", { name: "Settings navigation" }).getByRole("link", { name: "Members" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("2 / 25 seats used")).toBeVisible();
    await expect(page.getByRole("button", { name: "Leave organization" })).toHaveCount(0);

    // Navigate via AppHeader Account menu on ENTERPRISE unlimited plan & getMe() fallback
    orgMode = "enterprise";
    meFails = true;
    await page.goto("/runs");
    await page.getByRole("button", { name: /Account menu/i }).click();
    await page.getByRole("menuitem", { name: "Members & invitations" }).click();
    await expect(page).toHaveURL(/\/settings\/members$/);
    await expect(page.getByText("2 seats used (unlimited)")).toBeVisible();
    await expect(page.getByText("You", { exact: true })).toHaveCount(0);

    // InviteMemberDialog: client validation, role Select=ADMIN, 409 server error, submitting lock, Cancel reset
    await page.getByRole("button", { name: "Invite member" }).click();
    const inviteDialog = page.getByRole("dialog", { name: "Invite teammate" });
    await expect(inviteDialog).toContainText("Unlimited seats on your current plan.");
    await inviteDialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(inviteDialog.getByRole("alert")).toBeVisible();
    expect(invitePostCount).toBe(0);

    await inviteDialog.getByLabel("Email address").fill("bad-email");
    await inviteDialog.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Invite member" }).click();
    await expect(inviteDialog.getByLabel("Email address")).toHaveValue("");
    await expect(inviteDialog.getByRole("alert")).toHaveCount(0);

    holdInvite = true;
    await inviteDialog.getByLabel("Email address").fill("lead@example.com");
    await inviteDialog.getByRole("combobox", { name: "Invitation role" }).click();
    await page.getByRole("option", { name: "Admin" }).click();
    await inviteDialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(inviteDialog.getByRole("button", { name: "Sending..." })).toBeDisabled();
    await expect(inviteDialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(inviteDialog).toBeVisible();

    releaseInvite();
    await expect(inviteDialog.getByRole("alert")).toContainText("already has a pending invitation");
    holdInvite = false;
    await inviteDialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(inviteDialog).toBeHidden();
    await expect(page.getByText("lead@example.com")).toBeVisible();
    await expect(page.getByText("3 seats used (unlimited)")).toBeVisible();
  });

  test("[SC-ORG-010] [SC-ORG-014] [SC-ORG-015] [SC-PLAN-002] [SC-UX-004] [SC-UX-005] handles member retry, You badge, role/remove/resend/revoke failures, dialogs, viewer gating & XSS", async ({
    page,
  }) => {
    test.slow();
    const hostileName = "<img src=x onerror=alert(1)>";
    let orgs: MockOrg[] = [buildOrg({ name: hostileName, planTier: "FREE", role: "ADMIN" })];
    let currentUserId = ADMIN_ID;
    let members: MockMember[] = [
      {
        userId: OWNER_ID,
        name: "Olive Owner",
        email: "owner@example.com",
        role: "OWNER",
        joinedAt: "2026-10-01T00:00:00.000Z",
      },
      {
        userId: ADMIN_ID,
        name: "Alice Admin",
        email: "admin@example.com",
        role: "ADMIN",
        joinedAt: "2026-10-02T00:00:00.000Z",
      },
      {
        userId: MEMBER_ID,
        name: hostileName,
        email: "member@example.com",
        role: "MEMBER",
        joinedAt: "2026-10-03T00:00:00.000Z",
      },
    ];
    let invitations: MockInvitation[] = [];
    let memberAttempts = 0;
    let releaseInitialMembers!: () => void;
    const initialMembersGate = new Promise<void>((r) => {
      releaseInitialMembers = r;
    });

    let failPatch = true;
    let holdDelete = false;
    let releaseDelete!: () => void;
    let failDelete = true;
    let failResend = true;
    let failRevoke = true;
    let leaveError = true;

    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        json: ok({
          user: {
            id: currentUserId,
            email: currentUserId === ADMIN_ID ? "admin@example.com" : "viewer@example.com",
            name: currentUserId === ADMIN_ID ? "Alice Admin" : hostileName,
            emailVerifiedAt: "2026-10-01T00:00:00.000Z",
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        }),
      }),
    );
    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok(orgs) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) =>
      route.fulfill({ json: ok(orgs.length ? [buildProject()] : []) }),
    );
    await page.route(`**/api/v1/orgs/${ORG_1}/members`, async (route) => {
      memberAttempts += 1;
      if (memberAttempts === 1) {
        await initialMembersGate;
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Members db trace" } },
        });
      }
      return route.fulfill({ json: ok(members) });
    });

    await page.route(`**/api/v1/orgs/${ORG_1}/members/*`, async (route) => {
      const targetUserId = route.request().url().split("/members/")[1] ?? "";
      if (route.request().method() === "PATCH") {
        if (failPatch) {
          failPatch = false;
          return route.fulfill({
            status: 500,
            json: { success: false, error: { code: "INTERNAL", message: "Patch boom" } },
          });
        }
        const body = route.request().postDataJSON() as { role: MockMember["role"] };
        members = members.map((m) => (m.userId === targetUserId ? { ...m, role: body.role } : m));
        return route.fulfill({ json: ok(members.find((m) => m.userId === targetUserId)) });
      }
      if (route.request().method() === "DELETE") {
        if (holdDelete) {
          await new Promise<void>((r) => {
            releaseDelete = r;
          });
        }
        if (targetUserId === currentUserId && leaveError) {
          leaveError = false;
          return route.fulfill({
            status: 500,
            json: { success: false, error: { code: "INTERNAL", message: "Leave boom" } },
          });
        }
        if (targetUserId !== currentUserId && failDelete) {
          failDelete = false;
          return route.fulfill({
            status: 500,
            json: { success: false, error: { code: "INTERNAL", message: "Delete boom" } },
          });
        }
        members = members.filter((m) => m.userId !== targetUserId);
        if (targetUserId === currentUserId) orgs = [];
        return route.fulfill({ status: 204 });
      }
      return route.fallback();
    });

    await page.route(`**/api/v1/orgs/${ORG_1}/invitations`, async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: ok(invitations) });
      const body = route.request().postDataJSON() as { email: string; role: MockInvitation["role"] };
      const created: MockInvitation = {
        id: INV_1,
        orgId: ORG_1,
        email: body.email,
        role: body.role,
        invitedById: ADMIN_ID,
        invitedByName: "Alice Admin",
        expiresAt: "2026-12-10T00:00:00.000Z",
        createdAt: "2026-12-03T00:00:00.000Z",
      };
      invitations = [created, ...invitations];
      return route.fulfill({ status: 201, json: ok(created) });
    });

    await page.route(`**/api/v1/orgs/${ORG_1}/invitations/${INV_1}/resend`, (route) => {
      if (failResend) {
        failResend = false;
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Resend boom" } },
        });
      }
      invitations = invitations.map((i) => (i.id === INV_1 ? { ...i, expiresAt: "2030-01-15T00:00:00.000Z" } : i));
      return route.fulfill({ json: ok(invitations[0]) });
    });

    await page.route(`**/api/v1/orgs/${ORG_1}/invitations/${INV_1}`, (route) => {
      if (failRevoke) {
        failRevoke = false;
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Revoke boom" } },
        });
      }
      invitations = invitations.filter((i) => i.id !== INV_1);
      return route.fulfill({ status: 204 });
    });

    await page.goto("/settings/members");
    await expect(page.getByTestId("members-loading")).toBeVisible();
    releaseInitialMembers();

    await expect(page.getByRole("main").getByRole("alert")).not.toContainText("Members db trace");
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Try again" }).click();

    await expect(page.getByRole("heading", { name: "Members & invitations", level: 1 })).toBeVisible();
    await expect(page.getByText("3 / 3 seats used")).toBeVisible();
    await expect(page.getByText("Member limit reached")).toBeVisible();
    await expect(page.getByRole("button", { name: "Invite member" })).toBeDisabled();
    await expect(page.getByText(hostileName).first()).toBeVisible();

    // "You" badge on Alice Admin + Owner & self rows lack Role select and Remove button
    const adminRow = page.getByRole("listitem").filter({ hasText: "Alice Admin" });
    await expect(adminRow.getByText("You", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Role for Olive Owner" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove Olive Owner" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Role for Alice Admin" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove Alice Admin" })).toHaveCount(0);

    // Role change failure alert -> retry succeeds
    await page.getByRole("combobox", { name: `Role for ${hostileName}` }).click();
    await page.getByRole("option", { name: "Viewer" }).click();
    await expect(page.getByRole("main").getByRole("alert")).not.toContainText("Patch boom");
    await page.getByRole("combobox", { name: `Role for ${hostileName}` }).click();
    await page.getByRole("option", { name: "Viewer" }).click();
    await expect(page.getByText("Viewer").first()).toBeVisible();

    // Remove Cancel, busy lock + error keeping dialog open -> confirm succeeds
    await page.getByRole("button", { name: `Remove ${hostileName}` }).click();
    const removeDialog = page.getByRole("dialog", { name: "Remove member" });
    await removeDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(removeDialog).toBeHidden();

    holdDelete = true;
    await page.getByRole("button", { name: `Remove ${hostileName}` }).click();
    await removeDialog.getByRole("button", { name: "Confirm remove" }).click();
    await expect(removeDialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(removeDialog).toBeVisible();
    releaseDelete();
    await expect(removeDialog).toBeHidden();
    await expect(page.getByRole("main").getByRole("alert")).not.toContainText("Delete boom");

    holdDelete = false;
    await page.getByRole("button", { name: `Remove ${hostileName}` }).click();
    await removeDialog.getByRole("button", { name: "Confirm remove" }).click();
    await expect(removeDialog).toBeHidden();
    await expect(page.getByText("2 / 3 seats used")).toBeVisible();

    // Invite teammate dialog + axe while open -> Resend error & updated expiry -> Revoke error & success
    await page.getByRole("button", { name: "Invite member" }).click();
    const inviteDialog = page.getByRole("dialog", { name: "Invite teammate" });
    await expectNoAxeViolations(page);
    await inviteDialog.getByLabel("Email address").fill("teammate@example.com");
    await inviteDialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(inviteDialog).toBeHidden();
    await expect(page.getByText("3 / 3 seats used")).toBeVisible();
    await expectNoAxeViolations(page);

    const expectedUpdatedExpiry = await page.evaluate(() => new Date("2030-01-15T00:00:00.000Z").toLocaleDateString());
    await page.getByRole("button", { name: "Resend invite to teammate@example.com" }).click();
    await expect(page.getByRole("main").getByRole("alert")).not.toContainText("Resend boom");
    await page.getByRole("button", { name: "Resend invite to teammate@example.com" }).click();
    await expect(page.getByText(`Expires ${expectedUpdatedExpiry}`)).toBeVisible();

    await page.getByRole("button", { name: "Revoke invite for teammate@example.com" }).click();
    await expect(page.getByRole("main").getByRole("alert")).not.toContainText("Revoke boom");
    await page.getByRole("button", { name: "Revoke invite for teammate@example.com" }).click();
    await expect(page.getByText("No pending invitations")).toBeVisible();
    await expect(page.getByText("2 / 3 seats used")).toBeVisible();

    // Viewer caller in a full 3/3 org sees no pending invites, no Invite button, no quota limit nag, and Leave organization
    currentUserId = VIEWER_ID;
    orgs = [buildOrg({ role: "VIEWER" })];
    members = [
      {
        userId: OWNER_ID,
        name: "Olive Owner",
        email: "owner@example.com",
        role: "OWNER",
        joinedAt: "2026-10-01T00:00:00.000Z",
      },
      {
        userId: ADMIN_ID,
        name: "Alice Admin",
        email: "admin@example.com",
        role: "ADMIN",
        joinedAt: "2026-10-02T00:00:00.000Z",
      },
      {
        userId: VIEWER_ID,
        name: hostileName,
        email: "viewer@example.com",
        role: "VIEWER",
        joinedAt: "2026-10-03T00:00:00.000Z",
      },
    ];
    await page.reload();
    await expect(page.getByText("3 / 3 seats used")).toBeVisible();
    await expect(page.getByText("Member limit reached")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Pending invitations" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Invite member" })).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Remove / })).toHaveCount(0);
    await expectNoAxeViolations(page);

    // Leave failure keeps stored org ID -> Leave success clears storage and transitions to empty state
    await page.getByRole("button", { name: "Leave organization" }).click();
    const leaveDialog = page.getByRole("dialog", { name: "Leave organization" });
    await leaveDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(leaveDialog).toBeHidden();

    await page.getByRole("button", { name: "Leave organization" }).click();
    await leaveDialog.getByRole("button", { name: "Confirm leave" }).click();
    await expect(page.getByRole("main").getByRole("alert")).not.toContainText("Leave boom");
    expect(await page.evaluate(() => window.localStorage.getItem("testpulse-active-org-id"))).toBe(ORG_1);

    await page.getByRole("button", { name: "Leave organization" }).click();
    await leaveDialog.getByRole("button", { name: "Confirm leave" }).click();
    await expect(page.getByText("No organization selected")).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem("testpulse-active-org-id"))).toBeNull();
    await expectNoAxeViolations(page);
  });
});
