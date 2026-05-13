import { NextResponse } from "next/server";
import { formatDocumentType } from "@/lib/document-types";
import { getCurrentUser } from "@/lib/session";
import { uploadFieldsSchema, validateUploadFile, validateUploadFileContent } from "@/lib/upload-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const formData = await request.formData();
  const parsedFields = uploadFieldsSchema.safeParse({
    documentType: formData.get("documentType"),
    sourceType: formData.get("sourceType")
  });
  const file = formData.get("file");

  if (!parsedFields.success) {
    return NextResponse.json({ error: "Invalid document metadata." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload an image file." }, { status: 400 });
  }

  const fileError = validateUploadFile(file);

  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  let record;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileContentError = validateUploadFileContent(buffer, file.type);

    if (fileContentError) {
      return NextResponse.json({ error: fileContentError }, { status: 400 });
    }

    const documentsModule = await import("@/lib/documents");

    record = await documentsModule.createUploadedDocument({
      userId: user.id,
      documentType: parsedFields.data.documentType,
      sourceType: parsedFields.data.sourceType,
      originalFilename: file.name || "document-image",
      mimeType: file.type,
      fileSize: file.size,
      buffer
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ImageQualityFailureError" && "assessment" in error) {
      const qualityError = error as Error & {
        assessment: {
          qualityStatus: unknown;
          qualityWarnings: unknown;
          qualityMetrics: unknown;
        };
      };

      return NextResponse.json(
        {
          error: qualityError.message,
          qualityStatus: qualityError.assessment.qualityStatus,
          qualityWarnings: qualityError.assessment.qualityWarnings,
          qualityMetrics: qualityError.assessment.qualityMetrics
        },
        { status: 422 }
      );
    }

    if (error instanceof Error && error.name === "DocumentImageProcessingError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }

  return NextResponse.json({
    documentId: String(record._id),
    documentType: record.documentType,
    documentTypeLabel: formatDocumentType(record.documentType),
    processingProfile: record.processingProfile,
    qrCandidateAnalysis: record.qrCandidateAnalysis ?? null,
    qrDecode: record.qrDecode ?? null,
    transferMetadata: record.transferMetadata ?? null,
    slipVerification: record.slipVerification ?? null,
    slipImageRead: record.slipImageRead ?? null,
    duplicateStatus: record.duplicateStatus,
    duplicateDecisionType: record.duplicateDecisionType,
    duplicateDecisionReasons: record.duplicateDecisionReasons,
    matchedDocumentId: record.matchedDocumentId,
    similarityScore: record.similarityScore,
    reviewStatus: record.reviewStatus,
    qualityStatus: record.qualityStatus,
    qualityWarnings: record.qualityWarnings,
    status: record.status
  });
}
