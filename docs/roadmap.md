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
- Lightweight framing guidance for paper-document photos.
- Focused Playwright E2E coverage for upload preview and quality-failure recovery.
- One real-service Playwright happy-path upload test through MongoDB and MinIO.
- CI-friendly Playwright bootstrap/readiness wrapper for Docker-backed MongoDB and MinIO.
- Owner-only document detail and original-image access.
- Document records with exact and likely duplicate fields.
- Clear docs, Docker Compose local development, and a focused operations runbook for write-mode maintenance commands.

## Next Phase

- Add richer upload progress and persisted post-upload result messaging.
- Add a provider-specific CI workflow only when the target provider is known.
- Add tests for registration and auth guard behavior.
- Add optional crop/framing tools only after the current guidance-only flow proves insufficient.
- Add automated type suggestion only after enough real examples exist; keep manual type selection as the durable source for now.
- Define external truth-provider requirements only if a real provider, credentials, data-retention policy, and claim semantics are selected.
- Add document list filtering by type and status.
- Add migration/backfill handling for any older records that still have `NOT_CHECKED`.
- Decide whether concurrent same-user exact uploads need stronger duplicate guarantees than v1's lookup-before-insert behavior.
- Add richer review history and notes if users need audit comments.

## Later Phases

- Background processing queue.
- Stronger image normalization for skew, crop, glare, and rotation edge cases.
- Better client-side camera guidance, preview cropping, and corner framing aids.
- Cluster-level duplicate review behavior beyond pair memory.
- Broader transfer payload parsing formats beyond the initial Thai QR payment support.
- External truth verification for bank transfer slips (requires a real provider, credentials, and claim semantics).
- OCR-assisted field extraction.
- Cheque-specific field extraction.
- Review workflow for possible duplicates.
- Admin audit views and retention controls.

## Not Now

- Real bank account validation.
- Cheque clearing or settlement integration.
- Heavy OCR-first architecture.
- Separate backend services.
- Complex profile, organization, or role management.
