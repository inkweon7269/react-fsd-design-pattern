import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";
import { resetMockIds } from "./mocks/data";
import { resetRegisteredEmails } from "./mocks/handlers";

// Polyfill for Radix UI components that use ResizeObserver (e.g., Switch)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockIds();
  resetRegisteredEmails();
});

afterAll(() => server.close());
