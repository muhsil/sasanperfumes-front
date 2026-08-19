/**
 * WordPress only accepts usernames that survive `sanitize_user($value, true)`,
 * which keeps letters, digits and `_ . - @`. The storefront registers customers
 * with their email as the username, so a plus-addressed email such as
 * `name+tag@example.com` fails `validate_username()` and WooCommerce answers
 * with "Please provide a valid account username."
 *
 * Normalising here keeps registration working regardless of the plugin version
 * installed on the CMS.
 */
const WP_DISALLOWED_USERNAME_CHARS = /[^A-Za-z0-9_.\-@]/g;

export function toWordPressUsername(value: string): string {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/%[0-9a-f]{2}/gi, "")
    .replace(WP_DISALLOWED_USERNAME_CHARS, "")
    .trim();
}

export function isValidWordPressUsername(value: string): boolean {
  const trimmed = String(value || "").trim();
  return trimmed !== "" && toWordPressUsername(trimmed) === trimmed;
}

/**
 * Stable short digest so an email whose local part has no usable characters
 * (non-Latin scripts, for example) still maps to its own username instead of
 * colliding with every other customer on the same domain.
 */
function shortDigest(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash * 33) ^ value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Builds a username WordPress accepts, preferring the supplied username and
 * falling back to the email.
 */
export function resolveWordPressUsername(username: string, email: string): string {
  const candidate = String(username || "").trim() || String(email || "").trim();
  if (candidate === "") return "customer";

  const separator = candidate.lastIndexOf("@");
  if (separator > 0) {
    const local = toWordPressUsername(candidate.slice(0, separator));
    const domain = toWordPressUsername(candidate.slice(separator + 1));
    if (local !== "") {
      return domain !== "" ? `${local}@${domain}` : local;
    }
    return `customer-${shortDigest(candidate.toLowerCase())}`;
  }

  const sanitized = toWordPressUsername(candidate);
  return sanitized !== "" ? sanitized : `customer-${shortDigest(candidate.toLowerCase())}`;
}
