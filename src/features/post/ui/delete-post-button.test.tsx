import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, waitFor, within } from "@/test/utils";
import { DeletePostButton } from "./delete-post-button";

describe("DeletePostButton", () => {
  it("opens confirmation dialog when clicked", async () => {
    const { user } = renderWithProviders(<DeletePostButton postId={1} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(
        screen.getByText(/this action cannot be undone/i),
      ).toBeInTheDocument();
    });
  });

  it("calls onSuccess after confirming deletion", async () => {
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <DeletePostButton postId={1} onSuccess={onSuccess} />,
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    // Click the "Delete" button inside the alert dialog
    const { getByRole: getByRoleInDialog } = within(
      screen.getByRole("alertdialog"),
    );
    await user.click(getByRoleInDialog("button", { name: /delete/i }));

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
