/**
 * Phone number normalization utility.
 *
 * Rules:
 * 1. Strip all formatting characters and unicode whitespace
 * 2. Strip leading "00" international prefix
 * 3. If starts with "0", remove leading 0 and prepend country code (defaultCc)
 * 4. If exactly 9 digits, prepend defaultCc
 * 5. GCC country code prefixes: 966, 971, 965, 974, 968, 973
 */

export const GCC_PREFIXES = ["966", "971", "965", "974", "968", "973"];

/**
 * Normalizes a phone number according to the reconciliation rules.
 * @param raw - The raw phone number string
 * @param defaultCc - The default country code to use (e.g., "966")
 * @returns The normalized phone number string
 */
export function normalizePhone(raw: string, defaultCc: string): string {
  if (!raw) return "";

  // Step 1: Strip all non-digit characters (formatting, unicode whitespace, dashes, etc.)
  let phone = raw.replace(/[^\d]/g, "");

  if (!phone) return "";

  // Step 2: Strip leading "00" international prefix
  if (phone.startsWith("00")) {
    phone = phone.slice(2);
  }

  // Step 3: If starts with "0", remove leading 0 and prepend defaultCc
  if (phone.startsWith("0")) {
    phone = defaultCc + phone.slice(1);
  }

  // Step 4: If exactly 9 digits (no country code), prepend defaultCc
  if (phone.length === 9) {
    phone = defaultCc + phone;
  }

  return phone;
}

/**
 * Checks if a phone number has a valid GCC country code prefix.
 */
export function hasGccPrefix(phone: string): boolean {
  return GCC_PREFIXES.some((prefix) => phone.startsWith(prefix));
}

/**
 * Extracts the country code from a normalized phone number.
 * Returns the matching GCC prefix or null if none match.
 */
export function extractCountryCode(phone: string): string | null {
  for (const prefix of GCC_PREFIXES) {
    if (phone.startsWith(prefix)) {
      return prefix;
    }
  }
  return null;
}
