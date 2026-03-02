import { test, expect } from "@playwright/test";
import {
  clearAuthCookies,
  loginAndWaitForRedirect,
  expectAuthCookies,
  registerUser,
  logoutUser,
} from "../fixtures/auth";

test.describe("Auth navigation", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerUser(page);
    await context.close();
  });

  test.describe("header - unauthenticated", () => {
    test.beforeEach(async ({ page }) => {
      await clearAuthCookies(page);
    });

    test("shows Login and Register buttons, hides Logout and New Post", async ({
      page,
    }) => {
      await page.goto("/posts");

      await expect(page.getByRole("button", { name: /login/i })).toBeVisible();
      await expect(
        page.getByRole("button", { name: /register/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /logout/i }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: /new post/i }),
      ).not.toBeVisible();
    });

    test("Login button navigates to /login", async ({ page }) => {
      await page.goto("/posts");
      await page.getByRole("button", { name: /login/i }).click();

      await expect(page).toHaveURL(/\/login/);
    });

    test("Register button navigates to /register", async ({ page }) => {
      await page.goto("/posts");
      await page.getByRole("button", { name: /register/i }).click();

      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe("header - authenticated", () => {
    test.beforeEach(async ({ page }) => {
      await clearAuthCookies(page);
      await loginAndWaitForRedirect(page);
    });

    test("shows All Posts, New Post, and Logout buttons, hides Login and Register", async ({
      page,
    }) => {
      await expect(
        page.getByRole("button", { name: /all posts/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /new post/i }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /logout/i })).toBeVisible();
      await expect(
        page.getByRole("button", { name: /login/i }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: /register/i }),
      ).not.toBeVisible();
    });

    test("New Post button navigates to /posts/create", async ({ page }) => {
      await page.getByRole("button", { name: /new post/i }).click();

      await expect(page).toHaveURL(/\/posts\/create$/);
    });

    test("All Posts button navigates to /posts", async ({ page }) => {
      await page.goto("/posts/create");
      await page.getByRole("button", { name: /all posts/i }).click();

      await expect(page).toHaveURL(/\/posts\/?$/);
    });
  });

  test.describe("logout", () => {
    test.beforeEach(async ({ page }) => {
      await clearAuthCookies(page);
      await loginAndWaitForRedirect(page);
    });

    test("clears auth cookies on logout", async ({ page }) => {
      await expectAuthCookies(page, { present: true });

      await logoutUser(page);

      await expectAuthCookies(page, { present: false });
    });

    test("header switches to unauthenticated state after logout", async ({
      page,
    }) => {
      await logoutUser(page);
      await page.goto("/posts");

      await expect(page.getByRole("button", { name: /login/i })).toBeVisible();
      await expect(
        page.getByRole("button", { name: /register/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /logout/i }),
      ).not.toBeVisible();
    });

    test("cannot access protected route after logout", async ({ page }) => {
      await logoutUser(page);

      await page.goto("/posts/create");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("full lifecycle", () => {
    test("register → login → access protected route → logout → blocked", async ({
      page,
    }) => {
      await clearAuthCookies(page);
      const uniqueEmail = `e2e-lifecycle-${Date.now()}@example.com`;

      // Register
      await registerUser(page, {
        name: "Lifecycle User",
        email: uniqueEmail,
        password: "lifecycle123",
      });
      await expect(page).toHaveURL(/\/login/);

      // Login
      await loginAndWaitForRedirect(page, {
        email: uniqueEmail,
        password: "lifecycle123",
      });

      // Access protected route
      await page.goto("/posts/create");
      await expect(page).toHaveURL(/\/posts\/create/);

      // Logout
      await logoutUser(page);

      // Blocked from protected route
      await page.goto("/posts/create");
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
