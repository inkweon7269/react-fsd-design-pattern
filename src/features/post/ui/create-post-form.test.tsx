import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/utils";
import { CreatePostForm } from "./create-post-form";

describe("CreatePostForm", () => {
  it("shows validation errors for empty submission", async () => {
    const { user } = renderWithProviders(<CreatePostForm />);

    await user.click(screen.getByRole("button", { name: /create post/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it("submits form with valid data and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <CreatePostForm onSuccess={onSuccess} />,
    );

    await user.type(screen.getByLabelText(/title/i), "Test Post");
    await user.type(screen.getByLabelText(/content/i), "Test content");
    await user.click(screen.getByRole("button", { name: /create post/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(99);
    });
  });

  it("sends Idempotency-Key header with UUID v4 format on submission", async () => {
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@/test/mocks/server");

    let capturedIdempotencyKey: string | null = null;

    server.use(
      http.post("*/api/posts", async ({ request }) => {
        capturedIdempotencyKey = request.headers.get("Idempotency-Key");
        return HttpResponse.json({ id: 99 }, { status: 201 });
      }),
    );

    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <CreatePostForm onSuccess={onSuccess} />,
    );

    await user.type(screen.getByLabelText(/title/i), "Test Post");
    await user.type(screen.getByLabelText(/content/i), "Test content");
    await user.click(screen.getByRole("button", { name: /create post/i }));

    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(capturedIdempotencyKey).not.toBeNull();
      expect(capturedIdempotencyKey).toMatch(uuidV4Regex);
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

  it("sends the same Idempotency-Key on retry after failure", async () => {
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@/test/mocks/server");

    const capturedKeys: string[] = [];
    let callCount = 0;

    server.use(
      http.post("*/api/posts", async ({ request }) => {
        capturedKeys.push(request.headers.get("Idempotency-Key") ?? "");
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json({ message: "Error" }, { status: 500 });
        }
        return HttpResponse.json({ id: 99 }, { status: 201 });
      }),
    );

    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <CreatePostForm onSuccess={onSuccess} />,
    );

    await user.type(screen.getByLabelText(/title/i), "Test Post");
    await user.type(screen.getByLabelText(/content/i), "Test content");

    // 첫 번째 제출 (실패)
    await user.click(screen.getByRole("button", { name: /create post/i }));
    await waitFor(() => {
      expect(screen.getByText(/failed to create post/i)).toBeInTheDocument();
    });

    // 재시도 (성공)
    await user.click(screen.getByRole("button", { name: /create post/i }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(capturedKeys).toHaveLength(2);
    expect(capturedKeys[0]).toBe(capturedKeys[1]);
  });

  it("sends a different Idempotency-Key after successful submission", async () => {
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@/test/mocks/server");

    const capturedKeys: string[] = [];

    server.use(
      http.post("*/api/posts", async ({ request }) => {
        capturedKeys.push(request.headers.get("Idempotency-Key") ?? "");
        return HttpResponse.json({ id: 99 }, { status: 201 });
      }),
    );

    const { user } = renderWithProviders(<CreatePostForm />);

    // 첫 번째 제출
    await user.type(screen.getByLabelText(/title/i), "Test Post");
    await user.type(screen.getByLabelText(/content/i), "Test content");
    await user.click(screen.getByRole("button", { name: /create post/i }));

    await waitFor(() => {
      expect(capturedKeys).toHaveLength(1);
    });

    // 폼이 리셋된 후 두 번째 제출
    await user.type(screen.getByLabelText(/title/i), "Another Post");
    await user.type(screen.getByLabelText(/content/i), "Another content");
    await user.click(screen.getByRole("button", { name: /create post/i }));

    await waitFor(() => {
      expect(capturedKeys).toHaveLength(2);
    });

    expect(capturedKeys[0]).not.toBe(capturedKeys[1]);
  });

  it("resets form after successful submission", async () => {
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <CreatePostForm onSuccess={onSuccess} />,
    );

    await user.type(screen.getByLabelText(/title/i), "Test Post");
    await user.type(screen.getByLabelText(/content/i), "Test content");
    await user.click(screen.getByRole("button", { name: /create post/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(screen.getByLabelText(/title/i)).toHaveValue("");
      expect(screen.getByLabelText(/content/i)).toHaveValue("");
    });
  });
});
