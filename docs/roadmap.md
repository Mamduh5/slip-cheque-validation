# Roadmap

## V1 Scaffold

- Next.js App Router application.
- MongoDB and MinIO integration.
- Email/password auth and optional Google auth.
- Protected dashboard and upload pages.
- Original image upload storage.
- Exact duplicate detection using SHA-256 file hashes.
- Normalized image derivative generation and dHash near-duplicate detection.
- Owner-only document detail and original-image access.
- Document records with exact and likely duplicate fields.
- Clear docs and Docker Compose local development.

## Next Phase

- Add upload preview and clearer processing states.
- Add tests for registration and auth guard behavior.
- Add document list filtering by type and status.
- Add migration/backfill handling for any older records that still have `NOT_CHECKED`.
- Decide whether concurrent same-user exact uploads need stronger duplicate guarantees than v1's lookup-before-insert behavior.
- Add review workflow affordances for `LIKELY_DUPLICATE` results.

## Later Phases

- Background processing queue.
- Stronger image normalization for skew, crop, glare, and rotation edge cases.
- QR extraction for bank transfer slips where available.
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
