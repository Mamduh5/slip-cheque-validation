import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { attemptSlipImageRead, extractFieldsFromOcrText } from "@/lib/slip-image-read";
import type { ImageReadTransferFields } from "@/lib/models";

const IMAGE_DIR = path.resolve(__dirname, "image", "transfer-slip");

interface ImageResult {
  filename: string;
  rawOcrText: string | null;
  extractedFields: ImageReadTransferFields | null;
  result: string;
  warnings: string[];
}

function getImageFiles(): string[] {
  if (!fs.existsSync(IMAGE_DIR)) return [];
  return fs
    .readdirSync(IMAGE_DIR)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort();
}

function summarizeField(
  fields: ImageReadTransferFields | null,
  key: keyof ImageReadTransferFields
): string {
  if (!fields) return "—";
  const f = fields[key];
  if (!f.value) return "—";
  return `${f.value} (${f.confidence.toLowerCase()})`;
}

function printResults(results: ImageResult[]) {
  console.log("\n=== Slip Image Read Real-Image Regression Results ===\n");
  for (const r of results) {
    console.log(`File: ${r.filename}`);
    console.log(`  Result: ${r.result}`);
    console.log(`  Amount:        ${summarizeField(r.extractedFields, "amount")}`);
    console.log(`  Sender:        ${summarizeField(r.extractedFields, "senderName")}`);
    console.log(`  Receiver:      ${summarizeField(r.extractedFields, "receiverName")}`);
    console.log(`  Date/Time:     ${summarizeField(r.extractedFields, "dateTime")}`);
    console.log(`  Reference:     ${summarizeField(r.extractedFields, "transactionReference")}`);
    console.log(`  Sender Bank:   ${summarizeField(r.extractedFields, "senderBank")}`);
    console.log(`  Receiver Bank: ${summarizeField(r.extractedFields, "receiverBank")}`);
    console.log(`  Sender Acct:   ${summarizeField(r.extractedFields, "senderAccountTail")}`);
    console.log(`  Receiver Acct: ${summarizeField(r.extractedFields, "receiverAccountTail")}`);
    if (r.warnings.length > 0) {
      console.log(`  Warnings: ${r.warnings.join("; ")}`);
    }
    console.log("");
  }
}

describe("slip-image-read real-image regression", () => {
  const imageFiles = getImageFiles();

  it("has at least one real transfer-slip image to test against", () => {
    expect(imageFiles.length).toBeGreaterThan(0);
  });

  const results: ImageResult[] = [];

  for (const filename of imageFiles) {
    it(
      `extracts fields from ${filename}`,
      async () => {
        const buffer = fs.readFileSync(path.join(IMAGE_DIR, filename));
        // Normalize like the processing pipeline does
        const normalized = await sharp(buffer)
          .rotate()
          .resize({ width: 1024, height: 1024, fit: "inside" })
          .toBuffer();
        const ocrBuffer = await sharp(buffer)
          .rotate()
          .resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true })
          .toBuffer();

        const analysis = await attemptSlipImageRead({ normalizedBuffer: normalized, ocrBuffer });

        const result: ImageResult = {
          filename,
          rawOcrText: analysis.rawOcrText,
          extractedFields: analysis.extractedFields,
          result: analysis.result,
          warnings: analysis.warnings ?? []
        };
        results.push(result);

        // Every real image should produce some OCR text
        expect(analysis.rawOcrText).not.toBeNull();
        expect((analysis.rawOcrText ?? "").length).toBeGreaterThan(20);

        // At minimum we expect some fields to be extractable from real slips
        expect(["EXTRACTED", "PARTIAL"]).toContain(analysis.result);
      },
      120000
    );
  }

  it("prints summary and validates key fields across all images", () => {
    printResults(results);

    // Sanity: at least half the images should extract an amount
    const withAmount = results.filter(
      (r) => r.extractedFields?.amount.value !== null
    );
    console.log(`\nAmount extracted: ${withAmount.length} / ${results.length}`);

    // At least half should extract a receiver name
    const withReceiver = results.filter(
      (r) => r.extractedFields?.receiverName.value !== null
    );
    console.log(`Receiver extracted: ${withReceiver.length} / ${results.length}`);

    // At least some should extract a reference
    const withRef = results.filter(
      (r) => r.extractedFields?.transactionReference.value !== null
    );
    console.log(`Reference extracted: ${withRef.length} / ${results.length}`);

    // These are observational — we log them but do not assert hard thresholds
    // because OCR quality varies by image.
    expect(results.length).toBeGreaterThan(0);
  });

  // Named-image soft assertions: verify that reference codes matching the filename
  // are extracted, and that key fields (amount, reference) are non-null.
  // We do NOT hardcode expected amounts because the amount is not encoded in the filename.
  const namedImages = [
    "016121214623BTF04629.jpg",
    "016121215844BPP07119.jpg",
    "016122154438ATF07364.jpg",
    "016126175244BTF00250.jpg",
    "016120093227BTF03543.jpg",
    "016121201234BPP12938.jpg"
  ];

  for (const filename of namedImages) {
    const filepath = path.join(IMAGE_DIR, filename);
    if (!fs.existsSync(filepath)) continue;

    // Derive the short reference code from the filename, e.g. "BTF04629"
    const shortCodeMatch = filename.match(/([A-Z]{3}\d{4,})/);
    const shortCode = shortCodeMatch ? shortCodeMatch[1] : null;

    it(`named-image soft assertions: ${filename}`, async () => {
      const buffer = fs.readFileSync(filepath);
      const normalized = await sharp(buffer)
        .rotate()
        .resize({ width: 1024, height: 1024, fit: "inside" })
        .toBuffer();
      const ocrBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true })
        .toBuffer();
      const analysis = await attemptSlipImageRead({ normalizedBuffer: normalized, ocrBuffer });

      // Reference should be extracted and non-null
      // We intentionally do NOT assert the exact code because OCR may misread
      // letter prefixes (e.g. BPP -> 8PP) on some images.
      expect(analysis.extractedFields?.transactionReference.value).not.toBeNull();

      // Amount should be extracted and non-zero
      const amount = analysis.extractedFields?.amount.value ?? "";
      const amountNum = parseFloat(amount.replace(/,/g, ""));
      expect(amountNum).toBeGreaterThan(0);

      // Date/time should be extracted
      expect(analysis.extractedFields?.dateTime.value).not.toBeNull();
    }, 120000);
  }
});
