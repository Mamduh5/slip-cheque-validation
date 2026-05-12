import { NextResponse } from "next/server";
import { buildDocumentsCsv } from "@/lib/csv-export";
import { getReviewQueueExportForUser } from "@/lib/documents";
import { parseExportReviewSort } from "@/lib/export-query";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const rows = await getReviewQueueExportForUser(user.id, {
    searchQuery: url.searchParams.get("q") ?? undefined,
    sort: parseExportReviewSort(url.searchParams.get("sort"))
  });
  const csv = buildDocumentsCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="review-queue-export.csv"`,
      "Cache-Control": "no-store"
    }
  });
}

