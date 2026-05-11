# Operations Runbook

This runbook covers explicit maintenance commands for the single-app deployment. These commands are operational tools, not product features.

## General Maintenance Checklist

Before running a command that can write to MongoDB:

1. Confirm the target environment and database.
2. Set `MONGODB_URI` and `MONGODB_DB` explicitly for any production-like environment.
3. Take or confirm a recent MongoDB backup.
4. Run the command's dry-run mode first when available.
5. Review the output and expected record count.
6. Run the write command only if the dry-run output is expected.
7. Rerun dry-run afterward to confirm the remaining eligible count.
8. Record the command, timestamp, environment, and output in the operator notes for the deployment.

## Slip Verification Backfill

Use this command only when older `BANK_TRANSFER_SLIP` records may predate the persisted `slipVerification` scaffold and you want to normalize their stored shape.

The application does not require this command to read old records. Legacy records with missing or null `slipVerification` remain readable and are displayed with safe not-available wording.

### Environment

The command reads:

- `MONGODB_URI`: MongoDB connection string.
- `MONGODB_DB`: MongoDB database name.

For local development, the script falls back to:

- `MONGODB_URI=mongodb://localhost:27017/slip_cheque_validation`
- `MONGODB_DB=slip_cheque_validation`

For production-like environments, set both values explicitly before running any command.

### Dry Run

```bash
npm run backfill:slip-verification -- --dry-run
```

Expected output shape:

```text
[slip-verification-backfill] Dry run: N eligible transfer-slip record(s) would be updated.
```

Interpretation:

- `N` is the count of `BANK_TRANSFER_SLIP` records where `slipVerification` is missing or null.
- No documents are updated in dry-run mode.
- If `N` is unexpectedly high or low, stop and verify the target database and backup before continuing.

### Real Run

```bash
npm run backfill:slip-verification
```

Expected output shape:

```text
[slip-verification-backfill] Updated X of Y eligible transfer-slip record(s).
```

Interpretation:

- `Y` is the count of eligible records found immediately before the update.
- `X` is the number MongoDB reported as modified.
- `X` should normally match `Y`.
- If `X` is lower than `Y`, check whether records changed concurrently or already had equivalent values.

### Confirm Completion

After the real run, rerun dry-run:

```bash
npm run backfill:slip-verification -- --dry-run
```

Expected output after a completed backfill:

```text
[slip-verification-backfill] Dry run: 0 eligible transfer-slip record(s) would be updated.
```

### What The Backfill Does

- Targets only `BANK_TRANSFER_SLIP` records.
- Matches only documents where `slipVerification` is missing or null.
- Sets only `slipVerification`.
- Uses the safe `SLIP_VERIFICATION` / `COMPLETED` / `NOT_VERIFIED` / `NO_EVIDENCE` scaffold.
- Is idempotent; populated records no longer match the query.

### What The Backfill Does Not Do

- It does not perform real slip verification.
- It does not run local structural validation.
- It does not call a bank, provider, or external verification source.
- It does not run OCR.
- It does not parse cheques.
- It does not reprocess images.
- It does not infer or change document types.
- It does not touch duplicate, review, quality, hashes, object references, original assets, normalized assets, QR-candidate, QR-decode, or transfer-metadata fields.
- It does not create per-record audit logs.
- It does not run automatically at application startup.

## Inspect Transfer-Slip OCR and Duplicate Assessment (Dev Only)

This is a read-only developer script that runs the current OCR/image-read pipeline and duplicate assessment on one or two local image files. It does not connect to MongoDB, MinIO, or the web app. It is useful for inspecting extraction behavior on real fixture images and for debugging why two images are treated as distinct or similar.

### Prerequisites

`tsx` is installed as a dev dependency (`npm install --save-dev tsx`).

### List available fixture images

```bash
npx tsx scripts/inspect-transfer-slip.ts --list-fixtures
```

### Inspect a single image

```bash
npx tsx scripts/inspect-transfer-slip.ts 016126175244BTF00250.jpg
```

Bare filenames resolve under `tests/image/transfer-slip/`. Absolute or relative paths also work.

### Compare two images

```bash
npx tsx scripts/inspect-transfer-slip.ts image1.jpg image2.jpg
```

This prints the simulated duplicate assessment: conflicts, reason codes, and whether the pair would be suppressed.

### JSON output

```bash
npx tsx scripts/inspect-transfer-slip.ts --json image1.jpg image2.jpg
```

### What it does

- Reads the image(s) from disk.
- Runs the same preprocessing (normalized 1024px buffer + high-res 4096px OCR buffer) as the production pipeline.
- Runs `attemptSlipImageRead` to extract fields and confidence levels.
- For two images, constructs minimal document-like objects and runs `assessTransferSlipDuplicateCandidate` plus `resolveDuplicateDecision`.
- Prints a human-readable report to stdout.

### What it does NOT do

- It does not verify payments, confirm bank truth, or contact any provider.
- It does not write to the database or object storage.
- It does not run the web app or start a server.
- It does not perform exact-hash or perceptual-hash comparison.
- Extracted values are OCR-derived interpretations of visible text, not financial facts.
