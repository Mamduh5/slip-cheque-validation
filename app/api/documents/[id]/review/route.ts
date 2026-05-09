import { NextResponse } from "next/server";
import { z } from "zod";
import { DocumentReviewError, formatReviewStatus, reviewLikelyDuplicateDocument } from "@/lib/documents";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const reviewSchema = z.object({
  decision: z.enum(["CONFIRMED_DUPLICATE", "CONFIRMED_DISTINCT"])
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid review decision." }, { status: 400 });
  }

  const { id } = await params;

  try {
    const document = await reviewLikelyDuplicateDocument({
      documentId: id,
      userId: user.id,
      decision: parsed.data.decision
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    return NextResponse.json({
      documentId: String(document._id),
      duplicateStatus: document.duplicateStatus,
      matchedDocumentId: document.matchedDocumentId,
      similarityScore: document.similarityScore,
      reviewStatus: document.reviewStatus,
      reviewStatusLabel: formatReviewStatus(document.reviewStatus),
      reviewedAt: document.reviewedAt?.toISOString() ?? null,
      reviewedMatchDocumentId: document.reviewedMatchDocumentId
    });
  } catch (error) {
    if (error instanceof DocumentReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
