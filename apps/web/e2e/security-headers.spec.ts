import { expect, test } from "@playwright/test";

test("[SC-SEC-005] sends a fresh CSP nonce and preserves client navigation and same-origin sign-in", async ({
  page,
}) => {
  const documents: string[] = [];
  const violations: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") documents.push(request.url());
  });
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) violations.push(message.text());
  });

  const user = {
    id: "01950000-0000-7000-8000-000000000055",
    name: "Test User",
    email: "browser@example.com",
    emailVerifiedAt: "2026-11-26T00:00:00.000Z",
    createdAt: "2026-11-26T00:00:00.000Z",
  };
  await page.route("**/api/v1/auth/login", (route) => route.fulfill({ json: { success: true, data: { user } } }));
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: { success: true, data: { user } } }));
  await page.route("**/api/v1/orgs", (route) => route.fulfill({ json: { success: true, data: { orgs: [] } } }));

  const first = await page.goto("/login");
  const policy = first?.headers()["content-security-policy"] ?? "";
  const nonce = /script-src [^;]*'nonce-([^']+)'/.exec(policy)?.[1] ?? "";
  expect(nonce.length).toBeGreaterThan(0);
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toMatch(/script-src [^;]*'unsafe-(inline|eval)'/);
  expect(first?.headers()["strict-transport-security"]).toMatch(/max-age=[1-9]\d+/);
  const scriptNonces = await page
    .locator("script")
    .evaluateAll((scripts) =>
      scripts.filter((script) => script instanceof HTMLScriptElement && !script.type).map((script) => script.nonce),
    );
  expect(scriptNonces.length).toBeGreaterThan(0);
  expect([...new Set(scriptNonces)]).toEqual([nonce]);

  const second = await page.reload();
  const secondPolicy = second?.headers()["content-security-policy"] ?? "";
  expect(secondPolicy).toMatch(/script-src [^;]*'nonce-[^']+'/);
  expect(secondPolicy).not.toContain(`'nonce-${nonce}'`);
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password").fill("ExamplePassword123!");
  const loginResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  const login = await loginResponse;
  expect(new URL(login.url()).origin).toBe(new URL(page.url()).origin);
  expect(login.status()).toBe(200);
  await expect(page).toHaveURL(/\/runs$/);
  expect(documents).toHaveLength(2);
  expect(violations).toEqual([]);
});
