import { test, expect } from "@playwright/test";
import { navigateToPostList } from "./fixtures/test-base";

test.describe("Post list page", () => {
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

  test("root path redirects to /posts", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/posts\/?$/);
  });

  test("header navigation links work", async ({ page }) => {
    await page.goto("/posts");

    // Click "New Post" in header
    await page.getByRole("button", { name: /new post/i }).click();
    await expect(page).toHaveURL(/\/posts\/create$/);

    // Click "All Posts" in header
    await page.getByRole("button", { name: /all posts/i }).click();
    await expect(page).toHaveURL(/\/posts\/?$/);
  });
});
