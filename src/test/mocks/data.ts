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
