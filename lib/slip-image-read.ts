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
  ocrBuffer?: Buffer;
  readAt?: Date;
}

export async function attemptSlipImageRead(
  input: AttemptSlipImageReadInput
): Promise<SlipImageReadAnalysisResult> {
  const readAt = input.readAt ?? new Date();

  try {
    const ocrText = await runMultiVariantOcr(input.ocrBuffer ?? input.normalizedBuffer);

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

  const candidateTexts: string[] = [];
  for (const variant of variants) {
    try {
      const ret = await worker.recognize(variant);
      const text = ret.data.text?.trim() ?? "";
      if (text.length > 10) {
        candidateTexts.push(text);
      }
    } catch {
      // Ignore single-variant failures
    }
  }

  await worker.terminate();

  if (candidateTexts.length === 0) {
    return "";
  }

  // Instead of blindly merging all texts, extract fields from each variant
  // and pick the variant with the best extraction score (most populated fields).
  let bestText = candidateTexts[0];
  let bestScore = scoreExtraction(extractFieldsFromOcrText(bestText), bestText);

  for (let i = 1; i < candidateTexts.length; i++) {
    const text = candidateTexts[i];
    const fields = extractFieldsFromOcrText(text);
    const score = scoreExtraction(fields, text);
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }

  return bestText;
}

function scoreExtraction(fields: ImageReadTransferFields, rawText: string): number {
  let score = 0;
  const weights: Record<keyof ImageReadTransferFields, number> = {
    amount: 4,
    transactionReference: 3,
    dateTime: 3,
    receiverName: 2,
    senderName: 2,
    receiverBank: 1,
    senderBank: 1,
    receiverAccountTail: 1,
    senderAccountTail: 1
  };
  for (const key of Object.keys(fields) as Array<keyof ImageReadTransferFields>) {
    const field = fields[key];
    if (field.value !== null && field.confidence !== "NONE") {
      score += weights[key];
      if (field.confidence === "HIGH") score += 0.5;
    }
  }

  // Bonus for Thai date-like patterns in raw text (encourages selecting variants with readable dates)
  const hasThaiDate = /\d{1,2}\s*[\u0E00-\u0E7F]\s*\.?\s*[\u0E00-\u0E7F]\s*\.?\s*\d{2,4}/.test(rawText);
  if (hasThaiDate) score += 3;

  // Penalty for excessive garbage characters (non-alphanumeric, non-Thai, non-space, non-punctuation)
  const garbageChars = (rawText.match(/[^\w\s\u0E00-\u0E7F.,:;!?@%&*()\-\/฿]/g) || []).length;
  score -= garbageChars * 0.2;

  return score;
}

function hasOcrFragmentation(text: string): boolean {
  // Detect OCR-fragmented Thai text: three or more Thai characters
  // separated by single spaces, which indicates tesseract inserted
  // spaces between individual characters.
  return /[\u0E00-\u0E7F]\s[\u0E00-\u0E7F]\s[\u0E00-\u0E7F]/.test(text);
}

function densifyThaiText(text: string): string {
  // Tesseract often inserts spaces between Thai characters.
  // Remove spaces that sit between two Thai characters while preserving
  // spaces around non-Thai text and line breaks.
  // Only apply when we detect OCR-fragmentation patterns, so clean
  // text (e.g. unit tests with proper word spacing) is left untouched.
  if (!hasOcrFragmentation(text)) {
    return text;
  }
  let result = text;
  let prev = "";
  do {
    prev = result;
    result = result.replace(
      /([\u0E00-\u0E7F])\s+([\u0E00-\u0E7F])/g,
      (_, a: string, b: string) => a + b
    );
  } while (result !== prev);
  return result;
}

function normalizeThaiOcr(text: string): string {
  // Fix common tesseract Thai misreadings:
  // - ํา (nikhahit + sara a) is often OCR'd instead of ำ (sara am)
  return text
    .replace(/\u0E4D\u0E32/g, "\u0E33")
    .replace(/\u0E4D \u0E32/g, "\u0E33");
}

export function extractFieldsFromOcrText(text: string): ImageReadTransferFields {
  const clean = text
    .replace(/\r/g, "\n")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/\n{3,}/g, "\n\n");

  const densified = densifyThaiText(clean);
  const normalized = normalizeThaiOcr(densified);

  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);
  const flat = normalized;

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
  // After densification, spaced Thai text like "บ า ท" becomes "บาท".
  const patterns = [
    // Label on same line: "Amount: 1,250.00", "จำนวนเงิน 1,250.00", "ยอดโอน 1,250.00"
    /(?:Amount|จำนวนเงิน|ยอด|ยอดโอน|Amount\s*\(?THB\)?)[\s:]*([\d,]+(?:\.\d{1,2})?)/i,
    // Currency-first: "THB 1,250.00", "Baht 1,250.00", "บาท 1,250.00"
    /(?:THB|Baht|บาท)[\s:]*([\d,]+(?:\.\d{1,2})?)/i,
    // Baht symbol
    /฿\s*([\d,]+(?:\.\d{1,2})?)/,
    // Number then currency: "1,250.00 Baht", "1,250.00 บาท"
    /(^|\s)([\d,]+(?:\.\d{2})\s*(?:Baht|บาท))/i,
    // Number then currency (Thai script): "1,250.00บาท" without space
    /(^|\s)([\d,]+(?:\.\d{2})บาท)/i
  ];

  for (const pattern of patterns) {
    const match = flat.match(pattern);
    if (match) {
      const raw = match[1] || match[2] || match[0];
      const normalized = normalizeAmount(raw);
      if (normalized && !isFeeAmount(normalized)) {
        return makeField(normalized, "HIGH", "regex-amount-line");
      }
    }
  }

  // Contextual: label "จำนวน" or "Amount" on one line, number on next line(s)
  for (let i = 0; i < lines.length; i++) {
    if (/^(จำนวน|จำนวนเงิน|Amount|ยอด|ยอดโอน)/i.test(lines[i])) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const m = lines[j].match(/([\d,]+\.\d{2})/);
        if (m) {
          const normalized = normalizeAmount(m[1]);
          if (normalized && !isFeeAmount(normalized)) {
            return makeField(normalized, "MEDIUM", "regex-amount-contextual");
          }
        }
      }
    }
  }

  // Fallback: look for the largest standalone number with 2 decimals on its own line
  let bestAmount: string | null = null;
  for (const line of lines) {
    const m = line.match(/^[\s:]*([\d,]+\.\d{2})[\s]*$/);
    if (m) {
      const normalized = normalizeAmount(m[1]);
      if (normalized && !isFeeAmount(normalized)) {
        if (!bestAmount || parseFloat(normalized.replace(/,/g, "")) > parseFloat(bestAmount.replace(/,/g, ""))) {
          bestAmount = normalized;
        }
      }
    }
  }
  if (bestAmount) {
    return makeField(bestAmount, "MEDIUM", "regex-amount-standalone");
  }

  return makeField(null, "NONE", "no-match");
}

