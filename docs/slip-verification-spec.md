# Slip Verification Specification

This document defines the `SLIP_VERIFICATION` stage boundary for bank transfer slips. The current runtime implementation includes local-only structural validation for supported Thai QR payment metadata plus safe no-evidence fallbacks. No bank/provider integration, OCR, queue, external truth verification, or new runtime service is implemented by this document.

## Current Transfer-Slip Stage Boundary

The current `BANK_TRANSFER_SLIP` path has three executed QR/metadata stages and one local-only structural verification stage:

1. `QR_CANDIDATE`
   - Detects whether a plausible QR-like region exists in the normalized image.
   - Does not decode QR content.
   - Does not prove the document is a transfer slip or that a payment exists.
2. `QR_DECODE`
   - Attempts technical QR content extraction after a plausible candidate is found.
   - Stores `qrDecode.rawDecodedText` when decoding succeeds.
   - Does not parse, trust, or verify the decoded payload.
3. `TRANSFER_METADATA_PARSE`
   - Classifies decoded payloads before parsing.
   - Parses only supported payload families into `transferMetadata.metadata`.
   - Stores structured metadata as an interpretation of decoded text.
   - Does not verify authenticity, account truth, payment status, or bank truth.
4. `SLIP_VERIFICATION`
   - Runs local-only structural validation only when `transferMetadata` is parsed as supported Thai QR payment metadata.
   - Can record `STRUCTURALLY_CONSISTENT` or `STRUCTURALLY_INCONSISTENT` with `LOCAL_STRUCTURAL_CHECK`.
   - Uses `NOT_VERIFIED` or `UNSUPPORTED` with `NO_EVIDENCE` when supported local checks cannot run.
   - Does not perform external truth verification and must not be implied by successful decode or parse alone.

## Definitions

### Raw Decode

Raw decode is technical extraction of QR content.

- Source: QR pixels in the uploaded document image.
- Current field: `qrDecode.rawDecodedText`.
- Allowed user-facing wording: "QR content decoded" or "Raw QR content extracted".
- Must not say: "payment verified", "valid transfer", "confirmed slip", or "authentic".

### Parsed Metadata

Parsed metadata is structured interpretation of supported decoded payloads.

- Source: `qrDecode.rawDecodedText`.
- Current field: `transferMetadata.metadata`.
- Allowed user-facing wording: "Parsed from decoded QR content" or "Structured metadata parsed".
- Must not say: "verified amount", "verified recipient", "confirmed payment", or "bank-confirmed".

### Local Structural Validation

Local structural validation means checks that can be performed entirely inside the app using already stored decoded/parsed data.

Implemented checks for supported Thai QR payment metadata:

- EMV payload format indicator is present and equals `01`.
- Country code is present and equals `TH`.
- Currency code is present and equals `764`.
- Thai QR merchant account information is present.
- PromptPay target identifier is present for PromptPay payloads.
- Biller id and reference 1 are present for bill-payment payloads.
- Amount format is syntactically valid if present.
- CRC tag is present and its checksum is validated using CRC-16/CCITT-FALSE over the payload with the CRC value replaced by `0000`. A mismatch makes the result `STRUCTURALLY_INCONSISTENT`.

Local structural validation can support only a statement like "structurally consistent with supported format". It cannot support a statement that a real payment happened, that a bank account exists, or that a slip is authentic.

### External Truth Verification

External truth verification means checking against a source outside this app that is authorized to provide payment, account, provider, or transaction truth.

Examples, if ever explicitly integrated later:

- Bank/provider verification API.
- Payment network API.
- Merchant or payment-gateway status API.
- A trusted uploaded evidence artifact with a separately defined trust model.

External truth verification is not implemented now. Until it is implemented, the product must not display "verified payment", "confirmed transfer", or similar wording.

## Stage Contract

`SLIP_VERIFICATION` consumes only explicit prior-stage outputs and declared evidence sources. The current local implementation consumes parsed `transferMetadata` only.

### Required Inputs

At minimum:

- `documentType` must be `BANK_TRANSFER_SLIP`.
- `qrDecode` result, if verification depends on decoded QR content.
- `transferMetadata` result, if verification depends on parsed structured metadata.
- Original document identifiers and ownership context for API access control.

Optional future inputs may include:

- User-supplied reference data.
- External provider response data.
- Local structural-validation output if split into a separate pre-verification step.

### Proposed Stage Statuses

Runtime statuses should be explicit and auditable:

- `NOT_APPLICABLE`: document type or profile does not support slip verification.
- `SKIPPED`: required prior-stage inputs are unavailable or unsupported.
- `COMPLETED`: the stage produced a result. This can mean local structural checks ran, an unsupported payload was classified, or a no-evidence fallback was recorded.
- `FAILED`: verification could not complete due to system or provider error.

