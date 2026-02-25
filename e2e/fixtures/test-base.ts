import { type Page, expect } from "@playwright/test";

/** Navigate to the post list page and wait for posts to load */
export async function navigateToPostList(page: Page) {
  await page.goto("/posts");
  // Wait for loading to finish — either post cards appear or empty state
  await page.waitForSelector('[data-slot="skeleton"], h1:has-text("Posts")', {
    state: "attached",
  });
  // Wait for skeletons to disappear (loading complete)
  await page
    .locator('[data-slot="skeleton"]')
    .first()
    .waitFor({ state: "detached", timeout: 10000 })
    .catch(() => {
      // No skeletons means data loaded before we checked
    });
}

/** Create a new post via the create form */
export async function createPost(
  page: Page,
  {
    title,
    content,
    isPublished = false,
  }: {
    title: string;
    content: string;
    isPublished?: boolean;
  },
) {
  await page.goto("/posts/create");
  await page.getByLabel(/title/i).fill(title);
  await page.getByLabel(/content/i).fill(content);

  if (isPublished) {
    await page.getByRole("switch").click();
  }

  await page.getByRole("button", { name: /create post/i }).click();
}

/** Wait for navigation to the post detail page */
export async function waitForPostDetail(page: Page) {
  await expect(page).toHaveURL(/\/posts\/\d+$/);
  // Wait for content to load
  await page
    .locator('[data-slot="skeleton"]')
    .first()
    .waitFor({ state: "detached", timeout: 10000 })
    .catch(() => {});
}
