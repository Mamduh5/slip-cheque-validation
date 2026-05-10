import { MongoClient } from "mongodb";

const config = {
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/slip_cheque_validation",
  mongoDb: process.env.MONGODB_DB ?? "slip_cheque_validation"
};

const flags = new Set(process.argv.slice(2));
const dryRun = flags.has("--dry-run");
const help = flags.has("--help") || flags.has("-h");

if (help) {
  printUsage();
  process.exit(0);
}

const query = {
  documentType: "BANK_TRANSFER_SLIP",
  $or: [{ slipVerification: { $exists: false } }, { slipVerification: null }]
};

function buildSlipVerificationScaffold(evaluatedAt = new Date()) {
  return {
    stage: "SLIP_VERIFICATION",
    algorithm: "slip-verification-scaffold-v1",
    status: "COMPLETED",
    result: "NOT_VERIFIED",
    evidenceCategory: "NO_EVIDENCE",
    evaluatedAt,
    notes: [
      "Slip verification runtime scaffold recorded with no verification evidence.",
      "No local structural validation or external provider verification has been performed."
    ]
  };
}

function printUsage() {
  console.log(`Usage: node scripts/backfill-slip-verification.mjs [--dry-run]\n\nBackfills missing slipVerification scaffolds for BANK_TRANSFER_SLIP records only.\n\nOptions:\n  --dry-run   Count eligible records without updating them\n  --help      Show this help text`);
}

async function main() {
  const client = new MongoClient(config.mongoUri);

  try {
    await client.connect();
    const documents = client.db(config.mongoDb).collection("documents");
    const matchedCount = await documents.countDocuments(query);

    if (dryRun) {
      console.log(`[slip-verification-backfill] Dry run: ${matchedCount} eligible transfer-slip record(s) would be updated.`);
      return;
    }

    const result = await documents.updateMany(query, {
      $set: {
        slipVerification: buildSlipVerificationScaffold()
      }
    });

    console.log(
      `[slip-verification-backfill] Updated ${result.modifiedCount} of ${matchedCount} eligible transfer-slip record(s).`
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("[slip-verification-backfill] Failed", error);
  process.exitCode = 1;
});
