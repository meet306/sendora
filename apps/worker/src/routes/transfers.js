// Transfers API Route - Hardened & Secure
import { Hono } from 'hono';
import { z } from 'zod';
import {
  generateId,
  generateShortCode,
  generateSecretToken,
  sha256,
  hashPassword,
  verifyPassword,
  timingSafeEqual,
  anonymizeIp
} from '../services/crypto.js';
import { checkRateLimit, resetRateLimit } from '../middleware/rateLimit.js';

const app = new Hono();

// Validation schema for creating a transfer
const createTransferSchema = z.object({
  title: z.string().max(100).optional(),
  message: z.string().max(1000).optional(),
  transfer_type: z.enum(['standard', 'clipboard']).default('standard'),
  clipboard_text: z.string().max(50000).optional(),
  password: z.string().max(128).optional(),
  expiration_hours: z.enum(['1', '6', '24', '168']).or(z.number()).default(24),
  max_downloads: z.union([z.literal(1), z.literal(5), z.literal(10), z.null()]).optional()
});

/**
 * Generate deterministic unlock token for authorized sessions
 */
async function generateUnlockToken(transferId, salt) {
  return sha256(`unlock:${transferId}:${salt}`);
}

// POST /api/transfers - Create transfer metadata
app.post('/', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const parsed = createTransferSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.format() }, 400);
  }

  const data = parsed.data;
  const now = Math.floor(Date.now() / 1000);
  const expirationHours = Number(data.expiration_hours) || 24;
  const expiresAt = now + (expirationHours * 3600);

  const transferId = generateId();
  const shortCode = generateShortCode(6);
  const senderToken = generateSecretToken();
  const senderTokenHash = await sha256(senderToken);

  let passwordHash = null;
  let passwordSalt = null;
  // Explicitly check that password is non-empty after trimming
  if (data.password && typeof data.password === 'string' && data.password.trim().length > 0) {
    const hashed = await hashPassword(data.password.trim());
    passwordHash = hashed.hash;
    passwordSalt = hashed.salt;
  }

  let rawIp = c.req.header('CF-Connecting-IP');
  if (!rawIp) {
    const xff = c.req.header('x-forwarded-for');
    rawIp = xff ? xff.split(',')[0].trim() : '127.0.0.1';
  }
  const ipHash = await anonymizeIp(rawIp);

  await db.prepare(
    `INSERT INTO transfers (
      id, short_code, sender_token_hash, password_hash, password_salt,
      title, message, transfer_type, clipboard_text, total_size, file_count,
      max_downloads, download_count, status, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 'active', ?, ?, ?)`
  ).bind(
    transferId,
    shortCode,
    senderTokenHash,
    passwordHash,
    passwordSalt,
    data.title || null,
    data.message || null,
    data.transfer_type,
    data.clipboard_text || null,
    data.max_downloads !== undefined ? data.max_downloads : null,
    expiresAt,
    now,
    now
  ).run();

  // Audit log
  await db.prepare(
    `INSERT INTO audit_logs (id, event_type, actor_type, actor_id, metadata_json, ip_hash, created_at)
     VALUES (?, 'transfer_created', 'user', ?, ?, ?, ?)`
  ).bind(
    generateId(),
    transferId,
    JSON.stringify({ type: data.transfer_type, expiresAt, hasPassword: Boolean(passwordHash) }),
    ipHash,
    now
  ).run();

  return c.json({
    id: transferId,
    short_code: shortCode,
    sender_token: senderToken,
    has_password: Boolean(passwordHash),
    transfer_type: data.transfer_type,
    title: data.title || null,
    message: data.message || null,
    clipboard_text: data.clipboard_text || null,
    expires_at: expiresAt,
    max_downloads: data.max_downloads || null,
    created_at: now
  }, 201);
});

