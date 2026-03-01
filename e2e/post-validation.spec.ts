import { test, expect } from "@playwright/test";

test.describe("Post form validation", () => {
  test("shows validation error when submitting empty form", async ({
    page,
  }) => {
    await page.goto("/posts/create");

    await page.getByRole("button", { name: /create post/i }).click();

    // Should show validation error for title
    await expect(page.getByText(/title is required/i)).toBeVisible();
  });

  test("shows validation error for title exceeding 200 characters", async ({
    page,
  }) => {
    await page.goto("/posts/create");

    const longTitle = "A".repeat(201);
    await page.getByLabel(/title/i).fill(longTitle);
    await page.getByLabel(/content/i).fill("Some content");
    await page.getByRole("button", { name: /create post/i }).click();

    await expect(
      page.getByText(/200 characters or less/i),
    ).toBeVisible();
  });

  test("edit form is pre-filled with existing data", async ({ page }) => {
    // First create a post
    await page.goto("/posts/create");
    const uniqueTitle = `Prefill Test ${Date.now()}`;
    await page.getByLabel(/title/i).fill(uniqueTitle);
    await page.getByLabel(/content/i).fill("Content for prefill test");
    await page.getByRole("button", { name: /create post/i }).click();

    // Wait for detail page
    await expect(page).toHaveURL(/\/posts\/\d+$/);

    // Go to edit page
    await page.getByRole("button", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/posts\/\d+\/edit$/);

    // Form should be pre-filled
    await expect(page.getByLabel(/title/i)).toHaveValue(uniqueTitle);
    await expect(page.getByLabel(/content/i)).toHaveValue(
      "Content for prefill test",
    );

    // Clean up: go back and delete
    await page.getByText(/back to post/i).click();
    await page.getByRole("button", { name: /delete/i }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /delete/i })
      .click();
  });
});
