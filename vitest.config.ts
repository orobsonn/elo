import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
export default defineConfig({
  plugins: [
    cloudflareTest({
      remoteBindings: false,
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        d1Databases: {
          DB: "832389af-77f6-45db-b22e-35f3d8aeeb0b",
          DB_ISOLATED: "test-isolated",
        },
        bindings: {
          PUBLIC_ORIGIN: "https://elo.test",
          ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com",
          ACCESS_CLIENT_ID: "synthetic",
          ACCESS_CLIENT_SECRET: "synthetic-secret",
          OWNER_EMAIL: "owner@example.test",
          ENCRYPTION_KEY: "12".repeat(32),
          AUTH_EPOCH: "synthetic-epoch",
        },
      },
    }),
  ],
  test: { include: ["tests/**/*.test.ts"], setupFiles: ["./tests/setup.ts"] },
});
