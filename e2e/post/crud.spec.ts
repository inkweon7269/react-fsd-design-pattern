import { test, expect } from "@playwright/test";
import { createPost, waitForPostDetail } from "../fixtures/post";
import {
  clearAuthCookies,
  loginAndWaitForRedirect,
  registerUser,
} from "../fixtures/auth";

test.describe("Post CRUD flow", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerUser(page);
    await context.close();
  });

  test("create, read, update, and delete a post", async ({ page }) => {
    await clearAuthCookies(page);
    await loginAndWaitForRedirect(page);
    const testTitle = `E2E Test Post ${Date.now()}`;
    const testContent = "This is E2E test content for CRUD validation.";

    // --- Create ---
    await createPost(page, { title: testTitle, content: testContent });
    await waitForPostDetail(page);

    // Verify we're on the detail page with the new post
    await expect(page.getByText(testTitle)).toBeVisible();
    await expect(page.getByText(testContent)).toBeVisible();

    // --- Read ---
    // Verify detail elements are visible
    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByRole("button", { name: /edit/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /delete/i })).toBeVisible();

    // --- Update ---
    await page.getByRole("button", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/posts\/\d+\/edit$/);

    const updatedTitle = `Updated ${testTitle}`;
    const titleInput = page.getByLabel(/title/i);
    await titleInput.clear();
    await titleInput.fill(updatedTitle);
    await page.getByRole("button", { name: /update post/i }).click();

    // Should navigate back to detail page
    await waitForPostDetail(page);
    await expect(page.getByText(updatedTitle)).toBeVisible();

    // --- Delete ---
    await page.getByRole("button", { name: /delete/i }).click();

    // Wait for confirmation dialog
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText(/are you sure/i)).toBeVisible();

    // Click Delete inside the dialog
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /delete/i })
      .click();

    // Should navigate to posts list
    await expect(page).toHaveURL(/\/posts\/?$/);
  });
});
