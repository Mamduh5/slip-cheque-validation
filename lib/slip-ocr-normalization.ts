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
 * Normalize a Thai person or company name for comparison.
 *
 * Applies the following transformations (comparison path only — stored value unchanged):
 *  1. Common OCR misread: nikhahit (U+0E4D) + sara-a (U+0E32) → sara-am (U+0E33)
 *  2. Strip leading Thai honorific title prefix: น.ส., นางสาว, นาง, นาย
 *     (including OCR dot-space variants like "น . ส .")
 *  3. Collapse ALL spaces between adjacent Thai characters, eliminating both
 *     OCR spacing fragmentation ("น า ย" → "นาย") and inconsistent word spacing.
 *  4. Strip leading/trailing punctuation noise.
 *  5. Normalize internal whitespace; lowercase (Thai is caseless; affects Latin only).
 *
 * Examples:
 *   normalizeThaiNameForCompare("นาย สมชาย ใจดี")        → "สมชายใจดี"
 *   normalizeThaiNameForCompare("น า ย ส ม ช า ย ใ จ ดี") → "สมชายใจดี"
 *   normalizeThaiNameForCompare("นางสาว มาลี รักดี")     → "มาลีรักดี"
 *   normalizeThaiNameForCompare("น.ส. มาลี รักดี")       → "มาลีรักดี"
 *   normalizeThaiNameForCompare("น . ส . มาลี รักดี")    → "มาลีรักดี"
 *   normalizeThaiNameForCompare("นาง ประไพ ดีงาม")       → "ประไพดีงาม"
 *   normalizeThaiNameForCompare(null)                    → ""
 */
export function normalizeThaiNameForCompare(value: string | null): string {
  if (!value) return "";
  let v = value.trim();

  // 1. Fix OCR misread: nikhahit + sara-a → sara-am
  v = v.replace(/\u0E4D\u0E32/g, "\u0E33").replace(/\u0E4D \u0E32/g, "\u0E33");

  // 2. Collapse all spaces between adjacent Thai characters FIRST.
  //    Applied iteratively until stable to handle long fragmented runs.
  //    Done before title stripping so fragmented titles (e.g. "น า ย" → "นาย")
  //    become compact and can be matched by the title-strip patterns below.
  //    Also collapses word-boundary spacing ("สมชาย ใจดี" → "สมชายใจดี").
  //    Note: dot-separated Thai chars ("น . ส .") are NOT collapsed by this step
  //    since dots break the Thai-whitespace-Thai adjacency pattern.
  let prev = "";
  do {
    prev = v;
    v = v.replace(/([\u0E00-\u0E7F])\s+([\u0E00-\u0E7F])/g, "$1$2");
  } while (v !== prev);

  // 3. Strip leading Thai honorific title prefix.
  //    น.ส. pattern handled first (has dots); then multi-char titles by desc length.
  //    \s* after each title also handles OCR that drops the space between title and
  //    name (e.g. "นายสมชาย" with no separator). This is intentionally aggressive
  //    since these are comparison-only normalizations and the edge case of a name
  //    that begins with title characters never occurs in transfer-slip OCR.
  v = v.replace(/^น\s*\.\s*ส\s*\.\s*/u, "");
  v = v.replace(/^นางสาว\s*/u, "");
  v = v.replace(/^นาง\s*/u, "");
  v = v.replace(/^นาย\s*/u, "");

  // 4. Strip leading/trailing punctuation noise
  v = v.replace(/^[\s\-.,;:'"()\[\]]+/, "").replace(/[\s\-.,;:'"()\[\]]+$/, "");

  // 5. Normalize whitespace and lowercase
  return v.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Result of a Thai name comparison used during duplicate assessment.
 *
 *  - EXACT        — Normalized forms are identical.
 *  - CLOSE        — One name is a prefix of the other (≥4 chars): covers OCR truncation.
 *  - DIFFERENT    — Names are clearly different after normalization.
 *  - INSUFFICIENT — At least one normalized name is empty; cannot compare.
 */
export type ThaiNameCompareResult = "EXACT" | "CLOSE" | "DIFFERENT" | "INSUFFICIENT";

/**
 * Compare two raw OCR-extracted Thai names for duplicate-assessment purposes.
 *
 * Both values are normalized via normalizeThaiNameForCompare before comparison.
 * The comparison is conservative: CLOSE is only returned for genuine OCR truncation
 * (one name is a full prefix of the other, min 4 chars), not for arbitrary partial
 * matches. EXACT and CLOSE are both treated as "same person" by the caller; only
 * DIFFERENT raises a conflict.
 *
 * @param a - Raw stored OCR name value from one document.
 * @param b - Raw stored OCR name value from another document.
 */
export function compareThaiNames(a: string | null, b: string | null): ThaiNameCompareResult {
  const na = normalizeThaiNameForCompare(a);
  const nb = normalizeThaiNameForCompare(b);

  if (!na || !nb) return "INSUFFICIENT";
  if (na === nb) return "EXACT";

  // Conservative prefix check: one name is a prefix of the other (OCR truncation).
  // Require the shorter form to be at least 4 chars to avoid spurious micro-prefix matches.
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (shorter.length >= 4 && longer.startsWith(shorter)) return "CLOSE";

  return "DIFFERENT";
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
