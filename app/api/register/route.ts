import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import type { AppUser } from "@/lib/models";

export const runtime = "nodejs";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email and a password of at least 8 characters." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const now = new Date();
  const db = await getDb();

  await db.collection<AppUser>("users").createIndex({ email: 1 }, { unique: true });

  const existingUser = await db.collection<AppUser>("users").findOne({ email });

  if (existingUser) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  await db.collection<AppUser>("users").insertOne({
    email,
    name: parsed.data.name || email,
    emailVerified: null,
    image: null,
    passwordHash: await hashPassword(parsed.data.password),
    createdAt: now,
    updatedAt: now
  });

  await db.collection("audit_logs").insertOne({
    action: "USER_REGISTERED",
    targetType: "user",
    metadata: { email },
    createdAt: now
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