function isFeeAmount(value: string): boolean {
  const num = parseFloat(value.replace(/,/g, ""));
  return num === 0;
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
    /(?:To|Receiver|Recipient|Pay\s*(?:to|ee)?|ผู้รับ|โอนเข้า|ไปที่)[\s:]*(.{2,80})/i,
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

  // Contextual: look for "To", "ผู้รับ", or "ไปที่" on one line and the next line is a name
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (/^(To|ผู้รับ|Receiver|โอนเข้า|ไปที่)[:\s]*$/i.test(line)) {
      const next = cleanThaiName(lines[i + 1]);
      if (next) {
        return makeField(next, "MEDIUM", "regex-receiver-contextual");
      }
    }
  }

  // Fallback: look for Thai titles or company names that suggest a receiver
  for (const line of lines) {
    const name = extractThaiPersonOrCompanyName(line);
    if (name) {
      // Skip if this line already matched as sender via "จาก" context
      // (handled by trying sender first in the caller pipeline)
      return makeField(name, "LOW", "regex-receiver-title");
    }
  }

  return makeField(null, "NONE", "no-match");
}

function extractThaiPersonOrCompanyName(line: string): string | null {
  // Thai titles: น.ส./นางสาว (Miss), นาย (Mr), นาง (Mrs), บริษัท (Company), ร้าน (Shop)
  // นางสาว listed before นาง to avoid a partial prefix match consuming only "นาง".
  const titlePattern = /^(.*?)((?:น\.ส\.|นางสาว|นาย|นาง|บริษัท|ร้าน|ร\.ร\.)[^\n]{1,60})/;
  const m = line.match(titlePattern);
  if (m) {
    const candidate = cleanThaiName(m[2]);
    if (candidate && candidate.length >= 3) {
      return candidate;
    }
  }
  return null;
}

