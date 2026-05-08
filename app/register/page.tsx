import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Email/password accounts are stored in MongoDB for this v1 scaffold.
        </p>
      </div>
      <RegisterForm />
      <p className="mt-5 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link className="font-medium text-accent hover:text-accent-dark" href="/login">
          Log in
        </Link>
      </p>
    </section>
  );
}
