import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import type { ApiKey } from "@testpulse/shared";

async function waitForTransitions(page: Page) {
  await page.evaluate(async () => {
    await Promise.allSettled(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    );
  });
}

async function expectNoAxeViolations(page: Page) {
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((next) => {
      document.documentElement.classList.toggle("dark", next === "dark");
    }, theme);
    if (theme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/);
    } else {
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    }
    await waitForTransitions(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `axe violations (${theme})`).toEqual([]);
  }
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await waitForTransitions(page);
}

const ok = <T>(data: T) => ({ success: true as const, data });

const ORG_1 = "01950000-0000-7000-8000-000000000001";
const PROJ_1 = "01950000-0000-7000-8000-000000000011";
const PROJ_2 = "01950000-0000-7000-8000-000000000012";
const USER_1 = "01950000-0000-7000-8000-000000000021";

test.describe("API keys settings page (/settings/api-keys)", () => {
  test("[SC-KEY-003] [SC-UX-004] renders loading workspace skeleton and no-project empty state before selection", async ({
    page,
  }) => {
    let holdOrgs = true;
    let releaseOrgs!: () => void;

    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        json: ok({
          user: {
            id: USER_1,
            email: "admin@example.com",
            name: "Ada Admin",
            emailVerifiedAt: "2026-10-01T00:00:00.000Z",
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        }),
      }),
    );

    await page.route("**/api/v1/orgs", async (route) => {
      if (holdOrgs) {
        await new Promise<void>((r) => {
          releaseOrgs = r;
        });
      }
      return route.fulfill({
        json: ok([
          {
            id: ORG_1,
            name: "Acme QA",
            slug: "acme-qa",
            planTier: "FREE",
            role: "ADMIN" as const,
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        ]),
      });
    });

    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) => route.fulfill({ json: ok([]) }));

    await page.goto("/settings/api-keys");
    await expect(page.getByRole("status", { name: "Loading workspace" })).toBeVisible();
    holdOrgs = false;
    releaseOrgs();

    await expect(page.getByRole("heading", { name: "Select a project first" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("[SC-KEY-001] [SC-KEY-002] [SC-KEY-003] [SC-KEY-004] [SC-UX-004] [SC-UX-005] covers states, validation/403 errors, show-once copy & reset, list details, revoke, project switch, role gating, XSS & axe", async ({
    page,
  }) => {
    test.slow();
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    const hostileName = "<img src=x onerror=alert(1)>";
    const dummyPlaintext = `tp_live_${"a".repeat(43)}`;

    let role: "ADMIN" | "MEMBER" | "VIEWER" = "ADMIN";
    let listMode: "fail" | "empty" | "populated" = "fail";
    let holdList = false;
    let releaseList!: () => void;
    let postFailCode: "VALIDATION_ERROR" | "FORBIDDEN" | null = "VALIDATION_ERROR";
    let revokeFails = true;

    const proj1Keys: ApiKey[] = [
      {
        id: "01950000-0000-7000-8000-000000000101",
        orgId: ORG_1,
        projectId: PROJ_1,
        name: "Nightly Expired",
        prefix: "cccccccc",
        createdById: USER_1,
        createdByName: hostileName,
        lastUsedAt: null,
        expiresAt: "2026-01-01T00:00:00.000Z",
        revokedAt: null,
        status: "EXPIRED" as const,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "01950000-0000-7000-8000-000000000102",
        orgId: ORG_1,
        projectId: PROJ_1,
        name: "Old Compromised Key",
        prefix: "dddddddd",
        createdById: USER_1,
        createdByName: "Ada Admin",
        lastUsedAt: "2026-10-05T12:00:00.000Z",
        expiresAt: null,
        revokedAt: "2026-10-06T12:00:00.000Z",
        status: "REVOKED" as const,
        createdAt: "2026-02-01T00:00:00.000Z",
      },
    ];
    let currentProj1Keys = [...proj1Keys];

    const proj2Keys: ApiKey[] = [
      {
        id: "01950000-0000-7000-8000-000000000201",
        orgId: ORG_1,
        projectId: PROJ_2,
        name: "Mobile Release Key",
        prefix: "eeeeeeee",
        createdById: USER_1,
        createdByName: "Ada Admin",
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        status: "ACTIVE" as const,
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    ];

    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        json: ok({
          user: {
            id: USER_1,
            email: "admin@example.com",
            name: "Ada Admin",
            emailVerifiedAt: "2026-10-01T00:00:00.000Z",
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        }),
      }),
    );

    await page.route("**/api/v1/orgs", (route) =>
      route.fulfill({
        json: ok([
          {
            id: ORG_1,
            name: "Acme QA",
            slug: "acme-qa",
            planTier: "FREE",
            role,
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        ]),
      }),
    );

    await page.route(`**/api/v1/orgs/${ORG_1}/projects`, (route) =>
      route.fulfill({
        json: ok([
          {
            id: PROJ_1,
            orgId: ORG_1,
            name: "Core Web",
            slug: "core-web",
            description: null,
            defaultBranch: "main",
            slaDays: 14,
            retentionDays: 30,
            flakyWindow: 10,
            flakyThreshold: 3,
            trackedBranches: ["main"],
            role,
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-01T00:00:00.000Z",
          },
          {
            id: PROJ_2,
            orgId: ORG_1,
            name: "Mobile App",
            slug: "mobile-app",
            description: null,
            defaultBranch: "main",
            slaDays: 14,
            retentionDays: 30,
            flakyWindow: 10,
            flakyThreshold: 3,
            trackedBranches: ["main"],
            role,
            createdAt: "2026-10-02T00:00:00.000Z",
            updatedAt: "2026-10-02T00:00:00.000Z",
          },
        ]),
      }),
    );

    await page.route(`**/api/v1/projects/${PROJ_1}/api-keys`, async (route) => {
      if (route.request().method() === "GET") {
        if (holdList) {
          await new Promise<void>((r) => {
            releaseList = r;
          });
        }
        if (listMode === "fail") {
          return route.fulfill({
            status: 500,
            json: { success: false, error: { code: "INTERNAL", message: "DB error" } },
          });
        }
        if (listMode === "empty") {
          return route.fulfill({ json: ok([]) });
        }
        return route.fulfill({ json: ok(currentProj1Keys) });
      }
      if (route.request().method() === "POST") {
        if (postFailCode === "VALIDATION_ERROR") {
          postFailCode = "FORBIDDEN";
          return route.fulfill({
            status: 400,
            json: { success: false, error: { code: "VALIDATION_ERROR", message: "Bad payload" } },
          });
        }
        if (postFailCode === "FORBIDDEN") {
          postFailCode = null;
          return route.fulfill({
            status: 403,
            json: { success: false, error: { code: "FORBIDDEN", message: "Not admin" } },
          });
        }
        const body = route.request().postDataJSON() as { name: string; expiresAt?: string };
        const newKey = {
          id: "01950000-0000-7000-8000-000000000103",
          orgId: ORG_1,
          projectId: PROJ_1,
          name: body.name,
          prefix: "aaaaaaaa",
          createdById: USER_1,
          createdByName: "Ada Admin",
          lastUsedAt: null,
          expiresAt: body.expiresAt ?? null,
          revokedAt: null,
          status: "ACTIVE" as const,
          createdAt: "2026-11-26T00:00:00.000Z",
        };
        currentProj1Keys = [newKey, ...currentProj1Keys];
        return route.fulfill({ status: 201, json: ok({ ...newKey, plaintextKey: dummyPlaintext }) });
      }
      return route.fulfill({ status: 405 });
    });

    await page.route(`**/api/v1/projects/${PROJ_2}/api-keys`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: ok(proj2Keys) });
      }
      return route.fulfill({ status: 405 });
    });

    await page.route(`**/api/v1/projects/${PROJ_1}/api-keys/*`, (route) => {
      if (route.request().method() === "DELETE") {
        if (revokeFails) {
          revokeFails = false;
          return route.fulfill({
            status: 500,
            json: { success: false, error: { code: "INTERNAL", message: "Revoke fail" } },
          });
        }
        const keyId = route.request().url().split("/").pop() ?? "";
        currentProj1Keys = currentProj1Keys.map((k) =>
          k.id === keyId ? { ...k, revokedAt: "2026-11-26T01:00:00.000Z", status: "REVOKED" as const } : k,
        );
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ status: 405 });
    });

    // 1. Settings nav link + loading skeleton + load failure + Retry -> empty state
    holdList = true;
    await page.goto("/settings/api-keys");
    await expect(page.getByRole("link", { name: "API keys" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByLabel("Loading API keys")).toBeVisible();
    holdList = false;
    releaseList();

    await expect(page.getByRole("main").getByRole("alert")).toContainText("couldn't load API keys");
    await expectNoAxeViolations(page);

    listMode = "empty";
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("heading", { name: "No API keys yet" })).toBeVisible();
    await expectNoAxeViolations(page);

    // 2. Generate dialog: client validation, 400/403 server alerts, Cancel reset, axe scan, then create + Copy + Escape reset
    listMode = "populated";
    await page.getByRole("button", { name: "Generate API key" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Generate API key" })).toBeVisible();
    await expectNoAxeViolations(page);

    await dialog.getByLabel("Key name").fill("Bad\u0007Key");
    await dialog.getByRole("button", { name: "Create API key" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Generate API key" }).click();
    await expect(dialog.getByLabel("Key name")).toHaveValue("");
    await expect(dialog.getByRole("alert")).toHaveCount(0);

    await dialog.getByLabel("Key name").fill(`CI ${hostileName}`);
    await dialog.getByLabel("Expiration").selectOption("30d");
    await dialog.getByRole("button", { name: "Create API key" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Enter a valid API key name");

    await dialog.getByRole("button", { name: "Create API key" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Only organization owners and admins");

    await dialog.getByRole("button", { name: "Create API key" }).click();
    await expect(dialog.getByRole("heading", { name: "Copy your new API key" })).toBeVisible();
    await expect(dialog.getByText("won't be able to view this key again")).toBeVisible();
    await expect(dialog.getByText(dummyPlaintext)).toBeVisible();

    await dialog.getByRole("button", { name: "Copy key" }).click();
    await expect(dialog.getByRole("button", { name: "Copied" })).toBeVisible();

    await expect(dialog.locator("pre")).toContainText("@testpulse/reporter/playwright");
    await expect(dialog.locator("pre")).toContainText("process.env.TESTPULSE_API_KEY");
    await dialog.getByRole("tab", { name: "Vitest" }).click();
    await expect(dialog.locator("pre")).toContainText("@testpulse/reporter/vitest");
    await expectNoAxeViolations(page);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    // Reopening after Escape shows fresh Create form without plaintext leak
    await page.getByRole("button", { name: "Generate API key" }).click();
    await expect(dialog.getByRole("heading", { name: "Generate API key" })).toBeVisible();
    await expect(dialog.getByText(dummyPlaintext)).toHaveCount(0);
    await dialog.getByRole("button", { name: "Cancel" }).click();

    // Reloading confirms server list renders ACTIVE, EXPIRED, REVOKED, lastUsedAt, "Revoked" label, & XSS-safe creator
    await page.reload();
    await expect(page.getByText(dummyPlaintext)).toHaveCount(0);
    const createdRow = page.getByRole("row", {
      name: new RegExp(`CI ${hostileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    });
    await expect(createdRow).toBeVisible();
    await expect(page.getByText(hostileName, { exact: true })).toBeVisible();
    await expect(page.getByText("tp_live_aaaaaaaa…")).toBeVisible();
    await expect(page.getByText("Oct 5, 2026")).toBeVisible();
    await expect(createdRow).toContainText("Never");

    const preRevokedRow = page.getByRole("row", { name: /Old Compromised Key/ });
    await expect(preRevokedRow).toContainText("REVOKED");
    await expect(preRevokedRow.getByText("Revoked", { exact: true })).toBeVisible();
    await expect(preRevokedRow.getByRole("button")).toHaveCount(0);

    // 3. Revoke dialog: axe scan + error fallback -> retry succeeds -> row updates to REVOKED
    await page.getByRole("button", { name: `Revoke CI ${hostileName}` }).click();
    const revokeDialog = page.getByRole("alertdialog");
    await expect(revokeDialog).toBeVisible();
    await expectNoAxeViolations(page);
    await revokeDialog.getByRole("button", { name: "Revoke key" }).click();
    await expect(revokeDialog.getByRole("alert")).toContainText("couldn't revoke");
    await revokeDialog.getByRole("button", { name: "Revoke key" }).click();
    await expect(revokeDialog).toHaveCount(0);
    await expect(createdRow).toContainText("REVOKED");
    await expect(createdRow.getByText("Revoked", { exact: true })).toBeVisible();
    await expect(createdRow.getByRole("button", { name: `Revoke CI ${hostileName}` })).toHaveCount(0);

    // 4. Switching active project updates the project name and reloads API keys for PROJ_2
    await page.getByRole("button", { name: "Switch organization or project" }).click();
    await page.getByRole("menuitem", { name: "Mobile App" }).click();
    await expect(page.getByText("Manage project-scoped CI ingestion keys for Mobile App.")).toBeVisible();
    await expect(page.getByText("Mobile Release Key")).toBeVisible();
    await expect(page.getByText("Nightly Expired")).toHaveCount(0);

    // 5. Member & Viewer role gating
    role = "MEMBER";
    await page.reload();
    await expect(page.getByText("Only organization owners and admins can manage project API keys.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate API key" })).toHaveCount(0);
    await expectNoAxeViolations(page);

    role = "VIEWER";
    await page.reload();
    await expect(page.getByText("Only organization owners and admins can manage project API keys.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate API key" })).toHaveCount(0);

    expect(pageErrors).toEqual([]);
  });
});
