import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { checkObjectStorageConnection } from "@/lib/object-storage";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    await checkObjectStorageConnection();

    return NextResponse.json({
      ok: true,
      services: {
        app: "ok",
        mongo: "ok",
        minio: "ok"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown healthcheck error"
      },
      { status: 503 }
    );
  }
}