// GET /api/transfers/:identifier - Lookup transfer by ID or Short Code
app.get('/:identifier', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const identifier = c.req.param('identifier');
  const now = Math.floor(Date.now() / 1000);

  // Rate limit short code enumeration
  const rate = await checkRateLimit(c, 'lookup', identifier, 20, 60);
  if (!rate.allowed) {
    return c.json({
      error: 'Too many lookup requests. Please wait.',
      retry_after: rate.retryAfter
    }, 429);
  }

  const transfer = await db.prepare(
    `SELECT * FROM transfers WHERE (id = ? OR short_code = ? COLLATE NOCASE)`
  ).bind(identifier, identifier).first();

  if (!transfer) {
    return c.json({ error: 'Transfer not found or has been removed' }, 404);
  }

  // Check expiration
  if (transfer.status === 'expired' || now >= transfer.expires_at) {
    if (transfer.status !== 'expired') {
      await db.prepare(`UPDATE transfers SET status = 'expired' WHERE id = ?`).bind(transfer.id).run();
    }
    return c.json({ error: 'This transfer has expired and is no longer accessible' }, 410);
  }

  // Check deletion
  if (transfer.status === 'deleted') {
    return c.json({ error: 'This transfer was deleted by the sender' }, 410);
  }

  // Check download limit
  if (transfer.max_downloads !== null && transfer.download_count >= transfer.max_downloads) {
    return c.json({ error: 'Download limit has been reached for this transfer' }, 410);
  }

  const hasPassword = Boolean(transfer.password_hash);
  let isAuthorized = !hasPassword;

  // Check for unlock token in headers
  if (hasPassword) {
    const unlockToken = c.req.header('X-Unlock-Token');
    if (unlockToken) {
      const expectedToken = await generateUnlockToken(transfer.id, transfer.password_salt);
      if (timingSafeEqual(unlockToken, expectedToken)) {
        isAuthorized = true;
      }
    }
  }

  // Check if caller is sender (providing X-Sender-Token)
  const senderToken = c.req.header('X-Sender-Token');
  let isSender = false;
  if (senderToken) {
    const hash = await sha256(senderToken);
    if (timingSafeEqual(hash, transfer.sender_token_hash)) {
      isSender = true;
      isAuthorized = true; // Senders bypass password requirement
    }
  }

  // If password protected and not authorized, NEVER expose file metadata (Strict Requirement 4.C)
  if (hasPassword && !isAuthorized) {
    return c.json({
      id: transfer.id,
      short_code: transfer.short_code,
      title: transfer.title,
      has_password: true,
      requires_password: true,
      transfer_type: transfer.transfer_type,
      total_size: transfer.total_size,
      file_count: transfer.file_count,
      expires_at: transfer.expires_at,
      status: transfer.status
    });
  }

  // Fetch files
  const filesQuery = await db.prepare(
    `SELECT id, original_filename, safe_filename, file_size, mime_type, sha256_hash, download_count, created_at 
     FROM transfer_files WHERE transfer_id = ?`
  ).bind(transfer.id).all();

  return c.json({
    id: transfer.id,
    short_code: transfer.short_code,
    title: transfer.title,
    message: transfer.message,
    transfer_type: transfer.transfer_type,
    clipboard_text: transfer.clipboard_text,
    has_password: hasPassword,
    requires_password: false,
    total_size: transfer.total_size,
    file_count: transfer.file_count,
    max_downloads: transfer.max_downloads,
    download_count: transfer.download_count,
    expires_at: transfer.expires_at,
    created_at: transfer.created_at,
    status: transfer.status,
    is_sender: isSender,
    files: filesQuery.results || []
  });
});

// POST /api/transfers/:identifier/unlock - Verify password
app.post('/:identifier/unlock', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const identifier = c.req.param('identifier');
  const rate = await checkRateLimit(c, 'password_guess', identifier, 5, 900);
  if (!rate.allowed) {
    return c.json({
      error: 'Too many incorrect attempts. Please wait before retrying.',
      retry_after: rate.retryAfter
    }, 429);
  }

  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const password = body.password;
  if (!password || typeof password !== 'string') {
    return c.json({ error: 'Password required' }, 400);
  }

  const transfer = await db.prepare(
    `SELECT id, password_hash, password_salt, expires_at, status FROM transfers WHERE (id = ? OR short_code = ? COLLATE NOCASE)`
  ).bind(identifier, identifier).first();

  if (!transfer || transfer.status !== 'active') {
    return c.json({ error: 'Invalid transfer or incorrect password' }, 401);
  }

  const isValid = await verifyPassword(password, transfer.password_salt, transfer.password_hash);
  if (!isValid) {
    return c.json({
      error: 'Invalid password. Please check and try again.',
      remaining_attempts: rate.remainingAttempts
    }, 401);
  }

  // Reset rate limit on success
  await resetRateLimit(c, 'password_guess', identifier);

  const unlockToken = await generateUnlockToken(transfer.id, transfer.password_salt);
  return c.json({
    success: true,
    unlock_token: unlockToken
  });
});

// DELETE /api/transfers/:id - Early deletion by sender
app.delete('/:id', async (c) => {
  const db = c.env.DB;
  const bucket = c.env.BUCKET;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const id = c.req.param('id');
  const senderToken = c.req.header('X-Sender-Token');
  if (!senderToken) {
    return c.json({ error: 'Missing management token' }, 401);
  }

  const senderTokenHash = await sha256(senderToken);

  const transfer = await db.prepare(
    `SELECT id, sender_token_hash, status FROM transfers WHERE id = ?`
  ).bind(id).first();

  if (!transfer) {
    return c.json({ error: 'Transfer not found' }, 404);
  }

  if (!timingSafeEqual(transfer.sender_token_hash, senderTokenHash)) {
    return c.json({ error: 'Unauthorized management token' }, 403);
  }

  // Delete associated physical R2 files
  const filesQuery = await db.prepare(
    `SELECT id, r2_key FROM transfer_files WHERE transfer_id = ?`
  ).bind(id).all();

  const files = filesQuery.results || [];
  for (const file of files) {
    try {
      if (bucket && file.r2_key) {
        await bucket.delete(file.r2_key);
      }
    } catch (e) {
      console.error(`Failed to delete R2 object ${file.r2_key}:`, e);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    `UPDATE transfers SET status = 'deleted', updated_at = ? WHERE id = ?`
  ).bind(now, id).run();

  await db.prepare(
    `DELETE FROM transfer_files WHERE transfer_id = ?`
  ).bind(id).run();

  // Audit log
  await db.prepare(
    `INSERT INTO audit_logs (id, event_type, actor_type, actor_id, metadata_json, ip_hash, created_at)
     VALUES (?, 'transfer_deleted_by_sender', 'user', ?, ?, 'sender', ?)`
  ).bind(generateId(), id, JSON.stringify({ fileCount: files.length }), now).run();

  return c.json({ success: true, message: 'Transfer deleted immediately' });
});

export default app;
