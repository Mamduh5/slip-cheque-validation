import { describe, expect, it } from "vitest";
import { extractFieldsFromOcrText } from "../lib/slip-image-read";
import { normalizeReferenceForCompare, normalizeThaiDateTimeForCompare } from "../lib/slip-ocr-normalization";

describe("extractFieldsFromOcrText", () => {
  it("extracts amount from Amount line", () => {
    const text = "Amount: 1,250.00\nTo: Somchai Jaidee";
    const result = extractFieldsFromOcrText(text);
    expect(result.amount.value).toBe("1250.00");
    expect(result.amount.confidence).toBe("HIGH");
  });

  it("extracts amount from THB prefix", () => {
    const text = "THB 999.50\nFrom: Alice";
    const result = extractFieldsFromOcrText(text);
    expect(result.amount.value).toBe("999.50");
    expect(result.amount.confidence).toBe("HIGH");
  });

  it("extracts amount from Baht suffix", () => {
    const text = "500.00 Baht\nDate: 11/05/2026";
    const result = extractFieldsFromOcrText(text);
    expect(result.amount.value).toBe("500.00");
    expect(result.amount.confidence).toBe("HIGH");
  });

  it("extracts amount from ฿ symbol", () => {
    const text = "฿ 75.00\nRef: ABC123";
    const result = extractFieldsFromOcrText(text);
    expect(result.amount.value).toBe("75.00");
  });

  it("extracts amount from standalone decimal line", () => {
    const text = "Transfer\n1,500.00\nTo: Bob";
    const result = extractFieldsFromOcrText(text);
    expect(result.amount.value).toBe("1500.00");
    expect(result.amount.confidence).toBe("MEDIUM");
  });

  it("does not invent amount when none is present", () => {
    const text = "Hello world\nNo numbers here";
    const result = extractFieldsFromOcrText(text);
    expect(result.amount.value).toBeNull();
    expect(result.amount.confidence).toBe("NONE");
  });

  it("extracts receiver name from To label", () => {
    const text = "To: Somchai Jaidee\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.receiverName.value).toBe("Somchai Jaidee");
    expect(result.receiverName.confidence).toBe("HIGH");
  });

  it("extracts receiver name from contextual next line", () => {
    const text = "To\nSuda Prasert\nAmount: 200.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.receiverName.value).toBe("Suda Prasert");
    expect(result.receiverName.confidence).toBe("HIGH");
  });

  it("extracts sender name from From label", () => {
    const text = "From: Alice Smith\nTo: Bob Jones";
    const result = extractFieldsFromOcrText(text);
    expect(result.senderName.value).toBe("Alice Smith");
    expect(result.senderName.confidence).toBe("HIGH");
  });

  it("extracts sender name from contextual next line", () => {
    const text = "From\nCharlie Brown\nTo: Dave";
    const result = extractFieldsFromOcrText(text);
    expect(result.senderName.value).toBe("Charlie Brown");
    expect(result.senderName.confidence).toBe("HIGH");
  });

  it("extracts ISO-like datetime", () => {
    const text = "2026-05-11 10:21:00\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.dateTime.value).toBe("2026-05-11 10:21:00");
    expect(result.dateTime.confidence).toBe("HIGH");
  });

  it("extracts Thai-style date with time", () => {
    const text = "Date: 11/05/2026, 10:21:00\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.dateTime.value).toBe("11/05/2026 10:21:00");
    expect(result.dateTime.confidence).toBe("HIGH");
  });

  it("extracts date and time from adjacent lines", () => {
    const text = "11/05/2026\n10:21:00\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.dateTime.value).toBe("11/05/2026 10:21:00");
    expect(result.dateTime.confidence).toBe("HIGH");
  });

  it("extracts standalone time with low confidence", () => {
    const text = "Time: 14:30:00\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.dateTime.value).toBe("14:30:00");
    expect(result.dateTime.confidence).toBe("LOW");
  });

  it("extracts transaction reference from Ref label", () => {
    const text = "Ref: ABC-12345\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.transactionReference.value).toBe("ABC-12345");
    expect(result.transactionReference.confidence).toBe("HIGH");
  });

  it("extracts transaction reference from contextual next line", () => {
    const text = "Reference\nXYZ-99999\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.transactionReference.value).toBe("XYZ-99999");
    expect(result.transactionReference.confidence).toBe("HIGH");
  });

  it("extracts sender bank near From label", () => {
    const text = "From\nAlice\nKBANK\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.senderBank.value).toBe("KBANK");
    expect(result.senderBank.confidence).toBe("HIGH");
  });

  it("extracts receiver bank near To label", () => {
    const text = "To\nBob\nSCB\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.receiverBank.value).toBe("SCB");
    expect(result.receiverBank.confidence).toBe("HIGH");
  });

  it("falls back to global bank match with LOW confidence", () => {
    const text = "KBANK transfer slip\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.senderBank.value).toBe("KBANK");
    expect(result.senderBank.confidence).toBe("LOW");
  });

  it("extracts account tail near sender context", () => {
    const text = "From\nAlice\nAccount No. x-1234\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.senderAccountTail.value).toBe("1234");
    expect(result.senderAccountTail.confidence).toBe("HIGH");
  });

  it("extracts account tail near receiver context", () => {
    const text = "To\nBob\n***5678\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.receiverAccountTail.value).toBe("5678");
    expect(result.receiverAccountTail.confidence).toBe("HIGH");
  });

  it("returns null for fields not found in text", () => {
    const text = "Random unrelated text";
    const result = extractFieldsFromOcrText(text);
    expect(result.amount.value).toBeNull();
    expect(result.receiverName.value).toBeNull();
    expect(result.senderName.value).toBeNull();
    expect(result.dateTime.value).toBeNull();
    expect(result.transactionReference.value).toBeNull();
    expect(result.senderBank.value).toBeNull();
    expect(result.receiverBank.value).toBeNull();
    expect(result.senderAccountTail.value).toBeNull();
    expect(result.receiverAccountTail.value).toBeNull();
  });

  it("extracts Thai amount line with จำนวนเงิน", () => {
    const text = "จำนวนเงิน 2,500.00\nTo: สมชาย ใจดี";
    const result = extractFieldsFromOcrText(text);
    expect(result.amount.value).toBe("2500.00");
  });

  it("extracts Thai receiver name with ผู้รับ", () => {
    const text = "ผู้รับ: สมชาย ใจดี\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.receiverName.value).toBe("สมชาย ใจดี");
  });

  it("extracts Thai sender name with ผู้โอน", () => {
    const text = "ผู้โอน: สุดา ประเสริฐ\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.senderName.value).toBe("สุดา ประเสริฐ");
  });

  it("extracts Thai reference with เลขที่รายการ", () => {
    const text = "เลขที่รายการ: REF-123\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.transactionReference.value).toBe("REF-123");
  });
});

