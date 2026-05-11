import sharp from "sharp";
import type {
  ImageReadField,
  ImageReadTransferFields,
  SlipImageReadAnalysisResult,
  SlipImageReadResult
} from "@/lib/models";

const algorithm = "slip-image-read-v1" as const;

// Lazily import tesseract.js so tests can mock it without bundling issues.
async function getTesseract() {
  const tesseract = await import("tesseract.js");
  return tesseract;
}

export interface AttemptSlipImageReadInput {
  normalizedBuffer: Buffer;
  readAt?: Date;
}

export async function attemptSlipImageRead(
  input: AttemptSlipImageReadInput
): Promise<SlipImageReadAnalysisResult> {
  const readAt = input.readAt ?? new Date();

  try {
    const ocrText = await runMultiVariantOcr(input.normalizedBuffer);

    if (!ocrText || ocrText.trim().length === 0) {
      return {
        stage: "SLIP_IMAGE_READ",
        algorithm,
        status: "COMPLETED",
        result: "NONE",
        readAt,
        extractedFields: null,
        rawOcrText: null,
        notes: ["OCR produced no readable text from the image."],
        warnings: []
      };
    }

    const extractedFields = extractFieldsFromOcrText(ocrText);
    const populatedCount = countPopulatedFields(extractedFields);
    const result: SlipImageReadResult =
      populatedCount === 0 ? "NONE" : populatedCount >= 4 ? "EXTRACTED" : "PARTIAL";

    const notes: string[] = [];
    if (result === "EXTRACTED") {
      notes.push("Multiple key transaction fields were extracted from the slip image via OCR.");
    } else if (result === "PARTIAL") {
      notes.push("Some transaction fields were extracted from the slip image via OCR.");
    } else {
      notes.push("No reliable transaction fields were extracted from the OCR text.");
    }

    const warnings = buildConfidenceWarnings(extractedFields);

    return {
      stage: "SLIP_IMAGE_READ",
      algorithm,
      status: "COMPLETED",
      result,
      readAt,
      extractedFields,
      rawOcrText: ocrText,
      notes,
      warnings
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      stage: "SLIP_IMAGE_READ",
      algorithm,
      status: "FAILED",
      result: "NONE",
      readAt,
      extractedFields: null,
      rawOcrText: null,
      notes: [`Image reading failed: ${message}`],
      warnings: []
    };
  }
}

async function runMultiVariantOcr(buffer: Buffer): Promise<string> {
  const { createWorker } = await getTesseract();
  const worker = await createWorker("eng+tha", 1, {
    logger: () => undefined,
    errorHandler: () => undefined
  });

  const variants = await Promise.all([
    sharp(buffer).grayscale().toBuffer(),
    sharp(buffer).grayscale().sharpen({ sigma: 1.5 }).toBuffer(),
    sharp(buffer).grayscale().normalize().toBuffer(),
    sharp(buffer).grayscale().threshold(128).toBuffer(),
    sharp(buffer).grayscale().resize({ width: 2048, height: 2048, fit: "inside" }).toBuffer()
  ]);

  const texts: string[] = [];
  for (const variant of variants) {
    try {
      const ret = await worker.recognize(variant);
      const text = ret.data.text?.trim() ?? "";
      if (text.length > 10) {
        texts.push(text);
      }
    } catch {
      // Ignore single-variant failures
    }
  }

  await worker.terminate();

  if (texts.length === 0) {
    return "";
  }

  // Deduplicate lines across variants while preserving order from the longest text
  const merged = mergeOcrTexts(texts);
  return merged;
}

function mergeOcrTexts(texts: string[]): string {
  // Prefer the longest text as the backbone, then append unique lines from others
  const sorted = [...texts].sort((a, b) => b.length - a.length);
  const backbone = sorted[0];
  const backboneLines = new Set(backbone.split(/\r?\n/));
  const additional: string[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const lines = sorted[i].split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && !backboneLines.has(trimmed)) {
        additional.push(trimmed);
        backboneLines.add(trimmed);
      }
    }
  }

  return [backbone, ...additional].join("\n");
}

