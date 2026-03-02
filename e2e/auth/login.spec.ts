import { test, expect } from "@playwright/test";
import {
  loginUser,
  clearAuthCookies,
  expectAuthCookies,
  registerUser,
  TEST_USER,
} from "../fixtures/auth";

test.describe("Login flow", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerUser(page);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await clearAuthCookies(page);
  });

  test("displays login form with email and password fields", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.locator('[data-slot="card-title"]')).toHaveText(/login/i);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("button", { name: /^login$/i }),
    ).toBeVisible();
  });

  test("successful login stores cookies and redirects to /posts", async ({
    page,
  }) => {
    await loginUser(page);

    await expect(page).toHaveURL(/\/posts\/?$/);
    await expectAuthCookies(page, { present: true });
  });

  test("shows error message for invalid credentials", async ({ page }) => {
    await loginUser(page, {
      email: TEST_USER.email,
      password: "wrongpassword123",
    });

    await expect(
      page.getByText(/invalid email or password/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows validation error for empty email", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Password").fill("somepassword");
    await page.getByRole("main").getByRole("button", { name: /^login$/i }).click();

    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test("shows validation error for password shorter than 6 characters", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel("Password").fill("12345");
    await page.getByRole("main").getByRole("button", { name: /^login$/i }).click();

    await expect(
      page.getByText(/password must be at least 6 characters/i),
    ).toBeVisible();
  });

  test("navigates to register page via link", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("main").getByRole("link", { name: /register/i }).click();

    await expect(page).toHaveURL(/\/register/);
  });
});
