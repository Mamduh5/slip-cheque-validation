#!/usr/bin/env node
/**
 * Developer / manual regression runner for inspecting OCR extraction
 * and duplicate-assessment behavior on real transfer-slip images.
 *
 * This script does NOT perform financial verification.
 * It is for local debugging of extraction and duplicate-suppression logic only.
 *
 * Usage:
 *   npx tsx scripts/inspect-transfer-slip.ts <image> [image2]
 *   npx tsx scripts/inspect-transfer-slip.ts --list-fixtures
 *   npx tsx scripts/inspect-transfer-slip.ts --json <image> [image2]
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { attemptSlipImageRead } from "@/lib/slip-image-read";
import { assessTransferSlipDuplicateCandidate } from "@/lib/transfer-slip-duplicate-assessment";
import { resolveDuplicateDecision } from "@/lib/duplicate-detection";
import { reasonCodeToLabel } from "@/lib/document-result-summary";
import {
  resolveImagePath,
  formatField,
  formatFields,
  formatFieldsLines,
} from "@/lib/dev/inspect-formatters";
import type { ImageReadTransferFields } from "@/lib/models";

const FIXTURE_DIR = path.resolve(process.cwd(), "tests/image/transfer-slip");

/* ── CLI parsing ────────────────────────────────────────────────────── */

interface CliArgs {
  paths: string[];
  json: boolean;
  listFixtures: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const result: CliArgs = { paths: [], json: false, listFixtures: false };
  for (const arg of args) {
    if (arg === "--json") result.json = true;
    else if (arg === "--list-fixtures" || arg === "-l") result.listFixtures = true;
    else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      result.paths.push(arg);
    }
  }
  return result;
}

function printUsage() {
  console.log(`
Usage: npx tsx scripts/inspect-transfer-slip.ts [options] <image> [image2]

Options:
  --json            Output machine-readable JSON
  --list-fixtures   List available test images
  --help            Show this message

Image paths:
  Absolute or relative paths work directly.
  Bare filenames are resolved under tests/image/transfer-slip/.

Examples:
  npx tsx scripts/inspect-transfer-slip.ts 016126175244BTF00250.jpg
  npx tsx scripts/inspect-transfer-slip.ts image1.jpg image2.jpg
  npx tsx scripts/inspect-transfer-slip.ts --json image1.jpg image2.jpg
`);
}

function resolvePath(input: string): string {
  return resolveImagePath(input, FIXTURE_DIR);
}

/* ── Image processing ───────────────────────────────────────────────── */

interface InspectionResult {
  path: string;
  filename: string;
  imageRead: Awaited<ReturnType<typeof attemptSlipImageRead>>;
}

async function inspectImage(filepath: string): Promise<InspectionResult> {
  const buffer = fs.readFileSync(filepath);
  const normalized = await sharp(buffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: "inside" })
    .toBuffer();
  const ocrBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true })
    .toBuffer();

  const imageRead = await attemptSlipImageRead({
    normalizedBuffer: normalized,
    ocrBuffer,
  });

  return {
    path: filepath,
    filename: path.basename(filepath),
    imageRead,
  };
}

/* ── Formatting ─────────────────────────────────────────────────────── */


function formatNotes(result: InspectionResult["imageRead"]): string {
  const lines: string[] = [];
  for (const note of result.notes) {
    lines.push(`  Note:  ${note}`);
  }
  for (const warning of result.warnings) {
    lines.push(`  Warn:  ${warning}`);
  }
  return lines.length > 0 ? lines.join("\n") + "\n" : "";
}

function formatSingle(result: InspectionResult): string {
  const W = 62;
  const pad = Math.max(0, W - result.filename.length - 4);
  const header = `\n┌─ ${result.filename} ${"─".repeat(pad)}┐`;
  const footer = `└${"─".repeat(W + 1)}┘`;
  const status = `  Status: ${result.imageRead.result}`;
  const fields = formatFields(result.imageRead.extractedFields);
  const notes = formatNotes(result.imageRead);
  return [header, status, fields, notes, footer].filter(Boolean).join("\n");
}

/* ── Duplicate assessment formatting ────────────────────────────────── */

