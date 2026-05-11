/**
 * Quick OCR text dump for diagnostic purposes.
 * Usage: node scripts/dump-ocr-raw.mjs <image-basename> [<image-basename2> ...]
 * Images are loaded from tests/image/transfer-slip/
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import sharp from "sharp";
import { createWorker } from "tesseract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = path.resolve(__dirname, "../tests/image/transfer-slip");

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(IMAGE_DIR).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)).sort();

const worker = await createWorker("eng+tha", 1, { logger: () => undefined, errorHandler: () => undefined });

for (const name of targets) {
  const filepath = path.join(IMAGE_DIR, name);
  if (!fs.existsSync(filepath)) { console.log(`SKIP: ${name} not found`); continue; }
  const buf = fs.readFileSync(filepath);
  const ocrBuf = await sharp(buf).rotate()
    .resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true })
    .grayscale().toBuffer();
  const ret = await worker.recognize(ocrBuf);
  const text = ret.data.text?.trim() ?? "";
  console.log(`\n${"=".repeat(60)}`);
  console.log(`FILE: ${name}`);
  console.log("=".repeat(60));
  console.log(text);
}

await worker.terminate();
