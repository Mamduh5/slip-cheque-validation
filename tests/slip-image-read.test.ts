import { describe, expect, it } from "vitest";
import { extractFieldsFromOcrText } from "../lib/slip-image-read";

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
