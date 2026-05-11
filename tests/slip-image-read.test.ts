import { describe, expect, it } from "vitest";
import { extractFieldsFromOcrText } from "../lib/slip-image-read";
import { normalizeReferenceForCompare, normalizeThaiDateTimeForCompare, normalizeThaiNameForCompare, compareThaiNames } from "../lib/slip-ocr-normalization";

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

  it("rejects all-numeric short reference from label (< 15 chars) to prevent garbage like '046123'", () => {
    const text = "เลขที่รายการ: 046123 someNoise\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.transactionReference.value).toBeNull();
  });

  it("rejects all-numeric 13-char reference from label (< 15 chars) to prevent garbled bank refs", () => {
    const text = "เลขที่รายการ: 0161212158448\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.transactionReference.value).toBeNull();
  });

  it("accepts all-numeric 18-char PromptPay reference from label (>= 15 chars)", () => {
    const text = "เลขที่รายการ: 016125082931729327\nAmount: 200.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.transactionReference.value).toBe("016125082931729327");
  });

  it("extracts pure-numeric PromptPay reference from label line with dot-noise (contextual path)", () => {
    const text = "เลขที่รายการ : .\n016128121551405021\nAmount: 200.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.transactionReference.value).toBe("016128121551405021");
  });

  it("returns null receiver name for 2-char value (cleanThaiName min length 3)", () => {
    const text = "To: Se\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.receiverName.value).toBeNull();
  });

  it("extracts receiver name for 3-char minimum value", () => {
    const text = "To: Amy\nAmount: 100.00";
    const result = extractFieldsFromOcrText(text);
    expect(result.receiverName.value).toBe("Amy");
  });
});

