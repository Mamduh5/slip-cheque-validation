export function getE2eTestAuthUserId() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (process.env.E2E_TEST_AUTH_ENABLED !== "true") {
    return null;
  }

  return process.env.E2E_TEST_AUTH_USER_ID || null;
}
