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
const PROJ_1 = "01950000-0000-7000-8000-000000000101";

const buildOrg = (overrides: Partial<MockOrg> = {}): MockOrg => ({
  id: ORG_1,
  name: "Acme QA",
  slug: "acme-qa",
  planTier: "FREE",
  role: "OWNER",
  createdAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const buildProject = (overrides: Partial<MockProject> = {}): MockProject => ({
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
});

test.describe("Onboarding checklist on /runs", () => {
  test("[SC-ORG-009] guides a brand-new user through creating their first organization and project", async ({
    page,
  }) => {
    const orgs: MockOrg[] = [];
    const projectsByOrg = new Map<string, MockProject[]>();

    await page.route("**/api/v1/orgs", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: ok(orgs) });
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
      if (route.request().method() === "GET") return route.fulfill({ json: ok(projectsByOrg.get(orgId) ?? []) });
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

    await expect(page.getByRole("heading", { level: 1, name: "Test Runs" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Get started with TestPulse" })).toBeVisible();
    const createOrgBtn = page.getByRole("main").getByRole("button", { name: "Create organization" });
    await expect(createOrgBtn).toBeVisible();
    await expectNoAxeViolations(page);

    await createOrgBtn.click();
    const orgDialog = page.getByRole("dialog");
    await orgDialog.getByLabel("Organization name").fill("Acme QA");
    await orgDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(orgDialog).toBeHidden();
    const createProjBtn = page.getByRole("main").getByRole("button", { name: "Create project" });
    await expect(createProjBtn).toBeVisible();
    await expectNoAxeViolations(page);

    await createProjBtn.click();
    const projDialog = page.getByRole("dialog");
    await projDialog.getByLabel("Project name").fill("Checkout Web");
    await projDialog.getByRole("button", { name: "Create project" }).click();

    await expect(projDialog).toBeHidden();
    await expect(page.getByRole("heading", { level: 2, name: "Get started with TestPulse" })).toBeHidden();
    await expect(page.getByText("Monitoring runs for Acme QA / Checkout Web.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Switch organization or project" })).toContainText("Acme QA");
    await expect(page.getByRole("button", { name: "Switch organization or project" })).toContainText("Checkout Web");
  });

  test("[SC-ORG-009] skips onboarding when an invited user already has a project, and gates Member onboarding CTA", async ({
    page,
  }) => {
    let org = buildOrg({ name: "Invited Corp", role: "MEMBER" });
    let projects = [buildProject({ name: "Core Engine", role: "MEMBER" })];

    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok([org]) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) => route.fulfill({ json: ok(projects) }));

    await page.goto("/runs");
    await expect(page.getByText("Monitoring runs for Invited Corp / Core Engine.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Get started with TestPulse" })).toBeHidden();
    await expectNoAxeViolations(page);

    // Member in an org with zero projects sees informational note and no Create project button
    projects = [];
    org = buildOrg({ name: "Invited Corp", role: "MEMBER" });
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Get started with TestPulse" })).toBeVisible();
    await expect(page.getByText("Ask an organization Admin or Owner to create the first project.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Create project" })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
});

test.describe("Project settings page (/settings/project)", () => {
  test("[SC-ORG-007] handles loading, error retry, admin update/delete, SLA selection, member read-only, empty states and XSS", async ({
    page,
  }) => {
    const hostileName = "<img src=x onerror=alert(1)>";
    let orgs: MockOrg[] = [buildOrg({ id: ORG_1, name: hostileName, planTier: "FREE", role: "ADMIN" })];
    let projects: MockProject[] = [buildProject({ name: hostileName, role: "ADMIN", slaDays: 14, retentionDays: 30 })];
    let listAttempts = 0;
    let releaseInitialProjects!: () => void;
    const initialProjectsGate = new Promise<void>((resolve) => {
      releaseInitialProjects = resolve;
    });
    let patchFailureMode: "forbidden" | null = null;
    let patchedBody: unknown;
    let releaseDelete!: () => void;
    const deleteGate = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });

    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok(orgs) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, async (route) => {
      listAttempts += 1;
      if (listAttempts === 1) {
        await initialProjectsGate;
        return route.fulfill({
          status: 500,
          json: { success: false, error: { code: "INTERNAL", message: "Server down" } },
        });
      }
      return route.fulfill({ json: ok(projects) });
    });
    await page.route(`**/api/v1/projects/${PROJ_1}`, async (route) => {
      if (route.request().method() === "PATCH") {
        if (patchFailureMode === "forbidden") {
          return route.fulfill({
            status: 403,
            json: { success: false, error: { code: "FORBIDDEN", message: "Forbidden" } },
          });
        }
        patchedBody = route.request().postDataJSON();
        const updated = buildProject({
          ...projects[0],
          ...(patchedBody as Partial<MockProject>),
        });
        projects = [updated];
        return route.fulfill({ json: ok(updated) });
      }
      if (route.request().method() === "DELETE") {
        await deleteGate;
        projects = [];
        return route.fulfill({ status: 204 });
      }
      return route.fallback();
    });

    await page.route("**/api/v1/me/oauth-accounts", (route) =>
      route.fulfill({ json: ok({ accounts: [], hasPassword: true }) }),
    );

    await page.goto("/settings/project");

    // Loading skeleton then 500 error & retry
    await expect(page.getByTestId("project-settings-loading")).toBeVisible();
    releaseInitialProjects();
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Try again" }).click();

    // Populated form + XSS inert rendering + effective retention hint + Settings nav
    const nameInput = page.getByLabel("Project name");
    await expect(nameInput).toHaveValue(hostileName);
    await expect(page.locator("img")).toHaveCount(0);
    await expect(page.getByText("Effective retention on Free tier: 7 days (plan max 7 days).")).toBeVisible();
    const settingsNav = page.getByRole("navigation", { name: "Settings navigation" });
    await expect(settingsNav.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/settings/profile");
    await expect(settingsNav.getByRole("link", { name: "Project" })).toHaveAttribute("aria-current", "page");
    await expectNoAxeViolations(page);

    // Client-side validation error & server 403 alert
    await nameInput.fill("   ");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Name is required");

    await nameInput.fill("Hardened Suite");
    patchFailureMode = "forbidden";
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("do not have permission");

    // Admin updates name, clears description -> null, branch -> develop, SLA -> 30, retention -> 14
    patchFailureMode = null;
    await page.getByLabel("Description").fill("   ");
    await page.getByLabel("Default branch").fill("develop");
    await page.getByRole("combobox", { name: "Quarantine SLA" }).click();
    await page.getByRole("option", { name: "30 days" }).click();
    await page.getByLabel("Data retention (days)").fill("14");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Project settings saved." })).toBeVisible();
    expect(patchedBody).toEqual({
      name: "Hardened Suite",
      description: null,
      defaultBranch: "develop",
      slaDays: 30,
      retentionDays: 14,
    });
    await expect(page.getByRole("button", { name: "Switch organization or project" })).toContainText("Hardened Suite");

    // Delete project confirmation dialog: prevents closing while in-flight, then lands on empty state
    await page.getByRole("button", { name: "Delete project" }).click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog.getByRole("heading", { name: "Delete project" })).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Confirm delete" }).click();
    await expect(confirmDialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(confirmDialog).toBeVisible();

    releaseDelete();
    await expect(confirmDialog).toBeHidden();
    await expect(page.getByText("No projects in this organization")).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Create project" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Viewer read-only state
    orgs = [buildOrg({ id: ORG_1, name: "Viewer Org", role: "VIEWER" })];
    projects = [buildProject({ id: PROJ_1, name: "Read Only App", role: "VIEWER" })];
    await page.reload();
    await expect(page.getByLabel("Project name")).toBeDisabled();
    await expect(page.getByLabel("Description")).toBeDisabled();
    await expect(page.getByLabel("Default branch")).toBeDisabled();
    await expect(page.getByRole("combobox", { name: "Quarantine SLA" })).toBeDisabled();
    await expect(page.getByLabel("Data retention (days)")).toBeDisabled();
    await expect(page.getByText("Only Admins and Owners can edit or delete project settings.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete project" })).toHaveCount(0);
    await expectNoAxeViolations(page);

    // Empty no-org state
    orgs = [];
    projects = [];
    await page.reload();
    await expect(page.getByText("No organization selected")).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Create organization" })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
