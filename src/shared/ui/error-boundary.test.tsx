import { useState, useImperativeHandle, forwardRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./error-boundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>No error</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders default fallback UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("resets error state when Try again is clicked", async () => {
    const user = userEvent.setup();
    const TestWrapper = forwardRef<{ fix: () => void }>((_props, ref) => {
      const [shouldThrow, setShouldThrow] = useState(true);
      useImperativeHandle(ref, () => ({
        fix: () => setShouldThrow(false),
      }));
      return (
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    });
    TestWrapper.displayName = "TestWrapper";

    const ref = { current: null } as React.RefObject<{ fix: () => void } | null>;
    render(<TestWrapper ref={ref} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Fix the component so it won't throw on next render
    act(() => ref.current?.fix());

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("No error")).toBeInTheDocument();
  });
});
