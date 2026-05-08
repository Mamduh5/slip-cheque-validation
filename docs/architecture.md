# Architecture

## App Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: reusable UI components and client-side forms.
- `lib/`: server-side auth, MongoDB, storage, validation, and document services.
- `types/`: NextAuth session type extensions.
- `docs/`: project memory for future work.

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
5. Original image is stored in MinIO.
6. Document metadata is inserted into MongoDB.
7. User is redirected to `/documents/{id}`.

## Future Duplicate Pipeline

The current upload flow prepares fields for future processing:

- `exactHash`: exact byte-level duplicate lookup.
- `perceptualHash`: normalized image similarity placeholder.
- `duplicateStatus`: result state such as `NEW`, `DUPLICATE`, or `POSSIBLE_DUPLICATE`.
- `matchedDocumentId`: related document when a duplicate is found.
- `similarityScore`: future near-match score.

Likely next steps are an exact-hash check, then a background image normalization and perceptual-hash stage. OCR, QR extraction, and cheque field extraction should remain later pipeline stages, not the core v1 intake path.
