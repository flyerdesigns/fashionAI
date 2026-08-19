import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = { "@": path.resolve(__dirname, ".") };

const sharedTestConfig = {
  environment: "node" as const,
  globals: true,
  server: {
    deps: {
      inline: ["next-auth", "next"],
    },
  },
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          ...sharedTestConfig,
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/integration/**", "tests/security/**", "tests/smoke/**"],
        },
      },
      {
        resolve: { alias },
        test: {
          ...sharedTestConfig,
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          fileParallelism: false,
          maxWorkers: 1,
        },
      },
      {
        resolve: { alias },
        test: {
          ...sharedTestConfig,
          name: "security",
          include: ["tests/security/**/*.test.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          fileParallelism: false,
          maxWorkers: 1,
        },
      },
      {
        resolve: { alias },
        test: {
          ...sharedTestConfig,
          name: "smoke",
          include: ["tests/smoke/**/*.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "lib/credits/**",
        "lib/generation/**",
        "lib/video/**",
        "lib/billing/**",
        "lib/admin/**",
        "lib/storage/**",
        "lib/auth/**",
        "lib/workers/**",
        "lib/rate-limit/**",
      ],
    },
  },
});
