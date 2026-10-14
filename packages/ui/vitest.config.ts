import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// `npm test -w packages/ui` runs vitest from this folder; SFCs compile
// through the vue plugin and the tests run in happy-dom.
export default defineConfig({
  plugins: [vue()],
  test: {
    include: ["test/**/*.test.ts"],
    environment: "happy-dom",
    testTimeout: 60_000,
  },
});
