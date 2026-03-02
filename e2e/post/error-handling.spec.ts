import { test, expect } from "@playwright/test";

test.describe("Error handling", () => {
  test("shows error for non-existent post", async ({ page }) => {
    await page.goto("/posts/999999");

    // Wait for error message
    await expect(page.getByText(/failed to load post/i)).toBeVisible({
      timeout: 10000,
    });

    // "Back to Posts" button should be visible
    const backButton = page.getByRole("button", { name: /back to posts/i });
    await expect(backButton).toBeVisible();
  });

  test("navigates back to posts list from error page", async ({ page }) => {
    await page.goto("/posts/999999");

    await expect(page.getByText(/failed to load post/i)).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: /back to posts/i }).click();
    await expect(page).toHaveURL(/\/posts\/?$/);
  });
});
