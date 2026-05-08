# Data Model

Collection and field names are currently implemented in camelCase TypeScript/Mongo records.

## `users`

Stores authentication users.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Primary user id used in sessions. |
| `email` | string | Unique normalized email. |
| `name` | string \| null | Display name. |
| `image` | string \| null | OAuth profile image when available. |
| `emailVerified` | Date \| null | Reserved for future verification. |
| `passwordHash` | string \| null | Present for email/password users; null for OAuth-only users. |
| `createdAt` | Date | Creation timestamp. |
| `updatedAt` | Date | Update timestamp. |

## `documents`

Stores one registry record per uploaded document image.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Document id. |
| `userId` | string | Owner user id from session. |
| `documentType` | enum | `BANK_TRANSFER_SLIP`, `DEPOSIT_PAYMENT_SLIP`, `CHEQUE`, `UNKNOWN`. |
| `sourceType` | enum | `CAMERA` or `UPLOAD`. |
| `originalFilename` | string | Browser-provided filename. |
| `mimeType` | string | Allowed now: JPEG, PNG, WebP. |
| `fileSize` | number | Original upload size in bytes. |
| `originalObject.bucket` | string | MinIO bucket. |
| `originalObject.key` | string | MinIO object key. |
| `normalizedObject.bucket` | string \| null | MinIO bucket for the normalized derivative. |
| `normalizedObject.key` | string \| null | Normalized WebP derivative object key. |
| `normalizedImage.width` | number \| null | Normalized derivative width in pixels. |
| `normalizedImage.height` | number \| null | Normalized derivative height in pixels. |
| `normalizedImage.mimeType` | string \| null | Currently `image/webp`. |
| `normalizedImage.fileSize` | number \| null | Normalized derivative size in bytes. |
| `normalizedImage.algorithm` | string \| null | Currently `normalized-webp-grayscale-v1`. |
| `status` | enum | `UPLOADED`, `PROCESSING`, `READY`, `FAILED`. |
| `duplicateStatus` | enum | `NOT_CHECKED`, `PENDING`, `NEW`, `EXACT_DUPLICATE`, `LIKELY_DUPLICATE`, `DUPLICATE`, `POSSIBLE_DUPLICATE`, `ERROR`. |
| `matchedDocumentId` | string \| null | Match reference for exact or likely duplicates; null for new documents. |
| `similarityScore` | number \| null | `1` for exact duplicates; `1 - hammingDistance / 64` for likely duplicates. |
| `exactHash` | string \| null | SHA-256 of the original uploaded bytes. |
| `perceptualHash` | string \| null | 64-bit dHash of the normalized derivative as 16 hex characters. |
| `notes` | string \| null | Reserved for internal notes. |
| `createdAt` | Date | Creation timestamp. |
| `updatedAt` | Date | Update timestamp. |

## `audit_logs`

Optional lightweight audit collection.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Audit id. |
| `userId` | string | Optional actor id. |
| `action` | string | Event name. |
| `targetType` | string | `document`, `user`, or `system`. |
| `targetId` | string | Optional target id. |
| `metadata` | object | Small contextual payload. |
| `createdAt` | Date | Event timestamp. |

## Duplicate-Check Fields

V1 computes `exactHash` during upload and checks for the earliest existing document owned by the same user with the same hash.

- New unique uploads are stored with `duplicateStatus: "NEW"`.
- Exact duplicate uploads still create a new document record for auditability.
- Exact duplicate records use `duplicateStatus: "EXACT_DUPLICATE"`, set `matchedDocumentId`, and set `similarityScore` to `1`.
- If there is no exact match, perceptual candidates are checked with owner-scoped dHash Hamming distance.
- Likely duplicate records use `duplicateStatus: "LIKELY_DUPLICATE"`, set `matchedDocumentId`, and set `similarityScore` to `1 - hammingDistance / 64`.
- Exact matching is deterministic: `createdAt ASC`, then `_id ASC`.
- Likely duplicate matching is deterministic: lowest Hamming distance, then `createdAt ASC`, then `_id ASC`.
- The generated current document id is excluded from the lookup so a record cannot match itself.
- `NOT_CHECKED` remains in the enum for older or future deferred-processing records.

## Image Storage

- `originalObject` always points to the unchanged uploaded file.
- `normalizedObject` points to the generated derivative used for fingerprinting.
- Normalized derivatives are auto-oriented, resized within 1024x1024, converted to grayscale, lightly normalized, and stored as WebP.
- Current object key pattern is `documents/{userId}/{documentId}/normalized.webp`.

## Ownership Rules

- Each document belongs to exactly one `userId`.
- Dashboard and document detail pages only query documents for the current session user.
- `POST /api/documents` requires authentication and stores the session user id as owner.
- `GET /api/documents/{id}` and `GET /api/documents/{id}/original` require authentication and only return owner documents.
- Missing and non-owned documents are handled the same way at the API boundary.
