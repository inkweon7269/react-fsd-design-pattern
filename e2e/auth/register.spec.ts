import { test, expect } from "@playwright/test";
import { registerUser, clearAuthCookies } from "../fixtures/auth";

test.describe("Register flow", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthCookies(page);
  });

  test("displays register form with all required fields", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator('[data-slot="card-title"]')).toHaveText(
      /create account/i,
    );
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeVisible();
  });

  test("successful registration redirects to /login", async ({ page }) => {
    const uniqueEmail = `e2e-register-${Date.now()}@example.com`;

    await registerUser(page, {
      name: "New User",
      email: uniqueEmail,
      password: "securepassword123",
    });

    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error for duplicate email", async ({ page }) => {
    const duplicateEmail = `e2e-dup-${Date.now()}@example.com`;

    // First registration
    await registerUser(page, {
      name: "First User",
      email: duplicateEmail,
      password: "password123456",
    });
    await expect(page).toHaveURL(/\/login/);

    // Second registration with same email
    await registerUser(page, {
      name: "Second User",
      email: duplicateEmail,
      password: "password123456",
    });

    await expect(
      page.getByText(/this email is already registered/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("shows validation error for empty name", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test("shows validation error for name exceeding 50 characters", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("A".repeat(51));
    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/50 characters or less/i)).toBeVisible();
  });

  test("shows validation error for password shorter than 8 characters", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByLabel("Confirm Password").fill("short");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.getByText(/password must be at least 8 characters/i),
    ).toBeVisible();
  });

  test("shows validation error when passwords do not match", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("differentpassword");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/passwords must match/i)).toBeVisible();
  });

  test("navigates to login page via link", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("main").getByRole("link", { name: /login/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});
