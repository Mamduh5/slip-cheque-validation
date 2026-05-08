import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocumentForUser } from "@/lib/documents";
import { getOriginalDocumentObject } from "@/lib/object-storage";

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

  const stream = await getOriginalDocumentObject(document.originalObject.bucket, document.originalObject.key);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": document.mimeType,
      "Cache-Control": "private, max-age=300"
    }
  });
}
