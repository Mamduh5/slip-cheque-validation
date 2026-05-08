"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      redirect: false,
      callbackUrl
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(result?.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            className="focus-ring w-full rounded-md border border-line px-3 py-2"
            id="email"
            name="email"
            autoComplete="email"
            type="email"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            className="focus-ring w-full rounded-md border border-line px-3 py-2"
            id="password"
            name="password"
            autoComplete="current-password"
            type="password"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          className="focus-ring w-full rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Log in"}
        </button>
      </form>
      <div className="my-5 h-px bg-line" />
      <button
        className="focus-ring w-full rounded-md border border-line px-4 py-2 font-medium hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        type="button"
        disabled={!googleEnabled}
        onClick={() => signIn("google", { callbackUrl })}
      >
        Continue with Google
      </button>
      {!googleEnabled ? (
        <p className="mt-2 text-xs text-slate-500">Google sign-in is disabled until OAuth env values are set.</p>
      ) : null}
    </div>
  );
}
