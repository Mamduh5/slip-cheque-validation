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
- It does not touch duplicate, review, quality, hash, object, QR-candidate, QR-decode, or transfer-metadata fields.
- It does not create per-record audit logs.
- It does not run automatically at application startup.
