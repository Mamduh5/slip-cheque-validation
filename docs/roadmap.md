# Roadmap

## V1 Scaffold

- Next.js App Router application.
- MongoDB and MinIO integration.
- Email/password auth and optional Google auth.
- Protected dashboard and upload pages.
- Original image upload storage.
- Explicit document-type intake for transfer slips, deposit/payment slips, cheques, and unknown documents.
- Owner-only audited document-type correction after upload.
- Type-aware processing profiles with a slip-first branch for QR-oriented work.
- Transfer-slip stage contract with active QR candidate analysis, QR decode, transfer metadata parse, and local-only structural `slipVerification`, plus planned later external truth verification only if a real provider is selected.
- Slip verification contract documenting decode vs parse vs local structural validation vs external truth verification.
- Executed transfer-slip QR-candidate analysis that records plausible QR-like regions.
- Executed transfer-slip QR decode that extracts raw QR content without parsing or verifying business fields.
- Executed transfer-slip metadata parsing that classifies decoded payloads and parses supported Thai QR payment payloads without verification.
- Persisted transfer-slip `slipVerification` results for local-only supported Thai QR structural checks, including CRC-16/CCITT-FALSE checksum validation, with safe no-evidence fallback outcomes.
- Optional idempotent `slipVerification` backfill command for older transfer-slip records, with lazy-compatible read behavior before backfill.
- Exact duplicate detection using SHA-256 file hashes.
- Normalized image derivative generation and dHash near-duplicate detection.
- Human review workflow for likely duplicates.
- Capture quality warnings for photographed documents.
- Pre-submit upload preview with advisory client-side capture hints.
- Bulk upload workflow for selecting multiple images, removing individual files before upload, seeing per-file staged progress, compact per-file outcomes, grouped batch counts, and retrying only failed or quality-rejected items.
- Lightweight framing guidance for paper-document photos.
- Focused Playwright E2E coverage for upload preview and quality-failure recovery.
- One real-service Playwright happy-path upload test through MongoDB and MinIO.
- CI-friendly Playwright bootstrap/readiness wrapper for Docker-backed MongoDB and MinIO.
- Owner-only document detail and original-image access.
- Document records with exact and likely duplicate fields.
- Structure-aware transfer-slip duplicate detection that uses QR decode, parsed transfer metadata, and image-read OCR fields to suppress false near-duplicates from similar templates, while keeping image similarity as a fallback for non-slip types and slips without parsed metadata.
- Staged upload progress indicator with disabled submit and clear stage labels.
- Per-file bulk upload status model: waiting, uploading, processing, completed, failed, and quality rejected.
- Post-upload result summary on the document detail page derived from stored document fields, redirect-safe and refresh-safe.
- Duplicate-decision transparency: a dedicated "Duplicate decision" card on the document detail page explaining exact duplicate, likely duplicate, new upload, and suppressed near-duplicate outcomes with structured-conflict reasons.
- Structured duplicate-decision reason fields (`duplicateDecisionType`, `duplicateDecisionReasons`) stored on document records so the UI does not depend on brittle note-string parsing. Legacy records with only freeform notes still render via a compatibility fallback.
- Dashboard suppression badges so users can visually distinguish suppressed near-duplicates from plain new uploads.
- Dashboard filtering by document type, duplicate status, and review status using server-side MongoDB queries scoped to the authenticated owner.
- Dashboard and review queue extracted-field search for amount, reference, receiver/sender names, date/time, banks, and account tails, using comparison-safe normalization where existing helpers support it.
- Review queue sorting and pagination for pending likely duplicates, with newest/oldest/highest-similarity/lowest-similarity ordering.
- Bulk review actions for pending likely duplicates, with compact queue selection, select-all-on-page, confirmation prompts, confirm duplicate / confirm distinct actions, and updated/skipped result summaries.
- Optional Review notes for single and bulk duplicate-review actions. Single-item reviews store one optional note with the decision; bulk review stores one optional note for each item actually updated in the selected batch.
- Lightweight Review history on document detail, backed by review audit entries and showing the latest action, time, optional note, actor id when available, and recent earlier actions without adding a full comment/thread system.
- Built-in workflow presets for recent uploads, needs review, exact duplicates, new uploads, suppressed near-duplicates, strongest review matches, hardest review cases, and oldest pending review items. Presets are URL-driven query shortcuts, not user preference records.
- CSV export for dashboard and review queue working sets, using current filter/search/sort URL state and compact operational fields only.
- Clear docs, Docker Compose local development, and a focused operations runbook for write-mode maintenance commands.
- Lightweight dev regression runner (`scripts/inspect-transfer-slip.ts`) for local OCR extraction and duplicate-assessment inspection on real image fixtures without touching the database.
- Field-specific trust tiers for image-read duplicate suppression: `amount` and `transactionReference` suppress at `MEDIUM` confidence or higher; `receiverName`, `senderName`, `dateTime`, and `receiverBank` suppress alone at `HIGH` or combine as multi-signal at `MEDIUM`. The system no longer depends on QR metadata or on a single field to suppress clearly different transfer-slip near-duplicates.
- Promoted strong bank transaction reference pattern (`\d{9,20}[A-Z]{3}\d{4,}`) from `LOW` to `MEDIUM` extraction confidence when found anywhere in OCR text, since the pattern is specific enough to drive suppression.
- Added Thai title `นาง` (Mrs.) and `นางสาว` (Miss, full form) to the OCR name extraction pattern so more real-slip person names are extracted with title context.
- Numeric amount normalization in duplicate comparison so `500` and `500.00` from different OCR variants are not treated as conflicting amounts.
- Real-image pair suppression regression test verifying two clearly different fixture slips are assessed as CONFLICT and not sent to review.
- OCR comparison normalization module (`lib/slip-ocr-normalization.ts`) with two focused helpers:
  - `normalizeReferenceForCompare`: resolves O/0, I/1, l/1 character confusions in the digit portions of Thai bank transaction references, applied only when the value matches the expected reference format.
  - `normalizeThaiDateTimeForCompare`: collapses OCR-fragmented Thai month abbreviation spacing so that `6 พ . ค . 69 17:52` and `6 พ.ค. 69 17:52` compare as equal.
