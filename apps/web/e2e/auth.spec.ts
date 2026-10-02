import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Authentication Web UI & Accessibility E2E Suite", () => {
  test("[SC-AUTH-020] verifies /login renders with WCAG 2.1 AA in light and dark themes", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in to TestPulse");
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // 1. Light Theme Axe Audit
    const lightAxe = await new AxeBuilder({ page }).analyze();
    expect(lightAxe.violations).toEqual([]);

    // 2. Dark Theme Axe Audit
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
    const darkAxe = await new AxeBuilder({ page }).analyze();
    expect(darkAxe.violations).toEqual([]);
  });

  test("[SC-AUTH-020] verifies /register renders with WCAG 2.1 AA and form interaction", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create an account");
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Work email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();

    // Light Theme Axe Audit
    const lightAxe = await new AxeBuilder({ page }).analyze();
    expect(lightAxe.violations).toEqual([]);

    // Form interaction: client-side short password validation
    await page.getByLabel("Full name").fill("Sarah Connor");
    await page.getByLabel("Work email").fill("sarah@example.com");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.locator("form").getByRole("alert")).toContainText("at least 10 characters");

    // Dark Theme Axe Audit
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
    const darkAxe = await new AxeBuilder({ page }).analyze();
    expect(darkAxe.violations).toEqual([]);
  });

  test("[SC-AUTH-020] verifies /forgot-password renders with WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reset your password");
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();

    // Light Theme Axe Audit
    const lightAxe = await new AxeBuilder({ page }).analyze();
    expect(lightAxe.violations).toEqual([]);

    // Dark Theme Axe Audit
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
    const darkAxe = await new AxeBuilder({ page }).analyze();
    expect(darkAxe.violations).toEqual([]);
  });

  test("[SC-AUTH-020] verifies /reset-password renders with WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/reset-password?token=dummy-sample-token-min-32-characters-test");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Set new password");
    await expect(page.getByLabel("New password")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset password" })).toBeVisible();

    // Light Theme Axe Audit
    const lightAxe = await new AxeBuilder({ page }).analyze();
    expect(lightAxe.violations).toEqual([]);

    // Dark Theme Axe Audit
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
    const darkAxe = await new AxeBuilder({ page }).analyze();
    expect(darkAxe.violations).toEqual([]);
  });

  test("[SC-AUTH-020] verifies /verify-email renders with WCAG 2.1 AA", async ({ page }) => {
    await page.goto("/verify-email");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Verify your email");
    await expect(page.getByLabel("Verification token")).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify email" })).toBeVisible();

    // Light Theme Axe Audit
    const lightAxe = await new AxeBuilder({ page }).analyze();
    expect(lightAxe.violations).toEqual([]);

    // Dark Theme Axe Audit
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
    const darkAxe = await new AxeBuilder({ page }).analyze();
    expect(darkAxe.violations).toEqual([]);
  });
});
