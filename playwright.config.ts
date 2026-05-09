import { defineConfig, devices } from "@playwright/test";

const appBaseUrl = "http://127.0.0.1:3100";
const e2eEnv = {
  E2E_TEST_AUTH_ENABLED: "true",
  E2E_TEST_AUTH_USER_ID: "e2e-user",
  NEXTAUTH_SECRET: "e2e-test-secret",
  NEXTAUTH_URL: appBaseUrl,
  MONGODB_URI: "mongodb://127.0.0.1:27017/slip_cheque_validation_e2e",
  MONGODB_DB: "slip_cheque_validation_e2e",
  MINIO_ENDPOINT: "127.0.0.1",
  MINIO_PORT: "9000",
  MINIO_USE_SSL: "false",
  MINIO_ACCESS_KEY: "minioadmin",
  MINIO_SECRET_KEY: "minioadmin",
  MINIO_BUCKET: "document-images-e2e",
  MAX_UPLOAD_MB: "10"
};

for (const [key, value] of Object.entries(e2eEnv)) {
  process.env[key] ??= value;
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: appBaseUrl,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run e2e:bootstrap && npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: `${appBaseUrl}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: e2eEnv
  }
});