function formatAssessment(
  left: InspectionResult,
  right: InspectionResult
): string {
  const newDoc = {
    qrDecode: null,
    transferMetadata: null,
    slipImageRead: left.imageRead,
  };
  const candidate = {
    qrDecode: null,
    transferMetadata: null,
    slipImageRead: right.imageRead,
  };

  const assessment = assessTransferSlipDuplicateCandidate(newDoc, candidate);

  const suppressedNearDuplicate =
    assessment.result === "CONFLICT"
      ? { duplicateDecisionReasons: assessment.reasonCodes }
      : null;

  const decision = resolveDuplicateDecision({
    exactMatch: null,
    nearMatch: null,
    suppressedNearDuplicate,
  });

  const lines: string[] = [];
  lines.push("\n┌─ Duplicate Assessment ───────────────────────────────────────┐");
  lines.push(`  Comparing: ${left.filename}`);
 lines.push(`       with: ${right.filename}`);
  lines.push("");
  lines.push(`  Assessment result:     ${assessment.result}`);
  lines.push(`  Decision type:         ${decision.duplicateDecisionType}`);
  lines.push(`  Decision status:       ${decision.duplicateStatus}`);

  if (assessment.conflicts.length > 0) {
    lines.push("");
    lines.push("  Conflicts detected:");
    for (const conflict of assessment.conflicts) {
      lines.push(`    • ${conflict}`);
    }
  }

  if (assessment.positiveEvidence.length > 0) {
    lines.push("");
    lines.push("  Positive evidence:");
    for (const evidence of assessment.positiveEvidence) {
      lines.push(`    • ${evidence}`);
    }
  }

  if (assessment.reasonCodes.length > 0) {
    lines.push("");
    lines.push("  Reason codes:");
    for (const code of assessment.reasonCodes) {
      lines.push(`    • ${code} — ${reasonCodeToLabel(code)}`);
    }
  }

  if (assessment.notes) {
    lines.push("");
    lines.push(`  Note: ${assessment.notes}`);
  }

  lines.push("");
  if (suppressedNearDuplicate) {
    lines.push("  Outcome: These images would be treated as DISTINCT uploads");
    lines.push("           (near-duplicate suppressed due to conflicts).");
  } else if (assessment.result === "MATCH") {
    lines.push("  Outcome: These images would be flagged as EXACT_DUPLICATE.");
  } else {
    lines.push("  Outcome: Insufficient evidence for conflict or match.");
    lines.push("           Perceptual-hash similarity would be needed in production.");
  }

  lines.push("└──────────────────────────────────────────────────────────────┘");

  return lines.join("\n");
}

/* ── JSON mode ──────────────────────────────────────────────────────── */

function buildJsonOutput(results: InspectionResult[]): object {
  if (results.length === 2) {
    const newDoc = {
      qrDecode: null,
      transferMetadata: null,
      slipImageRead: results[0].imageRead,
    };
    const candidate = {
      qrDecode: null,
      transferMetadata: null,
      slipImageRead: results[1].imageRead,
    };
    const assessment = assessTransferSlipDuplicateCandidate(newDoc, candidate);
    const suppressedNearDuplicate =
      assessment.result === "CONFLICT"
        ? { duplicateDecisionReasons: assessment.reasonCodes }
        : null;
    const decision = resolveDuplicateDecision({
      exactMatch: null,
      nearMatch: null,
      suppressedNearDuplicate,
    });
    return {
      images: results.map((r) => ({
        path: r.path,
        filename: r.filename,
        imageRead: r.imageRead,
      })),
      duplicateAssessment: {
        assessmentResult: assessment.result,
        conflicts: assessment.conflicts,
        positiveEvidence: assessment.positiveEvidence,
        reasonCodes: assessment.reasonCodes,
        notes: assessment.notes,
      },
      simulatedDecision: {
        duplicateStatus: decision.duplicateStatus,
        duplicateDecisionType: decision.duplicateDecisionType,
        duplicateDecisionReasons: decision.duplicateDecisionReasons,
        matchedDocumentId: decision.matchedDocumentId,
        similarityScore: decision.similarityScore,
      },
    };
  }

  return {
    images: results.map((r) => ({
      path: r.path,
      filename: r.filename,
      imageRead: r.imageRead,
    })),
  };
}

/* ── List fixtures ──────────────────────────────────────────────────── */

function listFixtures() {
  if (!fs.existsSync(FIXTURE_DIR)) {
    console.error(`Fixture directory not found: ${FIXTURE_DIR}`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(FIXTURE_DIR)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort();
  console.log(`\nAvailable fixtures in tests/image/transfer-slip/ (${files.length} files):\n`);
  for (const f of files) {
    console.log(`  ${f}`);
  }
  console.log("");
}

/* ── Main ───────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv);

  if (args.listFixtures) {
    listFixtures();
    return;
  }

  if (args.paths.length === 0) {
    console.error("Error: No image path provided.\n");
    printUsage();
    process.exit(1);
  }

  if (args.paths.length > 2) {
    console.error("Error: At most two images can be compared.\n");
    printUsage();
    process.exit(1);
  }

  const resolvedPaths = args.paths.map((p) => {
    const resolved = resolvePath(p);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: File not found: ${resolved}`);
      process.exit(1);
    }
    return resolved;
  });

  const results: InspectionResult[] = [];
  for (const filepath of resolvedPaths) {
    if (!args.json) {
      process.stderr.write(`\nReading ${path.basename(filepath)} ... `);
    }
    const result = await inspectImage(filepath);
    results.push(result);
    if (!args.json) {
      process.stderr.write("done\n");
    }
  }

  if (args.json) {
    console.log(JSON.stringify(buildJsonOutput(results), null, 2));
  } else {
    for (const result of results) {
      console.log(formatSingle(result));
    }
    if (results.length === 2) {
      console.log(formatAssessment(results[0], results[1]));
    }
    console.log("\nCaveat: Extracted values are OCR-derived and unverified.");
    console.log("        They reflect the current pipeline, not financial truth.\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
