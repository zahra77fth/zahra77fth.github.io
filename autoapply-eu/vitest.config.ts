import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
    exclude: process.env.LIVE_DISCOVERY ? [] : ["tests/live/**"],
  },
});
