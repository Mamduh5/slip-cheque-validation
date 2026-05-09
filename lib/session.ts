import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getE2eTestAuthUserId } from "@/lib/e2e-auth";

export async function getCurrentUser() {
  const e2eUserId = getE2eTestAuthUserId();

  if (e2eUserId) {
    return {
      id: e2eUserId,
      email: "e2e@example.test",
      name: "E2E Test User"
    };
  }

  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login");
  }

  return user;
}
