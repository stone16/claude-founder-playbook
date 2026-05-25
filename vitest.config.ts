import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["dist/**", "skills/**", "templates/**", "test/**"],
      reporter: ["text"],
    },
  },
});
