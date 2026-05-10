import { vi } from "vitest";

// Mock server-only to prevent it from throwing in test environment
vi.mock("server-only", () => ({
  default: () => {}
}));