function extractSenderName(lines: string[], flat: string): ImageReadField {
  const labelPatterns = [
    /(?:From|Sender|Remitter|ผู้โอน|โอนจาก|จ่ายจาก)[\s:]*(.{2,80})/i,
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
    if (/^(From|ผู้โอน|Sender|โอนจาก|จ่ายจาก)[:\s]*$/i.test(line)) {
      const next = cleanThaiName(lines[i + 1]);
      if (next) {
        return makeField(next, "MEDIUM", "regex-sender-contextual");
      }
    }
  }

  // Fallback: look for Thai titles near "จาก" (from) context
  for (let i = 0; i < lines.length; i++) {
    if (/จาก/i.test(lines[i])) {
      for (let j = i; j < Math.min(i + 3, lines.length); j++) {
        const name = extractThaiPersonOrCompanyName(lines[j]);
        if (name) {
          return makeField(name, "MEDIUM", "regex-sender-title-near-label");
        }
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

  // Thai Buddhist calendar: 6 พ.ค. 2569 17:52 น.  or  30 เม.ย. 69, 09:32
  // Handles both dense and spaced OCR output (e.g. "พ . ค ." → matched as-is)
  const thaiBuddhistPattern = /(\d{1,2}(?:\s*[\u0E00-\u0E7F]\s*\.?\s*){1,5}\d{2,4})(?:[,\s]+(\d{2}:\d{2}(?::\d{2})?))?(?:\s*น\.)?/;
  const matchThaiBuddhist = flat.match(thaiBuddhistPattern);
  if (matchThaiBuddhist) {
    const value = matchThaiBuddhist[2]
      ? `${matchThaiBuddhist[1]} ${matchThaiBuddhist[2]}`.trim()
      : matchThaiBuddhist[1];
    return makeField(value, "HIGH", "regex-datetime-thai-buddhist");
  }

  // Thai/common slash-dash: 11/05/2026 or 11-05-2026 with optional time
  const thaiDatePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})(?:[\s,]+(\d{2}:\d{2}:\d{2}|\d{2}:\d{2}))?/;
  const matchThai = flat.match(thaiDatePattern);
  if (matchThai) {
    const value = matchThai[2] ? `${matchThai[1]} ${matchThai[2]}` : matchThai[1];
    return makeField(value, "HIGH", "regex-datetime-thai");
  }

  // Date + time on adjacent lines
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const slashDate = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
    if (slashDate) {
      const next = lines[i + 1];
      const timeMatch = next.match(/(\d{2}:\d{2}(:\d{2})?)/);
      if (timeMatch) {
        return makeField(`${slashDate[1]} ${timeMatch[1]}`, "MEDIUM", "regex-datetime-adjacent");
      }
    }
    // Thai Buddhist date on one line, time on next
    const thaiDate = line.match(/(\d{1,2}\s*[\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46]+\.\s*\d{2,4})/);
    if (thaiDate) {
      const next = lines[i + 1];
      const timeMatch = next.match(/(\d{2}:\d{2}(:\d{2})?)/);
      if (timeMatch) {
        return makeField(`${thaiDate[1]} ${timeMatch[1]}`, "MEDIUM", "regex-datetime-adjacent");
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
  // Priority 1: full bank reference code after a label (handles line breaks via flat text)
  // e.g. "เลขที่รายการ: 016126175244BTF00250"
  const fullRefPattern = /(?:Reference|Transaction\s*ID|Trace\s*No\.?|Ref\.?|เลขที่รายการ|เลขอ้างอิง|หมายเลขอ้างอิง|รายการ)[\s:]*([0-9]{9,20}[A-Z]{3}\d{4,})/i;
  const fullRefMatch = flat.match(fullRefPattern);
  if (fullRefMatch) {
    return makeField(fullRefMatch[1], "HIGH", "regex-reference-full");
  }

  // Priority 2: standard labels followed by any alphanumeric code (shorter/less specific)
  const patterns = [
    /(?:Reference|Transaction\s*ID|Trace\s*No\.?|Ref\.?|เลขที่รายการ|เลขอ้างอิง|หมายเลขอ้างอิง|รายการ)[\s:]*([A-Za-z0-9\-]{4,40})/i,
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

  // Contextual: label on one line, value on next (tolerate extra text on value line)
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (/^(Ref\.?|Reference|เลขที่รายการ|เลขอ้างอิง|หมายเลขอ้างอิง|รายการ)[:\s]*$/i.test(line)) {
      const next = lines[i + 1].trim();
      // Allow the full bank reference pattern even with trailing noise
      const m = next.match(/^([A-Za-z0-9\-]{4,40})/);
      if (m) {
        return makeField(m[1], "MEDIUM", "regex-reference-contextual");
      }
    }
  }

  // Fallback: look for lines that start with a bank transaction reference
  // e.g. "016126175244BTF00250 [=]: = [=]"
  for (const line of lines) {
    const m = line.match(/^(\d{9,20}[A-Z]{3}\d{4,})/);
    if (m) {
      return makeField(m[1], "MEDIUM", "regex-reference-line-start");
    }
  }

  // Last resort: search anywhere in the text for the distinctive bank reference pattern.
  // The pattern is specific enough (long digit run + 3-letter code + digits) to warrant MEDIUM
  // confidence even without a label, since accidental matches are rare.
  const anywhereMatch = flat.match(/(\d{9,20}[A-Z]{3}\d{4,})/);
  if (anywhereMatch) {
    return makeField(anywhereMatch[1], "MEDIUM", "regex-reference-anywhere");
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
  // Full Thai names
  "ธนาคารกสิกรไทย",
  "ธนาคารไทยพาณิชย์",
  "ธนาคารกรุงเทพ",
  "ธนาคารกรุงไทย",
  "ธนาคารกรุงศรี",
  "ธนาคารทหารไทย",
  "ธนาคารออมสิน",
  "ธนาคารซีไอเอ็มบี",
  "ธนาคารยูโอบี",
  // Short forms used on slips (after densification)
  "กสิกร",
  "กรุงเทพ",
  "กรุงไทย",
  "กรุงศรี",
  "ทหารไทย",
  "ออมสิน",
  "ไทยพาณิชย์",
  "ธ.กสิกร",
  "ธ.กรุงเทพ",
  "ธ.กรุงไทย"
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
