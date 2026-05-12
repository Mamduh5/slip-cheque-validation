import { NextResponse } from "next/server";
import { z } from "zod";
import { bulkReviewLikelyDuplicateDocuments } from "@/lib/documents";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const bulkReviewSchema = z.object({
  decision: z.enum(["CONFIRMED_DUPLICATE", "CONFIRMED_DISTINCT"]),
  documentIds: z.array(z.string().min(1)).min(1).max(100)
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Choose pending review items and a valid review decision." }, { status: 400 });
  }

  const result = await bulkReviewLikelyDuplicateDocuments({
    documentIds: parsed.data.documentIds,
    userId: user.id,
    decision: parsed.data.decision
  });

  return NextResponse.json(result);
}
