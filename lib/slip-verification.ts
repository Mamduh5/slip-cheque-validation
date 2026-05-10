import type { SlipVerificationAnalysisResult, TransferMetadataFields, TransferMetadataParseAnalysisResult } from "@/lib/models";

export function buildSlipVerificationScaffold(input: { evaluatedAt?: Date } = {}): SlipVerificationAnalysisResult {
  return {
    stage: "SLIP_VERIFICATION",
    algorithm: "slip-verification-scaffold-v1",
    status: "COMPLETED",
    result: "NOT_VERIFIED",
    evidenceCategory: "NO_EVIDENCE",
    evaluatedAt: input.evaluatedAt ?? new Date(),
    notes: [
      "Slip verification runtime scaffold recorded with no verification evidence.",
      "No local structural validation or external provider verification has been performed."
    ]
  };
}

export function attemptSlipVerification(input: {
  transferMetadata: TransferMetadataParseAnalysisResult | null;
  evaluatedAt?: Date;
}): SlipVerificationAnalysisResult {
  const evaluatedAt = input.evaluatedAt ?? new Date();

  if (!input.transferMetadata) {
    return buildSlipVerificationScaffold({ evaluatedAt });
  }

  if (
    input.transferMetadata.status !== "COMPLETED" ||
    input.transferMetadata.result !== "PARSED" ||
    input.transferMetadata.payloadFormat !== "THAI_QR_PAYMENT" ||
    !input.transferMetadata.metadata
  ) {
    return {
      stage: "SLIP_VERIFICATION",
      algorithm: "slip-verification-scaffold-v1",
      status: input.transferMetadata.result === "UNSUPPORTED_FORMAT" ? "COMPLETED" : "SKIPPED",
      result: input.transferMetadata.result === "UNSUPPORTED_FORMAT" ? "UNSUPPORTED" : "NOT_VERIFIED",
      evidenceCategory: "NO_EVIDENCE",
      evaluatedAt,
      notes: [
        "Local structural validation was not run because supported Thai QR payment metadata was not available.",
        "No external provider verification has been performed."
      ]
    };
  }

  return validateThaiQrPaymentStructure({
    metadata: input.transferMetadata.metadata,
    parseWarnings: input.transferMetadata.warnings,
    evaluatedAt
  });
}

function validateThaiQrPaymentStructure(input: {
  metadata: TransferMetadataFields;
  parseWarnings: string[];
  evaluatedAt: Date;
}): SlipVerificationAnalysisResult {
  const checks: string[] = [];
  const issues: string[] = [];
  const metadata = input.metadata;
  const merchantAccountInfo = metadata.merchantAccountInfo;

  recordPresenceCheck({
    label: "EMV payload format indicator is present and equals 01.",
    passed: metadata.emvVersion === "01",
    issues
  });
  recordPresenceCheck({
    label: "Country code is present and equals TH.",
    passed: metadata.countryCode === "TH",
    issues
  });
  recordPresenceCheck({
    label: "Currency code is present and equals 764.",
    passed: metadata.currencyCode === "764",
    issues
  });
  recordPresenceCheck({
    label: "Thai QR merchant account information is present.",
    passed: merchantAccountInfo !== null,
    issues
  });
  recordPresenceCheck({
    label: "CRC tag is present.",
    passed: isNonEmpty(metadata.crc),
    issues
  });
  checks.push(
    "Checked EMV payload indicator, Thai country/currency tags, merchant account information, target/reference fields, optional amount syntax, and CRC tag presence."
  );

  if (metadata.amount !== null && !/^\d+(\.\d{1,2})?$/.test(metadata.amount)) {
    issues.push("Amount is present but is not a decimal value with up to two fractional digits.");
  }

  if (!merchantAccountInfo) {
    return buildLocalStructuralResult({
      result: "STRUCTURALLY_INCONSISTENT",
      evaluatedAt: input.evaluatedAt,
      checks,
      issues,
      parseWarnings: input.parseWarnings
    });
  }

  if (merchantAccountInfo.subtype === "PROMPTPAY") {
    recordPresenceCheck({
      label: "PromptPay target identifier is present.",
      passed: isNonEmpty(merchantAccountInfo.targetIdentifier) && merchantAccountInfo.targetIdentifierType !== "UNKNOWN",
      issues
    });
  } else if (merchantAccountInfo.subtype === "BILL_PAYMENT") {
    recordPresenceCheck({
      label: "Bill payment biller id and reference 1 are present.",
      passed: isNonEmpty(merchantAccountInfo.targetIdentifier) && isNonEmpty(merchantAccountInfo.references.reference1),
      issues
    });
  } else {
    issues.push("Thai QR merchant account subtype is not supported for local structural validation.");
  }

  return buildLocalStructuralResult({
    result: issues.length === 0 ? "STRUCTURALLY_CONSISTENT" : "STRUCTURALLY_INCONSISTENT",
    evaluatedAt: input.evaluatedAt,
    checks,
    issues,
    parseWarnings: input.parseWarnings
  });
}

function buildLocalStructuralResult(input: {
  result: "STRUCTURALLY_CONSISTENT" | "STRUCTURALLY_INCONSISTENT";
  evaluatedAt: Date;
  checks: string[];
  issues: string[];
  parseWarnings: string[];
}): SlipVerificationAnalysisResult {
  return {
    stage: "SLIP_VERIFICATION",
    algorithm: "slip-verification-local-structural-v1",
    status: "COMPLETED",
    result: input.result,
    evidenceCategory: "LOCAL_STRUCTURAL_CHECK",
    evaluatedAt: input.evaluatedAt,
    notes: [
      "Local structural validation checked only supported Thai QR payment metadata parsed from decoded QR content.",
      ...input.checks,
      ...input.issues.map((issue) => `Structural issue: ${issue}`),
      ...input.parseWarnings.map((warning) => `Parse warning considered: ${warning}`),
      "This local result does not confirm payment completion, bank truth, recipient truth, or slip authenticity."
    ]
  };
}

function recordPresenceCheck(input: { label: string; passed: boolean; issues: string[] }) {
  if (!input.passed) {
    input.issues.push(input.label);
  }
}

function isNonEmpty(value: string | null) {
  return typeof value === "string" && value.trim().length > 0;
}
