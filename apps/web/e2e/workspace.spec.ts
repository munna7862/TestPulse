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

test.describe("Workspace switcher, creation dialogs & sidebar quota", () => {
  test("[SC-ORG-001] [SC-ORG-002] creates an organization and project from the header switcher", async ({ page }) => {
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

    const switcher = page.getByRole("button", { name: "Switch organization or project" });
    await expect(switcher).toContainText("Create organization");
    await expectNoAxeViolations(page);

    await switcher.click();
    await page.getByRole("menuitem", { name: "New organization" }).click();
    const orgDialog = page.getByRole("dialog");
    await expect(orgDialog.getByRole("heading", { name: "Create organization" })).toBeVisible();
    await orgDialog.getByLabel("Organization name").fill("Acme QA");
    await expectNoAxeViolations(page);
    await orgDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(orgDialog).toBeHidden();
    await expect(switcher).toContainText("Acme QA");
    await expect(switcher).toContainText("No project");

    await switcher.click();
    await page.getByRole("menuitem", { name: "New project" }).click();
    const projectDialog = page.getByRole("dialog");
    await expect(projectDialog.getByRole("heading", { name: "Create project" })).toBeVisible();
    await projectDialog.getByLabel("Project name").fill("Checkout Web");
    await expectNoAxeViolations(page);
    await projectDialog.getByRole("button", { name: "Create project" }).click();

    await expect(projectDialog).toBeHidden();
    await expect(switcher).toContainText("Checkout Web");
    await expect(page.getByText("1 / 2 projects")).toBeVisible();
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

  test("[SC-ORG-001] [SC-ORG-008] enforces role gating and shows conflict and plan limit errors in creation dialogs", async ({
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
    await expectNoAxeViolations(page);
    await orgDialog.getByRole("button", { name: "Close" }).click();

    // Free plan limit (2 / 2 projects) disables creation cleanly
    await switcher.click();
    await page.getByRole("menuitem", { name: "New project" }).click();
    const projDialog = page.getByRole("dialog");
    await expect(projDialog.getByText(/Plan limit reached/i)).toBeVisible();
    await expect(projDialog.getByRole("button", { name: "Create project" })).toBeDisabled();
    await expectNoAxeViolations(page);
    await projDialog.getByRole("button", { name: "Close" }).click();

    // Member cannot see New project menu item
    const memberOrg = buildOrg({ role: "MEMBER" });
    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok([memberOrg]) }));
    await page.reload();
    await switcher.click();
    await expect(page.getByRole("menuitem", { name: "New project" })).toHaveCount(0);
  });

  test("[SC-ORG-002] handles switcher retry on error and renders hostile workspace names safely as text", async ({
    page,
  }) => {
    const hostileName = "<img src=x onerror=alert(1)>";
    const org = buildOrg({ name: hostileName });
    const project = buildProject({ name: hostileName });
    let orgCalls = 0;

    await page.route("**/api/v1/orgs", (route) => {
      orgCalls += 1;
      if (orgCalls === 1) {
        return route.fulfill({ status: 500, json: { success: false, error: { code: "INTERNAL", message: "Down" } } });
      }
      return route.fulfill({ json: ok([org]) });
    });
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) => route.fulfill({ json: ok([project]) }));

    await page.goto("/runs");
    const unavailableBtn = page.getByRole("button", { name: "Workspace unavailable" });
    await expect(unavailableBtn).toBeVisible();
    await expectNoAxeViolations(page);

    await unavailableBtn.click();
    await page.getByRole("menuitem", { name: "Retry" }).click();

    const switcher = page.getByRole("button", { name: "Switch organization or project" });
    await expect(switcher).toContainText(hostileName);
    await expect(page.locator("img")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
});
