export interface AuthFieldErrors {
  email?: string;
  name?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailLike(value: string) {
  return EMAIL_PATTERN.test(value);
}

export function validateLoginFields(input: { email: string; password: string }) {
  const errors: AuthFieldErrors = {};
  const email = input.email.trim();

  if (!email) {
    errors.email = "Enter the email address for your account.";
  } else if (!isEmailLike(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!input.password) {
    errors.password = "Enter your password.";
  }

  return errors;
}

export function validateRegisterFields(input: { email: string; name: string; password: string }) {
  const errors: AuthFieldErrors = {};
  const email = input.email.trim();
  const name = input.name.trim();

  if (name.length > 120) {
    errors.name = "Name must be 120 characters or fewer.";
  }

  if (!email) {
    errors.email = "Enter the email address for this account.";
  } else if (!isEmailLike(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!input.password) {
    errors.password = "Create a password before submitting.";
  } else if (input.password.length < 8 || input.password.length > 128) {
    errors.password = "Use a password between 8 and 128 characters.";
  }

  return errors;
}

export function hasAuthFieldErrors(errors: AuthFieldErrors) {
  return Object.values(errors).some(Boolean);
}
