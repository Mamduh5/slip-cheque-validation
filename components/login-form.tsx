"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { createTranslator, type SupportedLocale } from "@/lib/i18n";
import { hasAuthFieldErrors, validateLoginFields, type AuthFieldErrors } from "@/lib/auth-form-validation";

export function LoginForm({ googleEnabled, locale }: { googleEnabled: boolean; locale: SupportedLocale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = createTranslator(locale);
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const nextFieldErrors = validateLoginFields(
      { email, password },
      {
        emailRequired: t("public.login.errors.emailRequired"),
        emailInvalid: t("public.login.errors.emailInvalid"),
        passwordRequired: t("public.login.errors.passwordRequired")
      }
    );

    setFieldErrors(nextFieldErrors);

    if (hasAuthFieldErrors(nextFieldErrors)) {
      return;
    }

    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError(t("public.login.errors.credentials"));
      return;
    }

    router.push(result?.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            {t("public.login.fields.email")}
          </label>
          <input
            className="focus-ring w-full rounded-md border border-line px-3 py-2"
            id="email"
            name="email"
            autoComplete="email"
            type="email"
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className="mt-1 text-sm text-red-700" id="login-email-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium" htmlFor="password">
              {t("public.login.fields.password")}
            </label>
            <Link className="text-xs font-medium text-accent hover:text-accent-dark" href="/forgot-password">
              {t("public.login.forgotPassword")}
            </Link>
          </div>
          <input
            className="focus-ring w-full rounded-md border border-line px-3 py-2"
            id="password"
            name="password"
            autoComplete="current-password"
            type="password"
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password ? (
            <p className="mt-1 text-sm text-red-700" id="login-password-error">
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
          {isSubmitting ? t("public.login.submittingStatus") : ""}
        </p>
        <button
          className="focus-ring w-full rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? t("public.login.submitting") : t("public.login.title")}
        </button>
      </form>
      <div className="my-5 h-px bg-line" />
      <button
        className="focus-ring w-full rounded-md border border-line px-4 py-2 font-medium hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        type="button"
        disabled={!googleEnabled}
        onClick={() => signIn("google", { callbackUrl })}
      >
        {t("public.login.continueWithGoogle")}
      </button>
      {!googleEnabled ? (
        <p className="mt-2 text-xs text-slate-500">{t("public.login.googleDisabled")}</p>
      ) : null}
    </div>
  );
}
