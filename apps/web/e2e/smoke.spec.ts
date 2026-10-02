import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Web App Smoke & Health Suite", () => {
  test("[SC-OPS-002] renders landing scaffold with accessible markup", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("TestPulse");
    await expect(page.getByText("See your tests. In real time.")).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("[SC-OPS-002] web liveness probe /healthz returns ok status", async ({ request }) => {
    const res = await request.get("/healthz");
    expect(res.ok()).toBeTruthy();
    const data: unknown = await res.json();
    expect(data).toEqual({
      success: true,
      data: {
        status: "ok",
        service: "web",
      },
    });
  });
});
