import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  resolveImagePath,
  formatField,
  formatFieldsLines,
} from "@/lib/dev/inspect-formatters";
import type { ImageReadField, ImageReadTransferFields } from "@/lib/models";

describe("resolveImagePath", () => {
  it("resolves absolute paths as-is", () => {
    const result = resolveImagePath("/foo/bar.jpg", "/fixtures");
    expect(result).toBe(path.resolve("/foo/bar.jpg"));
  });

  it("resolves relative paths with separators", () => {
    const result = resolveImagePath("./foo/bar.jpg", "/fixtures");
    expect(result).toMatch(/foo[/\\]bar\.jpg$/);
  });

  it("resolves bare filenames under the fixture directory", () => {
    const result = resolveImagePath("test.jpg", "/fixtures");
    expect(result).toBe(path.join("/fixtures", "test.jpg"));
  });
});

describe("formatField", () => {
  it("returns em-dash for missing field", () => {
    expect(formatField(undefined)).toBe("—");
  });

  it("returns em-dash for null value", () => {
    const field: ImageReadField = { value: null, confidence: "NONE", source: "no-match" };
    expect(formatField(field)).toBe("—");
  });

  it("formats value with lowercase confidence", () => {
    const field: ImageReadField = { value: "73.00", confidence: "HIGH", source: "regex" };
    expect(formatField(field)).toBe("73.00 (high)");
  });
});

describe("formatFieldsLines", () => {
  it("returns placeholder when fields are null", () => {
    const lines = formatFieldsLines(null);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("  (no fields extracted)");
  });

  it("returns all field lines with formatted values", () => {
    const fields: ImageReadTransferFields = {
      amount: { value: "100.00", confidence: "HIGH", source: "regex" },
      senderName: { value: "Alice", confidence: "MEDIUM", source: "regex" },
      receiverName: { value: null, confidence: "NONE", source: "no-match" },
      dateTime: { value: "6 พ.ค. 69", confidence: "HIGH", source: "regex" },
      transactionReference: { value: "REF123", confidence: "LOW", source: "regex" },
      senderBank: { value: null, confidence: "NONE", source: "no-match" },
      receiverBank: { value: "กสิกร", confidence: "LOW", source: "regex" },
      senderAccountTail: { value: "1234", confidence: "LOW", source: "regex" },
      receiverAccountTail: { value: null, confidence: "NONE", source: "no-match" },
    };

    const lines = formatFieldsLines(fields);
    expect(lines).toContain("  Amount:              100.00 (high)");
    expect(lines).toContain("  Sender name:         Alice (medium)");
    expect(lines).toContain("  Receiver name:       —");
    expect(lines).toContain("  Date/Time:           6 พ.ค. 69 (high)");
    expect(lines).toContain("  Transaction ref:     REF123 (low)");
    expect(lines).toContain("  Sender bank:         —");
    expect(lines).toContain("  Receiver bank:       กสิกร (low)");
    expect(lines).toContain("  Sender acct tail:    1234 (low)");
    expect(lines).toContain("  Receiver acct tail:  —");
  });
});
