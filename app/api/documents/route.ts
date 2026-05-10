import { NextResponse } from "next/server";
import { DocumentImageProcessingError } from "@/lib/document-processing";
import { createUploadedDocument, formatDocumentType } from "@/lib/documents";
import { ImageQualityFailureError } from "@/lib/image-quality";
import { getCurrentUser } from "@/lib/session";
import { uploadFieldsSchema, validateUploadFile } from "@/lib/upload-validation";

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
    record = await createUploadedDocument({
      userId: user.id,
      documentType: parsedFields.data.documentType,
      sourceType: parsedFields.data.sourceType,
      originalFilename: file.name || "document-image",
      mimeType: file.type,
      fileSize: file.size,
      buffer
    });
  } catch (error) {
    if (error instanceof ImageQualityFailureError) {
      return NextResponse.json(
        {
          error: error.message,
          qualityStatus: error.assessment.qualityStatus,
          qualityWarnings: error.assessment.qualityWarnings,
          qualityMetrics: error.assessment.qualityMetrics
        },
        { status: 422 }
      );
    }

    if (error instanceof DocumentImageProcessingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }

  return NextResponse.json({
    documentId: String(record._id),
    documentType: record.documentType,
    documentTypeLabel: formatDocumentType(record.documentType),
    duplicateStatus: record.duplicateStatus,
    matchedDocumentId: record.matchedDocumentId,
    similarityScore: record.similarityScore,
    reviewStatus: record.reviewStatus,
    qualityStatus: record.qualityStatus,
    qualityWarnings: record.qualityWarnings,
    status: record.status
  });
}
