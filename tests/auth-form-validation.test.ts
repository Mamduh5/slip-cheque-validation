import { describe, expect, it } from "vitest";
import {
  hasAuthFieldErrors,
  validateLoginFields,
  validateRegisterFields
} from "../lib/auth-form-validation";

describe("auth form validation", () => {
  it("returns specific login field messages", () => {
    expect(validateLoginFields({ email: "", password: "" })).toEqual({
      email: "Enter the email address for your account.",
      password: "Enter your password."
    });

    expect(validateLoginFields({ email: "not-an-email", password: "secret" })).toEqual({
      email: "Enter a valid email address."
    });
  });

  it("accepts complete login fields", () => {
    expect(hasAuthFieldErrors(validateLoginFields({ email: "reviewer@example.com", password: "secret" }))).toBe(false);
  });

  it("returns specific register field messages", () => {
    expect(validateRegisterFields({ name: "A".repeat(121), email: "", password: "short" })).toEqual({
      name: "Name must be 120 characters or fewer.",
      email: "Enter the email address for this account.",
      password: "Use a password between 8 and 128 characters."
    });
  });

  it("accepts complete register fields", () => {
    expect(
      hasAuthFieldErrors(
        validateRegisterFields({
          name: "Reviewer",
          email: "reviewer@example.com",
          password: "long-enough"
        })
      )
    ).toBe(false);
  });
});
