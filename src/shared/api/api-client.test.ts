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
});

describe("apiClient", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockClear();
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

  it("does not set Content-Type when body is undefined", async () => {
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
    expect(options.method).toBe("POST");
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
