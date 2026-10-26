import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    testTimeout: 90_000,
    hookTimeout: 90_000,
    fileParallelism: false,
    setupFiles: ["tests/setup/env.ts"],
    globalSetup: ["tests/setup/global.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: process.env.LIVE_DISCOVERY ? [] : ["tests/live/**"],
  },
});
