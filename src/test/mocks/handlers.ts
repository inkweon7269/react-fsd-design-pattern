import { http, HttpResponse, delay } from "msw";
import {
  createMockPost,
  createMockPaginatedResponse,
  createMockPostList,
} from "./data";

const BASE_URL = "*/api";

const registeredEmails = new Set<string>();

export function resetRegisteredEmails() {
  registeredEmails.clear();
}

export const handlers = [
  http.get(`${BASE_URL}/posts`, async ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 10;
    const allPosts = createMockPostList(25);
    const start = (page - 1) * limit;
    const paginatedPosts = allPosts.slice(start, start + limit);

    await delay(50);
    return HttpResponse.json(
      createMockPaginatedResponse(paginatedPosts, {
        totalElements: 25,
        page,
        limit,
      }),
    );
  }),

  http.get(`${BASE_URL}/posts/:id`, async ({ params }) => {
    const id = Number(params.id);
    await delay(50);
    return HttpResponse.json(
      createMockPost({ id, title: `Post ${id}` }),
    );
  }),

  http.post(`${BASE_URL}/posts`, async () => {
    await delay(50);
    return HttpResponse.json({ id: 99 }, { status: 201 });
  }),

  http.patch(`${BASE_URL}/posts/:id`, async () => {
    await delay(50);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${BASE_URL}/posts/:id`, async () => {
    await delay(50);
    return new HttpResponse(null, { status: 204 });
  }),

  // Auth handlers
  http.post(`${BASE_URL}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email: string };
    await delay(50);

    if (body.email === "existing@test.com" || registeredEmails.has(body.email)) {
      return HttpResponse.json(
        { message: "Email already exists" },
        { status: 409 },
      );
    }

    registeredEmails.add(body.email);
    return HttpResponse.json({ id: 1 }, { status: 201 });
  }),

  http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      password: string;
    };
    await delay(50);

    if (body.email && body.password) {
      return HttpResponse.json({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
      });
    }

    return HttpResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }),

  http.post(`${BASE_URL}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string };
    await delay(50);

    if (
      body.refreshToken === "mock-refresh-token" ||
      body.refreshToken === "mock-refreshed-refresh-token"
    ) {
      return HttpResponse.json({
        accessToken: "mock-refreshed-access-token",
        refreshToken: "mock-refreshed-refresh-token",
      });
    }

    return HttpResponse.json(
      { message: "Invalid refresh token" },
      { status: 401 },
    );
  }),
];
