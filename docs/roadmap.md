# Roadmap

## V1 Scaffold

- Next.js App Router application.
- MongoDB and MinIO integration.
- Email/password auth and optional Google auth.
- Protected dashboard and upload pages.
- Original image upload storage.
- Document records with duplicate-check-ready fields.
- Clear docs and Docker Compose local development.

## Next Phase

- Add exact duplicate detection by querying `exactHash`.
- Set `duplicateStatus` to `NEW` or `DUPLICATE` during upload.
- Add upload preview and clearer processing states.
- Add tests for registration, auth guard behavior, and upload validation.
- Add document list filtering by type and status.

## Later Phases

- Background processing queue.
- Image normalization and perceptual hash generation.
- Near-duplicate similarity search.
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
