// File Requests API Route - Hardened & Secure
import { Hono } from 'hono';
import { z } from 'zod';
import {
  generateId,
  generateShortCode,
  generateSecretToken,
  sha256,
  hashPassword,
  verifyPassword,
  timingSafeEqual
} from '../services/crypto.js';

const app = new Hono();

const createRequestSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  password: z.string().max(128).optional(),
  expiration_hours: z.enum(['1', '6', '24', '168']).or(z.number()).default(24),
  max_submissions: z.number().int().min(1).max(100).optional()
});

// POST /api/requests - Create a new file request drop
app.post('/', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.format() }, 400);
  }

  const data = parsed.data;
  const now = Math.floor(Date.now() / 1000);
  const expirationHours = Number(data.expiration_hours) || 24;
  const expiresAt = now + (expirationHours * 3600);

  const requestId = generateId();
  const shortCode = generateShortCode(6);
  const requesterToken = generateSecretToken();
  const requesterTokenHash = await sha256(requesterToken);

  let passwordHash = null;
  let passwordSalt = null;
  if (data.password && typeof data.password === 'string' && data.password.trim().length > 0) {
    const hashed = await hashPassword(data.password.trim());
    passwordHash = hashed.hash;
    passwordSalt = hashed.salt;
  }

  await db.prepare(
    `INSERT INTO file_requests (
      id, short_code, requester_token_hash, title, description,
      password_hash, password_salt, max_submissions, submission_count,
      status, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?)`
  ).bind(
    requestId,
    shortCode,
    requesterTokenHash,
    data.title,
    data.description || null,
    passwordHash,
    passwordSalt,
    data.max_submissions || null,
    expiresAt,
    now
  ).run();

  return c.json({
    id: requestId,
    short_code: shortCode,
    requester_token: requesterToken,
    has_password: Boolean(passwordHash),
    title: data.title,
    description: data.description || null,
    expires_at: expiresAt,
    created_at: now
  }, 201);
});

// GET /api/requests/:identifier - Public view for uploaders
// STRICT SECURITY REQUIREMENT: Never exposes past submissions or files!
app.get('/:identifier', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const identifier = c.req.param('identifier');
  const now = Math.floor(Date.now() / 1000);

  const request = await db.prepare(
    `SELECT id, short_code, title, description, password_hash, max_submissions, submission_count, status, expires_at, created_at
     FROM file_requests WHERE (id = ? OR short_code = ? COLLATE NOCASE)`
  ).bind(identifier, identifier).first();

  if (!request) {
    return c.json({ error: 'File request not found' }, 404);
  }

  if (request.status === 'closed') {
    return c.json({ error: 'This file request has been closed by the requester' }, 410);
  }

  if (request.status === 'expired' || now >= request.expires_at) {
    return c.json({ error: 'This file request has expired' }, 410);
  }

  if (request.max_submissions && request.submission_count >= request.max_submissions) {
    return c.json({ error: 'Maximum submissions limit reached for this request' }, 410);
  }

  return c.json({
    id: request.id,
    short_code: request.short_code,
    title: request.title,
    description: request.description,
    has_password: Boolean(request.password_hash),
    submission_count: request.submission_count,
    expires_at: request.expires_at,
    status: request.status
  });
});

// POST /api/requests/:identifier/submissions - Public uploader creates a submission
app.post('/:identifier/submissions', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const identifier = c.req.param('identifier');
  const now = Math.floor(Date.now() / 1000);

  const request = await db.prepare(
    `SELECT * FROM file_requests WHERE (id = ? OR short_code = ? COLLATE NOCASE)`
  ).bind(identifier, identifier).first();

  if (!request || request.status !== 'active' || now >= request.expires_at) {
    return c.json({ error: 'File request is no longer accepting uploads' }, 410);
  }

  let body = {};
  try {
    body = await c.req.json();
  } catch (e) {}

  // Password check if required
  if (request.password_hash) {
    const password = body.password;
    if (!password) {
      return c.json({ error: 'Password required to submit files' }, 401);
    }
    const isValid = await verifyPassword(password, request.password_salt, request.password_hash);
    if (!isValid) {
      return c.json({ error: 'Incorrect request password' }, 401);
    }
  }

  const submissionId = generateId();
  await db.prepare(
    `INSERT INTO file_request_submissions (id, request_id, submitter_note, file_count, total_size, created_at)
     VALUES (?, ?, ?, 0, 0, ?)`
  ).bind(submissionId, request.id, body.note || null, now).run();

  await db.prepare(
    `UPDATE file_requests SET submission_count = submission_count + 1 WHERE id = ?`
  ).bind(request.id).run();

  return c.json({
    submission_id: submissionId,
    request_id: request.id,
    message: 'Submission session initialized'
  }, 201);
});

