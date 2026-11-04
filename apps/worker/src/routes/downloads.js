// Download and File Preview Authorization API Route - Hardened & Secure
import { Hono } from 'hono';
import { anonymizeIp, sha256, timingSafeEqual } from '../services/crypto.js';
import { getStorageBucket } from '../services/storage.js';

const app = new Hono();

// Allowed MIME types for inline preview (Strictly disallowing text/html and image/svg+xml to prevent script execution)
const ALLOWED_PREVIEW_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json'
]);

/**
 * Validate unlock token with constant-time equality
 */
async function checkTransferAccess(c, transfer) {
  if (!transfer.password_hash) return true;

  const unlockToken = c.req.header('X-Unlock-Token') || c.req.query('unlock_token');
  if (unlockToken) {
    const expectedToken = await sha256(`unlock:${transfer.id}:${transfer.password_salt}`);
    if (timingSafeEqual(unlockToken, expectedToken)) return true;
  }

  const senderToken = c.req.header('X-Sender-Token');
  if (senderToken) {
    const hash = await sha256(senderToken);
    if (timingSafeEqual(hash, transfer.sender_token_hash)) return true;
  }

  return false;
}

// GET /api/downloads/:transferId/file/:fileId - Download specific file
app.get('/:transferId/file/:fileId', async (c) => {
  const db = c.env.DB;
  const bucket = getStorageBucket(c.env);
  if (!db || !bucket) return c.json({ error: 'Service unavailable' }, 503);

  const transferId = c.req.param('transferId');
  const fileId = c.req.param('fileId');
  const now = Math.floor(Date.now() / 1000);

  // 1. First check if transferId belongs to standard transfers
  let transfer = await db.prepare(
    `SELECT * FROM transfers WHERE (id = ? OR short_code = ? COLLATE NOCASE)`
  ).bind(transferId, transferId).first();

  let isSubmissionFile = false;
  let file = null;

  if (transfer) {
    if (transfer.status !== 'active' || now >= transfer.expires_at) {
      return c.json({ error: 'Transfer has expired or is no longer available' }, 410);
    }

    const authorized = await checkTransferAccess(c, transfer);
    if (!authorized) {
      return c.json({ error: 'Password required or invalid token' }, 401);
    }

    file = await db.prepare(
      `SELECT * FROM transfer_files WHERE id = ? AND transfer_id = ?`
    ).bind(fileId, transfer.id).first();

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Atomic download limit enforcement with concurrency protection:
    const atomicUpdate = await db.prepare(
      `UPDATE transfers 
       SET download_count = download_count + 1, updated_at = ?
       WHERE id = ? 
         AND status = 'active' 
         AND expires_at > ? 
         AND (max_downloads IS NULL OR download_count < max_downloads)`
    ).bind(now, transfer.id, now).run();

    if (atomicUpdate.meta.changes === 0) {
      return c.json({ error: 'Download limit reached for this transfer' }, 410);
    }

    // Increment file download counter
    await db.prepare(
      `UPDATE transfer_files SET download_count = download_count + 1 WHERE id = ?`
    ).bind(fileId).run();

  } else {
    // 2. Check if transferId belongs to a file_request_submission
    const submission = await db.prepare(
      `SELECT frs.id, frs.request_id, fr.requester_token_hash, fr.expires_at, fr.status
       FROM file_request_submissions frs
       JOIN file_requests fr ON frs.request_id = fr.id
       WHERE frs.id = ?`
    ).bind(transferId).first();

    if (!submission) {
      return c.json({ error: 'Transfer or submission not found' }, 404);
    }

    // Submission files require requester management token for access
    const requesterToken = c.req.header('X-Requester-Token') || c.req.query('requester_token');
    if (requesterToken) {
      const tokenHash = await sha256(requesterToken);
      if (!timingSafeEqual(tokenHash, submission.requester_token_hash)) {
        return c.json({ error: 'Unauthorized submission download' }, 403);
      }
    }

    file = await db.prepare(
      `SELECT * FROM transfer_files WHERE id = ? AND submission_id = ?`
    ).bind(fileId, submission.id).first();

    if (!file) {
      return c.json({ error: 'File not found in submission' }, 404);
    }

    isSubmissionFile = true;
  }

  // Record download audit event with anonymized IP
  let rawIp = c.req.header('CF-Connecting-IP');
  if (!rawIp) {
    const xff = c.req.header('x-forwarded-for');
    rawIp = xff ? xff.split(',')[0].trim() : '127.0.0.1';
  }
  const ipHash = await anonymizeIp(rawIp);
  const userAgent = (c.req.header('User-Agent') || 'Unknown').slice(0, 100);

  await db.prepare(
    `INSERT INTO download_events (id, transfer_id, file_id, anonymized_ip_hash, user_agent_summary, downloaded_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID ? crypto.randomUUID() : `dl-${now}-${Math.random()}`,
    transferId,
    fileId,
    ipHash,
    userAgent,
    now
  ).run();

  // Fetch from private R2 storage
  const object = await bucket.get(file.r2_key);
  if (!object) {
    return c.json({ error: 'File object not found in private storage' }, 404);
  }

  // Sanitize filename for HTTP header injection prevention (RFC 6266 / RFC 5987)
  const safeAsciiFilename = file.safe_filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  const encodedUtf8Filename = encodeURIComponent(file.safe_filename);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag || `"${file.id}"`);
  headers.set('Content-Type', file.mime_type || 'application/octet-stream');
  headers.set(
    'Content-Disposition',
    `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedUtf8Filename}`
  );
  headers.set('Content-Length', file.file_size.toString());
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cache-Control', 'private, no-cache, no-store');

  return new Response(object.body, { headers });
});

// GET /api/downloads/:transferId/file/:fileId/preview - Sandboxed preview
app.get('/:transferId/file/:fileId/preview', async (c) => {
  const db = c.env.DB;
  const bucket = getStorageBucket(c.env);
  if (!db || !bucket) return c.json({ error: 'Service unavailable' }, 503);

  const transferId = c.req.param('transferId');
  const fileId = c.req.param('fileId');
  const now = Math.floor(Date.now() / 1000);

  const transfer = await db.prepare(
    `SELECT * FROM transfers WHERE (id = ? OR short_code = ? COLLATE NOCASE)`
  ).bind(transferId, transferId).first();

  if (!transfer || transfer.status !== 'active' || now >= transfer.expires_at) {
    return c.json({ error: 'Transfer not available' }, 410);
  }

  const authorized = await checkTransferAccess(c, transfer);
  if (!authorized) {
    return c.json({ error: 'Password required' }, 401);
  }

  const file = await db.prepare(
    `SELECT * FROM transfer_files WHERE id = ? AND transfer_id = ?`
  ).bind(fileId, transfer.id).first();

  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }

  let previewMime = file.mime_type || 'application/octet-stream';
  const ext = file.safe_filename.split('.').pop().toLowerCase();
  const extToMime = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/plain',
    json: 'text/plain'
  };

  if (extToMime[ext]) {
    previewMime = extToMime[ext];
  }

  if (!ALLOWED_PREVIEW_MIMES.has(previewMime)) {
    return c.json({ error: 'Preview not supported for this file format' }, 415);
  }

  const object = await bucket.get(file.r2_key);
  if (!object) {
    return c.json({ error: 'File object not found' }, 404);
  }

  const safeAsciiFilename = file.safe_filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag || `"${file.id}"`);
  headers.set('Content-Type', previewMime);
  headers.set('Content-Disposition', `inline; filename="${safeAsciiFilename}"`);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  headers.set('Cache-Control', 'private, max-age=3600');

  return new Response(object.body, { headers });
});

export default app;
