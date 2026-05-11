import { describe, expect, it } from "vitest";
import { extractFieldsFromOcrText } from "@/lib/slip-image-read";

describe("densify and extract on sample OCR text", () => {
  const sample = `
โอ น เง ิ น ส ํ า เ ร ็ จ
6 พ . ค . 69 17:52 น .
น . ส . ณั ฐ ฐ า พ ร ว
ธ . ก ส ิ ก ร ไท ย
เล ข ท ี ่ ร า ย ก า ร :
016126175244BTF00250
จ ํ า น ว น :
73.00 บ า ท
ค ่ า ธ ร ร ม เ น ี ย ม :
0.00 บ า ท
`;

  it("extracts amount from spaced Thai OCR text", () => {
    const fields = extractFieldsFromOcrText(sample);
    console.log("Amount:", fields.amount);
    console.log("Reference:", fields.transactionReference);
    console.log("DateTime:", fields.dateTime);
    console.log("Receiver:", fields.receiverName);
    console.log("Sender:", fields.senderName);
    console.log("ReceiverBank:", fields.receiverBank);

    expect(fields.amount.value).not.toBeNull();
    expect(fields.amount.value).toBe("73.00");
  });

  it("extracts reference from spaced Thai OCR text", () => {
    const fields = extractFieldsFromOcrText(sample);
    expect(fields.transactionReference.value).not.toBeNull();
    expect(fields.transactionReference.value).toContain("BTF00250");
  });

  it("extracts date from spaced Thai OCR text", () => {
    const fields = extractFieldsFromOcrText(sample);
    expect(fields.dateTime.value).not.toBeNull();
  });
});
