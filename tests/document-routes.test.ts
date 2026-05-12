import { Readable } from "node:stream";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getDocument, PATCH as updateDocument } from "../app/api/documents/[id]/route";
import { GET as getOriginalDocument } from "../app/api/documents/[id]/original/route";
import { POST as reviewDocument } from "../app/api/documents/[id]/review/route";
import { POST as uploadDocument } from "../app/api/documents/route";
import { POST as bulkReviewDocuments } from "../app/api/review/bulk/route";
import { getDocumentProcessingProfile } from "../lib/document-processing-profiles";
import { findLikelyDuplicateMatchForUser, getRecentDocumentsForUser, getReviewHistoryForDocument } from "../lib/documents";
import { ImageQualityFailureError } from "../lib/image-quality";
import { attemptSlipVerification } from "../lib/slip-verification";
import { attemptTransferMetadataParse } from "../lib/transfer-metadata-parse";
import type { AuditLogRecord, DocumentRecord, DocumentType, DuplicateReviewPairRecord } from "../lib/models";

const thaiPromptPayPayload =
  "00020101021229370016A000000677010111011300668123456785802TH53037645406100.005909TEST SHOP6007BANGKOK63047938";

const testState = vi.hoisted(() => ({
  session: null as { user?: { id?: string; email?: string } } | null,
  documents: [] as DocumentRecord[],
  reviewPairs: [] as DuplicateReviewPairRecord[],
  auditLogs: [] as AuditLogRecord[],
  processUploadedDocumentImage: vi.fn(),
  getOriginalDocumentObject: vi.fn()
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => testState.session)
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {}
}));

vi.mock("@/lib/object-storage", () => ({
  putOriginalDocumentObject: vi.fn(async (input: { objectKey: string }) => ({
    bucket: "document-images",
    key: input.objectKey
  })),
  getOriginalDocumentObject: testState.getOriginalDocumentObject
}));

