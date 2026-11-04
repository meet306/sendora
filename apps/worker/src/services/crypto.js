// Web Crypto API service for Cloudflare Workers & Node environments
// Uses standard crypto.subtle - 100% JavaScript, zero external dependencies

/**
 * Generate a cryptographically secure random hexadecimal or alphanumeric string
 * @param {number} bytes
 * @returns {string}
 */
export function generateRandomHex(bytes = 16) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a UUID v4
 * @returns {string}
 */
export function generateId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Generate a human-friendly short code (e.g. SND-8492 or K7M2XP)
 * Uses high-entropy unguessable characters, omitting ambiguous characters (0, O, 1, I, L)
 * @param {number} length
 * @returns {string}
 */
export function generateShortCode(length = 6) {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

/**
 * Generate a high-entropy secret management token
 * @returns {string}
 */
export function generateSecretToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate SHA-256 hash of a string
 * @param {string} input
 * @returns {Promise<string>}
 */
export async function sha256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password with salt using PBKDF2 (100,000 iterations, SHA-256)
 * Safe and fast within Cloudflare Workers CPU limits
 * @param {string} password
 * @param {string} [existingSalt]
 * @returns {Promise<{ hash: string, salt: string }>}
 */
export async function hashPassword(password, existingSalt = null) {
  const encoder = new TextEncoder();
  const salt = existingSalt || generateRandomHex(16);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { hash, salt };
}

/**
 * Constant-time comparison to prevent timing attacks
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify a password against a stored PBKDF2 hash and salt
 * @param {string} password
 * @param {string} salt
 * @param {string} expectedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, salt, expectedHash) {
  if (!password || !salt || !expectedHash) return false;
  const { hash } = await hashPassword(password, salt);
  return timingSafeEqual(hash, expectedHash);
}

/**
 * Anonymize client IP address for privacy-preserving rate limiting and audit logs
 * Never stores raw IP in plaintext
 * @param {string} ip
 * @returns {Promise<string>}
 */
export async function anonymizeIp(ip) {
  if (!ip) return '0000000000000000000000000000000000000000000000000000000000000000';
  // Strip last subnet / host octet and hash
  const parts = ip.split('.');
  let sanitized = ip;
  if (parts.length === 4) {
    sanitized = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  return sha256(`sendora-ip-salt:${sanitized}`);
}

/**
 * Clean and sanitize filenames to prevent path traversal, control character injection, or XSS
 * @param {string} filename
 * @returns {string}
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'unnamed-file';
  // Remove path separators and null bytes
  let safe = filename
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/\0/g, '')
    .trim();

  // Strip dangerous control chars and non-printable characters
  safe = safe.replace(/[\x00-\x1F\x7F<>:"/\\|?*]/g, '_');

  // Prevent dot-dot attacks
  safe = safe.replace(/^\.+/, '');
  if (!safe) safe = 'unnamed-file';

  // Limit filename length to 255 chars
  if (safe.length > 255) {
    const extIndex = safe.lastIndexOf('.');
    if (extIndex > 0 && safe.length - extIndex < 15) {
      const ext = safe.slice(extIndex);
      safe = safe.slice(0, 255 - ext.length) + ext;
    } else {
      safe = safe.slice(0, 255);
    }
  }

  return safe;
}
