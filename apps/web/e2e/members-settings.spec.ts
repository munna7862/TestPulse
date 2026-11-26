import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function waitForTransitions(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
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
  test("[SC-ORG-010] [SC-ORG-014] [SC-ORG-015] [SC-PLAN-002] handles loading, retry, invite/resend/revoke, quota limit, role change, remove, leave, viewer gating & XSS", async ({
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
    const initialMembersGate = new Promise<void>((resolve) => {
      releaseInitialMembers = resolve;
    });

    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        json: ok({
          user: {
            id: currentUserId,
            email: currentUserId === ADMIN_ID ? "admin@example.com" : "member@example.com",
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
        const body = route.request().postDataJSON() as { role: MockMember["role"] };
        members = members.map((m) => (m.userId === targetUserId ? { ...m, role: body.role } : m));
        const updated = members.find((m) => m.userId === targetUserId);
        return route.fulfill({ json: ok(updated) });
      }
      if (route.request().method() === "DELETE") {
        members = members.filter((m) => m.userId !== targetUserId);
        if (targetUserId === currentUserId) orgs = [];
        return route.fulfill({ status: 204 });
      }
      return route.fallback();
    });

    await page.route(`**/api/v1/orgs/${ORG_1}/invitations`, async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: ok(invitations) });
      }
      if (route.request().method() === "POST") {
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
      }
      return route.fallback();
    });

    await page.route(`**/api/v1/orgs/${ORG_1}/invitations/${INV_1}/resend`, (route) => {
      invitations = invitations.map((i) => (i.id === INV_1 ? { ...i, expiresAt: "2026-12-12T00:00:00.000Z" } : i));
      return route.fulfill({ json: ok(invitations[0]) });
    });

    await page.route(`**/api/v1/orgs/${ORG_1}/invitations/${INV_1}`, (route) => {
      if (route.request().method() === "DELETE") {
        invitations = invitations.filter((i) => i.id !== INV_1);
        return route.fulfill({ status: 204 });
      }
      return route.fallback();
    });

    await page.goto("/settings/members");
    await expect(page.getByTestId("members-loading")).toBeVisible();
    releaseInitialMembers();

    // Error state + safe retry
    await expect(page.getByRole("main").getByRole("alert")).not.toContainText("Members db trace");
    await page.getByRole("button", { name: "Try again" }).click();

    await expect(page.getByRole("heading", { name: "Members & invitations", level: 1 })).toBeVisible();
    await expect(page.getByText("3 / 3 seats used")).toBeVisible();
    await expect(page.getByText("Member limit reached")).toBeVisible();
    await expect(page.getByRole("button", { name: "Invite member" })).toBeDisabled();
    await expect(page.getByText(hostileName).first()).toBeVisible();

    // Owner row and self row never offer role dropdown or Remove button
    await expect(page.getByRole("combobox", { name: "Role for Olive Owner" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Role for Alice Admin" })).toHaveCount(0);

    // Change Member -> Viewer and remove Member to free seat 3
    await page.getByRole("combobox", { name: `Role for ${hostileName}` }).click();
    await page.getByRole("option", { name: "Viewer" }).click();
    await expect(page.getByText("Viewer").first()).toBeVisible();

    await page.getByRole("button", { name: `Remove ${hostileName}` }).click();
    const removeDialog = page.getByRole("dialog", { name: "Remove member" });
    await removeDialog.getByRole("button", { name: "Confirm remove" }).click();
    await expect(removeDialog).toBeHidden();
    await expect(page.getByText("2 / 3 seats used")).toBeVisible();

    // Invite a new teammate (now at 3 / 3 with pending invite -> quota notice returns)
    await page.getByRole("button", { name: "Invite member" }).click();
    const inviteDialog = page.getByRole("dialog", { name: "Invite teammate" });
    await inviteDialog.getByLabel("Email address").fill("teammate@example.com");
    await inviteDialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(inviteDialog).toBeHidden();
    await expect(page.getByText("teammate@example.com")).toBeVisible();
    await expect(page.getByText("3 / 3 seats used")).toBeVisible();

    await expectNoAxeViolations(page);

    // Resend then revoke invitation -> quota drops back to 2 / 3
    await page.getByRole("button", { name: "Resend invite to teammate@example.com" }).click();
    await page.getByRole("button", { name: "Revoke invite for teammate@example.com" }).click();
    await expect(page.getByText("No pending invitations")).toBeVisible();
    await expect(page.getByText("2 / 3 seats used")).toBeVisible();

    // Member view hides pending invitations and invite controls, allows Leave organization
    currentUserId = MEMBER_ID;
    orgs = [buildOrg({ role: "MEMBER" })];
    members = [
      {
        userId: OWNER_ID,
        name: "Olive Owner",
        email: "owner@example.com",
        role: "OWNER",
        joinedAt: "2026-10-01T00:00:00.000Z",
      },
      {
        userId: MEMBER_ID,
        name: hostileName,
        email: "member@example.com",
        role: "MEMBER",
        joinedAt: "2026-10-03T00:00:00.000Z",
      },
    ];
    await page.reload();
    await expect(page.getByRole("heading", { name: "Pending invitations" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Invite member" })).toHaveCount(0);
    await page.getByRole("button", { name: "Leave organization" }).click();
    await page
      .getByRole("dialog", { name: "Leave organization" })
      .getByRole("button", { name: "Confirm leave" })
      .click();

    await expect(page.getByText("No organization selected")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
