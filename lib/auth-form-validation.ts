export interface AuthFieldErrors {
  email?: string;
  name?: string;
  password?: string;
}

export interface LoginValidationMessages {
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
}

export interface RegisterValidationMessages {
  nameTooLong: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordLength: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const defaultLoginValidationMessages: LoginValidationMessages = {
  emailRequired: "Enter the email address for your account.",
  emailInvalid: "Enter a valid email address.",
  passwordRequired: "Enter your password."
};
const defaultRegisterValidationMessages: RegisterValidationMessages = {
  nameTooLong: "Name must be 120 characters or fewer.",
  emailRequired: "Enter the email address for this account.",
  emailInvalid: "Enter a valid email address.",
  passwordRequired: "Create a password before submitting.",
  passwordLength: "Use a password between 8 and 128 characters."
};

function isEmailLike(value: string) {
  return EMAIL_PATTERN.test(value);
}

export function validateLoginFields(
  input: { email: string; password: string },
  messages: LoginValidationMessages = defaultLoginValidationMessages
) {
  const errors: AuthFieldErrors = {};
  const email = input.email.trim();

  if (!email) {
    errors.email = messages.emailRequired;
  } else if (!isEmailLike(email)) {
    errors.email = messages.emailInvalid;
  }

  if (!input.password) {
    errors.password = messages.passwordRequired;
  }

  return errors;
}

export function validateRegisterFields(
  input: { email: string; name: string; password: string },
  messages: RegisterValidationMessages = defaultRegisterValidationMessages
) {
  const errors: AuthFieldErrors = {};
  const email = input.email.trim();
  const name = input.name.trim();

  if (name.length > 120) {
    errors.name = messages.nameTooLong;
  }

  if (!email) {
    errors.email = messages.emailRequired;
  } else if (!isEmailLike(email)) {
    errors.email = messages.emailInvalid;
  }

  if (!input.password) {
    errors.password = messages.passwordRequired;
  } else if (input.password.length < 8 || input.password.length > 128) {
    errors.password = messages.passwordLength;
  }

  return errors;
}

export function hasAuthFieldErrors(errors: AuthFieldErrors) {
  return Object.values(errors).some(Boolean);
}
