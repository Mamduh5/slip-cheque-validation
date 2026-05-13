import Link from "next/link";
import { PublicTrustLinks } from "@/components/public-trust-links";

export default function HomePage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">
          Document Registry Checker
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
          Validate slips, cheques, and financial documents before review decisions are recorded.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
          Upload document images, identify likely duplicates, and give reviewers a clear comparison path before they
          confirm the outcome.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className="rounded-md bg-accent px-5 py-3 text-center font-medium text-white hover:bg-accent-dark"
            href="/register"
          >
            Create account
          </Link>
          <Link
            className="rounded-md border border-line bg-white px-5 py-3 text-center font-medium hover:border-slate-400"
            href="/login"
          >
            Log in
          </Link>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="space-y-4">
          {[
            ["Upload", "Add a clear image of a slip, cheque, or supporting financial document."],
            ["Check", "Review duplicate status and extracted details in one place."],
            ["Decide", "Compare likely matches and record a clear reviewer decision."]
          ].map(([title, body]) => (
            <div className="rounded-md border border-line p-4" key={title}>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="md:col-span-2">
        <PublicTrustLinks />
      </div>
    </section>
  );
}
