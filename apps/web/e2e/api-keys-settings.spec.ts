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
    await waitForTransitions(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `axe violations (${theme})`).toEqual([]);
  }
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
}

const ok = <T>(data: T) => ({ success: true as const, data });

const ORG_1 = "01950000-0000-7000-8000-000000000001";
const PROJ_1 = "01950000-0000-7000-8000-000000000011";
const USER_1 = "01950000-0000-7000-8000-000000000021";

test.describe("API keys settings page (/settings/api-keys)", () => {
  test("[SC-KEY-001] [SC-KEY-002] [SC-KEY-003] [SC-KEY-004] [SC-UX-004] [SC-UX-005] handles loading, empty, error+retry, Admin show-once creation + snippet, list badges, revoke, role gating, XSS & axe", async ({
    page,
  }) => {
    test.slow();
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    const hostileName = "<img src=x onerror=alert(1)>";
    const dummyPlaintext = `tp_live_${"a".repeat(43)}`;

    let role: "ADMIN" | "MEMBER" = "ADMIN";
    let listMode: "fail" | "empty" | "populated" = "fail";
    let holdList = false;
    let releaseList!: () => void;
    let revokeFails = true;

    const initialKeys: ApiKey[] = [
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
    let currentKeys = [...initialKeys];

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
        return route.fulfill({ json: ok(currentKeys) });
      }
      if (route.request().method() === "POST") {
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
        currentKeys = [newKey, ...currentKeys];
        return route.fulfill({ status: 201, json: ok({ ...newKey, plaintextKey: dummyPlaintext }) });
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
        currentKeys = currentKeys.map((k) =>
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

    // 2. Generate API key -> show-once plaintext dialog + copy + Playwright/Vitest reporter snippet tabs -> reload clear
    listMode = "populated";
    await page.getByRole("button", { name: "Generate API key" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Generate API key" })).toBeVisible();
    await dialog.getByLabel("Key name").fill(`CI ${hostileName}`);
    await dialog.getByLabel("Expiration").selectOption("30d");
    await dialog.getByRole("button", { name: "Create API key" }).click();

    await expect(dialog.getByRole("heading", { name: "Copy your new API key" })).toBeVisible();
    await expect(dialog.getByText("won't be able to view this key again")).toBeVisible();
    await expect(dialog.getByText(dummyPlaintext)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Copy key" })).toBeVisible();

    // Snippet tabs switch between Playwright and Vitest without embedding plaintext key inside config code.
    await expect(dialog.locator("pre")).toContainText("@testpulse/reporter/playwright");
    await expect(dialog.locator("pre")).toContainText("process.env.TESTPULSE_API_KEY");
    await dialog.getByRole("tab", { name: "Vitest" }).click();
    await expect(dialog.locator("pre")).toContainText("@testpulse/reporter/vitest");
    await expectNoAxeViolations(page);

    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toHaveCount(0);

    // Reloading confirms plaintext never reappears and server list renders ACTIVE, EXPIRED, REVOKED + hostile XSS text
    await page.reload();
    await expect(page.getByText(dummyPlaintext)).toHaveCount(0);
    await expect(page.getByText(`CI ${hostileName}`)).toBeVisible();
    await expect(page.getByText(hostileName, { exact: true })).toBeVisible();
    await expect(page.getByText("tp_live_aaaaaaaa…")).toBeVisible();
    await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();
    await expect(page.getByText("EXPIRED", { exact: true })).toBeVisible();
    await expect(page.getByText("REVOKED", { exact: true })).toBeVisible();

    // 3. Revoke key confirmation dialog: error fallback -> retry succeeds
    await page.getByRole("button", { name: `Revoke CI ${hostileName}` }).click();
    const revokeDialog = page.getByRole("alertdialog");
    await expect(revokeDialog).toBeVisible();
    await revokeDialog.getByRole("button", { name: "Revoke key" }).click();
    await expect(revokeDialog.getByRole("alert")).toContainText("couldn't revoke");
    await revokeDialog.getByRole("button", { name: "Revoke key" }).click();
    await expect(revokeDialog).toHaveCount(0);
    await expectNoAxeViolations(page);

    // 4. Member / non-admin gated state
    role = "MEMBER";
    await page.reload();
    await expect(page.getByText("Only organization owners and admins can manage project API keys.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate API key" })).toHaveCount(0);
    await expectNoAxeViolations(page);
    expect(pageErrors).toEqual([]);
  });
});
