import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function waitForTransitions(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
  });
}

async function expectNoAxeViolations(page: Page, menuOnly = false): Promise<void> {
  const runAxe = () => {
    const builder = new AxeBuilder({ page });
    return (menuOnly ? builder.include('[role="menu"]') : builder).analyze();
  };

  await waitForTransitions(page);
  const light = await runAxe();
  expect(light.violations).toEqual([]);

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(page.locator("html")).toHaveClass(/dark/);
  await waitForTransitions(page);
  const dark = await runAxe();
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
const PROJ_3 = "01950000-0000-7000-8000-000000000202";

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

test.describe("Workspace switcher, creation dialogs & sidebar quota", () => {
  test("[SC-ORG-001] [SC-ORG-002] loads workspace skeleton, creates org and project with minimal JSON payloads, and updates sidebar quota", async ({
    page,
  }) => {
    const orgs: MockOrg[] = [];
    const projectsByOrg = new Map<string, MockProject[]>();
    const postedBodies: { org?: unknown; project?: unknown } = {};
    let releaseInitialOrgs!: () => void;
    const initialOrgsGate = new Promise<void>((resolve) => {
      releaseInitialOrgs = resolve;
    });

    await page.route("**/api/v1/orgs", async (route) => {
      if (route.request().method() === "GET") {
        await initialOrgsGate;
        return route.fulfill({ json: ok(orgs) });
      }
      if (route.request().method() === "POST") {
        postedBodies.org = route.request().postDataJSON();
        const body = postedBodies.org as { name: string; slug?: string };
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
        postedBodies.project = route.request().postDataJSON();
        const body = postedBodies.project as { name: string; slug?: string; description?: string };
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
    await expect(page.getByText("Loading workspace")).toBeVisible();
    releaseInitialOrgs();

    const switcher = page.getByRole("button", { name: "Switch organization or project" });
    await expect(switcher).toContainText("Create organization");
    await expectNoAxeViolations(page);

    await switcher.click();
    await expectNoAxeViolations(page, true);
    await page.getByRole("menuitem", { name: "New organization" }).click();
    const orgDialog = page.getByRole("dialog");
    await orgDialog.getByLabel("Organization name").fill("Acme QA");
    await orgDialog.getByRole("button", { name: "Create organization" }).click();

    await expect(orgDialog).toBeHidden();
    expect(postedBodies.org).toEqual({ name: "Acme QA" });
    await expect(switcher).toContainText("Acme QA");
    await expect(switcher).toContainText("No project");

    await switcher.click();
    await page.getByRole("menuitem", { name: "New project" }).click();
    const projectDialog = page.getByRole("dialog");
    await projectDialog.getByLabel("Project name").fill("Checkout Web");
    await projectDialog.getByRole("button", { name: "Create project" }).click();

    await expect(projectDialog).toBeHidden();
    expect(postedBodies.project).toEqual({ name: "Checkout Web" });
    await expect(switcher).toContainText("Checkout Web");
    await expect(page.getByText("1 / 2 projects")).toBeVisible();
    await expect(page.getByText("7 days data retention")).toBeVisible();
  });

  test("[SC-ORG-002] switches orgs/projects, suppresses out-of-order project responses, and persists project across reload", async ({
    page,
  }) => {
    const orgA = buildOrg({ id: ORG_1, name: "Alpha Org", slug: "alpha", planTier: "FREE" });
    const orgB = buildOrg({ id: ORG_2, name: "Beta Pro", slug: "beta", planTier: "PRO", role: "ADMIN" });
    const projA = buildProject({ id: PROJ_1, orgId: ORG_1, name: "Alpha Web" });
    const projB1 = buildProject({ id: PROJ_2, orgId: ORG_2, name: "Beta API", role: "ADMIN" });
    const projB2 = buildProject({ id: PROJ_3, orgId: ORG_2, name: "Beta Mobile", slug: "beta-mobile", role: "ADMIN" });

    let holdSecondOrgAFetch = false;
    let releaseStaleOrgA: (() => void) | undefined;

    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok([orgA, orgB]) }));
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, async (route) => {
      if (holdSecondOrgAFetch) {
        await new Promise<void>((resolve) => {
          releaseStaleOrgA = resolve;
        });
      }
      await route.fulfill({ json: ok([projA]) }).catch(() => undefined);
    });
    await page.route(`**/api/v1/orgs/${ORG_2}/projects`, (route) => route.fulfill({ json: ok([projB1, projB2]) }));

    await page.goto("/runs");
    const switcher = page.getByRole("button", { name: "Switch organization or project" });
    await expect(switcher).toContainText("Alpha Org");
    await expect(switcher).toContainText("Alpha Web");

    // Switch to Org B first, then trigger slow Org A and rapidly switch back to Org B before Org A returns.
    await switcher.click();
    await page.getByRole("menuitem", { name: /Beta Pro/ }).click();
    await expect(switcher).toContainText("Beta Pro");

    holdSecondOrgAFetch = true;
    await switcher.click();
    await page.getByRole("menuitem", { name: /Alpha Org/ }).click();
    await switcher.click();
    await expect(page.getByRole("menuitem", { name: "Loading projects..." })).toBeVisible();
    await page.getByRole("menuitem", { name: /Beta Pro/ }).click();

    await expect(switcher).toContainText("Beta Pro");
    await expect(switcher).toContainText("Beta API");
    releaseStaleOrgA?.();

    // Switch to second project within Org B and reload to prove STORAGE_PROJECT_KEY persistence.
    await switcher.click();
    await page.getByRole("menuitem", { name: "Beta Mobile" }).click();
    await expect(switcher).toContainText("Beta Mobile");
    await expect(page.getByText("Pro Tier")).toBeVisible();
    await expect(page.getByText("2 projects (unlimited)")).toBeVisible();
    await expect(page.getByText("90 days data retention")).toBeVisible();

    await page.reload();
    await expect(switcher).toContainText("Beta Pro");
    await expect(switcher).toContainText("Beta Mobile");
  });

  test("[SC-ORG-001] [SC-ORG-008] shows client validation, Cancel reset, server 403/409 dialog errors, plan limits, and role gating", async ({
    page,
  }) => {
    const org = buildOrg({ planTier: "FREE", role: "OWNER" });
    const p1 = buildProject({ id: PROJ_1, name: "First App", slug: "first-app" });
    const p2 = buildProject({ id: PROJ_2, name: "Second App", slug: "second-app" });
    let projects = [p1];
    let orgPostMode: "CONFLICT" | "EMAIL_NOT_VERIFIED" = "CONFLICT";
    let projectPostMode: "CONFLICT" | "PLAN_LIMIT_REACHED" = "CONFLICT";

    await page.route("**/api/v1/orgs", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: ok([org]) });
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: orgPostMode === "CONFLICT" ? 409 : 403,
          json: { success: false, error: { code: orgPostMode, message: "Server refusal" } },
        });
      }
      return route.fallback();
    });
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: ok(projects) });
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: projectPostMode === "CONFLICT" ? 409 : 403,
          json: { success: false, error: { code: projectPostMode, message: "Project refusal" } },
        });
      }
      return route.fallback();
    });

    await page.goto("/runs");
    const switcher = page.getByRole("button", { name: "Switch organization or project" });
    await expect(switcher).toContainText("Acme QA");

    // Client validation alert + Cancel reset on reopen
    await switcher.click();
    await page.getByRole("menuitem", { name: "New organization" }).click();
    const orgDialog = page.getByRole("dialog");
    await orgDialog.getByRole("button", { name: "Create organization" }).click();
    await expect(orgDialog.getByRole("alert")).toContainText("Name is required");
    await orgDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(orgDialog).toBeHidden();

    // Reopen cleanly -> no alert or stale input; test server 409 and 403 EMAIL_NOT_VERIFIED
    await switcher.click();
    await page.getByRole("menuitem", { name: "New organization" }).click();
    await expect(orgDialog.getByRole("alert")).toHaveCount(0);
    await orgDialog.getByLabel("Organization name").fill("Acme QA");
    await orgDialog.getByRole("button", { name: "Create organization" }).click();
    await expect(orgDialog.getByRole("alert")).toContainText("already exists");

    orgPostMode = "EMAIL_NOT_VERIFIED";
    await orgDialog.getByRole("button", { name: "Create organization" }).click();
    await expect(orgDialog.getByRole("alert")).toContainText("Verify your email address");
    await expectNoAxeViolations(page);
    await orgDialog.getByRole("button", { name: "Close" }).click();

    // Server 409 CONFLICT and server 403 PLAN_LIMIT_REACHED on CreateProjectDialog (when 1/2 projects cached locally)
    await switcher.click();
    await page.getByRole("menuitem", { name: "New project" }).click();
    const projDialog = page.getByRole("dialog");
    await projDialog.getByLabel("Project name").fill("First App");
    await projDialog.getByRole("button", { name: "Create project" }).click();
    await expect(projDialog.getByRole("alert")).toContainText("already exists");

    projectPostMode = "PLAN_LIMIT_REACHED";
    await projDialog.getByRole("button", { name: "Create project" }).click();
    await expect(projDialog.getByRole("alert")).toContainText("reached your plan limit");
    await projDialog.getByRole("button", { name: "Close" }).click();

    // Client-side 2 / 2 Free limit notice + disabled submit + MEMBER hiding New project
    projects = [p1, p2];
    await page.reload();
    await switcher.click();
    await page.getByRole("menuitem", { name: "New project" }).click();
    await expect(projDialog.getByText(/Plan limit reached/i)).toBeVisible();
    await expect(projDialog.getByRole("button", { name: "Create project" })).toBeDisabled();
    await expectNoAxeViolations(page);
    await projDialog.getByRole("button", { name: "Close" }).click();

    await page.unroute("**/api/v1/orgs");
    await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: ok([buildOrg({ role: "MEMBER" })]) }));
    await page.reload();
    await switcher.click();
    await expect(page.getByRole("menuitem", { name: "New project" })).toHaveCount(0);
  });

  test("[SC-ORG-002] recovers from org and project load errors cleanly and renders hostile workspace names safely as text", async ({
    page,
  }) => {
    const hostileName = "<img src=x onerror=alert(1)>";
    const org = buildOrg({ name: hostileName });
    const project = buildProject({ name: hostileName });
    let orgCalls = 0;
    let projectCalls = 0;

    await page.route("**/api/v1/orgs", (route) => {
      orgCalls += 1;
      if (orgCalls === 1) {
        return route.fulfill({ status: 500, json: { success: false, error: { code: "INTERNAL", message: "Down" } } });
      }
      return route.fulfill({ json: ok([org]) });
    });
    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) => {
      projectCalls += 1;
      if (projectCalls === 1) {
        return route.fulfill({ status: 500, json: { success: false, error: { code: "INTERNAL", message: "Down" } } });
      }
      return route.fulfill({ json: ok([project]) });
    });

    await page.goto("/runs");
    const unavailableBtn = page.getByRole("button", { name: "Workspace unavailable" });
    await expect(unavailableBtn).toBeVisible();
    await unavailableBtn.click();
    await expectNoAxeViolations(page, true);
    await page.getByRole("menuitem", { name: "Retry" }).click();

    // Orgs loaded, projects errored on first try -> retry projects cleanly
    const switcher = page.getByRole("button", { name: "Switch organization or project" });
    await expect(switcher).toContainText(hostileName);
    await switcher.click();
    await page.getByRole("menuitem", { name: /Retry/ }).click();

    await expect(switcher).toContainText(hostileName);
    await expect(page.locator("img")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
});
