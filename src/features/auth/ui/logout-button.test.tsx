import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse, delay } from "msw";
import {
  renderWithProviders,
  screen,
  waitFor,
  setupAuthenticatedUser,
  clearAuthenticatedUser,
} from "@/test/utils";
import { server } from "@/test/mocks/server";
import { tokenStorage } from "@/shared/lib";
import { LogoutButton } from "./logout-button";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    setupAuthenticatedUser();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    clearAuthenticatedUser();
  });

  it("renders with 'Logout' text", () => {
    renderWithProviders(<LogoutButton />);
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("calls server API and clears tokens on click", async () => {
    const { user } = renderWithProviders(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(tokenStorage.isAuthenticated()).toBe(false);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  it("shows loading state while logging out", async () => {
    server.use(
      http.post("*/api/auth/logout", async () => {
        await delay(500);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { user } = renderWithProviders(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(screen.getByText(/logging out/i)).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  it("clears tokens even when server returns error", async () => {
    server.use(
      http.post("*/api/auth/logout", async () => {
        await delay(50);
        return HttpResponse.json(
          { message: "Internal Server Error" },
          { status: 500 },
        );
      }),
    );

    const { user } = renderWithProviders(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(tokenStorage.isAuthenticated()).toBe(false);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });
});
