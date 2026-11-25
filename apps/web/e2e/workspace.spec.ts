import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoAxeViolations(page: Page): Promise<void> {
  const light = await new AxeBuilder({ page }).analyze();
  expect(light.violations).toEqual([]);

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(page.locator("html")).toHaveClass(/dark/);
  const dark = await new AxeBuilder({ page }).analyze();
  expect(dark.violations).toEqual([]);
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await expect(page.locator("html")).not.toHaveClass(/dark/);
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

interface MockProject {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  defaultBranch: string;
  slaDays: number;
  retentionDays: number;
  flakyWindow: number;
  flakyThreshold: number;
  trackedBranches: string[];
  role: "VIEWER" | "MEMBER" | "ADMIN" | "OWNER";
  createdAt: string;
  updatedAt: string;
}

const ORG_1 = "01950000-0000-7000-8000-000000000001";
const ORG_2 = "01950000-0000-7000-8000-000000000002";
const PROJ_1 = "01950000-0000-7000-8000-000000000101";
const PROJ_2 = "01950000-0000-7000-8000-000000000201";

function buildOrg(overrides: Partial<MockOrg> = {}): MockOrg {
  return {
    id: ORG_1,
    name: "Acme QA",
    slug: "acme-qa",
    planTier: "FREE",
    role: "OWNER",
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildProject(overrides: Partial<MockProject> = {}): MockProject {
  return {
    id: PROJ_1,
    orgId: ORG_1,
    name: "Checkout Web",
    slug: "checkout-web",
    description: "Primary browser tests",
    defaultBranch: "main",
    slaDays: 14,
    retentionDays: 30,
    flakyWindow: 10,
    flakyThreshold: 3,
    trackedBranches: ["main"],
    role: "OWNER",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

test.describe("Workspace switcher, dialogs, onboarding & project settings", () => {
  test("[SC-ORG-009] guides a brand-new user through creating their first organization and project", async ({
    page,
  }) => {
    const orgs: MockOrg[] = [];
    const projectsByOrg = new Map<string, MockProject[]>();

    await page.route("**/api/v1/orgs", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: ok(orgs) });
      }
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as { name: string; slug?: string };
        const created = buildOrg({ id: ORG_1, name: body.name, slug: body.slug ?? "acme-qa" });
        orgs.push(created);
        projectsByOrg.set(created.id, []);
        return route.fulfill({ status: 201, json: ok(created) });
      }
      return route.fallback();
    });

    await page.route("**/api/v1/orgs/*/projects", async (route) => {
      const orgId = route.request().url().split("/orgs/")[1]?.split("/projects")[0] ?? "";
      if (route.request().method() === "GET") {
        return route.fulfill({ json: ok(projectsByOrg.get(orgId) ?? []) });
      }
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as { name: string; slug?: string; description?: string };
        const created = buildProject({
          id: PROJ_1,
          orgId,
          name: body.name,
          slug: body.slug ?? "checkout-web",
          description: body.description ?? null,
        });
        projectsByOrg.set(orgId, [created]);
        return route.fulfill({ status: 201, json: ok(created) });
      }
      return route.fallback();
    });

    await page.goto("/runs");

    await expect(page.getByRole("heading", { level: 2, name: "Get started with TestPulse" })).toBeVisible();
    const createOrgBtn = page.getByRole("button", { name: "Create organization" });
    await expect(createOrgBtn).toBeVisible();
    await expectNoAxeViolations(page);

    await createOrgBtn.click();
    const orgDialog = page.getByRole("dialog");
    await expect(orgDialog.getByRole("heading", { name: "Create organization" })).toBeVisible();
    await orgDialog.getByLabel("Organization name").fill("Acme QA");
    await expectNoAxeViolations(page);
    await orgDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(orgDialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Create project" })).toBeVisible();

    await page.getByRole("button", { name: "Create project" }).click();
    const projectDialog = page.getByRole("dialog");
    await expect(projectDialog.getByRole("heading", { name: "Create project" })).toBeVisible();
    await projectDialog.getByLabel("Project name").fill("Checkout Web");
    await projectDialog.getByRole("button", { name: "Create project" }).click();

    await expect(projectDialog).toBeHidden();
    await expect(page.getByRole("heading", { level: 2, name: "Get started with TestPulse" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Switch organization or project" })).toContainText("Acme QA");
    await expect(page.getByRole("button", { name: "Switch organization or project" })).toContainText("Checkout Web");
    await expect(page.getByText("1 / 2 projects")).toBeVisible();
  });

  test("[SC-ORG-009] skips onboarding when an invited user already belongs to an organization with a project", async ({
    page,
  }) => {
    const org = buildOrg({ name: "Invited Corp", role: "MEMBER" });
    const project = buildProject({ name: "Core Engine", role: "MEMBER" });

    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok([org]) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) => route.fulfill({ json: ok([project]) }));

    await page.goto("/runs");
    await expect(page.getByRole("button", { name: "Switch organization or project" })).toContainText("Invited Corp");
    await expect(page.getByRole("button", { name: "Switch organization or project" })).toContainText("Core Engine");
    await expect(page.getByRole("heading", { level: 2, name: "Get started with TestPulse" })).toBeHidden();
  });

  test("[SC-ORG-002] switches between organizations and projects and persists selection across reloads", async ({
    page,
  }) => {
    const orgA = buildOrg({ id: ORG_1, name: "Alpha Org", slug: "alpha", planTier: "FREE" });
    const orgB = buildOrg({ id: ORG_2, name: "Beta Pro", slug: "beta", planTier: "PRO", role: "ADMIN" });
    const projA = buildProject({ id: PROJ_1, orgId: ORG_1, name: "Alpha Web" });
    const projB = buildProject({ id: PROJ_2, orgId: ORG_2, name: "Beta API", role: "ADMIN" });

    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok([orgA, orgB]) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) => route.fulfill({ json: ok([projA]) }));
    await page.route(`**/api/v1/orgs/${ORG_2}/projects`, (route) => route.fulfill({ json: ok([projB]) }));

    await page.goto("/runs");
    const switcher = page.getByRole("button", { name: "Switch organization or project" });
    await expect(switcher).toContainText("Alpha Org");
    await expect(switcher).toContainText("Alpha Web");

    await switcher.click();
    await page.getByRole("menuitem", { name: /Beta Pro/ }).click();

    await expect(switcher).toContainText("Beta Pro");
    await expect(switcher).toContainText("Beta API");
    await expect(page.getByText("Pro Tier")).toBeVisible();
    await expect(page.getByText("1 projects (unlimited)")).toBeVisible();

    await page.reload();
    await expect(switcher).toContainText("Beta Pro");
    await expect(switcher).toContainText("Beta API");
  });

  test("[SC-ORG-001] [SC-ORG-008] shows friendly conflict and plan limit errors in creation dialogs", async ({
    page,
  }) => {
    const org = buildOrg({ planTier: "FREE", role: "OWNER" });
    const p1 = buildProject({ id: PROJ_1, name: "First App", slug: "first-app" });
    const p2 = buildProject({ id: PROJ_2, name: "Second App", slug: "second-app" });

    await page.route("**/api/v1/orgs", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: ok([org]) });
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 409,
          json: { success: false, error: { code: "CONFLICT", message: "Slug exists" } },
        });
      }
      return route.fallback();
    });
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) => route.fulfill({ json: ok([p1, p2]) }));

    await page.goto("/runs");
    const switcher = page.getByRole("button", { name: "Switch organization or project" });
    await expect(switcher).toContainText("Acme QA");

    // 409 conflict on CreateOrgDialog
    await switcher.click();
    await page.getByRole("menuitem", { name: "New organization" }).click();
    const orgDialog = page.getByRole("dialog");
    await orgDialog.getByLabel("Organization name").fill("Acme QA");
    await orgDialog.getByRole("button", { name: "Create organization" }).click();
    await expect(orgDialog.getByRole("alert")).toContainText("already exists");
    await orgDialog.getByRole("button", { name: "Close" }).click();

    // Free plan limit (2 / 2 projects) disables creation notice cleanly
    await switcher.click();
    await page.getByRole("menuitem", { name: "New project" }).click();
    const projDialog = page.getByRole("dialog");
    await expect(projDialog.getByText(/Plan limit reached/i)).toBeVisible();
    await expect(projDialog.getByRole("button", { name: "Create project" })).toBeDisabled();
  });

  test("[SC-ORG-007] /settings/project handles loading, error retry, admin update/delete, member read-only and XSS", async ({
    page,
  }) => {
    const hostileName = "<img src=x onerror=alert(1)>";
    const adminOrg = buildOrg({ id: ORG_1, name: hostileName, planTier: "FREE", role: "ADMIN" });
    let adminProjects: MockProject[] = [
      buildProject({ name: hostileName, role: "ADMIN", slaDays: 14, retentionDays: 30 }),
    ];

    let listAttempts = 0;
    let patchedBody: unknown;
    let deletedCalled = false;

    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok([adminOrg]) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, async (route) => {
      listAttempts += 1;
      if (listAttempts === 1) {
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Server down" } },
        });
      }
      return route.fulfill({ json: ok(adminProjects) });
    });
    await page.route(`**/api/v1/projects/${PROJ_1}`, async (route) => {
      if (route.request().method() === "PATCH") {
        patchedBody = route.request().postDataJSON();
        const updated = buildProject({
          ...adminProjects[0],
          ...(patchedBody as Partial<MockProject>),
        });
        adminProjects = [updated];
        return route.fulfill({ json: ok(updated) });
      }
      if (route.request().method() === "DELETE") {
        deletedCalled = true;
        adminProjects = [];
        return route.fulfill({ status: 204 });
      }
      return route.fallback();
    });

    await page.goto("/settings/project");

    // Error state & retry
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Try again" }).click();

    // Populated state + XSS text-only check
    const nameInput = page.getByLabel("Project name");
    await expect(nameInput).toHaveValue(hostileName);
    await expect(page.locator("img")).toHaveCount(0);
    await expect(page.getByText(/Effective retention on Free tier: 7 days/i)).toBeVisible();
    await expectNoAxeViolations(page);

    // Admin updates fields
    await nameInput.fill("Hardened Suite");
    await page.getByLabel("Default branch").fill("develop");
    await page.getByLabel("Data retention (days)").fill("14");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Project settings saved." })).toBeVisible();
    expect(patchedBody).toEqual({
      name: "Hardened Suite",
      description: "Primary browser tests",
      defaultBranch: "develop",
      slaDays: 14,
      retentionDays: 14,
    });
    await expect(page.getByRole("button", { name: "Switch organization or project" })).toContainText("Hardened Suite");

    // Admin deletes project via confirmation dialog
    await page.getByRole("button", { name: "Delete project" }).click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog.getByRole("heading", { name: "Delete project" })).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Confirm delete" }).click();

    expect(deletedCalled).toBe(true);
    await expect(page.getByText("No projects in this organization")).toBeVisible();
    await expectNoAxeViolations(page);

    // Member/Viewer read-only check in a fresh route override
    const viewerOrg = buildOrg({ id: ORG_1, name: "Viewer Org", role: "VIEWER" });
    const viewerProject = buildProject({ id: PROJ_1, name: "Read Only App", role: "VIEWER" });
    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok([viewerOrg]) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) => route.fulfill({ json: ok([viewerProject]) }));
    await page.goto("/settings/project");

    await expect(page.getByLabel("Project name")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete project" })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
});
