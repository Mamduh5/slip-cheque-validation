import Link from "next/link";
import { PublicTrustLinks } from "@/components/public-trust-links";

export default function SupportPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-semibold">Support</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This internal tool does not have a public support desk configured. For account recovery, access questions, or
          document handling concerns, contact the administrator who manages your Document Registry Checker access.
        </p>
        <Link className="mt-5 inline-flex font-medium text-accent hover:text-accent-dark" href="/login">
          Return to login
        </Link>
      </div>
      <div className="mt-5">
        <PublicTrustLinks />
      </div>
    </section>
  );
}
