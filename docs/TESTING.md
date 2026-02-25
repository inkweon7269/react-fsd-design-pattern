# 테스트 코드 가이드

FSD 아키텍처 프로젝트를 위한 단위 / 통합 / E2E 테스트 작성 가이드.

---

## 목차

1. [테스트 스택](#1-테스트-스택)
2. [프로젝트 설정](#2-프로젝트-설정)
3. [테스트 유틸리티](#3-테스트-유틸리티)
4. [단위 테스트](#4-단위-테스트)
5. [통합 테스트](#5-통합-테스트)
6. [E2E 테스트](#6-e2e-테스트)
7. [테스트 파일 목록](#7-테스트-파일-목록)
8. [실행 명령어](#8-실행-명령어)

---

## 1. 테스트 스택

| 도구 | 역할 | 테스트 레벨 |
|---|---|---|
| **Vitest** | Vite 네이티브 테스트 러너 | 단위 / 통합 |
| **@testing-library/react** | 컴포넌트 렌더링 + 사용자 관점 쿼리 | 통합 |
| **@testing-library/jest-dom** | DOM 매처 (`toBeInTheDocument` 등) | 통합 |
| **@testing-library/user-event** | 사용자 인터랙션 시뮬레이션 | 통합 |
| **jsdom** | 브라우저 DOM 환경 시뮬레이션 | 단위 / 통합 |
| **MSW v2** | 네트워크 레벨 API 모킹 | 통합 |
| **Playwright** | 실제 브라우저 기반 E2E | E2E |

### 패키지 설치

```bash
# 단위/통합 테스트
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw

# E2E 테스트
pnpm add -D @playwright/test
npx playwright install chromium
```

---

## 2. 프로젝트 설정

### 2-1. vitest.config.ts

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    testTimeout: 10000,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

**설정 근거:**

- `globals: true` — `describe`, `it`, `expect`를 import 없이 사용
- `environment: "jsdom"` — DOM/window 접근이 필요한 코드를 위한 브라우저 환경 시뮬레이션
- `css: false` — Tailwind CSS 파싱 생략 (테스트에서 스타일 검증 불필요)
- `resolve.alias` — 프로덕션 코드의 `@/` 경로 별칭과 동일하게 설정

### 2-2. tsconfig.test.json

```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**/*.ts"]
}
```

프로덕션 `tsconfig.app.json`의 `types: ["vite/client"]`를 오염시키지 않기 위해 별도 파일로 분리한다.

### 2-3. playwright.config.ts

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  baseURL: "http://localhost:5173",
  use: {
    browserName: "chromium",
    screenshot: "only-on-failure",
  },
  retries: 0,
  webServer: {
    command: "pnpm dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

> **주의:** E2E 테스트는 실제 백엔드 API 서버(`localhost:3000`)가 실행 중이어야 한다. `webServer`는 Vite dev 서버만 자동 실행한다.

### 2-4. package.json 스크립트

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 3. 테스트 유틸리티

### 디렉토리 구조

```
src/test/
├── setup.ts              # 글로벌 설정 (jest-dom + MSW 라이프사이클)
├── utils.tsx             # 커스텀 렌더, QueryClient 래퍼
└── mocks/
    ├── server.ts         # MSW 서버 인스턴스
    ├── handlers.ts       # 기본 API 핸들러 (5개 엔드포인트)
    └── data.ts           # Mock 데이터 팩토리
```

### 3-1. setup.ts — 글로벌 테스트 설정

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

`onUnhandledRequest: "error"` — MSW 핸들러가 없는 네트워크 요청은 즉시 에러로 감지한다. 실수로 실제 API를 호출하는 것을 방지한다.

### 3-2. mocks/data.ts — Mock 데이터 팩토리

```ts
import type { Post } from "@/entities/post";
import type { PaginatedResponse } from "@/shared/types";

let nextId = 1;

export function createMockPost(overrides: Partial<Post> = {}): Post {
  const id = overrides.id ?? nextId++;
  return {
    id,
    title: `Test Post ${id}`,
    content: `Content of test post ${id}.`,
    isPublished: true,
    createdAt: "2025-01-15T10:30:00Z",
    updatedAt: "2025-01-16T14:00:00Z",
    ...overrides,
  };
}

export function createMockPaginatedResponse<T>(
  items: T[],
  overrides: Partial<Omit<PaginatedResponse<T>, "items">> = {},
): PaginatedResponse<T> {
  return {
    items,
    totalElements: overrides.totalElements ?? items.length,
    page: overrides.page ?? 1,
    limit: overrides.limit ?? 10,
  };
}

export function createMockPostList(count = 5): Post[] {
  return Array.from({ length: count }, (_, i) =>
    createMockPost({
      id: i + 1,
      title: `Post ${i + 1}`,
      isPublished: i % 2 === 0,
    }),
  );
}

// 고정 프리셋
export const mockPost: Post = createMockPost({
  id: 1,
  title: "First Post",
  content: "This is the first post content.",
  isPublished: true,
});

export const mockDraftPost: Post = createMockPost({
  id: 2,
  title: "Draft Post",
  content: "This is a draft post.",
  isPublished: false,
});

export function resetMockIds() {
  nextId = 1;
}
```

### 3-3. mocks/handlers.ts — MSW v2 핸들러

```ts
import { http, HttpResponse, delay } from "msw";
import {
  createMockPost,
  createMockPaginatedResponse,
  createMockPostList,
} from "./data";

const BASE_URL = "*/api";

export const handlers = [
  // GET /posts — 페이지네이션
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

  // GET /posts/:id — 단일 조회
  http.get(`${BASE_URL}/posts/:id`, async ({ params }) => {
    const id = Number(params.id);
    await delay(50);
    return HttpResponse.json(createMockPost({ id, title: `Post ${id}` }));
  }),

  // POST /posts — 생성
  http.post(`${BASE_URL}/posts`, async () => {
    await delay(50);
    return HttpResponse.json({ id: 99 }, { status: 201 });
  }),

  // PATCH /posts/:id — 수정
  http.patch(`${BASE_URL}/posts/:id`, async () => {
    await delay(50);
    return new HttpResponse(null, { status: 204 });
  }),

  // DELETE /posts/:id — 삭제
  http.delete(`${BASE_URL}/posts/:id`, async () => {
    await delay(50);
    return new HttpResponse(null, { status: 204 });
  }),
];
```

### 3-4. mocks/server.ts

```ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

### 3-5. utils.tsx — 커스텀 렌더 함수

```tsx
import { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: React.ReactNode;
}

// renderHook 용 래퍼
export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// 컴포넌트 렌더 용 (userEvent + queryClient 포함)
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    user: userEvent.setup(),
    queryClient,
  };
}

export { screen, waitFor, within, act } from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
```

**`retry: false` 설정 이유:** 프로덕션에서는 `retry: 1`이지만, 테스트에서는 실패 시 즉시 에러를 반환하여 결과를 결정적으로 만든다.

---

## 4. 단위 테스트

DOM이 필요 없는 순수 로직을 검증한다. 테스트 파일은 소스 파일 옆에 co-locate 한다.

### 4-1. ApiError 클래스

> `src/shared/api/api-error.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { ApiError } from "./api-error";

describe("ApiError", () => {
  it("creates error with custom message", () => {
    const error = new ApiError(404, "Not Found", "Post not found");
    expect(error.message).toBe("Post not found");
    expect(error.status).toBe(404);
    expect(error.statusText).toBe("Not Found");
    expect(error.name).toBe("ApiError");
  });

  it("generates default message when not provided", () => {
    const error = new ApiError(500, "Internal Server Error");
    expect(error.message).toBe("API Error: 500 Internal Server Error");
  });

  it("is an instance of Error", () => {
    const error = new ApiError(400, "Bad Request");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});
```

### 4-2. cn 유틸리티

> `src/shared/lib/utils.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes (clsx)", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves Tailwind conflicts (tailwind-merge)", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles no arguments", () => {
    expect(cn()).toBe("");
  });
});
```

### 4-3. Query Key Factory

> `src/entities/post/api/post-query-keys.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { postQueryKeys } from "./post-query-keys";

describe("postQueryKeys", () => {
  it("returns base key", () => {
    expect(postQueryKeys.all).toEqual(["posts"]);
  });

  it("returns list keys with params", () => {
    const params = { page: 2, limit: 10 };
    expect(postQueryKeys.lists()).toEqual(["posts", "list"]);
    expect(postQueryKeys.list(params)).toEqual(["posts", "list", params]);
  });

  it("returns detail keys with id", () => {
    expect(postQueryKeys.details()).toEqual(["posts", "detail"]);
    expect(postQueryKeys.detail(42)).toEqual(["posts", "detail", 42]);
  });

  it("list keys are prefixed by lists()", () => {
    const listKey = postQueryKeys.list({ page: 1 });
    const listsKey = postQueryKeys.lists();
    expect(listKey.slice(0, listsKey.length)).toEqual(listsKey);
  });

  it("detail keys are prefixed by details()", () => {
    const detailKey = postQueryKeys.detail(1);
    const detailsKey = postQueryKeys.details();
    expect(detailKey.slice(0, detailsKey.length)).toEqual(detailsKey);
  });
});
```

### 4-4. Yup 스키마 검증

> `src/features/post/model/create-post-schema.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { createPostSchema } from "./create-post-schema";

describe("createPostSchema", () => {
  it("validates correct data", async () => {
    const valid = { title: "Hello", content: "World", isPublished: false };
    await expect(createPostSchema.validate(valid)).resolves.toEqual(valid);
  });

  it("rejects missing title", async () => {
    const invalid = { content: "World" };
    await expect(createPostSchema.validate(invalid)).rejects.toThrow(
      "Title is required",
    );
  });

  it("rejects title exceeding 200 characters", async () => {
    const invalid = { title: "a".repeat(201), content: "Content" };
    await expect(createPostSchema.validate(invalid)).rejects.toThrow(
      "Title must be 200 characters or less",
    );
  });

  it("accepts title with exactly 200 characters", async () => {
    const valid = { title: "a".repeat(200), content: "Content" };
    await expect(createPostSchema.validate(valid)).resolves.toBeDefined();
  });

  it("rejects missing content", async () => {
    const invalid = { title: "Title" };
    await expect(createPostSchema.validate(invalid)).rejects.toThrow(
      "Content is required",
    );
  });

  it("defaults isPublished to false", async () => {
    const input = { title: "Title", content: "Content" };
    const result = await createPostSchema.validate(input);
    expect(result.isPublished).toBe(false);
  });
});
```

> `src/features/post/model/update-post-schema.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { updatePostSchema } from "./update-post-schema";

describe("updatePostSchema", () => {
  it("validates correct data", async () => {
    const valid = { title: "Title", content: "Content", isPublished: true };
    await expect(updatePostSchema.validate(valid)).resolves.toEqual(valid);
  });

  it("rejects missing title", async () => {
    const invalid = { content: "Content", isPublished: true };
    await expect(updatePostSchema.validate(invalid)).rejects.toThrow(
      "Title is required",
    );
  });

  it("rejects missing content", async () => {
    const invalid = { title: "Title", isPublished: false };
    await expect(updatePostSchema.validate(invalid)).rejects.toThrow(
      "Content is required",
    );
  });

  it("defaults isPublished to false when omitted", async () => {
    const input = { title: "Title", content: "Content" };
    const result = await updatePostSchema.validate(input);
    expect(result.isPublished).toBe(false);
  });
});
```

### 4-5. API Client

> `src/shared/api/api-client.test.ts`

테스트를 위해 `api-client.ts`의 `buildUrl` 함수에 `export` 키워드를 추가해야 한다.

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, buildUrl } from "./api-client";
import { ApiError } from "./api-error";

vi.mock("@/shared/config", () => ({
  env: { API_BASE_URL: "/api" },
}));

describe("buildUrl", () => {
  it("constructs URL with base path", () => {
    const url = buildUrl("/posts");
    expect(url).toContain("/api/posts");
  });

  it("appends query params", () => {
    const url = buildUrl("/posts", { page: 1, limit: 10 });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("page")).toBe("1");
    expect(parsed.searchParams.get("limit")).toBe("10");
  });

  it("omits undefined params", () => {
    const url = buildUrl("/posts", { page: 1, limit: undefined });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("page")).toBe("1");
    expect(parsed.searchParams.has("limit")).toBe(false);
  });

  it("handles boolean params", () => {
    const url = buildUrl("/posts", { isPublished: true });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("isPublished")).toBe("true");
  });
});

describe("apiClient", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("makes GET request by default", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await apiClient("/posts");
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("GET");
    expect(result).toEqual({ data: "test" });
  });

  it("does not set Content-Type for GET", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiClient("/posts");
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBeUndefined();
  });

  it("sets Content-Type and stringifies body for POST", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 1 }),
    });

    const body = { title: "Test", content: "Content" };
    await apiClient("/posts", { method: "POST", body });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.body).toBe(JSON.stringify(body));
  });

  it("returns undefined for 204 No Content", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });

    const result = await apiClient("/posts/1", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("throws ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: () => Promise.resolve("Post not found"),
    });

    await expect(apiClient("/posts/999")).rejects.toThrow(ApiError);
  });

  it("handles text() failure gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () => Promise.reject(new Error("cannot read body")),
    });

    await expect(apiClient("/posts")).rejects.toThrow(ApiError);
  });
});
```

---

## 5. 통합 테스트

React 컴포넌트, 훅, MSW를 결합하여 검증한다.

### 5-1. Query 훅

> `src/entities/post/api/use-posts.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "@/test/utils";
import { usePosts } from "./use-posts";

describe("usePosts", () => {
  it("fetches posts with default params", async () => {
    const { result } = renderHook(() => usePosts(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.items).toBeInstanceOf(Array);
    expect(result.current.data!.items.length).toBeGreaterThan(0);
  });

  it("fetches posts with pagination params", async () => {
    const { result } = renderHook(() => usePosts({ page: 2, limit: 5 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data!.page).toBe(2);
    expect(result.current.data!.limit).toBe(5);
  });

  it("handles server error", async () => {
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@/test/mocks/server");

    server.use(
      http.get("*/api/posts", () => {
        return HttpResponse.json({ message: "Error" }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => usePosts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

> `src/entities/post/api/use-post.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "@/test/utils";
import { usePost } from "./use-post";

describe("usePost", () => {
  it("fetches a single post by id", async () => {
    const { result } = renderHook(() => usePost(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.id).toBe(1);
  });

  it("does not fetch when id is 0 (enabled: false)", async () => {
    const { result } = renderHook(() => usePost(0), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  it("handles not found error", async () => {
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@/test/mocks/server");

    server.use(
      http.get("*/api/posts/:id", () => {
        return HttpResponse.json({ message: "Not found" }, { status: 404 });
      }),
    );

    const { result } = renderHook(() => usePost(999), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### 5-2. Mutation 훅

> `src/features/post/api/use-create-post.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createWrapper } from "@/test/utils";
import { useCreatePost } from "./use-create-post";

describe("useCreatePost", () => {
  it("creates a post and returns the new id", async () => {
    const { result } = renderHook(() => useCreatePost(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        title: "New Post",
        content: "Content",
        isPublished: false,
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ id: 99 });
  });

  it("invalidates list queries on success", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreatePost(), { wrapper });

    await act(async () => {
      result.current.mutate({ title: "Post", content: "Content" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["posts", "list"] }),
    );
  });
});
```

> `src/features/post/api/use-delete-post.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createWrapper } from "@/test/utils";
import { useDeletePost } from "./use-delete-post";

describe("useDeletePost", () => {
  it("deletes a post successfully", async () => {
    const { result } = renderHook(() => useDeletePost(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("removes detail query and invalidates lists on success", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const removeSpy = vi.spyOn(queryClient, "removeQueries");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeletePost(), { wrapper });

    await act(async () => {
      result.current.mutate(7);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(removeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["posts", "detail", 7] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["posts", "list"] }),
    );
  });
});
```

### 5-3. UI 컴포넌트

> `src/entities/post/ui/post-card.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostCard } from "./post-card";
import { mockPost, mockDraftPost } from "@/test/mocks/data";

describe("PostCard", () => {
  it("renders post title and content", () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText(mockPost.title)).toBeInTheDocument();
    expect(screen.getByText(mockPost.content)).toBeInTheDocument();
  });

  it("shows Published badge for published posts", () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("shows Draft badge for draft posts", () => {
    render(<PostCard post={mockDraftPost} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("calls onClick with post id", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<PostCard post={mockPost} onClick={handleClick} />);

    await user.click(screen.getByText(mockPost.title));
    expect(handleClick).toHaveBeenCalledWith(mockPost.id);
  });
});
```

> `src/shared/ui/error-boundary.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./error-boundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test error message");
  return <div>No error</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders fallback UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
  });

  it("resets error state on Try again click", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("No error")).toBeInTheDocument();
  });
});
```

### 5-4. 폼 컴포넌트

> `src/features/post/ui/create-post-form.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/utils";
import { CreatePostForm } from "./create-post-form";

describe("CreatePostForm", () => {
  it("renders all form fields", () => {
    renderWithProviders(<CreatePostForm />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create post/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty submission", async () => {
    const { user } = renderWithProviders(<CreatePostForm />);

    await user.click(screen.getByRole("button", { name: /create post/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it("submits and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(<CreatePostForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/title/i), "Test Post");
    await user.type(screen.getByLabelText(/content/i), "Test content");
    await user.click(screen.getByRole("button", { name: /create post/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(99); // MSW 핸들러의 반환값
    });
  });

  it("shows error message on mutation failure", async () => {
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@/test/mocks/server");

    server.use(
      http.post("*/api/posts", () => {
        return HttpResponse.json({ message: "Error" }, { status: 500 });
      }),
    );

    const { user } = renderWithProviders(<CreatePostForm />);

    await user.type(screen.getByLabelText(/title/i), "Test Post");
    await user.type(screen.getByLabelText(/content/i), "Test content");
    await user.click(screen.getByRole("button", { name: /create post/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to create post/i)).toBeInTheDocument();
    });
  });

  it("resets form after successful submission", async () => {
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(<CreatePostForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/title/i), "Test Post");
    await user.type(screen.getByLabelText(/content/i), "Test content");
    await user.click(screen.getByRole("button", { name: /create post/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/title/i)).toHaveValue("");
    expect(screen.getByLabelText(/content/i)).toHaveValue("");
  });
});
```

### 5-5. DeletePostButton

> `src/features/post/ui/delete-post-button.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/utils";
import { DeletePostButton } from "./delete-post-button";

describe("DeletePostButton", () => {
  it("renders delete button", () => {
    renderWithProviders(<DeletePostButton postId={1} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("opens confirmation dialog", async () => {
    const { user } = renderWithProviders(<DeletePostButton postId={1} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });

  it("calls onSuccess after confirming deletion", async () => {
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <DeletePostButton postId={1} onSuccess={onSuccess} />,
    );

    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    const dialogDeleteBtn = screen.getByRole("button", { name: /^delete$/i });
    await user.click(dialogDeleteBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("does not delete when cancelled", async () => {
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <DeletePostButton postId={1} onSuccess={onSuccess} />,
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
```

### 5-6. PostList 위젯

> `src/widgets/post/ui/post-list.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/utils";
import userEvent from "@testing-library/user-event";
import { PostList } from "./post-list";

describe("PostList", () => {
  const defaultProps = {
    params: { page: 1, limit: 10 },
    onPageChange: vi.fn(),
    onPostClick: vi.fn(),
  };

  it("shows loading skeletons initially", () => {
    renderWithProviders(<PostList {...defaultProps} />);
    const skeletons = document.querySelectorAll(
      ".animate-pulse, [data-slot='skeleton']",
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders post cards after loading", async () => {
    renderWithProviders(<PostList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Post 1")).toBeInTheDocument();
    });
  });

  it("calls onPostClick when card is clicked", async () => {
    const onPostClick = vi.fn();
    renderWithProviders(<PostList {...defaultProps} onPostClick={onPostClick} />);

    await waitFor(() => {
      expect(screen.getByText("Post 1")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Post 1"));
    expect(onPostClick).toHaveBeenCalledWith(1);
  });

  it("shows pagination info", async () => {
    renderWithProviders(<PostList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });

  it("calls onPageChange when Next is clicked", async () => {
    const onPageChange = vi.fn();
    renderWithProviders(<PostList {...defaultProps} onPageChange={onPageChange} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("shows error message when fetch fails", async () => {
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@/test/mocks/server");

    server.use(
      http.get("*/api/posts", () => {
        return HttpResponse.json({ message: "Error" }, { status: 500 });
      }),
    );

    renderWithProviders(<PostList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load posts/i)).toBeInTheDocument();
    });
  });

  it("shows empty state when no posts", async () => {
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@/test/mocks/server");

    server.use(
      http.get("*/api/posts", () => {
        return HttpResponse.json({
          items: [],
          totalElements: 0,
          page: 1,
          limit: 10,
        });
      }),
    );

    renderWithProviders(<PostList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/no posts found/i)).toBeInTheDocument();
    });
  });
});
```

---

## 6. E2E 테스트

Playwright로 실제 브라우저에서 사용자 흐름을 검증한다.

### 디렉토리 구조

```
e2e/
├── fixtures/
│   └── test-base.ts          # 공통 헬퍼
├── post-crud.spec.ts          # CRUD 전체 흐름
├── post-list.spec.ts          # 목록 + 페이지네이션
├── post-validation.spec.ts    # 폼 유효성 검증
└── error-handling.spec.ts     # 에러 상태
```

### 6-1. 공통 헬퍼

> `e2e/fixtures/test-base.ts`

```ts
import { type Page, expect } from "@playwright/test";

export async function navigateToPostList(page: Page) {
  await page.goto("/posts");
  await page.waitForSelector("[data-testid='post-card'], text=No posts found");
}

export async function createPost(
  page: Page,
  data: { title: string; content: string; isPublished?: boolean },
) {
  await page.goto("/posts/create");
  await page.fill('[name="title"]', data.title);
  await page.fill("textarea", data.content);
  if (data.isPublished) {
    await page.click("role=switch");
  }
  await page.click("button:has-text('Create Post')");
  await expect(page.locator("h2")).toContainText(data.title);
}
```

### 6-2. CRUD 전체 흐름

> `e2e/post-crud.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test.describe("Post CRUD", () => {
  test("전체 흐름: 생성 → 조회 → 수정 → 삭제", async ({ page }) => {
    // 1. Create
    await page.goto("/posts");
    await page.click("text=New Post");
    await page.fill('[name="title"]', "E2E Test Post");
    await page.fill("textarea", "E2E test content");
    await page.click("button:has-text('Create Post')");

    // 2. Read - 상세 페이지로 이동됨
    await expect(page.locator("h2")).toContainText("E2E Test Post");
    await expect(page.locator("text=E2E test content")).toBeVisible();

    // 3. Update
    await page.click("text=Edit");
    const titleInput = page.locator('[name="title"]');
    await titleInput.clear();
    await titleInput.fill("Updated E2E Post");
    await page.click("button:has-text('Update Post')");

    await expect(page.locator("h2")).toContainText("Updated E2E Post");

    // 4. Delete
    await page.click("button:has-text('Delete')");
    // AlertDialog 확인
    await page.click('role=alertdialog >> button:has-text("Delete")');

    await expect(page).toHaveURL(/\/posts$/);
  });
});
```

### 6-3. 목록 + 페이지네이션

> `e2e/post-list.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test.describe("Post List", () => {
  test("목록 페이지 로딩", async ({ page }) => {
    await page.goto("/posts");
    // 게시물 카드가 하나 이상 표시됨
    await expect(page.locator(".cursor-pointer").first()).toBeVisible();
  });

  test("게시물 카드 클릭 → 상세 이동", async ({ page }) => {
    await page.goto("/posts");
    await page.locator(".cursor-pointer").first().click();
    await expect(page).toHaveURL(/\/posts\/\d+/);
  });

  test("페이지네이션 동작", async ({ page }) => {
    await page.goto("/posts");

    // Next 버튼 클릭
    const nextButton = page.getByRole("button", { name: /next/i });
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await expect(page.locator("text=Page 2")).toBeVisible();

      // Previous 버튼으로 복귀
      await page.getByRole("button", { name: /previous/i }).click();
      await expect(page.locator("text=Page 1")).toBeVisible();
    }
  });

  test("루트 경로 → /posts 리다이렉트", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/posts/);
  });
});
```

### 6-4. 폼 유효성 검증

> `e2e/post-validation.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test.describe("Post Form Validation", () => {
  test("빈 폼 제출 시 에러 표시", async ({ page }) => {
    await page.goto("/posts/create");
    await page.click("button:has-text('Create Post')");
    await expect(page.locator("text=Title is required")).toBeVisible();
  });

  test("201자 제목 입력 시 에러 표시", async ({ page }) => {
    await page.goto("/posts/create");
    await page.fill('[name="title"]', "a".repeat(201));
    await page.fill("textarea", "Content");
    await page.click("button:has-text('Create Post')");
    await expect(
      page.locator("text=Title must be 200 characters or less"),
    ).toBeVisible();
  });
});
```

### 6-5. 에러 상태

> `e2e/error-handling.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test.describe("Error Handling", () => {
  test("존재하지 않는 게시물 접근 시 에러 표시", async ({ page }) => {
    await page.goto("/posts/999999");
    await expect(page.locator("text=Failed to load post")).toBeVisible();
  });

  test("Back to Posts 클릭 → 목록 복귀", async ({ page }) => {
    await page.goto("/posts/999999");
    await expect(page.locator("text=Failed to load post")).toBeVisible();
    await page.click("text=Back to Posts");
    await expect(page).toHaveURL(/\/posts$/);
  });
});
```

---

## 7. 테스트 파일 목록

### 단위/통합 테스트 (18개)

| 레이어 | 파일 | 타입 |
|---|---|---|
| shared | `src/shared/api/api-error.test.ts` | 단위 |
| shared | `src/shared/api/api-client.test.ts` | 단위 |
| shared | `src/shared/lib/utils.test.ts` | 단위 |
| shared | `src/shared/ui/error-boundary.test.tsx` | 통합 |
| entities | `src/entities/post/api/post-query-keys.test.ts` | 단위 |
| entities | `src/entities/post/api/use-posts.test.tsx` | 통합 |
| entities | `src/entities/post/api/use-post.test.tsx` | 통합 |
| entities | `src/entities/post/ui/post-card.test.tsx` | 통합 |
| entities | `src/entities/post/ui/post-detail-card.test.tsx` | 통합 |
| features | `src/features/post/model/create-post-schema.test.ts` | 단위 |
| features | `src/features/post/model/update-post-schema.test.ts` | 단위 |
| features | `src/features/post/api/use-create-post.test.tsx` | 통합 |
| features | `src/features/post/api/use-update-post.test.tsx` | 통합 |
| features | `src/features/post/api/use-delete-post.test.tsx` | 통합 |
| features | `src/features/post/ui/create-post-form.test.tsx` | 통합 |
| features | `src/features/post/ui/update-post-form.test.tsx` | 통합 |
| features | `src/features/post/ui/delete-post-button.test.tsx` | 통합 |
| widgets | `src/widgets/post/ui/post-list.test.tsx` | 통합 |

### E2E 테스트 (4개)

| 파일 | 시나리오 |
|---|---|
| `e2e/post-crud.spec.ts` | CRUD 전체 흐름 |
| `e2e/post-list.spec.ts` | 목록 조회 + 페이지네이션 |
| `e2e/post-validation.spec.ts` | 폼 유효성 검증 |
| `e2e/error-handling.spec.ts` | 에러 상태 처리 |

### 테스트 인프라

| 파일 | 역할 |
|---|---|
| `vitest.config.ts` | Vitest 설정 |
| `playwright.config.ts` | Playwright 설정 |
| `tsconfig.test.json` | 테스트 전용 TS 설정 |
| `src/test/setup.ts` | 글로벌 설정 (jest-dom + MSW) |
| `src/test/utils.tsx` | 커스텀 렌더, 래퍼 |
| `src/test/mocks/server.ts` | MSW 서버 인스턴스 |
| `src/test/mocks/handlers.ts` | MSW API 핸들러 |
| `src/test/mocks/data.ts` | Mock 데이터 팩토리 |
| `e2e/fixtures/test-base.ts` | E2E 공통 헬퍼 |

### 단위/통합 테스트 범위 제외

| 대상 | 근거 |
|---|---|
| Pages | TanStack Router 의존 (useParams/useNavigate). E2E에서 커버 |
| Header 위젯 | `<Link>` 2개만 있는 정적 컴포넌트. E2E에서 간접 검증 |
| env.ts | `api-client.test.ts`에서 `vi.mock`으로 간접 검증 |

---

## 8. 실행 명령어

```bash
# 단위/통합 테스트 (watch 모드)
pnpm test

# 단위/통합 테스트 (단일 실행, CI용)
pnpm test:run

# 커버리지 리포트
pnpm test:coverage

# E2E 테스트 (API 서버 별도 실행 필요)
pnpm test:e2e

# E2E 테스트 (UI 모드)
pnpm test:e2e:ui

# 특정 파일만 실행
pnpm vitest run src/shared/api/api-client.test.ts

# 특정 패턴 매칭
pnpm vitest run --grep "createPostSchema"
```

### 구현 순서 (권장)

```
Phase 1  인프라 설정 (패키지 설치 + 설정 파일 + 유틸리티)
Phase 2  단위 테스트 (ApiError, cn, QueryKeys, Schemas)
Phase 3  API Client 단위 테스트
Phase 4  훅 통합 테스트 (usePosts, usePost, mutations)
Phase 5  UI 컴포넌트 통합 테스트 (PostCard, PostDetailCard, ErrorBoundary)
Phase 6  폼/위젯 통합 테스트 (Forms, DeleteButton, PostList)
Phase 7  E2E 테스트 (CRUD, List, Validation, Error)
```