- Normalization is applied in the duplicate assessment comparison path; raw OCR values stored in document records are unchanged.
- Inspector script (`inspect-transfer-slip.ts`) shows a "Norm. ref" or "Norm. datetime" line when the normalized comparison value differs visibly from the stored raw value.

- Dedicated review queue at `/review` surfacing all `LIKELY_DUPLICATE` + `PENDING` documents with compact cards showing key OCR-derived fields (amount, receiver, reference, date/time), visual similarity, matched document filename, and quick triage actions.
- Side-by-side compare page at `/review/[id]` showing both slip images, a structured field comparison table with difference highlighting, and prominent review action buttons. Low-confidence fields excluded from the comparison table to reduce noise. Links to full detail for both documents.
- Dashboard pending-review banner: when items are waiting, a count badge with a direct link to the review queue appears above the filter bar.
- Review link added to the authenticated navigation header.
- Two-level information density on the document detail page: primary review decision, images, and quality warnings are always visible; "Document metadata", "Image-read fields", "Transfer slip analysis", and "Technical identifiers" are collapsed behind expandable sections, reducing cognitive load for triage work.
- `lib/review-helpers.ts`: extracted and unit-tested field comparison helpers (`reviewValuesMatch`, `getImageReadField`, `getImageReadConfidence`, `isLowConfidence`, `REVIEW_FIELD_LABELS`) that power the compare page without mixing display logic into lib code.
- `getReviewQueueForUser(userId)` data function in `lib/documents.ts` that batches matched-document lookups in one query rather than N+1 fetches.
- No new duplicate logic, statuses, or verification claims introduced. Compact mode summarises existing stored truth only.
- OCR comparison normalisation improvements (leading-zero prefix strip on `normalizeReferenceForCompare`, robust contextual reference extraction with Priority 3b for pure-numeric PromptPay refs, all-numeric reference garbage filter in Priority 2, cleanThaiName min-length guard).

## Next Phase

- Add a provider-specific CI workflow only when the target provider is known.
- Add tests for registration and auth guard behavior.
- Add optional crop/framing tools only after the current guidance-only flow proves insufficient.
- Consider small controlled concurrency for bulk uploads only if sequential batches become too slow in real use.
- Add automated type suggestion only after enough real examples exist; keep manual type selection as the durable source for now.
- Define external truth-provider requirements only if a real provider, credentials, data-retention policy, and claim semantics are selected.
- Add migration/backfill handling for any older records that still have `NOT_CHECKED`.
- Decide whether concurrent same-user exact uploads need stronger duplicate guarantees than v1's lookup-before-insert behavior.
- Add richer audit search/export only if lightweight per-document review history is insufficient.
- Add persisted normalized search keys and indexes if extracted-field search needs to scale beyond the current capped owner-scoped candidate set.
- Add owner-scoped custom saved views only if built-in workflow presets prove insufficient.

## Later Phases

- Background processing queue.
- Stronger image normalization for skew, crop, glare, and rotation edge cases.
- Better client-side camera guidance, preview cropping, and corner framing aids.
- Cluster-level duplicate review behavior beyond pair memory.
- Broader transfer payload parsing formats beyond the initial Thai QR payment support.
- External truth verification for bank transfer slips (requires a real provider, credentials, and claim semantics).
- Cheque-specific field extraction.
- Review workflow for possible duplicates.
- Admin audit views and retention controls.

## Not Now

- Real bank account validation.
- Cheque clearing or settlement integration.
- Heavy OCR-first architecture.
- Separate backend services.
- Complex profile, organization, or role management.
