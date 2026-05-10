import { NextResponse } from "next/server";
import {
  getDocumentForUser,
  formatDocumentType,
  formatDuplicateStatus,
  formatQualityStatus,
  formatReviewStatus
} from "@/lib/documents";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const document = await getDocumentForUser(id, user.id);

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({
    documentId: String(document._id),
    documentType: document.documentType,
    documentTypeLabel: formatDocumentType(document.documentType),
    sourceType: document.sourceType,
    originalFilename: document.originalFilename,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    status: document.status,
    duplicateStatus: document.duplicateStatus,
    duplicateStatusLabel: formatDuplicateStatus(document.duplicateStatus),
    matchedDocumentId: document.matchedDocumentId,
    similarityScore: document.similarityScore,
    reviewStatus: document.reviewStatus,
    reviewStatusLabel: formatReviewStatus(document.reviewStatus),
    reviewedAt: document.reviewedAt?.toISOString() ?? null,
    reviewedMatchDocumentId: document.reviewedMatchDocumentId,
    qualityStatus: document.qualityStatus,
    qualityStatusLabel: formatQualityStatus(document.qualityStatus),
    qualityWarnings: document.qualityWarnings,
    qualityMetrics: document.qualityMetrics,
    qualityCheckedAt: document.qualityCheckedAt?.toISOString() ?? null,
    exactHash: document.exactHash,
    perceptualHash: document.perceptualHash,
    normalizedObject: document.normalizedObject,
    normalizedImage: document.normalizedImage,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  });
}
