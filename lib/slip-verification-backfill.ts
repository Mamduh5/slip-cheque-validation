import type { Filter, UpdateFilter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { buildSlipVerificationScaffold } from "@/lib/slip-verification";
import type { DocumentRecord } from "@/lib/models";

export interface SlipVerificationBackfillResult {
  dryRun: boolean;
  matchedCount: number;
  modifiedCount: number;
}

export function buildMissingSlipVerificationQuery(): Filter<DocumentRecord> {
  return {
    documentType: "BANK_TRANSFER_SLIP",
    $or: [{ slipVerification: { $exists: false } }, { slipVerification: null }]
  };
}

export function buildSlipVerificationBackfillUpdate(input: { evaluatedAt?: Date } = {}): UpdateFilter<DocumentRecord> {
  return {
    $set: {
      slipVerification: buildSlipVerificationScaffold({ evaluatedAt: input.evaluatedAt })
    }
  };
}

export async function backfillMissingSlipVerification(input: {
  dryRun?: boolean;
  evaluatedAt?: Date;
} = {}): Promise<SlipVerificationBackfillResult> {
  const db = await getDb();
  const documents = db.collection<DocumentRecord>("documents");
  const query = buildMissingSlipVerificationQuery();
  const matchedCount = await documents.countDocuments(query);

  if (input.dryRun) {
    return {
      dryRun: true,
      matchedCount,
      modifiedCount: 0
    };
  }

  const result = await documents.updateMany(query, buildSlipVerificationBackfillUpdate({ evaluatedAt: input.evaluatedAt }));

  return {
    dryRun: false,
    matchedCount,
    modifiedCount: result.modifiedCount
  };
}
