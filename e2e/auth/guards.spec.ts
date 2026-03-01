import { test, expect } from "@playwright/test";
import {
  clearAuthCookies,
  loginAndWaitForRedirect,
  registerUser,
} from "../fixtures/auth";

test.describe("Route guards", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerUser(page);
    await context.close();
  });

  test.describe("requireAuth guard", () => {
    test.beforeEach(async ({ page }) => {
      await clearAuthCookies(page);
    });

    test("redirects unauthenticated user from /posts/create to /login", async ({
      page,
    }) => {
      await page.goto("/posts/create");
      await expect(page).toHaveURL(/\/login/);
    });

    test("redirects unauthenticated user from /posts/1/edit to /login", async ({
      page,
    }) => {
      await page.goto("/posts/1/edit");
      await expect(page).toHaveURL(/\/login/);
    });

    test("allows authenticated user to access /posts/create", async ({
      page,
    }) => {
      await loginAndWaitForRedirect(page);
      await page.goto("/posts/create");
      await expect(page).toHaveURL(/\/posts\/create/);
    });
  });

  test.describe("requireGuest guard", () => {
    test("redirects authenticated user from /login to /posts", async ({
      page,
    }) => {
      await clearAuthCookies(page);
      await loginAndWaitForRedirect(page);

      await page.goto("/login");
      await expect(page).toHaveURL(/\/posts\/?$/);
    });

    test("redirects authenticated user from /register to /posts", async ({
      page,
    }) => {
      await clearAuthCookies(page);
      await loginAndWaitForRedirect(page);

      await page.goto("/register");
      await expect(page).toHaveURL(/\/posts\/?$/);
    });

    test("allows unauthenticated user to access /login", async ({ page }) => {
      await clearAuthCookies(page);
      await page.goto("/login");
      await expect(page).toHaveURL(/\/login/);
    });

    test("allows unauthenticated user to access /register", async ({
      page,
    }) => {
      await clearAuthCookies(page);
      await page.goto("/register");
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe("public routes", () => {
    test("allows unauthenticated user to access /posts", async ({ page }) => {
      await clearAuthCookies(page);
      await page.goto("/posts");
      await expect(page).toHaveURL(/\/posts\/?$/);
    });
  });

  test.describe("root redirect", () => {
    test("redirects unauthenticated user from / to /login", async ({
      page,
    }) => {
      await clearAuthCookies(page);
      await page.goto("/");
      await expect(page).toHaveURL(/\/login/);
    });

    test("redirects authenticated user from / to /posts", async ({ page }) => {
      await clearAuthCookies(page);
      await loginAndWaitForRedirect(page);

      await page.goto("/");
      await expect(page).toHaveURL(/\/posts\/?$/);
    });
  });
});
