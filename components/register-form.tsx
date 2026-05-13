"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { createTranslator, type SupportedLocale } from "@/lib/i18n";
import { hasAuthFieldErrors, validateRegisterFields, type AuthFieldErrors } from "@/lib/auth-form-validation";

export function RegisterForm({ locale }: { locale: SupportedLocale }) {
  const router = useRouter();
  const t = createTranslator(locale);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatusMessage("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name"));
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const nextFieldErrors = validateRegisterFields(
      { name, email, password },
      {
        nameTooLong: t("public.register.errors.nameTooLong"),
        emailRequired: t("public.register.errors.emailRequired"),
        emailInvalid: t("public.register.errors.emailInvalid"),
        passwordRequired: t("public.register.errors.passwordRequired"),
        passwordLength: t("public.register.errors.passwordLength")
      }
    );

    setFieldErrors(nextFieldErrors);

    if (hasAuthFieldErrors(nextFieldErrors)) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(t("public.register.creatingStatus"));

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password
      })
    });

    if (!response.ok) {
      await response.json().catch(() => null);
      setError(response.status === 409 ? t("public.register.errors.existingAccount") : t("public.register.errors.default"));
      setStatusMessage("");
      setIsSubmitting(false);
      return;
    }

    setStatusMessage(t("public.register.createdStatus"));

    const loginResult = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl: "/dashboard"
    });

    setIsSubmitting(false);

    if (loginResult?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="rounded-lg border border-line bg-white p-5 shadow-sm" onSubmit={handleSubmit} noValidate>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="name">
            {t("public.register.fields.name")}
          </label>
          <input
            className="focus-ring w-full rounded-md border border-line px-3 py-2"
            id="name"
            name="name"
            autoComplete="name"
            type="text"
            aria-describedby={fieldErrors.name ? "register-name-error" : undefined}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? (
            <p className="mt-1 text-sm text-red-700" id="register-name-error">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            {t("public.register.fields.email")}
          </label>
          <input
            className="focus-ring w-full rounded-md border border-line px-3 py-2"
            id="email"
            name="email"
            autoComplete="email"
            type="email"
            aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className="mt-1 text-sm text-red-700" id="register-email-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            {t("public.register.fields.password")}
          </label>
          <input
            className="focus-ring w-full rounded-md border border-line px-3 py-2"
            id="password"
            name="password"
            autoComplete="new-password"
            type="password"
            minLength={8}
            maxLength={128}
            aria-describedby={fieldErrors.password ? "password-rules register-password-error" : "password-rules"}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          <p className="mt-1 text-xs leading-5 text-slate-500" id="password-rules">
            {t("public.register.passwordRules")}
          </p>
          {fieldErrors.password ? (
            <p className="mt-1 text-sm text-red-700" id="register-password-error">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {statusMessage}
        </p>
        <button
          className="focus-ring w-full rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? t("public.register.submitting") : t("public.register.title")}
        </button>
      </div>
    </form>
  );
}
