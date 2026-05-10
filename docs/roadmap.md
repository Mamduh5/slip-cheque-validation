# Roadmap

## V1 Scaffold

- Next.js App Router application.
- MongoDB and MinIO integration.
- Email/password auth and optional Google auth.
- Protected dashboard and upload pages.
- Original image upload storage.
- Explicit document-type intake for transfer slips, deposit/payment slips, cheques, and unknown documents.
- Owner-only audited document-type correction after upload.
- Type-aware processing profiles with a slip-first branch for future QR-oriented work.
- Transfer-slip stage contract with active QR candidate analysis plus planned QR decode, metadata parse, and later verification.
- Executed transfer-slip QR-candidate analysis that records plausible QR-like regions without decoding content.
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
- Clear docs and Docker Compose local development.

## Next Phase

- Add richer upload progress and persisted post-upload result messaging.
- Add a provider-specific CI workflow only when the target provider is known.
- Add tests for registration and auth guard behavior.
- Add optional crop/framing tools only after the current guidance-only flow proves insufficient.
- Add automated type suggestion only after enough real examples exist; keep manual type selection as the durable source for now.
- Add real transfer-slip QR decoding only after the candidate-analysis contract proves useful.
- Add document list filtering by type and status.
- Add migration/backfill handling for any older records that still have `NOT_CHECKED`.
- Decide whether concurrent same-user exact uploads need stronger duplicate guarantees than v1's lookup-before-insert behavior.
- Add richer review history and notes if users need audit comments.

## Later Phases

- Background processing queue.
- Stronger image normalization for skew, crop, glare, and rotation edge cases.
- Better client-side camera guidance, preview cropping, and corner framing aids.
- Cluster-level duplicate review behavior beyond pair memory.
- QR decoding and payload extraction for bank transfer slips where available.
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
