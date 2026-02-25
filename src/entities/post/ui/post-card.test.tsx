import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostCard } from "./post-card";
import { mockPost } from "@/test/mocks/data";

describe("PostCard", () => {
  it("calls onClick with post id when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<PostCard post={mockPost} onClick={handleClick} />);

    await user.click(screen.getByText(mockPost.title));
    expect(handleClick).toHaveBeenCalledWith(mockPost.id);
  });
});
