import { NextResponse } from "next/server";
import { z } from "zod";
import { getDocumentProcessingProfile } from "@/lib/document-processing-profiles";
import { documentTypes } from "@/lib/models";
import {
  getDocumentForUser,
  formatDocumentType,
  formatDuplicateStatus,
  formatQualityStatus,
  formatReviewStatus,
  updateDocumentTypeForUser
} from "@/lib/documents";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const updateDocumentSchema = z.object({
  documentType: z.enum(documentTypes)
});

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
  const processingProfile = document.processingProfile ?? getDocumentProcessingProfile(document.documentType);

  return NextResponse.json({
    documentId: String(document._id),
    documentType: document.documentType,
    documentTypeLabel: formatDocumentType(document.documentType),
    processingProfile,
    qrCandidateAnalysis: document.qrCandidateAnalysis ?? null,
    qrDecode: document.qrDecode ?? null,
    transferMetadata: document.transferMetadata ?? null,
    slipImageRead: document.slipImageRead ?? null,
    slipVerification: document.slipVerification ?? null,
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid document type." }, { status: 400 });
  }

  const { id } = await params;
  const document = await updateDocumentTypeForUser({
    documentId: id,
    userId: user.id,
    documentType: parsed.data.documentType
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  const processingProfile = document.processingProfile ?? getDocumentProcessingProfile(document.documentType);

  return NextResponse.json({
    documentId: String(document._id),
    documentType: document.documentType,
    documentTypeLabel: formatDocumentType(document.documentType),
    processingProfile,
    qrCandidateAnalysis: document.qrCandidateAnalysis ?? null,
    qrDecode: document.qrDecode ?? null,
    transferMetadata: document.transferMetadata ?? null,
    slipImageRead: document.slipImageRead ?? null,
    slipVerification: document.slipVerification ?? null,
    duplicateStatus: document.duplicateStatus,
    duplicateStatusLabel: formatDuplicateStatus(document.duplicateStatus),
    reviewStatus: document.reviewStatus,
    reviewStatusLabel: formatReviewStatus(document.reviewStatus),
    qualityStatus: document.qualityStatus,
    qualityStatusLabel: formatQualityStatus(document.qualityStatus),
    updatedAt: document.updatedAt.toISOString()
  });
}