vi.mock("@/lib/document-processing", () => ({
  DocumentImageProcessingError: class DocumentImageProcessingError extends Error {},
  processUploadedDocumentImage: testState.processUploadedDocumentImage
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(async () => ({
    collection(name: string) {
      if (name === "documents") {
        return {
          createIndexes: vi.fn(async () => undefined),
          findOne: vi.fn(async (query: Record<string, unknown>, options?: { sort?: Record<string, 1 | -1> }) => {
            const matches = testState.documents.filter((document) => matchesQuery(document, query));
            return sortDocuments(matches, options?.sort)[0] ?? null;
          }),
          insertOne: vi.fn(async (document: DocumentRecord) => {
            testState.documents.push(document);
            return { insertedId: document._id };
          }),
          find: vi.fn((query: Record<string, unknown>) => {
            const matches = testState.documents.filter((document) => matchesQuery(document, query));
            return {
              sort: () => ({
                limit: () => ({
                  toArray: async () => matches
                })
              })
            };
          }),
          updateOne: vi.fn(async (query: Record<string, unknown>, update: { $set?: Partial<DocumentRecord> }) => {
            const document = testState.documents.find((candidate) => matchesQuery(candidate, query));

            if (document && update.$set) {
              Object.assign(document, update.$set);
            }

            return {
              matchedCount: document ? 1 : 0,
              modifiedCount: document ? 1 : 0
            };
          })
        };
      }

      if (name === "duplicate_review_pairs") {
        return {
          createIndexes: vi.fn(async () => undefined),
          updateOne: vi.fn(async (
            query: Record<string, unknown>,
            update: { $set?: Partial<DuplicateReviewPairRecord>; $setOnInsert?: Partial<DuplicateReviewPairRecord> }
          ) => {
            const existing = testState.reviewPairs.find((pair) => matchesQuery(pair, query));

            if (existing) {
              Object.assign(existing, update.$set);
            } else {
              testState.reviewPairs.push({
                ...(update.$setOnInsert as DuplicateReviewPairRecord),
                ...(update.$set as DuplicateReviewPairRecord)
              });
            }

            return { matchedCount: existing ? 1 : 0, modifiedCount: 1, upsertedCount: existing ? 0 : 1 };
          }),
          findOne: vi.fn(async (query: Record<string, unknown>) => {
            return testState.reviewPairs.find((pair) => matchesQuery(pair, query)) ?? null;
          }),
          find: vi.fn((query: Record<string, unknown>) => {
            const matches = testState.reviewPairs.filter((pair) => matchesQuery(pair, query));

            return {
              toArray: async () => matches
            };
          })
        };
      }

      if (name === "audit_logs") {
        return {
          insertOne: vi.fn(async (document: AuditLogRecord) => {
            testState.auditLogs.push(document);
            return { insertedId: new ObjectId() };
          }),
          find: vi.fn((query: Record<string, unknown>) => {
            let matches = testState.auditLogs.filter((log) => matchesQuery(log, query));
            const cursor = {
              sort(sort: Record<string, 1 | -1>) {
                matches = sortAuditLogs(matches, sort);
                return cursor;
              },
              limit(value: number) {
                matches = matches.slice(0, value);
                return cursor;
              },
              toArray: async () => matches
            };
            return cursor;
          })
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }
  }))
}));

function matchesQuery(document: object, query: Record<string, unknown>): boolean {
  return Object.entries(query).every(([key, value]) => {
    if (key === "$or" && Array.isArray(value)) {
      return value.some((nestedQuery) => matchesQuery(document, nestedQuery as Record<string, unknown>));
    }

    if (key === "_id" && typeof value === "object" && value !== null && "$ne" in value) {
      return String(getDocumentValue(document, "_id")) !== String((value as { $ne: ObjectId }).$ne);
    }

    if (typeof value === "object" && value !== null && "$ne" in value) {
      return getDocumentValue(document, key) !== (value as { $ne: unknown }).$ne;
    }

    if (key === "_id") {
      return String(getDocumentValue(document, "_id")) === String(value);
    }

    return getDocumentValue(document, key) === value;
  });
}

function getDocumentValue(document: object, key: string) {
  return (document as Record<string, unknown>)[key];
}

function sortDocuments(documents: DocumentRecord[], sort?: Record<string, 1 | -1>) {
  if (!sort) {
    return documents;
  }

  return [...documents].sort((left, right) => {
    for (const [field, direction] of Object.entries(sort)) {
      const leftValue = left[field as keyof DocumentRecord];
      const rightValue = right[field as keyof DocumentRecord];
      const comparison =
        leftValue instanceof Date && rightValue instanceof Date
          ? leftValue.getTime() - rightValue.getTime()
          : String(leftValue).localeCompare(String(rightValue));

      if (comparison !== 0) {
        return direction === 1 ? comparison : -comparison;
      }
    }

    return 0;
  });
}

function sortAuditLogs(logs: AuditLogRecord[], sort?: Record<string, 1 | -1>) {
  if (!sort) {
    return logs;
  }

  return [...logs].sort((left, right) => {
    for (const [field, direction] of Object.entries(sort)) {
      const leftValue = left[field as keyof AuditLogRecord];
      const rightValue = right[field as keyof AuditLogRecord];
      const comparison =
        leftValue instanceof Date && rightValue instanceof Date
          ? leftValue.getTime() - rightValue.getTime()
          : String(leftValue ?? "").localeCompare(String(rightValue ?? ""));

      if (comparison !== 0) {
        return direction === 1 ? comparison : -comparison;
      }
    }

    return 0;
  });
}

function setSession(userId: string | null) {
  testState.session = userId ? { user: { id: userId, email: `${userId}@example.test` } } : null;
}

function createUploadRequest(bytes = "same image bytes", documentType: DocumentType = "CHEQUE") {
  const formData = new FormData();
  formData.set("documentType", documentType);
  formData.set("sourceType", "UPLOAD");
  formData.set(
    "file",
    new File([Buffer.from(bytes)], "cheque.jpg", {
      type: "image/jpeg"
    })
  );

  return new Request("http://localhost/api/documents", {
    method: "POST",
    body: formData
  });
}

async function upload(bytes?: string, documentType?: DocumentType) {
  const response = await uploadDocument(createUploadRequest(bytes, documentType));
  return {
    response,
    body: (await response.json()) as {
      documentId?: string;
      duplicateStatus?: string;
      matchedDocumentId?: string | null;
      similarityScore?: number | null;
      qualityStatus?: string;
      qualityWarnings?: string[];
      documentType?: string;
      documentTypeLabel?: string;
      processingProfile?: {
        name: string;
        branch: string;
        futureStages: string[];
      };
      qrCandidateAnalysis?: DocumentRecord["qrCandidateAnalysis"];
      qrDecode?: DocumentRecord["qrDecode"];
      transferMetadata?: DocumentRecord["transferMetadata"];
      slipVerification?: DocumentRecord["slipVerification"];
      error?: string;
    }
  };
}

function buildMockQrDecode(documentType: DocumentType, buffer: Buffer): DocumentRecord["qrDecode"] {
  const text = buffer.toString("utf8");

  if (documentType !== "BANK_TRANSFER_SLIP") {
    return null;
  }

  if (text.includes("thai")) {
    return {
      stage: "QR_DECODE",
      algorithm: "jsqr-decode-v1",
      status: "COMPLETED",
      result: "QR_DECODED",
      decodedAt: new Date("2026-05-08T10:00:00.000Z"),
      rawDecodedText: thaiPromptPayPayload,
      decodedTextLength: thaiPromptPayPayload.length,
      sourceImageType: "normalized-image",
      notes: ["QR content was successfully decoded from the normalized image."]
    };
  }

  if (text.includes("decoded text")) {
    return {
      stage: "QR_DECODE",
      algorithm: "jsqr-decode-v1",
      status: "COMPLETED",
      result: "QR_DECODED",
      decodedAt: new Date("2026-05-08T10:00:00.000Z"),
      rawDecodedText: "plain transfer note only",
      decodedTextLength: 24,
      sourceImageType: "normalized-image",
      notes: ["QR content was successfully decoded from the normalized image."]
    };
  }

  if (text.includes("decoded")) {
    return {
      stage: "QR_DECODE",
      algorithm: "jsqr-decode-v1",
      status: "COMPLETED",
      result: "QR_DECODED",
      decodedAt: new Date("2026-05-08T10:00:00.000Z"),
      rawDecodedText: "https://example.com/payment/12345",
      decodedTextLength: 33,
      sourceImageType: "normalized-image",
      notes: ["QR content was successfully decoded from the normalized image."]
    };
  }

  if (text.includes("qr")) {
    return {
      stage: "QR_DECODE",
      algorithm: "jsqr-decode-v1",
      status: "COMPLETED",
      result: "NO_QR_DECODED",
      decodedAt: new Date("2026-05-08T10:00:00.000Z"),
      rawDecodedText: null,
      decodedTextLength: null,
      sourceImageType: "normalized-image",
      notes: ["QR decode was attempted on the normalized image but no valid QR code was found."]
    };
  }

  return {
    stage: "QR_DECODE",
    algorithm: "jsqr-decode-v1",
    status: "SKIPPED",
    result: "NO_QR_DECODED",
    decodedAt: new Date("2026-05-08T10:00:00.000Z"),
    rawDecodedText: null,
    decodedTextLength: null,
    sourceImageType: null,
    notes: ["QR decode was skipped because no plausible QR candidate was found."]
  };
}

function buildMockTransferMetadata(documentType: DocumentType, buffer: Buffer): DocumentRecord["transferMetadata"] {
  return documentType === "BANK_TRANSFER_SLIP"
    ? attemptTransferMetadataParse({
        qrDecode: buildMockQrDecode(documentType, buffer) ?? null,
        parsedAt: new Date("2026-05-08T10:00:00.000Z")
      })
    : null;
}

function buildMockSlipVerification(documentType: DocumentType, transferMetadata: DocumentRecord["transferMetadata"]): DocumentRecord["slipVerification"] {
  return documentType === "BANK_TRANSFER_SLIP"
    ? attemptSlipVerification({
        transferMetadata: transferMetadata ?? null,
        evaluatedAt: new Date("2026-05-08T10:00:00.000Z")
      })
    : null;
}

describe("document API integration boundaries", () => {
  beforeEach(() => {
    setSession(null);
    testState.documents.length = 0;
    testState.reviewPairs.length = 0;
    testState.auditLogs.length = 0;
    testState.processUploadedDocumentImage.mockReset();
    testState.processUploadedDocumentImage.mockImplementation(async (input: {
      userId: string;
      documentId: string;
      documentType: DocumentType;
      buffer: Buffer;
    }) => {
      const transferMetadata = buildMockTransferMetadata(input.documentType, input.buffer);

      return {
        normalizedObject: {
          bucket: "document-images",
          key: `documents/${input.userId}/${input.documentId}/normalized.webp`
        },
        normalizedImage: {
          width: 32,
          height: 24,
          mimeType: "image/webp",
          fileSize: 128,
          algorithm: "normalized-webp-grayscale-v1"
        },
        processingProfile: getDocumentProcessingProfile(input.documentType),
        qrCandidateAnalysis:
          input.documentType === "BANK_TRANSFER_SLIP"
            ? {
                stage: "QR_CANDIDATE",
                algorithm: "qr-candidate-heuristic-v1",
                status: "COMPLETED",
                result: input.buffer.toString("utf8").includes("qr") ? "CANDIDATE_FOUND" : "NO_CANDIDATE_FOUND",
                checkedAt: new Date("2026-05-08T10:00:00.000Z"),
                candidateCount: input.buffer.toString("utf8").includes("qr") ? 1 : 0,
                bestCandidate: input.buffer.toString("utf8").includes("qr")
                  ? {
                      x: 8,
                      y: 8,
                      width: 56,
                      height: 56,
                      confidence: 0.82,
                      source: "normalized-image"
                    }
                  : null,
                notes: ["QR content was not decoded."]
              }
            : null,
        qrDecode: buildMockQrDecode(input.documentType, input.buffer),
        transferMetadata,
        slipVerification: buildMockSlipVerification(input.documentType, transferMetadata),
        slipImageRead:
          input.documentType === "BANK_TRANSFER_SLIP"
            ? {
                stage: "SLIP_IMAGE_READ",
                algorithm: "slip-image-read-v1",
                status: "COMPLETED",
                result: "EXTRACTED",
                readAt: new Date("2026-05-08T10:00:00.000Z"),
                extractedFields: {
                  amount: { value: "100.00", confidence: "HIGH", source: "regex-amount-line" },
                  senderName: { value: "Alice Smith", confidence: "HIGH", source: "regex-sender-line" },
                  receiverName: { value: "Bob Jones", confidence: "HIGH", source: "regex-receiver-line" },
                  dateTime: { value: "11/05/2026 10:21:00", confidence: "HIGH", source: "regex-datetime-iso" },
                  transactionReference: { value: "REF-12345", confidence: "HIGH", source: "regex-reference-line" },
                  senderBank: { value: "KBANK", confidence: "HIGH", source: "regex-bank-contextual" },
                  receiverBank: { value: "SCB", confidence: "HIGH", source: "regex-bank-contextual" },
                  senderAccountTail: { value: "1234", confidence: "MEDIUM", source: "regex-tail-contextual" },
                  receiverAccountTail: { value: "5678", confidence: "MEDIUM", source: "regex-tail-contextual" }
                },
                rawOcrText: "Amount: 100.00\nFrom: Alice Smith\nTo: Bob Jones\nRef: REF-12345",
                notes: ["Multi-variant OCR completed."],
                warnings: []
              }
            : null,
        perceptualHash: input.buffer.toString("utf8").includes("near") ? "ffff0000ffff0000" : "0000000000000000",
        qualityStatus: input.buffer.toString("utf8").includes("warn") ? "WARN" : "PASS",
        qualityWarnings: input.buffer.toString("utf8").includes("warn") ? ["BLURRY_IMAGE"] : [],
        qualityMetrics: {
          width: 1000,
          height: 800,
          meanLuminance: 128,
          sharpness: input.buffer.toString("utf8").includes("warn") ? 12 : 120
        },
        qualityCheckedAt: new Date("2026-05-08T10:00:00.000Z")
      };
    });
    testState.getOriginalDocumentObject.mockReset();
    testState.getOriginalDocumentObject.mockResolvedValue(Readable.from([Buffer.from("image")]));
  });

  it("creates a NEW document for an authenticated first upload", async () => {
    setSession("user-1");

    const { response, body } = await upload();

    expect(response.status).toBe(200);
    expect(body.documentId).toBeDefined();
    expect(body.duplicateStatus).toBe("NEW");
    expect(body.documentType).toBe("CHEQUE");
    expect(body.documentTypeLabel).toBe("Cheque");
    expect(body.processingProfile).toMatchObject({
      name: "cheque-v1",
      branch: "CHEQUE",
      capabilities: {
        qrOrientedFuturePath: false
      }
    });
    expect(body.matchedDocumentId).toBeNull();
    expect(body.similarityScore).toBeNull();
    expect(testState.documents).toHaveLength(1);
    expect(testState.documents[0]).toMatchObject({
      userId: "user-1",
      documentType: "CHEQUE",
      processingProfile: {
        name: "cheque-v1",
        branch: "CHEQUE",
        capabilities: {
          qrOrientedFuturePath: false
        }
      },
      status: "READY",
      duplicateStatus: "NEW",
      reviewStatus: "NOT_REQUIRED",
      matchedDocumentId: null,
      similarityScore: null,
      perceptualHash: "0000000000000000",
      qualityStatus: "PASS",
      qualityWarnings: [],
      normalizedObject: {
        key: expect.stringContaining("/normalized.webp")
      }
    });
  });

  it("persists the selected document type and exposes its display label", async () => {
    setSession("user-1");

    const { response, body } = await upload("deposit slip bytes", "DEPOSIT_PAYMENT_SLIP");

    expect(response.status).toBe(200);
    expect(body.documentType).toBe("DEPOSIT_PAYMENT_SLIP");
    expect(body.documentTypeLabel).toBe("Deposit/payment slip");
    expect(testState.documents[0].documentType).toBe("DEPOSIT_PAYMENT_SLIP");

    const detailResponse = await getDocument(new Request("http://localhost/api/documents/id"), {
      params: Promise.resolve({ id: body.documentId as string })
    });
    const detail = (await detailResponse.json()) as {
      documentType: string;
      documentTypeLabel: string;
      processingProfile: { name: string; branch: string };
    };

    expect(detail.documentType).toBe("DEPOSIT_PAYMENT_SLIP");
    expect(detail.documentTypeLabel).toBe("Deposit/payment slip");
    expect(detail.processingProfile).toMatchObject({
      name: "deposit-payment-slip-v1",
      branch: "PAYMENT_SLIP",
      capabilities: {
        qrOrientedFuturePath: false
      }
    });
  });

  it("selects the correct processing profile for every supported upload type", async () => {
    setSession("user-1");

    const expectations: Array<[DocumentType, string, string]> = [
      ["BANK_TRANSFER_SLIP", "bank-transfer-slip-v1", "TRANSFER_SLIP"],
      ["DEPOSIT_PAYMENT_SLIP", "deposit-payment-slip-v1", "PAYMENT_SLIP"],
      ["CHEQUE", "cheque-v1", "CHEQUE"],
      ["UNKNOWN", "generic-unknown-v1", "GENERIC"]
    ];

    for (const [documentType, profileName, branch] of expectations) {
      const { response, body } = await upload(`image bytes ${documentType}`, documentType);

      expect(response.status).toBe(200);
      expect(body.documentType).toBe(documentType);
      expect(body.processingProfile).toMatchObject({
        name: profileName,
        branch
      });
    }
  });

  it("exposes transfer-slip QR-candidate, QR-decode, transfer-metadata parse, and safe slip-verification scaffold results", async () => {
    setSession("user-1");

    const { body } = await upload("transfer slip qr image bytes", "BANK_TRANSFER_SLIP");
    const detailResponse = await getDocument(new Request("http://localhost/api/documents/id"), {
      params: Promise.resolve({ id: body.documentId as string })
    });
    const detail = (await detailResponse.json()) as {
      processingProfile: {
        capabilities: {
          qrOrientedFuturePath: boolean;
          qrCandidateAnalysisImplemented: boolean;
          extractionImplemented: boolean;
        };
        plannedStages: Array<{ key: string; status: string }>;
      };
      qrCandidateAnalysis: DocumentRecord["qrCandidateAnalysis"];
      qrDecode: DocumentRecord["qrDecode"];
      transferMetadata: DocumentRecord["transferMetadata"];
      slipImageRead: DocumentRecord["slipImageRead"];
      slipVerification: DocumentRecord["slipVerification"];
    };

    expect(detail.processingProfile.capabilities).toMatchObject({
      qrOrientedFuturePath: true,
      qrCandidateAnalysisImplemented: true,
      extractionImplemented: true,
      verificationImplemented: true
    });
    expect(detail.processingProfile.plannedStages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "QR_CANDIDATE", status: "ACTIVE" }),
        expect.objectContaining({ key: "QR_DECODE", status: "ACTIVE" }),
        expect.objectContaining({ key: "TRANSFER_METADATA_PARSE", status: "ACTIVE" }),
        expect.objectContaining({ key: "SLIP_VERIFICATION", status: "ACTIVE" })
      ])
    );
    expect(detail.qrCandidateAnalysis).toMatchObject({
      stage: "QR_CANDIDATE",
      status: "COMPLETED",
      result: "CANDIDATE_FOUND",
      candidateCount: 1
    });
    expect(detail.qrDecode).toMatchObject({
      stage: "QR_DECODE",
      status: "COMPLETED",
      result: "NO_QR_DECODED"
    });
    expect(detail.transferMetadata).toMatchObject({
      stage: "TRANSFER_METADATA_PARSE",
      status: "SKIPPED",
      result: "NO_STRUCTURED_METADATA"
    });
    expect(detail.slipImageRead).toMatchObject({
      stage: "SLIP_IMAGE_READ",
      algorithm: "slip-image-read-v1",
      status: "COMPLETED",
      result: "EXTRACTED",
      extractedFields: {
        amount: { value: "100.00", confidence: "HIGH" },
        senderName: { value: "Alice Smith", confidence: "HIGH" },
        receiverName: { value: "Bob Jones", confidence: "HIGH" }
      }
    });
    expect(detail.slipVerification).toMatchObject({
      stage: "SLIP_VERIFICATION",
      algorithm: "slip-verification-scaffold-v1",
      status: "SKIPPED",
      result: "NOT_VERIFIED",
      evidenceCategory: "NO_EVIDENCE"
    });
    expect(testState.documents[0].slipVerification).toMatchObject({
      result: "NOT_VERIFIED",
      evidenceCategory: "NO_EVIDENCE"
    });
  });

  it("keeps legacy transfer-slip records with missing slipVerification readable before backfill", async () => {
    setSession("user-1");

    const { body } = await upload("transfer slip qr image bytes", "BANK_TRANSFER_SLIP");
    delete (testState.documents[0] as Partial<DocumentRecord>).slipVerification;

    const detailResponse = await getDocument(new Request("http://localhost/api/documents/id"), {
      params: Promise.resolve({ id: body.documentId as string })
    });
    const detail = (await detailResponse.json()) as {
      documentType: string;
      slipVerification: DocumentRecord["slipVerification"];
    };

    expect(detailResponse.status).toBe(200);
    expect(detail.documentType).toBe("BANK_TRANSFER_SLIP");
    expect(detail.slipVerification).toBeNull();
  });

  it("successfully decodes QR content when candidate is found and QR is decodable", async () => {
    setSession("user-1");

    const { body } = await upload("transfer slip qr decoded image bytes", "BANK_TRANSFER_SLIP");
    const detailResponse = await getDocument(new Request("http://localhost/api/documents/id"), {
      params: Promise.resolve({ id: body.documentId as string })
    });
    const detail = (await detailResponse.json()) as {
      qrCandidateAnalysis: DocumentRecord["qrCandidateAnalysis"];
      qrDecode: DocumentRecord["qrDecode"];
      transferMetadata: DocumentRecord["transferMetadata"];
      slipVerification: DocumentRecord["slipVerification"];
    };

    expect(detail.qrCandidateAnalysis).toMatchObject({
      stage: "QR_CANDIDATE",
      status: "COMPLETED",
      result: "CANDIDATE_FOUND"
    });
    expect(detail.qrDecode).toMatchObject({
      stage: "QR_DECODE",
      algorithm: "jsqr-decode-v1",
      status: "COMPLETED",
      result: "QR_DECODED",
      rawDecodedText: "https://example.com/payment/12345",
      decodedTextLength: 33,
      sourceImageType: "normalized-image"
    });
    expect(testState.documents[0].qrDecode?.rawDecodedText).toBe("https://example.com/payment/12345");
    expect(detail.transferMetadata).toMatchObject({
      stage: "TRANSFER_METADATA_PARSE",
      status: "COMPLETED",
      result: "UNSUPPORTED_FORMAT",
      payloadFormat: "GENERIC_URL",
      metadata: null
    });
    expect(detail.slipVerification).toMatchObject({
      stage: "SLIP_VERIFICATION",
      status: "COMPLETED",
      result: "UNSUPPORTED",
      evidenceCategory: "NO_EVIDENCE"
    });
  });

  it("persists parsed transfer metadata and local structural validation for supported decoded Thai QR payloads", async () => {
    setSession("user-1");

    const { body } = await upload("transfer slip qr thai image bytes", "BANK_TRANSFER_SLIP");
    const detailResponse = await getDocument(new Request("http://localhost/api/documents/id"), {
      params: Promise.resolve({ id: body.documentId as string })
    });
    const detail = (await detailResponse.json()) as {
      transferMetadata: DocumentRecord["transferMetadata"];
      slipVerification: DocumentRecord["slipVerification"];
    };

    expect(detail.transferMetadata).toMatchObject({
      stage: "TRANSFER_METADATA_PARSE",
      algorithm: "transfer-metadata-parse-v1",
      status: "COMPLETED",
      result: "PARSED",
      payloadFormat: "THAI_QR_PAYMENT",
      metadata: {
        amount: "100.00",
        countryCode: "TH",
        currencyCode: "764",
        merchantAccountInfo: {
          subtype: "PROMPTPAY",
          targetIdentifier: "0066812345678",
          targetIdentifierType: "PROMPTPAY_MOBILE"
        }
      }
    });
    expect(detail.slipVerification).toMatchObject({
      stage: "SLIP_VERIFICATION",
      algorithm: "slip-verification-local-structural-v1",
      status: "COMPLETED",
      result: "STRUCTURALLY_CONSISTENT",
      evidenceCategory: "LOCAL_STRUCTURAL_CHECK"
    });
    expect(detail.slipVerification?.notes.join(" ")).toContain("does not confirm payment completion");
    expect(testState.documents[0].transferMetadata?.metadata?.merchantAccountInfo?.targetIdentifier).toBe("0066812345678");
  });

  it("records plain decoded QR text as no structured transfer metadata", async () => {
    setSession("user-1");

    const { body } = await upload("transfer slip qr decoded text image bytes", "BANK_TRANSFER_SLIP");
    const detailResponse = await getDocument(new Request("http://localhost/api/documents/id"), {
      params: Promise.resolve({ id: body.documentId as string })
    });
    const detail = (await detailResponse.json()) as {
      transferMetadata: DocumentRecord["transferMetadata"];
      slipVerification: DocumentRecord["slipVerification"];
    };

    expect(detail.transferMetadata).toMatchObject({
      status: "COMPLETED",
      result: "NO_STRUCTURED_METADATA",
      payloadFormat: "PLAIN_TEXT",
      metadata: null
    });
    expect(detail.slipVerification).toMatchObject({
      status: "SKIPPED",
      result: "NOT_VERIFIED",
      evidenceCategory: "NO_EVIDENCE"
    });
  });

  it("does not run QR-candidate analysis, QR decode, transfer metadata parse, or slip verification scaffold for non-transfer-slip document types", async () => {
    setSession("user-1");

    await upload("deposit slip qr-like image bytes", "DEPOSIT_PAYMENT_SLIP");

    expect(testState.documents[0].qrCandidateAnalysis).toBeNull();
    expect(testState.documents[0].qrDecode).toBeNull();
    expect(testState.documents[0].transferMetadata).toBeNull();
    expect(testState.documents[0].slipVerification).toBeNull();
  });

  it("clears transfer-slip QR and slip-verification scaffold results on document type correction", async () => {
    setSession("user-1");

    const { body } = await upload("transfer slip qr image bytes", "BANK_TRANSFER_SLIP");
    expect(testState.documents[0].slipVerification).toMatchObject({
      status: "SKIPPED",
      result: "NOT_VERIFIED",
      evidenceCategory: "NO_EVIDENCE"
    });

    const response = await updateDocument(
      new Request("http://localhost/api/documents/id", {
        method: "PATCH",
        body: JSON.stringify({ documentType: "CHEQUE" })
      }),
      { params: Promise.resolve({ id: body.documentId as string }) }
    );
    const payload = (await response.json()) as {
      documentType: string;
      qrCandidateAnalysis: DocumentRecord["qrCandidateAnalysis"];
      qrDecode: DocumentRecord["qrDecode"];
      transferMetadata: DocumentRecord["transferMetadata"];
      slipVerification: DocumentRecord["slipVerification"];
    };

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      documentType: "CHEQUE",
      qrCandidateAnalysis: null,
      qrDecode: null,
      transferMetadata: null,
      slipVerification: null
    });
    expect(testState.documents[0]).toMatchObject({
      documentType: "CHEQUE",
      qrCandidateAnalysis: null,
      qrDecode: null,
      transferMetadata: null,
      slipVerification: null
    });
  });

  it("allows the owner to update document type without changing duplicate review or quality state", async () => {
    setSession("user-1");

    const { body } = await upload("warn image bytes", "CHEQUE");
    const before = testState.documents[0];
    const response = await updateDocument(
      new Request("http://localhost/api/documents/id", {
        method: "PATCH",
        body: JSON.stringify({ documentType: "BANK_TRANSFER_SLIP" })
      }),
      { params: Promise.resolve({ id: body.documentId as string }) }
    );
    const payload = (await response.json()) as {
      documentType: string;
      documentTypeLabel: string;
      processingProfile: { name: string; branch: string };
      slipVerification: DocumentRecord["slipVerification"];
      duplicateStatus: string;
      reviewStatus: string;
      qualityStatus: string;
    };

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      documentType: "BANK_TRANSFER_SLIP",
      documentTypeLabel: "Bank transfer slip",
      processingProfile: {
        name: "bank-transfer-slip-v1",
        branch: "TRANSFER_SLIP"
      },
      duplicateStatus: "NEW",
      reviewStatus: "NOT_REQUIRED",
      slipVerification: null,
      qualityStatus: "WARN"
    });
    expect(testState.documents[0]).toMatchObject({
      documentType: "BANK_TRANSFER_SLIP",
      processingProfile: {
        name: "bank-transfer-slip-v1",
        branch: "TRANSFER_SLIP"
      },
      duplicateStatus: before.duplicateStatus,
      matchedDocumentId: before.matchedDocumentId,
      similarityScore: before.similarityScore,
      reviewStatus: before.reviewStatus,
      qualityStatus: before.qualityStatus,
      qualityWarnings: before.qualityWarnings
    });
    expect(testState.auditLogs).toContainEqual(
      expect.objectContaining({
        userId: "user-1",
        action: "DOCUMENT_TYPE_UPDATED",
        targetId: body.documentId,
        metadata: expect.objectContaining({
          oldDocumentType: "CHEQUE",
          newDocumentType: "BANK_TRANSFER_SLIP",
          oldProcessingProfileName: "cheque-v1",
          newProcessingProfileName: "bank-transfer-slip-v1",
          changedByUserId: "user-1",
          unchangedDuplicateStatus: "NEW",
          unchangedReviewStatus: "NOT_REQUIRED",
          unchangedQualityStatus: "WARN"
        })
      })
    );
  });

  it("does not expose another user's document type update target", async () => {
    setSession("owner-user");
    const { body } = await upload("owner image bytes", "CHEQUE");

    setSession("other-user");
    const response = await updateDocument(
      new Request("http://localhost/api/documents/id", {
        method: "PATCH",
        body: JSON.stringify({ documentType: "UNKNOWN" })
      }),
      { params: Promise.resolve({ id: body.documentId as string }) }
    );

    expect(response.status).toBe(404);
    expect(testState.documents[0].documentType).toBe("CHEQUE");
  });

  it("rejects invalid document type updates", async () => {
    setSession("user-1");

    const { body } = await upload("owner image bytes", "CHEQUE");
    const response = await updateDocument(
      new Request("http://localhost/api/documents/id", {
        method: "PATCH",
        body: JSON.stringify({ documentType: "PASSPORT" })
      }),
      { params: Promise.resolve({ id: body.documentId as string }) }
    );
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Choose a valid document type.");
    expect(testState.documents[0].documentType).toBe("CHEQUE");
  });

  it("creates a new EXACT_DUPLICATE record linked to the earliest owned match", async () => {
    setSession("user-1");

    const first = await upload();
    const second = await upload();
    const third = await upload();

    expect(second.response.status).toBe(200);
    expect(testState.documents).toHaveLength(3);
    expect(second.body.documentId).not.toBe(first.body.documentId);
    expect(second.body.duplicateStatus).toBe("EXACT_DUPLICATE");
    expect(second.body.matchedDocumentId).toBe(first.body.documentId);
    expect(second.body.similarityScore).toBe(1);
    expect(third.body.duplicateStatus).toBe("EXACT_DUPLICATE");
    expect(third.body.matchedDocumentId).toBe(first.body.documentId);
    expect(testState.documents[1]).toMatchObject({
      duplicateStatus: "EXACT_DUPLICATE",
      reviewStatus: "NOT_REQUIRED",
      matchedDocumentId: first.body.documentId,
      similarityScore: 1
    });
  });

  it("creates a likely duplicate when bytes differ but the owner-scoped perceptual hash is close", async () => {
    setSession("user-1");

    const first = await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");

    expect(second.body.documentId).not.toBe(first.body.documentId);
    expect(second.body.duplicateStatus).toBe("LIKELY_DUPLICATE");
    expect(second.body.matchedDocumentId).toBe(first.body.documentId);
    expect(second.body.similarityScore).toBe(1);
    expect(testState.documents[1]).toMatchObject({
      reviewStatus: "PENDING",
      reviewedAt: null,
      reviewedMatchDocumentId: null
    });
  });

  it("allows the owner to confirm a pending likely duplicate", async () => {
    setSession("user-1");

    const first = await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    const response = await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DUPLICATE" })
      }),
      { params: Promise.resolve({ id: second.body.documentId as string }) }
    );
    const body = (await response.json()) as { reviewStatus: string; reviewedMatchDocumentId: string };

    expect(response.status).toBe(200);
    expect(body.reviewStatus).toBe("CONFIRMED_DUPLICATE");
    expect(body.reviewedMatchDocumentId).toBe(first.body.documentId);
    expect(testState.documents[1]).toMatchObject({
      duplicateStatus: "LIKELY_DUPLICATE",
      reviewStatus: "CONFIRMED_DUPLICATE",
      matchedDocumentId: first.body.documentId
    });
    expect(testState.reviewPairs).toHaveLength(1);
    expect(testState.reviewPairs[0]).toMatchObject({
      userId: "user-1",
      decision: "CONFIRMED_DUPLICATE"
    });
    const history = await getReviewHistoryForDocument({
      documentId: second.body.documentId as string,
      userId: "user-1"
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      action: "CONFIRMED_DUPLICATE",
      actionLabel: "Confirmed duplicate",
      note: null,
      actorUserId: "user-1",
      matchedDocumentId: first.body.documentId
    });
  });

  it("allows the owner to confirm a pending likely duplicate with a review note", async () => {
    setSession("user-1");

    const first = await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    const response = await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({
          decision: "CONFIRMED_DUPLICATE",
          reviewNote: "  Same amount and reference after visual review.  "
        })
      }),
      { params: Promise.resolve({ id: second.body.documentId as string }) }
    );
    const body = (await response.json()) as { reviewStatus: string; reviewNote: string | null };

    expect(response.status).toBe(200);
    expect(body.reviewStatus).toBe("CONFIRMED_DUPLICATE");
    expect(body.reviewNote).toBe("Same amount and reference after visual review.");
    expect(testState.auditLogs).toContainEqual(
      expect.objectContaining({
        action: "DOCUMENT_REVIEW_CONFIRMED_DUPLICATE",
        targetId: second.body.documentId,
        metadata: expect.objectContaining({
          matchedDocumentId: first.body.documentId,
          reviewDecision: "CONFIRMED_DUPLICATE",
          reviewNote: "Same amount and reference after visual review.",
          reviewedByUserId: "user-1",
          bulkReviewBatchId: null
        })
      })
    );

    const history = await getReviewHistoryForDocument({
      documentId: second.body.documentId as string,
      userId: "user-1"
    });
    expect(history[0]).toMatchObject({
      action: "CONFIRMED_DUPLICATE",
      note: "Same amount and reference after visual review.",
      actorUserId: "user-1"
    });
    await expect(
      getReviewHistoryForDocument({
        documentId: second.body.documentId as string,
        userId: "other-user"
      })
    ).resolves.toEqual([]);
  });

  it("allows the owner to mark a pending likely duplicate as distinct", async () => {
    setSession("user-1");

    const first = await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    const response = await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DISTINCT" })
      }),
      { params: Promise.resolve({ id: second.body.documentId as string }) }
    );
    const body = (await response.json()) as { reviewStatus: string; reviewedMatchDocumentId: string };

    expect(response.status).toBe(200);
    expect(body.reviewStatus).toBe("CONFIRMED_DISTINCT");
    expect(body.reviewedMatchDocumentId).toBe(first.body.documentId);
    expect(testState.documents[1]).toMatchObject({
      duplicateStatus: "LIKELY_DUPLICATE",
      reviewStatus: "CONFIRMED_DISTINCT",
      matchedDocumentId: first.body.documentId,
      similarityScore: 1
    });
    expect(testState.reviewPairs[0]).toMatchObject({
      userId: "user-1",
      decision: "CONFIRMED_DISTINCT"
    });
  });

  it("bulk confirms multiple pending likely duplicates for the owner", async () => {
    setSession("user-1");

    await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    const third = await upload("near third image bytes");
    const response = await bulkReviewDocuments(
      new Request("http://localhost/api/review/bulk", {
        method: "POST",
        body: JSON.stringify({
          decision: "CONFIRMED_DUPLICATE",
          documentIds: [second.body.documentId, third.body.documentId]
        })
      })
    );
    const body = (await response.json()) as {
      requestedCount: number;
      updatedCount: number;
      skippedCount: number;
      notFoundCount: number;
      failedCount: number;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      requestedCount: 2,
      updatedCount: 2,
      skippedCount: 0,
      notFoundCount: 0,
      failedCount: 0
    });
    expect(testState.documents.find((document) => String(document._id) === second.body.documentId)).toMatchObject({
      reviewStatus: "CONFIRMED_DUPLICATE"
    });
    expect(testState.documents.find((document) => String(document._id) === third.body.documentId)).toMatchObject({
      reviewStatus: "CONFIRMED_DUPLICATE"
    });
    expect(testState.reviewPairs).toHaveLength(2);
    const history = await getReviewHistoryForDocument({
      documentId: second.body.documentId as string,
      userId: "user-1"
    });
    expect(history[0]).toMatchObject({
      action: "CONFIRMED_DUPLICATE",
      note: null
    });
  });

  it("bulk marks selected pending likely duplicates as distinct with one shared review note", async () => {
    setSession("user-1");

    await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    const response = await bulkReviewDocuments(
      new Request("http://localhost/api/review/bulk", {
        method: "POST",
        body: JSON.stringify({
          decision: "CONFIRMED_DISTINCT",
          documentIds: [second.body.documentId],
          reviewNote: "Different visible reference."
        })
      })
    );

    expect(response.status).toBe(200);
    expect(testState.documents.find((document) => String(document._id) === second.body.documentId)).toMatchObject({
      reviewStatus: "CONFIRMED_DISTINCT"
    });
    expect(testState.reviewPairs[0]).toMatchObject({
      decision: "CONFIRMED_DISTINCT"
    });
    const history = await getReviewHistoryForDocument({
      documentId: second.body.documentId as string,
      userId: "user-1"
    });
    expect(history[0]).toMatchObject({
      action: "CONFIRMED_DISTINCT",
      actionLabel: "Confirmed distinct",
      note: "Different visible reference.",
      actorUserId: "user-1"
    });
    expect(history[0].bulkReviewBatchId).toEqual(expect.any(String));
  });

  it("bulk review skips already-reviewed and missing items safely", async () => {
    setSession("user-1");

    await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    await bulkReviewDocuments(
      new Request("http://localhost/api/review/bulk", {
        method: "POST",
        body: JSON.stringify({
          decision: "CONFIRMED_DUPLICATE",
          documentIds: [second.body.documentId]
        })
      })
    );
    const auditCountAfterFirstReview = testState.auditLogs.length;

    const response = await bulkReviewDocuments(
      new Request("http://localhost/api/review/bulk", {
        method: "POST",
        body: JSON.stringify({
          decision: "CONFIRMED_DISTINCT",
          documentIds: [second.body.documentId, String(new ObjectId())],
          reviewNote: "Should not be recorded for skipped items."
        })
      })
    );
    const body = (await response.json()) as {
      requestedCount: number;
      updatedCount: number;
      skippedCount: number;
      notFoundCount: number;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      requestedCount: 2,
      updatedCount: 0,
      skippedCount: 1,
      notFoundCount: 1
    });
    expect(testState.documents.find((document) => String(document._id) === second.body.documentId)).toMatchObject({
      reviewStatus: "CONFIRMED_DUPLICATE"
    });
    expect(testState.auditLogs).toHaveLength(auditCountAfterFirstReview);
    const history = await getReviewHistoryForDocument({
      documentId: second.body.documentId as string,
      userId: "user-1"
    });
    expect(history).toHaveLength(1);
    expect(history[0].note).toBeNull();
  });

  it("bulk review keeps owner scoping intact", async () => {
    setSession("owner-user");
    await upload("near original image bytes");
    const likelyDuplicate = await upload("near recompressed image bytes");

    setSession("other-user");
    const response = await bulkReviewDocuments(
      new Request("http://localhost/api/review/bulk", {
        method: "POST",
        body: JSON.stringify({
          decision: "CONFIRMED_DUPLICATE",
          documentIds: [likelyDuplicate.body.documentId]
        })
      })
    );
    const body = (await response.json()) as {
      updatedCount: number;
      notFoundCount: number;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      updatedCount: 0,
      notFoundCount: 1
    });
    expect(testState.documents.find((document) => String(document._id) === likelyDuplicate.body.documentId)).toMatchObject({
      reviewStatus: "PENDING"
    });
  });

  it("rejects unauthenticated bulk review", async () => {
    setSession(null);

    const response = await bulkReviewDocuments(
      new Request("http://localhost/api/review/bulk", {
        method: "POST",
        body: JSON.stringify({
          decision: "CONFIRMED_DUPLICATE",
          documentIds: [String(new ObjectId())]
        })
      })
    );

    expect(response.status).toBe(401);
  });

  it("rejects bulk review without selected document ids", async () => {
    setSession("user-1");

    const response = await bulkReviewDocuments(
      new Request("http://localhost/api/review/bulk", {
        method: "POST",
        body: JSON.stringify({
          decision: "CONFIRMED_DUPLICATE",
          documentIds: []
        })
      })
    );

    expect(response.status).toBe(400);
  });

  it("rejects non-owner review of another user's likely duplicate", async () => {
    setSession("owner-user");
    const likelyDuplicate = await upload("near original image bytes").then(async () =>
      upload("near recompressed image bytes")
    );

    setSession("other-user");
    const response = await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DUPLICATE" })
      }),
      { params: Promise.resolve({ id: likelyDuplicate.body.documentId as string }) }
    );

    expect(response.status).toBe(404);
  });

  it("does not return a reviewed pair as an unresolved likely duplicate candidate", async () => {
    setSession("user-1");

    await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DISTINCT" })
      }),
      { params: Promise.resolve({ id: second.body.documentId as string }) }
    );

    const match = await findLikelyDuplicateMatchForUser({
      userId: "user-1",
      documentId: new ObjectId(second.body.documentId),
      perceptualHash: "ffff0000ffff0000",
      excludeDocumentId: new ObjectId(second.body.documentId)
    });

    expect(match).toBeNull();
  });

  it("skips a reviewed distinct pair but can still select a different candidate", async () => {
    setSession("user-1");

    await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DISTINCT" })
      }),
      { params: Promise.resolve({ id: second.body.documentId as string }) }
    );
    const thirdId = new ObjectId();
    testState.documents.push({
      ...testState.documents[0],
      _id: thirdId,
      originalFilename: "third-near.jpg",
      exactHash: "different-third-hash",
      createdAt: new Date("2026-05-08T10:00:02.000Z"),
      updatedAt: new Date("2026-05-08T10:00:02.000Z")
    });

    const match = await findLikelyDuplicateMatchForUser({
      userId: "user-1",
      documentId: new ObjectId(second.body.documentId),
      perceptualHash: "ffff0000ffff0000",
      excludeDocumentId: new ObjectId(second.body.documentId)
    });

    expect(String(match?.document._id)).toBe(String(thirdId));
  });

  it("filters documents by review status for dashboard queries", async () => {
    setSession("user-1");

    await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DISTINCT" })
      }),
      { params: Promise.resolve({ id: second.body.documentId as string }) }
    );

    const confirmedDistinct = await getRecentDocumentsForUser("user-1", {
      reviewFilter: "confirmed-distinct"
    });
    const pending = await getRecentDocumentsForUser("user-1", {
      reviewFilter: "pending"
    });

    expect(confirmedDistinct).toHaveLength(1);
    expect(confirmedDistinct[0].reviewStatus).toBe("CONFIRMED_DISTINCT");
    expect(pending).toHaveLength(0);
  });

  it("continues uploads with quality warnings and persists the quality metadata", async () => {
    setSession("user-1");

    const { response, body } = await upload("warn image bytes");

    expect(response.status).toBe(200);
    expect(body.qualityStatus).toBe("WARN");
    expect(body.qualityWarnings).toEqual(["BLURRY_IMAGE"]);
    expect(testState.documents[0]).toMatchObject({
      qualityStatus: "WARN",
      qualityWarnings: ["BLURRY_IMAGE"],
      qualityMetrics: {
        sharpness: 12
      }
    });

    const detailResponse = await getDocument(new Request("http://localhost/api/documents/id"), {
      params: Promise.resolve({ id: body.documentId as string })
    });
    const detail = (await detailResponse.json()) as { qualityStatus: string; qualityWarnings: string[] };

    expect(detail.qualityStatus).toBe("WARN");
    expect(detail.qualityWarnings).toEqual(["BLURRY_IMAGE"]);
  });

  it("rejects hard-failed quality assessment without creating a document", async () => {
    setSession("user-1");
    testState.processUploadedDocumentImage.mockRejectedValueOnce(
      new ImageQualityFailureError({
        qualityStatus: "FAIL",
        qualityWarnings: ["IMAGE_TOO_SMALL"],
        qualityMetrics: {
          width: 100,
          height: 100,
          meanLuminance: 128,
          sharpness: 20
        },
        qualityCheckedAt: new Date("2026-05-08T10:00:00.000Z")
      })
    );

    const { response, body } = await upload("tiny image bytes");

    expect(response.status).toBe(422);
    expect(body.error).toContain("too small");
    expect(body.qualityStatus).toBe("FAIL");
    expect(body.qualityWarnings).toEqual(["IMAGE_TOO_SMALL"]);
    expect(testState.documents).toHaveLength(0);
  });

  it("rejects unauthenticated uploads", async () => {
    setSession(null);

    const { response, body } = await upload();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication required.");
    expect(testState.documents).toHaveLength(0);
  });

  it("does not expose another user's duplicate through upload matching", async () => {
    setSession("user-1");
    await upload();

    setSession("user-2");
    const secondUserUpload = await upload();

    expect(secondUserUpload.body.duplicateStatus).toBe("NEW");
    expect(secondUserUpload.body.matchedDocumentId).toBeNull();
  });

  it("does not expose another user's near duplicate through perceptual matching", async () => {
    setSession("user-1");
    await upload("near owner image bytes");

    setSession("user-2");
    const secondUserUpload = await upload("near other owner image bytes");

    expect(secondUserUpload.body.duplicateStatus).toBe("NEW");
    expect(secondUserUpload.body.matchedDocumentId).toBeNull();
  });

  it("rejects another user's document detail and original image without leaking object access", async () => {
    setSession("owner-user");
    const ownerUpload = await upload();

    setSession("other-user");
    const detailResponse = await getDocument(new Request("http://localhost/api/documents/id"), {
      params: Promise.resolve({ id: ownerUpload.body.documentId as string })
    });
    const originalResponse = await getOriginalDocument(new Request("http://localhost/api/documents/id/original"), {
      params: Promise.resolve({ id: ownerUpload.body.documentId as string })
    });

    expect(detailResponse.status).toBe(404);
    expect(originalResponse.status).toBe(404);
    expect(testState.getOriginalDocumentObject).not.toHaveBeenCalled();
  });
});
