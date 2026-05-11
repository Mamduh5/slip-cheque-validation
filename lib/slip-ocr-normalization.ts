/**
 * OCR post-normalization helpers for Thai bank transfer slip fields.
 *
 * These functions produce comparison-ready values without mutating stored OCR
 * output. All returned values remain OCR-derived interpretations — they are
 * not verified financial truth.
 *
 * Design principles:
 *  - Only apply reference normalization when the string matches the expected
 *    bank reference pattern; leave other strings unchanged.
 *  - Thai date/time normalization is limited to whitespace and dot squishing
 *    around Thai month abbreviations — it does not reinterpret date semantics.
 *  - When normalization cannot be applied confidently, fall back to plain
 *    lowercase-and-trim so comparison still works for non-reference strings.
 */

/**
 * Normalize a bank transaction reference for comparison.
 *
 * Handles the three most common OCR character confusions in digit positions:
 *   - O  (uppercase letter O) → 0  (zero)
 *   - I  (uppercase letter I) → 1  (one)
 *   - l  (lowercase letter L) → 1  (one)
 *
 * Normalization is applied only when the value matches the Thai bank reference
 * format: `{9-20 digit-like chars}{3-5 uppercase letters}{4+ digit-like chars}`.
 * This keeps the correction conservative — random alphanumeric strings are not
 * rewritten.
 *
 * If the value does not match the pattern, returns a plain lowercased-and-trimmed
 * version for general string comparison.
 *
 * Examples:
 *   normalizeReferenceForCompare("01612I214623BTF04629") → "016121214623BTF04629"
 *   normalizeReferenceForCompare("O16126175244BTF00250") → "016126175244BTF00250"
 *   normalizeReferenceForCompare("016126175244BTF00250") → "016126175244BTF00250"
 *   normalizeReferenceForCompare("REF-ABC123")           → "ref-abc123" (no pattern match)
 */
export function normalizeReferenceForCompare(value: string | null): string {
  if (!value) return "";
  const v = value.trim();

  // Match the bank reference format allowing OCR confusion characters in digit positions.
  // Digit-like chars: 0-9, O (OCR for 0), I (OCR for 1), l (OCR for 1)
  // Non-greedy on the letter group: take the shortest possible letter run that
  // still allows the trailing digit group to satisfy {4,}. This way an ambiguous
  // character like O that trails the letter code (e.g. "BTFO0250") is assigned to
  // the digit suffix where it can be normalized, not consumed into the code.
  const bankRefPattern = /^([0-9OIl]{9,20})([A-Za-z]{3,5}?)([0-9OIl]{4,})$/;
  const m = v.match(bankRefPattern);
  if (m) {
    const normDigitPart = (s: string): string =>
      s
        .toUpperCase()
        .replace(/O/g, "0")   // O → 0
        .replace(/[IL]/g, "1"); // I/uppercase-L (was lowercase-l) → 1
    return normDigitPart(m[1]) + m[2].toUpperCase() + normDigitPart(m[3]);
  }

  // Not a recognized bank reference pattern — plain comparison normalization.
  return v.toLowerCase().replace(/\s+/g, " ");
}

/**
 * Normalize a Thai date/time string for comparison.
 *
 * Thai bank slip OCR frequently fragments month abbreviations by inserting spaces
 * between individual Thai characters and around dots. For example:
 *   "6 พ . ค . 69 17:52"    (fully fragmented)
 *   "6 พ.ค. 69 17:52"       (semi-compact)
 *   "6 พ.ค.69 17:52"        (no space before year)
 *
 * All three normalize to "6พ.ค.69 17:52" for comparison, so OCR spacing
 * differences do not produce false conflicts.
 *
 * Non-Thai date formats (ISO, slash, time-only) pass through with only
 * standard whitespace normalization.
 *
 * Examples:
 *   normalizeThaiDateTimeForCompare("6 พ . ค . 69 17:52")  → "6พ.ค.69 17:52"
 *   normalizeThaiDateTimeForCompare("6 พ.ค. 69 17:52")     → "6พ.ค.69 17:52"
 *   normalizeThaiDateTimeForCompare("2026-05-11 10:21:00") → "2026-05-11 10:21:00"
 *   normalizeThaiDateTimeForCompare("11/05/2026 10:21:00") → "11/05/2026 10:21:00"
 */
export function normalizeThaiDateTimeForCompare(value: string | null): string {
  if (!value) return "";
  let v = value.trim();

  // Remove spaces immediately before and after every Thai character.
  // This collapses "6 พ . ค . 69" → "6พ. ค. 69" in the first pass,
  // then consecutive Thai chars like "เม" are already adjacent.
  // The replacement is applied twice to handle alternating Thai/dot/space sequences.
  v = v.replace(/\s*([\u0E00-\u0E7F])\s*/g, "$1");

  // Remove spaces around dots to rejoin fragmented abbreviations (e.g. ". ย ." → ".ย.").
  // After the Thai-space pass above, "ค. 69" still has ". " before the year; this fixes it.
  v = v.replace(/\s*\.\s*/g, ".");

  // Normalize remaining runs of whitespace
  return v.replace(/\s+/g, " ").trim().toLowerCase();
}