// GET /api/requests/:id/manage - Requester management dashboard (requires X-Requester-Token)
app.get('/:id/manage', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const id = c.req.param('id');
  const requesterToken = c.req.header('X-Requester-Token') || c.req.query('key');
  if (!requesterToken) {
    return c.json({ error: 'Missing requester management token' }, 401);
  }

  const tokenHash = await sha256(requesterToken);
  const request = await db.prepare(
    `SELECT * FROM file_requests WHERE id = ?`
  ).bind(id).first();

  if (!request) {
    return c.json({ error: 'File request not found' }, 404);
  }

  if (!timingSafeEqual(request.requester_token_hash, tokenHash)) {
    return c.json({ error: 'Invalid requester management token' }, 403);
  }

  // Fetch submissions and files
  const submissionsQuery = await db.prepare(
    `SELECT * FROM file_request_submissions WHERE request_id = ? ORDER BY created_at DESC`
  ).bind(id).all();

  const submissions = submissionsQuery.results || [];

  for (const sub of submissions) {
    const filesQuery = await db.prepare(
      `SELECT id, original_filename, safe_filename, file_size, mime_type, sha256_hash, download_count, created_at
       FROM transfer_files WHERE submission_id = ?`
    ).bind(sub.id).all();
    sub.files = filesQuery.results || [];
  }

  return c.json({
    request: {
      id: request.id,
      short_code: request.short_code,
      title: request.title,
      description: request.description,
      status: request.status,
      expires_at: request.expires_at,
      created_at: request.created_at,
      submission_count: request.submission_count
    },
    submissions
  });
});

// POST /api/requests/:id/close - Close request
app.post('/:id/close', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const id = c.req.param('id');
  const requesterToken = c.req.header('X-Requester-Token') || c.req.query('key');
  if (!requesterToken) return c.json({ error: 'Missing requester token' }, 401);

  const tokenHash = await sha256(requesterToken);
  const request = await db.prepare(`SELECT * FROM file_requests WHERE id = ?`).bind(id).first();
  if (!request || !timingSafeEqual(request.requester_token_hash, tokenHash)) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  await db.prepare(`UPDATE file_requests SET status = 'closed' WHERE id = ?`).bind(id).run();
  return c.json({ success: true, message: 'File request closed' });
});

// DELETE /api/requests/:id - Delete request and all files
app.delete('/:id', async (c) => {
  const db = c.env.DB;
  const bucket = c.env.BUCKET;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const id = c.req.param('id');
  const requesterToken = c.req.header('X-Requester-Token') || c.req.query('key');
  if (!requesterToken) return c.json({ error: 'Missing requester token' }, 401);

  const tokenHash = await sha256(requesterToken);
  const request = await db.prepare(`SELECT * FROM file_requests WHERE id = ?`).bind(id).first();
  if (!request || !timingSafeEqual(request.requester_token_hash, tokenHash)) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const filesQuery = await db.prepare(
    `SELECT tf.id, tf.r2_key FROM transfer_files tf
     JOIN file_request_submissions frs ON tf.submission_id = frs.id
     WHERE frs.request_id = ?`
  ).bind(id).all();

  const files = filesQuery.results || [];
  for (const file of files) {
    try {
      if (bucket && file.r2_key) {
        await bucket.delete(file.r2_key);
      }
    } catch (e) {
      console.error('Failed to delete submission file:', e);
    }
  }

  await db.prepare(`DELETE FROM file_requests WHERE id = ?`).bind(id).run();
  return c.json({ success: true, message: 'File request and all submissions permanently deleted' });
});

export default app;