export function extractFieldsFromOcrText(text: string): ImageReadTransferFields {
  const clean = text
    .replace(/\r/g, "\n")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/\n{3,}/g, "\n\n");

  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const flat = clean;

  return {
    amount: extractAmount(lines, flat),
    senderName: extractSenderName(lines, flat),
    receiverName: extractReceiverName(lines, flat),
    dateTime: extractDateTime(lines, flat),
    transactionReference: extractTransactionReference(lines, flat),
    senderBank: extractSenderBank(lines, flat),
    receiverBank: extractReceiverBank(lines, flat),
    senderAccountTail: extractSenderAccountTail(lines, flat),
    receiverAccountTail: extractReceiverAccountTail(lines, flat)
  };
}

function makeField(value: string | null, confidence: ImageReadField["confidence"], source: string): ImageReadField {
  return { value, confidence, source };
}

function extractAmount(lines: string[], flat: string): ImageReadField {
  // Thai amount patterns: ฿1,250.00, 1,250.00, THB 1,250.00, จำนวนเงิน 1,250.00, Amount: 1,250.00, 1,250.00 Baht
  const patterns = [
    /(?:Amount|จำนวนเงิน|ยอด|ยอดโอน|Amount\s*\(?THB\)?)[\s:]*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:THB|Baht|บาท)[\s:]*([\d,]+(?:\.\d{1,2})?)/i,
    /฿\s*([\d,]+(?:\.\d{1,2})?)/,
    /(^|\s)([\d,]+(?:\.\d{2})\s*Baht)/i,
    /(^|\s)([\d,]+(?:\.\d{2})\s*บาท)/
  ];

  for (const pattern of patterns) {
    const match = flat.match(pattern);
    if (match) {
      const raw = match[1] || match[2] || match[0];
      const normalized = normalizeAmount(raw);
      if (normalized) {
        return makeField(normalized, "HIGH", "regex-amount-line");
      }
    }
  }

  // Fallback: look for large standalone numbers that look like amounts on their own line
  for (const line of lines) {
    const m = line.match(/^[\s:]*([\d,]+\.\d{2})[\s]*$/);
    if (m) {
      const normalized = normalizeAmount(m[1]);
      if (normalized) {
        return makeField(normalized, "MEDIUM", "regex-amount-standalone");
      }
    }
  }

  return makeField(null, "NONE", "no-match");
}

function normalizeAmount(raw: string): string | null {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned || cleaned === ".") return null;
  const num = parseFloat(cleaned);
  if (Number.isNaN(num) || num < 0) return null;
  // Preserve original decimal precision if present, otherwise assume 2 decimals for common slip formats
  if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    if (parts[1] && parts[1].length <= 2) {
      return cleaned;
    }
  }
  return cleaned;
}

function extractReceiverName(lines: string[], flat: string): ImageReadField {
  const labelPatterns = [
    /(?:To|Receiver|Recipient|Pay\s*(?:to|ee)?|ผู้รับ|โอนเข้า)[\s:]*(.{2,80})/i,
    /(?:To[:\s]+)([^\n]{2,80})/i,
    /(?:ผู้รับเงิน|ชื่อผู้รับ)[\s:]*(.{2,80})/
  ];

  for (const pattern of labelPatterns) {
    const match = flat.match(pattern);
    if (match) {
      const cleaned = cleanThaiName(match[1]);
      if (cleaned) {
        return makeField(cleaned, "HIGH", "regex-receiver-line");
      }
    }
  }

  // Contextual: look for "To" or "ผู้รับ" on one line and the next line is a name
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (/^(To|ผู้รับ|Receiver|โอนเข้า)[:\s]*$/i.test(line)) {
      const next = cleanThaiName(lines[i + 1]);
      if (next) {
        return makeField(next, "MEDIUM", "regex-receiver-contextual");
      }
    }
  }

  return makeField(null, "NONE", "no-match");
}

function extractSenderName(lines: string[], flat: string): ImageReadField {
  const labelPatterns = [
    /(?:From|Sender|Remitter|ผู้โอน|โอนจาก)[\s:]*(.{2,80})/i,
    /(?:From[:\s]+)([^\n]{2,80})/i,
    /(?:ผู้โอนเงิน|ชื่อผู้โอน)[\s:]*(.{2,80})/
  ];

  for (const pattern of labelPatterns) {
    const match = flat.match(pattern);
    if (match) {
      const cleaned = cleanThaiName(match[1]);
      if (cleaned) {
        return makeField(cleaned, "HIGH", "regex-sender-line");
      }
    }
  }

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (/^(From|ผู้โอน|Sender|โอนจาก)[:\s]*$/i.test(line)) {
      const next = cleanThaiName(lines[i + 1]);
      if (next) {
        return makeField(next, "MEDIUM", "regex-sender-contextual");
      }
    }
  }

  return makeField(null, "NONE", "no-match");
}

