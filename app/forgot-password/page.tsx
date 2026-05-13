import Link from "next/link";
import { PublicTrustLinks } from "@/components/public-trust-links";

export default function ForgotPasswordPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-semibold">Password recovery</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Self-service password reset is not available yet. Contact your Document Registry Checker administrator to
          reset account access.
        </p>
        <Link
          className="mt-5 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
          href="/support"
        >
          View support options
        </Link>
      </div>
      <div className="mt-5">
        <PublicTrustLinks />
      </div>
    </section>
  );
}
