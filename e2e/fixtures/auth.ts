import { type Page, expect } from "@playwright/test";

// ── Constants ──

export const TEST_USER = {
  name: "E2E Test User",
  email: "e2e-test@example.com",
  password: "testpassword123",
};

const AUTH_COOKIES = {
  ACCESS_TOKEN: "auth_access_token",
  REFRESH_TOKEN: "auth_refresh_token",
};

// ── Cookie Management ──

/** Clear all cookies from the browser context */
export async function clearAuthCookies(page: Page) {
  await page.context().clearCookies();
}

/** Assert that auth cookies exist (or don't) in the browser context */
export async function expectAuthCookies(
  page: Page,
  expected: { present: boolean },
) {
  const cookies = await page.context().cookies();
  const accessCookie = cookies.find(
    (c) => c.name === AUTH_COOKIES.ACCESS_TOKEN,
  );
  const refreshCookie = cookies.find(
    (c) => c.name === AUTH_COOKIES.REFRESH_TOKEN,
  );
  if (expected.present) {
    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
  } else {
    expect(accessCookie).toBeUndefined();
    expect(refreshCookie).toBeUndefined();
  }
}

// ── Form Interactions ──

/** Register a new user via the register form */
export async function registerUser(
  page: Page,
  user: { name: string; email: string; password: string } = TEST_USER,
  options: { expectSuccess?: boolean } = {},
) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByLabel("Confirm Password").fill(user.password);
  await page.getByRole("button", { name: /create account/i }).click();
  if (options.expectSuccess ?? true) {
    await expect(page).toHaveURL(/\/login\/?$/);
  }
}

/** Login a user via the login form */
export async function loginUser(
  page: Page,
  credentials: { email: string; password: string } = {
    email: TEST_USER.email,
    password: TEST_USER.password,
  },
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page
    .getByRole("main")
    .getByRole("button", { name: /^login$/i })
    .click();
}

/** Login and wait for successful redirect to /posts */
export async function loginAndWaitForRedirect(
  page: Page,
  credentials?: { email: string; password: string },
) {
  await loginUser(page, credentials);
  await expect(page).toHaveURL(/\/posts\/?$/);
}

/** Click the logout button in the header */
export async function logoutUser(page: Page) {
  await page.getByRole("button", { name: /logout/i }).click();
}
