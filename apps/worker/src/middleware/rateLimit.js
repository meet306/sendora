// Rate limiting & Brute-force protection middleware backed by Cloudflare D1
import { anonymizeIp } from '../services/crypto.js';

/**
 * Check rate limit and record attempts
 * @param {object} c - Hono context
 * @param {string} identifierType - e.g. 'short_code', 'password_guess', 'admin_login'
 * @param {string} identifier - unique key e.g. short code or username
 * @param {number} maxAttempts - allowed attempts before lockout (e.g. 5)
 * @param {number} windowSeconds - time window in seconds (e.g. 900 for 15 mins)
 * @returns {Promise<{ allowed: boolean, remainingAttempts: number, retryAfter: number }>}
 */
export async function checkRateLimit(c, identifierType, identifier, maxAttempts = 5, windowSeconds = 900) {
  const db = c.env.DB;
  if (!db) return { allowed: true, remainingAttempts: maxAttempts, retryAfter: 0 };

  const rawIp = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const ipHash = await anonymizeIp(rawIp);
  const now = Math.floor(Date.now() / 1000);

  // Check existing attempt record
  const record = await db.prepare(
    `SELECT attempt_count, last_attempt_at, locked_until 
     FROM lookup_attempts 
     WHERE identifier_type = ? AND identifier = ? AND ip_hash = ?`
  ).bind(identifierType, identifier, ipHash).first();

  if (record) {
    // If currently locked out
    if (record.locked_until && record.locked_until > now) {
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfter: record.locked_until - now
      };
    }

    // If outside the window, reset attempt count
    if (now - record.last_attempt_at > windowSeconds) {
      await db.prepare(
        `UPDATE lookup_attempts 
         SET attempt_count = 1, last_attempt_at = ?, locked_until = 0 
         WHERE identifier_type = ? AND identifier = ? AND ip_hash = ?`
      ).bind(now, identifierType, identifier, ipHash).run();

      return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfter: 0 };
    }

    // Within window, increment count
    const newCount = record.attempt_count + 1;
    let lockedUntil = 0;
    if (newCount >= maxAttempts) {
      // Exponential or progressive lockout (starts at 5 mins, scales up)
      lockedUntil = now + Math.min(windowSeconds, 300 * Math.pow(2, newCount - maxAttempts));
    }

    await db.prepare(
      `UPDATE lookup_attempts 
       SET attempt_count = ?, last_attempt_at = ?, locked_until = ? 
       WHERE identifier_type = ? AND identifier = ? AND ip_hash = ?`
    ).bind(newCount, now, lockedUntil, identifierType, identifier, ipHash).run();

    if (newCount > maxAttempts) {
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfter: lockedUntil - now
      };
    }

    return {
      allowed: true,
      remainingAttempts: Math.max(0, maxAttempts - newCount),
      retryAfter: 0
    };
  }

  // Create first record
  const id = crypto.randomUUID ? crypto.randomUUID() : `att-${now}-${Math.random()}`;
  await db.prepare(
    `INSERT INTO lookup_attempts (id, identifier_type, identifier, ip_hash, attempt_count, last_attempt_at, locked_until)
     VALUES (?, ?, ?, ?, 1, ?, 0)`
  ).bind(id, identifierType, identifier, ipHash, now).run();

  return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfter: 0 };
}

/**
 * Reset rate limit record on successful authentication
 */
export async function resetRateLimit(c, identifierType, identifier) {
  const db = c.env.DB;
  if (!db) return;
  const rawIp = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const ipHash = await anonymizeIp(rawIp);
  await db.prepare(
    `DELETE FROM lookup_attempts WHERE identifier_type = ? AND identifier = ? AND ip_hash = ?`
  ).bind(identifierType, identifier, ipHash).run();
}
