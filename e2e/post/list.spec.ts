import { test, expect } from "@playwright/test";
import { navigateToPostList } from "../fixtures/post";
import {
  clearAuthCookies,
  loginAndWaitForRedirect,
  registerUser,
} from "../fixtures/auth";

test.describe("Post list page", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerUser(page);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await clearAuthCookies(page);
    await loginAndWaitForRedirect(page);
  });

  test("loads and displays post cards", async ({ page }) => {
    await navigateToPostList(page);

    // At least one post card should be visible
    const cards = page.locator('[data-slot="card"]');
    await expect(cards.first()).toBeVisible();
  });

  test("navigates to detail page when clicking a post card", async ({
    page,
  }) => {
    await navigateToPostList(page);

    // Click the first post card
    const firstCard = page.locator('[data-slot="card"]').first();
    await firstCard.click();

    // Should navigate to /posts/{id}
    await expect(page).toHaveURL(/\/posts\/\d+$/);
  });
});
