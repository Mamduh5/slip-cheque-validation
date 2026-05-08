import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createUploadedDocument } from "@/lib/documents";
import { uploadFieldsSchema, validateUploadFile } from "@/lib/upload-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const record = await createUploadedDocument({
    userId: session.user.id,
    documentType: parsedFields.data.documentType,
    sourceType: parsedFields.data.sourceType,
    originalFilename: file.name || "document-image",
    mimeType: file.type,
    fileSize: file.size,
    buffer
  });

  return NextResponse.json({
    documentId: String(record._id),
    duplicateStatus: record.duplicateStatus,
    matchedDocumentId: record.matchedDocumentId,
    status: record.status
  });
}
