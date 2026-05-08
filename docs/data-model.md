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
| `status` | enum | `UPLOADED`, `PROCESSING`, `READY`, `FAILED`. |
| `duplicateStatus` | enum | `NOT_CHECKED`, `PENDING`, `NEW`, `DUPLICATE`, `POSSIBLE_DUPLICATE`, `ERROR`. |
| `matchedDocumentId` | string \| null | Future duplicate match reference. |
| `similarityScore` | number \| null | Future near-duplicate score. |
| `exactHash` | string \| null | SHA-256 of the original uploaded bytes. |
| `perceptualHash` | string \| null | Placeholder for future normalized image fingerprint. |
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

V1 records upload data and sets `duplicateStatus` to `NOT_CHECKED`. Later phases should update this field based on exact hash, perceptual hash, and similarity search results.
