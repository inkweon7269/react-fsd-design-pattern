import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, waitFor } from "@/test/utils";
import { UpdatePostForm } from "./update-post-form";

const defaultValues = {
  title: "Existing Title",
  content: "Existing Content",
  isPublished: true,
};

describe("UpdatePostForm", () => {
  it("shows validation error when title is cleared", async () => {
    const { user } = renderWithProviders(
      <UpdatePostForm postId={1} defaultValues={defaultValues} />,
    );

    await user.clear(screen.getByLabelText(/title/i));
    await user.click(screen.getByRole("button", { name: /update post/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it("submits updated data and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <UpdatePostForm
        postId={1}
        defaultValues={defaultValues}
        onSuccess={onSuccess}
      />,
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Title");
    await user.click(screen.getByRole("button", { name: /update post/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows error message on mutation failure", async () => {
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("@/test/mocks/server");

    server.use(
      http.patch("*/api/posts/:id", () => {
        return HttpResponse.json({ message: "Error" }, { status: 500 });
      }),
    );

    const { user } = renderWithProviders(
      <UpdatePostForm postId={1} defaultValues={defaultValues} />,
    );

    await user.click(screen.getByRole("button", { name: /update post/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to update post/i)).toBeInTheDocument();
    });
  });
});