### Proposed Result Categories

Future result names should avoid overclaiming:

- `NOT_VERIFIED`: no verification evidence was available or checks were not run.
- `UNSUPPORTED`: the payload/evidence type is outside supported verification scope.
- `STRUCTURALLY_CONSISTENT`: local-only checks passed; not external truth verification.
- `STRUCTURALLY_INCONSISTENT`: local-only checks found inconsistencies.
- `EXTERNALLY_VERIFIED`: a configured external truth source confirmed the relevant claim.
- `EXTERNAL_MISMATCH`: a configured external truth source contradicted the relevant claim.
- `VERIFICATION_INCONCLUSIVE`: evidence was available but did not support a clear outcome.

`STRUCTURALLY_CONSISTENT` and `EXTERNALLY_VERIFIED` must remain separate. Local consistency must never be promoted to external verification.

### Evidence Sources

A verification record identifies its evidence category:

- `LOCAL_STRUCTURAL_CHECK`
  - Implemented entirely in app logic.
  - Can support format consistency only.
  - Cannot confirm bank truth or payment completion.
- `EXTERNAL_PROVIDER_API`
  - Requires explicit provider integration, credentials, error handling, and data-retention decisions.
  - Can support only the claims returned by the provider.
  - Not implemented now.
- `USER_UPLOADED_EVIDENCE`
  - Requires a trust and review model before use.
  - Can support human review context but not automatic bank truth unless paired with a trusted source.
  - Not implemented now.
- `NO_EVIDENCE`
  - Used when verification is skipped, unsupported, or unavailable.

### Proposed Output Shape

The `slipVerification` field remains separate from `qrDecode` and `transferMetadata`.

Suggested shape:

```ts
type SlipVerification = {
  stage: "SLIP_VERIFICATION";
  algorithm: string;
  status: "NOT_APPLICABLE" | "SKIPPED" | "COMPLETED" | "FAILED";
  result:
    | "NOT_VERIFIED"
    | "UNSUPPORTED"
    | "STRUCTURALLY_CONSISTENT"
    | "STRUCTURALLY_INCONSISTENT"
    | "EXTERNALLY_VERIFIED"
    | "EXTERNAL_MISMATCH"
    | "VERIFICATION_INCONCLUSIVE";
  evidenceCategory:
    | "LOCAL_STRUCTURAL_CHECK"
    | "EXTERNAL_PROVIDER_API"
    | "USER_UPLOADED_EVIDENCE"
    | "NO_EVIDENCE";
  checkedAt: Date;
  claimsChecked: Array<{
    claim: string;
    sourceField: string;
    result: string;
    notes: string[];
  }>;
  notes: string[];
  warnings: string[];
};
```

The current live model uses the stage/status/result/evidence/timestamp/notes subset of this shape.

## Safe UI And API Terminology

### Preferred Phrases

- Decoded: "QR content decoded" or "Raw QR content extracted".
- Parsed: "Structured metadata parsed from decoded QR content".
- Local structural check passed: "Structurally consistent with supported format".
- Local structural check failed: "Structural inconsistency found".
- Local checksum passed: "Local checksum check passed".
- Local checksum failed: "Local checksum inconsistency found".
- External verification passed: "Externally verified by configured provider".
- Unsupported: "Unsupported for verification".
- Not verified: "Not verified" or "No verification evidence available".

### Avoided Phrases Unless External Truth Exists

Do not use these for raw decode, parsed metadata, or local-only checks:

- "Verified payment"
- "Confirmed transfer"
- "Authentic slip"
- "Valid bank transfer"
- "Payment completed"
- "Bank-confirmed"
- "Recipient verified"
- "Amount verified"
- "Fraud-free"

### UI/API Display Rules

- The detail page may show decoded and parsed values, but must label them as unverified unless a future external truth source confirms a specific claim.
- API responses should expose stage status, result, and evidence category separately.
- External verification wording must name the evidence category or provider class where safe.
- Local structural validation must be described as local and structural, not as proof.

## Non-Goals For The Current Project State

The following remain intentionally unimplemented:

- Bank/provider API integration.
- Payment status verification.
- Account holder, recipient, or amount truth verification.
- OCR-assisted slip reading.
- Cheque parsing or cheque clearing.
- Background processing queues or separate verification services.

## Recommended Implementation Sequence

When implementation becomes appropriate, do it in this order:

1. Keep local structural checks explicitly labeled as local-only.
2. Add broader local checks only when they are deterministic and derived from already parsed fields.
3. Only later add external provider integration if a real provider, credentials, data-retention policy, and claim semantics are defined.