describe("normalizeReferenceForCompare", () => {
  it("returns empty string for null", () => {
    expect(normalizeReferenceForCompare(null)).toBe("");
  });

  it("normalizes clean references to leading-zero-stripped form", () => {
    // Leading zeros are stripped from the prefix so that OCR line-split variants
    // (e.g. "16126175244BTF00250" from OCR that put the leading 0 on its own line)
    // compare equal to the full form.
    expect(normalizeReferenceForCompare("016126175244BTF00250")).toBe("16126175244BTF00250");
    expect(normalizeReferenceForCompare("016121214623BTF04629")).toBe("16121214623BTF04629");
  });

  it("normalizes uppercase O to 0 in digit prefix (and strips leading zeros)", () => {
    expect(normalizeReferenceForCompare("O16126175244BTF00250")).toBe("16126175244BTF00250");
  });

  it("normalizes uppercase I to 1 in digit prefix (and strips leading zeros)", () => {
    expect(normalizeReferenceForCompare("01612I214623BTF04629")).toBe("16121214623BTF04629");
  });

  it("normalizes lowercase l to 1 in digit prefix (and strips leading zeros)", () => {
    expect(normalizeReferenceForCompare("0l6126175244BTF00250")).toBe("16126175244BTF00250");
  });

  it("normalizes O to 0 in digit suffix", () => {
    expect(normalizeReferenceForCompare("016126175244BTFO0250")).toBe("16126175244BTF00250");
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
    expect(normalizeReferenceForCompare("Ol612l175244BTF0O250")).toBe("16121175244BTF00250");
  });

  it("makes OCR line-split leading-zero-truncated reference equal to full reference", () => {
    // OCR sometimes splits the leading digit onto its own line; the captured value
    // then lacks the leading 0. Both forms should normalize to the same value.
    const truncated = normalizeReferenceForCompare("16126175244BTF00250");
    const full = normalizeReferenceForCompare("016126175244BTF00250");
    expect(truncated).toBe(full);
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

describe("normalizeThaiNameForCompare", () => {
  it("returns empty string for null", () => {
    expect(normalizeThaiNameForCompare(null)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(normalizeThaiNameForCompare("")).toBe("");
  });

  it("strips นาย title prefix", () => {
    expect(normalizeThaiNameForCompare("นาย สมชาย ใจดี")).toBe("สมชายใจดี");
  });

  it("strips นาง title prefix", () => {
    expect(normalizeThaiNameForCompare("นาง ประไพ ดีงาม")).toBe("ประไพดีงาม");
  });

  it("strips นางสาว title prefix (before partial นาง match)", () => {
    expect(normalizeThaiNameForCompare("นางสาว มาลี รักดี")).toBe("มาลีรักดี");
  });

  it("strips น.ส. title prefix with dots", () => {
    expect(normalizeThaiNameForCompare("น.ส. มาลี รักดี")).toBe("มาลีรักดี");
  });

  it("strips น . ส . title prefix with OCR dot-space fragmentation", () => {
    expect(normalizeThaiNameForCompare("น . ส . มาลี รักดี")).toBe("มาลีรักดี");
  });

  it("collapses OCR-fragmented Thai characters", () => {
    expect(normalizeThaiNameForCompare("น า ย ส ม ช า ย ใ จ ดี")).toBe("สมชายใจดี");
  });

  it("collapses word-boundary spaces between Thai chars", () => {
    expect(normalizeThaiNameForCompare("สมชาย ใจดี")).toBe("สมชายใจดี");
  });

  it("fragmented and compact Thai name produce same normalized form", () => {
    const fragmented = normalizeThaiNameForCompare("น า ย ส ม ช า ย ใ จ ดี");
    const compact = normalizeThaiNameForCompare("นาย สมชาย ใจดี");
    expect(fragmented).toBe(compact);
  });

  it("นาง and นางสาว forms of the same name produce same normalized form", () => {
    const a = normalizeThaiNameForCompare("นางสาว มาลี รักดี");
    const b = normalizeThaiNameForCompare("น.ส. มาลี รักดี");
    expect(a).toBe(b);
  });

  it("aggressively strips นาย prefix even without a following space (comparison-only)", () => {
    // After Thai-Thai collapse, title stripping uses \s* so it fires even when OCR
    // dropped the space between title and name. This is intentional and safe for
    // comparison-only normalization — "นายXXX" without a space never appears as a
    // real non-title name in transfer-slip OCR.
    expect(normalizeThaiNameForCompare("นายสมชาย")).toBe("สมชาย");
  });

  it("fixes OCR nikhahit+sara-a misread to sara-am", () => {
    // U+0E4D U+0E32 → U+0E33 (nikhahit + sara-a → sara-am)
    const ocrNoisy = normalizeThaiNameForCompare("สม\u0E4D\u0E32ร์");
    const correct = normalizeThaiNameForCompare("สม\u0E33ร์");
    expect(ocrNoisy).toBe(correct);
  });

  it("strips leading punctuation noise", () => {
    expect(normalizeThaiNameForCompare(". สมชาย ใจดี")).toBe("สมชายใจดี");
    expect(normalizeThaiNameForCompare("- มาลี")).toBe("มาลี");
  });

  it("lowercases Latin characters in mixed names", () => {
    expect(normalizeThaiNameForCompare("Alice Smith")).toBe("alice smith");
  });

  it("leaves Latin-only name whitespace intact (no Thai-Thai space collapse)", () => {
    expect(normalizeThaiNameForCompare("Alice Smith")).toBe("alice smith");
  });
});

describe("compareThaiNames", () => {
  it("returns INSUFFICIENT for null inputs", () => {
    expect(compareThaiNames(null, null)).toBe("INSUFFICIENT");
    expect(compareThaiNames("สมชาย ใจดี", null)).toBe("INSUFFICIENT");
    expect(compareThaiNames(null, "สมชาย ใจดี")).toBe("INSUFFICIENT");
  });

  it("returns EXACT for identical names", () => {
    expect(compareThaiNames("สมชาย ใจดี", "สมชาย ใจดี")).toBe("EXACT");
  });

  it("returns EXACT for same name with different titles", () => {
    expect(compareThaiNames("นาย สมชาย ใจดี", "สมชาย ใจดี")).toBe("EXACT");
    expect(compareThaiNames("นางสาว มาลี รักดี", "น.ส. มาลี รักดี")).toBe("EXACT");
  });

  it("returns EXACT for fragmented vs compact OCR forms", () => {
    expect(compareThaiNames("น า ย ส ม ช า ย ใ จ ดี", "นาย สมชาย ใจดี")).toBe("EXACT");
  });

  it("returns CLOSE when one name is a prefix of the other (OCR truncation)", () => {
    // First name only vs full name
    expect(compareThaiNames("สมชาย", "สมชาย ใจดี")).toBe("CLOSE");
    expect(compareThaiNames("สมชายใจดี", "สมชาย")).toBe("CLOSE");
  });

  it("returns DIFFERENT for clearly different names", () => {
    expect(compareThaiNames("สมชาย ใจดี", "มาลี รักดี")).toBe("DIFFERENT");
    expect(compareThaiNames("Alice Smith", "Bob Jones")).toBe("DIFFERENT");
  });

  it("does not return CLOSE for very short prefix matches (< 4 chars)", () => {
    expect(compareThaiNames("สม", "สมชายใจดี")).toBe("DIFFERENT");
  });

  it("returns INSUFFICIENT when one input normalizes to empty (title only, no actual name)", () => {
    // "นาย" alone strips to "" after title removal → cannot compare
    expect(compareThaiNames("นาย", "สมชาย")).toBe("INSUFFICIENT");
  });
});
