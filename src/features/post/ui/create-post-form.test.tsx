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
