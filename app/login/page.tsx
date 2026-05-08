import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { isGoogleAuthConfigured } from "@/lib/env";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Log in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Access your document dashboard and upload history.
        </p>
      </div>
      <Suspense fallback={<div className="rounded-lg border border-line bg-white p-5 shadow-sm">Loading...</div>}>
        <LoginForm googleEnabled={isGoogleAuthConfigured()} />
      </Suspense>
      <p className="mt-5 text-center text-sm text-slate-600">
        No account?{" "}
        <Link className="font-medium text-accent hover:text-accent-dark" href="/register">
          Register
        </Link>
      </p>
    </section>
  );
}
