import { NextResponse } from "next/server";
import { buildDocumentsCsv } from "@/lib/csv-export";
import { getDashboardExportDocumentsForUser } from "@/lib/documents";
import {
  parseExportDocumentType,
  parseExportDuplicateDecisionType,
  parseExportDuplicateStatus,
  parseExportReviewFilter
} from "@/lib/export-query";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const rows = await getDashboardExportDocumentsForUser(user.id, {
    reviewFilter: parseExportReviewFilter(url.searchParams.get("review")),
    documentType: parseExportDocumentType(url.searchParams.get("documentType")),
    duplicateStatus: parseExportDuplicateStatus(url.searchParams.get("duplicateStatus")),
    duplicateDecisionType: parseExportDuplicateDecisionType(url.searchParams.get("decision")),
    searchQuery: url.searchParams.get("q") ?? undefined
  });
  const csv = buildDocumentsCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dashboard-export.csv"`,
      "Cache-Control": "no-store"
    }
  });
}

