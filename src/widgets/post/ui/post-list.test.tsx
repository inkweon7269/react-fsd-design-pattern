import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, waitFor, userEvent } from "@/test/utils";
import { PostList } from "./post-list";

describe("PostList", () => {
  const defaultProps = {
    params: { page: 1, limit: 10 },
    onPageChange: vi.fn(),
    onPostClick: vi.fn(),
  };

  it("shows loading skeletons initially", () => {
    renderWithProviders(<PostList {...defaultProps} />);
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders post cards after loading", async () => {
    renderWithProviders(<PostList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Post 1")).toBeInTheDocument();
    });
  });

  it("calls onPostClick when a post card is clicked", async () => {
    const onPostClick = vi.fn();
    renderWithProviders(
      <PostList {...defaultProps} onPostClick={onPostClick} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Post 1")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Post 1"));
    expect(onPostClick).toHaveBeenCalledWith(1);
  });

  it("shows pagination when there are multiple pages", async () => {
    renderWithProviders(<PostList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /next/i }),
    ).not.toBeDisabled();
  });

  it("calls onPageChange when Next is clicked", async () => {
    const onPageChange = vi.fn();
    renderWithProviders(
      <PostList {...defaultProps} onPageChange={onPageChange} />,
    );

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
      expect(screen.getByText(/Failed to load posts/)).toBeInTheDocument();
    });
  });

  it("shows empty state when no posts exist", async () => {
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
      expect(screen.getByText(/No posts found/)).toBeInTheDocument();
    });
  });
});
