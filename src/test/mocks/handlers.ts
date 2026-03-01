import { http, HttpResponse, delay } from "msw";
import {
  createMockPost,
  createMockPaginatedResponse,
  createMockPostList,
} from "./data";

const BASE_URL = "*/api";

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
];