function extractDateTime(lines: string[], flat: string): ImageReadField {
  // ISO-like: 2026-05-11 10:21:00
  const isoPattern = /(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})/;
  const matchIso = flat.match(isoPattern);
  if (matchIso) {
    return makeField(matchIso[1].replace("T", " "), "HIGH", "regex-datetime-iso");
  }

  // Thai/common: 11/05/2026 or 11-05-2026 with optional time
  const thaiDatePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})(?:[\s,]+(\d{2}:\d{2}:\d{2}|\d{2}:\d{2}))?/;
  const matchThai = flat.match(thaiDatePattern);
  if (matchThai) {
    const value = matchThai[2] ? `${matchThai[1]} ${matchThai[2]}` : matchThai[1];
    return makeField(value, "HIGH", "regex-datetime-thai");
  }

  // Date + time on adjacent lines
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
    if (dateMatch) {
      const next = lines[i + 1];
      const timeMatch = next.match(/(\d{2}:\d{2}(:\d{2})?)/);
      if (timeMatch) {
        return makeField(`${dateMatch[1]} ${timeMatch[1]}`, "MEDIUM", "regex-datetime-adjacent");
      }
    }
  }

  // Standalone time with seconds
  const timePattern = /(\d{2}:\d{2}:\d{2})/;
  const matchTime = flat.match(timePattern);
  if (matchTime) {
    return makeField(matchTime[1], "LOW", "regex-time-only");
  }

  return makeField(null, "NONE", "no-match");
}

function extractTransactionReference(lines: string[], flat: string): ImageReadField {
  const patterns = [
    /(?:Ref\.?|Reference|Transaction\s*ID|Trace\s*No\.?|เลขที่รายการ|เลขอ้างอิง|หมายเลขอ้างอิง)[\s:]*([A-Za-z0-9\-]{4,40})/i,
    /(?:Ref[:\s]+)([A-Za-z0-9\-]{4,40})/i,
    /(?:เลขที่รายการ)[\s:]*([A-Za-z0-9\-]{4,40})/
  ];

  for (const pattern of patterns) {
    const match = flat.match(pattern);
    if (match) {
      const cleaned = match[1].trim();
      if (cleaned) {
        return makeField(cleaned, "HIGH", "regex-reference-line");
      }
    }
  }

  // Contextual: label on one line, value on next
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (/^(Ref\.?|Reference|เลขที่รายการ|เลขอ้างอิง)[:\s]*$/i.test(line)) {
      const next = lines[i + 1].trim();
      if (/^[A-Za-z0-9\-]{4,40}$/.test(next)) {
        return makeField(next, "MEDIUM", "regex-reference-contextual");
      }
    }
  }

  return makeField(null, "NONE", "no-match");
}

const knownThaiBanks = [
  "KBANK",
  "SCB",
  "BBL",
  "KTB",
  "BAY",
  "TTB",
  "GSB",
  "CIMB",
  "UOB",
  "TMB",
  "Thanachart",
  "Krungsri",
  "Kasikorn",
  "Siam Commercial",
  "Bangkok Bank",
  "Krung Thai",
  "Bank of Ayudhya",
  "TThanachart",
  "Government Savings Bank",
  "ธนาคารกสิกรไทย",
  "ธนาคารไทยพาณิชย์",
  "ธนาคารกรุงเทพ",
  "ธนาคารกรุงไทย",
  "ธนาคารกรุงศรี",
  "ธนาคารทหารไทย",
  "ธนาคารออมสิน",
  "ธนาคารซีไอเอ็มบี",
  "ธนาคารยูโอบี"
];