describe("normalizeReferenceForCompare", () => {
  it("returns empty string for null", () => {
    expect(normalizeReferenceForCompare(null)).toBe("");
  });

  it("leaves a clean bank reference unchanged", () => {
    expect(normalizeReferenceForCompare("016126175244BTF00250")).toBe("016126175244BTF00250");
    expect(normalizeReferenceForCompare("016121214623BTF04629")).toBe("016121214623BTF04629");
  });

  it("normalizes uppercase O to 0 in digit prefix", () => {
    expect(normalizeReferenceForCompare("O16126175244BTF00250")).toBe("016126175244BTF00250");
  });

  it("normalizes uppercase I to 1 in digit prefix", () => {
    expect(normalizeReferenceForCompare("01612I214623BTF04629")).toBe("016121214623BTF04629");
  });

  it("normalizes lowercase l to 1 in digit prefix", () => {
    expect(normalizeReferenceForCompare("0l6126175244BTF00250")).toBe("016126175244BTF00250");
  });

  it("normalizes O to 0 in digit suffix", () => {
    expect(normalizeReferenceForCompare("016126175244BTFO0250")).toBe("016126175244BTF00250");
  });

  it("does not alter the letter code portion", () => {
    const result = normalizeReferenceForCompare("016126175244BTF00250");
    expect(result).toContain("BTF");
  });

  it("makes OCR-confused reference equal to correct reference", () => {
    const confused = normalizeReferenceForCompare("01612I214623BTF04629");
    const correct = normalizeReferenceForCompare("016121214623BTF04629");
    expect(confused).toBe(correct);
  });

  it("keeps different bank references different after normalization", () => {
    const a = normalizeReferenceForCompare("016126175244BTF00250");
    const b = normalizeReferenceForCompare("016121214623BTF04629");
    expect(a).not.toBe(b);
  });

  it("falls back to lowercase-and-trim for non-bank-ref strings", () => {
    expect(normalizeReferenceForCompare("REF-ABC123")).toBe("ref-abc123");
    expect(normalizeReferenceForCompare("XYZ-99999")).toBe("xyz-99999");
  });

  it("handles multiple confusions in the same reference", () => {
    expect(normalizeReferenceForCompare("Ol612l175244BTF0O250")).toBe("016121175244BTF00250");
  });
});

describe("normalizeThaiDateTimeForCompare", () => {
  it("returns empty string for null", () => {
    expect(normalizeThaiDateTimeForCompare(null)).toBe("");
  });

  it("normalizes fully fragmented Thai date-time", () => {
    expect(normalizeThaiDateTimeForCompare("6 พ . ค . 69 17:52")).toBe("6พ.ค.69 17:52");
  });

  it("normalizes semi-compact Thai date-time", () => {
    expect(normalizeThaiDateTimeForCompare("6 พ.ค. 69 17:52")).toBe("6พ.ค.69 17:52");
  });

  it("normalizes compact Thai date-time already without spaces", () => {
    expect(normalizeThaiDateTimeForCompare("6พ.ค.69 17:52")).toBe("6พ.ค.69 17:52");
  });

  it("fragmented and compact forms normalize to the same value", () => {
    const fragmented = normalizeThaiDateTimeForCompare("6 พ . ค . 69 17:52");
    const compact = normalizeThaiDateTimeForCompare("6 พ.ค. 69 17:52");
    expect(fragmented).toBe(compact);
  });

  it("handles April abbreviation (เม.ย.)", () => {
    expect(normalizeThaiDateTimeForCompare("30 เม . ย . 69 09:32")).toBe("30เม.ย.69 09:32");
    expect(normalizeThaiDateTimeForCompare("30 เม.ย. 69 09:32")).toBe("30เม.ย.69 09:32");
  });

  it("two equivalent dates normalize to the same value", () => {
    const a = normalizeThaiDateTimeForCompare("1 พ . ค . 69 21:46");
    const b = normalizeThaiDateTimeForCompare("1 พ.ค. 69 21:46");
    expect(a).toBe(b);
  });

  it("genuinely different dates remain different after normalization", () => {
    const a = normalizeThaiDateTimeForCompare("6 พ.ค. 69 17:52");
    const b = normalizeThaiDateTimeForCompare("1 พ.ค. 69 21:46");
    expect(a).not.toBe(b);
  });

  it("does not alter ISO date format", () => {
    expect(normalizeThaiDateTimeForCompare("2026-05-11 10:21:00")).toBe("2026-05-11 10:21:00");
  });

  it("does not alter slash date format", () => {
    expect(normalizeThaiDateTimeForCompare("11/05/2026 10:21:00")).toBe("11/05/2026 10:21:00");
  });
});
