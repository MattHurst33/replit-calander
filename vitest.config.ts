import { defineConfig } from "vitest/config";
import path from "path";

// Separate from vite.config.ts on purpose: that file pins `root: client/` for the
// production client build, which would otherwise scope test discovery to client/ only.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "shared/**/*.test.ts", "client/src/**/*.test.{ts,tsx}"],
  },
});
