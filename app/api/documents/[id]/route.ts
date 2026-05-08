import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocumentForUser, formatDuplicateStatus } from "@/lib/documents";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const document = await getDocumentForUser(id, session.user.id);

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({
    documentId: String(document._id),
    documentType: document.documentType,
    sourceType: document.sourceType,
    originalFilename: document.originalFilename,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    status: document.status,
    duplicateStatus: document.duplicateStatus,
    duplicateStatusLabel: formatDuplicateStatus(document.duplicateStatus),
    matchedDocumentId: document.matchedDocumentId,
    similarityScore: document.similarityScore,
    exactHash: document.exactHash,
    perceptualHash: document.perceptualHash,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  });
}
