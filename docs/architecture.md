# Architecture

## App Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: reusable UI components and client-side forms.
- `lib/`: server-side auth, MongoDB, storage, validation, and document services.
- `types/`: NextAuth session type extensions.
- `docs/`: project memory for future work.

Imports use a TypeScript `paths` mapping for `@/*` without `baseUrl`. This keeps existing imports concise while avoiding deprecated `baseUrl` behavior in newer TypeScript versions.

## Auth

Auth is handled by NextAuth in the same Next.js app.

- Credentials provider supports email/password login.
- Optional Google provider is enabled when OAuth env values are present.
- Sessions use JWT strategy.
- User records are stored in MongoDB in the `users` collection.
- `proxy.ts` protects `/dashboard`, `/upload`, and `/documents/*` using NextAuth.

Email/password registration is exposed through `POST /api/register`. Passwords are hashed with bcrypt before storage.

## MongoDB

MongoDB stores application records:

- `users`: auth users and optional password hashes.
- `documents`: uploaded document registry records.
- `audit_logs`: lightweight audit entries for early lifecycle events.

The document service creates basic indexes lazily for user document listing, exact hash lookup, and duplicate status lookup.

## MinIO

MinIO stores original uploaded images. The app uses a small object-storage helper in `lib/object-storage.ts`.

The configured bucket is created lazily on upload if it does not already exist. Object keys use:

```text
documents/{userId}/{documentId}/original.{ext}
```

## Upload Flow

1. Authenticated user opens `/upload`.
2. Browser sends multipart form data to `POST /api/documents`.
3. Server validates metadata, MIME type, and file size.
4. Server computes a SHA-256 exact file hash.
5. Server checks MongoDB for the earliest existing document with the same `exactHash`.
6. Original image is stored in MinIO.
7. A new document record is inserted into MongoDB for auditability.
8. If no match exists, `duplicateStatus` is `NEW`.
9. If a match exists, `duplicateStatus` is `EXACT_DUPLICATE`, `matchedDocumentId` points to the matched document, and `similarityScore` is `1`.
10. User is redirected to `/documents/{id}`.

## Future Duplicate Pipeline

The current upload flow implements exact duplicate detection and prepares fields for future processing:

- `exactHash`: exact byte-level duplicate lookup, active now.
- `perceptualHash`: normalized image similarity placeholder.
- `duplicateStatus`: exact-match state such as `NEW` or `EXACT_DUPLICATE`; future stages may use `POSSIBLE_DUPLICATE`.
- `matchedDocumentId`: related document when a duplicate is found.
- `similarityScore`: future near-match score.

Likely next steps are a background image normalization and perceptual-hash stage. OCR, QR extraction, and cheque field extraction should remain later pipeline stages, not the core v1 intake path.
