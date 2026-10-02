import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Design System & App Shell E2E Suite", () => {
  test("[SC-UX-001] renders component catalog in both themes with zero accessibility violations", async ({ page }) => {
    // 1. Light Mode Verification
    await page.goto("/dev/ui");
    await expect(page.locator("h1")).toContainText("TestPulse Design System Catalog");

    // Verify key primitive sections render
    await expect(page.getByText("1. Buttons & Icon Actions")).toBeVisible();
    await expect(page.getByText("2. Test Status Indicators & Badges")).toBeVisible();
    await expect(page.getByText("3. Form Controls & Inputs")).toBeVisible();
    await expect(page.getByText("4. Overlays, Menus & Tooltips")).toBeVisible();
    await expect(page.getByText("5. Tabs & Structured Data Tables")).toBeVisible();
    await expect(page.getByText("6. Feedback States")).toBeVisible();
    await expect(page.getByText("7. Safe Code & Stack Trace Viewer")).toBeVisible();

    // Verify status badges are displayed in the status badges section
    const badgesSection = page.locator("section", { hasText: "2. Test Status Indicators & Badges" });
    await expect(badgesSection.getByText("Passed")).toBeVisible();
    await expect(badgesSection.getByText("Failed")).toBeVisible();
    await expect(badgesSection.getByText("Flaky")).toBeVisible();
    await expect(badgesSection.getByText("Quarantined")).toBeVisible();
    await expect(badgesSection.getByText("Running")).toBeVisible();

    // Run Axe audit in light theme
    const lightAxeResults = await new AxeBuilder({ page }).analyze();
    expect(lightAxeResults.violations).toEqual([]);

    // 2. Dark Mode Verification
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await expect(page.locator("html")).toHaveClass(/dark/);
    // Allow CSS color transitions to complete before accessibility evaluation
    await page.waitForTimeout(300);

    // Run Axe audit in dark theme
    const darkAxeResults = await new AxeBuilder({ page }).analyze();
    expect(darkAxeResults.violations).toEqual([]);
  });

  test("[SC-UX-002] loads page with dark system preference without theme flash", async ({ browser }) => {
    const darkContext = await browser.newContext({
      colorScheme: "dark",
    });
    const page = await darkContext.newPage();

    await page.goto("/dev/ui");

    // The inline pre-hydration script must apply .dark to <html> immediately
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(true);

    await darkContext.close();
  });

  test("[SC-UX-003] persists user theme choice in localStorage across reloads", async ({ page }) => {
    await page.goto("/dev/ui");

    // Set theme to dark via client script / toggle simulation
    await page.evaluate(() => {
      localStorage.setItem("testpulse-theme", "dark");
      document.documentElement.classList.add("dark");
    });

    // Reload page
    await page.reload();

    const storedTheme = await page.evaluate(() => localStorage.getItem("testpulse-theme"));
    expect(storedTheme).toBe("dark");

    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(hasDarkClass).toBe(true);
  });

  test("[SC-UX-005] app shell renders navigation and satisfies WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/runs");

    // Header & Sidebar landmarks
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main Navigation" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Test Runs");

    // Connection status pill
    await expect(page.getByText("Live", { exact: true })).toBeVisible();

    // Run Axe scan on App Shell
    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);
  });
});
