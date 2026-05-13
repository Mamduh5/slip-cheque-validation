import Link from "next/link";
import { PublicTrustLinks } from "@/components/public-trust-links";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Create an account to upload documents, review duplicates, and record audit-ready decisions.
        </p>
      </div>
      <RegisterForm />
      <p className="mt-5 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link className="font-medium text-accent hover:text-accent-dark" href="/login">
          Log in
        </Link>
      </p>
      <div className="mt-5">
        <PublicTrustLinks />
      </div>
    </section>
  );
}