function extractSenderBank(lines: string[], flat: string): ImageReadField {
  // Look near "From" or sender context
  for (let i = 0; i < lines.length; i++) {
    if (/From|ผู้โอน|Sender|โอนจาก/i.test(lines[i])) {
      for (let j = i; j < Math.min(i + 3, lines.length); j++) {
        const bank = matchKnownBank(lines[j]);
        if (bank) {
          return makeField(bank, "HIGH", "regex-sender-bank-near-label");
        }
      }
    }
  }

  const bank = matchKnownBank(flat);
  if (bank) {
    return makeField(bank, "LOW", "regex-bank-global");
  }

  return makeField(null, "NONE", "no-match");
}

function extractReceiverBank(lines: string[], flat: string): ImageReadField {
  for (let i = 0; i < lines.length; i++) {
    if (/To|ผู้รับ|Receiver|โอนเข้า/i.test(lines[i])) {
      for (let j = i; j < Math.min(i + 3, lines.length); j++) {
        const bank = matchKnownBank(lines[j]);
        if (bank) {
          return makeField(bank, "HIGH", "regex-receiver-bank-near-label");
        }
      }
    }
  }

  const bank = matchKnownBank(flat);
  if (bank) {
    return makeField(bank, "LOW", "regex-bank-global");
  }

  return makeField(null, "NONE", "no-match");
}

function matchKnownBank(text: string): string | null {
  const upper = text.toUpperCase();
  for (const bank of knownThaiBanks) {
    if (upper.includes(bank.toUpperCase())) {
      return bank;
    }
  }
  return null;
}

function extractSenderAccountTail(lines: string[], flat: string): ImageReadField {
  // x-1234, *1234, ending with 1234 after account context
  for (let i = 0; i < lines.length; i++) {
    if (/From|ผู้โอน|Sender|โอนจาก|Account/i.test(lines[i])) {
      for (let j = i; j < Math.min(i + 3, lines.length); j++) {
        const tail = matchAccountTail(lines[j]);
        if (tail) {
          return makeField(tail, "HIGH", "regex-sender-account-near-label");
        }
      }
    }
  }

  const tail = matchAccountTail(flat);
  if (tail) {
    return makeField(tail, "LOW", "regex-account-global");
  }

  return makeField(null, "NONE", "no-match");
}

function extractReceiverAccountTail(lines: string[], flat: string): ImageReadField {
  for (let i = 0; i < lines.length; i++) {
    if (/To|ผู้รับ|Receiver|โอนเข้า|Account/i.test(lines[i])) {
      for (let j = i; j < Math.min(i + 3, lines.length); j++) {
        const tail = matchAccountTail(lines[j]);
        if (tail) {
          return makeField(tail, "HIGH", "regex-receiver-account-near-label");
        }
      }
    }
  }

  const tail = matchAccountTail(flat);
  if (tail) {
    return makeField(tail, "LOW", "regex-account-global");
  }

  return makeField(null, "NONE", "no-match");
}

function matchAccountTail(text: string): string | null {
  const patterns = [
    /[xX*•]+(\d{3,4})/,
    /(?:Account\s*No\.?\s*[:\s]*)\d+\s*(\d{3,4})/,
    /(?:\d{3,}-)?(\d{3,4})\s*$/
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      return m[1];
    }
  }
  return null;
}

function cleanThaiName(raw: string): string | null {
  const cleaned = raw
    .replace(/\s+/g, " ")
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s\-.]/g, "")
    .trim();
  if (cleaned.length < 2) return null;
  // Avoid capturing labels as names
  const lower = cleaned.toLowerCase();
  if (
    lower === "to" ||
    lower === "from" ||
    lower === "sender" ||
    lower === "receiver" ||
    lower === "amount" ||
    lower === "date" ||
    lower === "ref" ||
    lower === "reference"
  ) {
    return null;
  }
  return cleaned;
}

function countPopulatedFields(fields: ImageReadTransferFields): number {
  let count = 0;
  for (const key of Object.keys(fields) as Array<keyof ImageReadTransferFields>) {
    if (fields[key].value !== null && fields[key].confidence !== "NONE") {
      count++;
    }
  }
  return count;
}

function buildConfidenceWarnings(fields: ImageReadTransferFields): string[] {
  const warnings: string[] = [];
  for (const key of Object.keys(fields) as Array<keyof ImageReadTransferFields>) {
    const field = fields[key];
    if (field.value !== null && field.confidence === "LOW") {
      warnings.push(`${key} was extracted with low confidence (${field.source}).`);
    }
  }
  return warnings;
}
