// Multipart Upload Lifecycle API Route - Hardened
import { Hono } from 'hono';
import { z } from 'zod';
import { generateId, sanitizeFilename } from '../services/crypto.js';
import { getPresignedR2Url, hasDirectR2Credentials } from '../services/r2.js';

const app = new Hono();

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB maximum
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

const initiateSchema = z.object({
  transfer_id: z.string().optional(),
  submission_id: z.string().optional(),
  filename: z.string().min(1).max(255),
  file_size: z.number().int().min(1).max(MAX_FILE_SIZE),
  mime_type: z.string().optional(),
  sha256_hash: z.string().optional()
});

// POST /api/uploads/initiate - Start a multipart upload session
app.post('/initiate', async (c) => {
  const db = c.env.DB;
  const bucket = c.env.BUCKET;
  if (!db || !bucket) return c.json({ error: 'Storage or Database unavailable' }, 503);

  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const parsed = initiateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({
      error: 'Invalid file upload parameters',
      details: parsed.error.format()
    }, 400);
  }

  const { transfer_id, submission_id, filename, file_size, mime_type, sha256_hash } = parsed.data;

  if (!transfer_id && !submission_id) {
    return c.json({ error: 'Either transfer_id or submission_id must be provided' }, 400);
  }

  // Verify parent entity exists and is still active
  if (transfer_id) {
    const transfer = await db.prepare(
      `SELECT id, status, expires_at FROM transfers WHERE id = ?`
    ).bind(transfer_id).first();

    if (!transfer || transfer.status !== 'active') {
      return c.json({ error: 'Transfer not active or expired' }, 400);
    }
  }

  const safeName = sanitizeFilename(filename);
  const fileUuid = generateId();
  const parentFolder = transfer_id || submission_id;
  const r2Key = `transfers/${parentFolder}/${fileUuid}-${safeName}`;

  // Calculate chunks
  const totalParts = Math.max(1, Math.ceil(file_size / CHUNK_SIZE));
  const now = Math.floor(Date.now() / 1000);
  const sessionExpiresAt = now + (24 * 3600); // 24 hours to complete upload

  // Create R2 multipart upload
  let multipartUpload;
  try {
    multipartUpload = await bucket.createMultipartUpload(r2Key, {
      httpMetadata: {
        contentType: mime_type || 'application/octet-stream',
        contentDisposition: `attachment; filename="${safeName}"`
      }
    });
  } catch (err) {
    return c.json({ error: `Failed to initiate R2 multipart upload: ${err.message}` }, 500);
  }

  const sessionId = generateId();

  await db.prepare(
    `INSERT INTO upload_sessions (
      id, transfer_id, submission_id, r2_upload_id, r2_key,
      filename, file_size, chunk_size, total_parts,
      completed_parts_json, status, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'initiated', ?, ?)`
  ).bind(
    sessionId,
    transfer_id || null,
    submission_id || null,
    multipartUpload.uploadId,
    r2Key,
    safeName,
    file_size,
    CHUNK_SIZE,
    totalParts,
    sessionExpiresAt,
    now
  ).run();

  const isDirectS3 = hasDirectR2Credentials(c.env);

  return c.json({
    upload_id: sessionId,
    r2_upload_id: multipartUpload.uploadId,
    r2_key: r2Key,
    filename: safeName,
    file_size,
    chunk_size: CHUNK_SIZE,
    total_parts: totalParts,
    direct_s3: isDirectS3
  });
});

// GET /api/uploads/:uploadId/part/:partNumber/sign - Sign part for direct upload or route
app.get('/:uploadId/part/:partNumber/sign', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const uploadId = c.req.param('uploadId');
  const partNumber = parseInt(c.req.param('partNumber'), 10);

  if (isNaN(partNumber) || partNumber < 1) {
    return c.json({ error: 'Invalid part number' }, 400);
  }

  const session = await db.prepare(
    `SELECT * FROM upload_sessions WHERE id = ?`
  ).bind(uploadId).first();

  if (!session || session.status === 'completed' || session.status === 'aborted') {
    return c.json({ error: 'Upload session not found or closed' }, 404);
  }

  if (hasDirectR2Credentials(c.env)) {
    try {
      const presignedUrl = await getPresignedR2Url({
        accountId: c.env.R2_ACCOUNT_ID,
        accessKeyId: c.env.R2_ACCESS_KEY_ID,
        secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
        bucketName: c.env.R2_BUCKET_NAME,
        key: session.r2_key,
        method: 'PUT',
        expiresIn: 900,
        queryParams: {
          partNumber: partNumber.toString(),
          uploadId: session.r2_upload_id
        }
      });

      return c.json({
        url: presignedUrl,
        method: 'PUT',
        partNumber,
        direct: true
      });
    } catch (e) {
      console.warn('Presigning fallback to worker proxy:', e.message);
    }
  }

  // Fallback to Worker streaming chunk proxy
  return c.json({
    url: `/api/uploads/${uploadId}/part/${partNumber}`,
    method: 'PUT',
    partNumber,
    direct: false
  });
});

// PUT /api/uploads/:uploadId/part/:partNumber - Worker streaming chunk upload
app.put('/:uploadId/part/:partNumber', async (c) => {
  const db = c.env.DB;
  const bucket = c.env.BUCKET;
  if (!db || !bucket) return c.json({ error: 'Service unavailable' }, 503);

  const uploadId = c.req.param('uploadId');
  const partNumber = parseInt(c.req.param('partNumber'), 10);

  const session = await db.prepare(
    `SELECT * FROM upload_sessions WHERE id = ?`
  ).bind(uploadId).first();

  if (!session || session.status === 'completed' || session.status === 'aborted') {
    return c.json({ error: 'Invalid upload session' }, 404);
  }

  try {
    const upload = bucket.resumeMultipartUpload(session.r2_key, session.r2_upload_id);
    const body = c.req.raw.body;
    if (!body) {
      return c.json({ error: 'Missing binary body' }, 400);
    }

    const uploadedPart = await upload.uploadPart(partNumber, body);

    return c.json({
      partNumber,
      etag: uploadedPart.etag
    });
  } catch (err) {
    return c.json({ error: `Upload part failed: ${err.message}` }, 500);
  }
});

// POST /api/uploads/:uploadId/complete - Finalize multipart upload
app.post('/:uploadId/complete', async (c) => {
  const db = c.env.DB;
  const bucket = c.env.BUCKET;
  if (!db || !bucket) return c.json({ error: 'Service unavailable' }, 503);

  const uploadId = c.req.param('uploadId');
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const { parts, sha256_hash } = body;
  if (!Array.isArray(parts) || parts.length === 0) {
    return c.json({ error: 'Missing or empty parts array' }, 400);
  }

  const session = await db.prepare(
    `SELECT * FROM upload_sessions WHERE id = ?`
  ).bind(uploadId).first();

  if (!session || session.status === 'completed') {
    return c.json({ error: 'Upload session already finalized or not found' }, 400);
  }

  try {
    const upload = bucket.resumeMultipartUpload(session.r2_key, session.r2_upload_id);
    const sortedParts = parts.slice().sort((a, b) => a.partNumber - b.partNumber);
    await upload.complete(sortedParts);
  } catch (err) {
    return c.json({ error: `R2 Complete Multipart failed: ${err.message}` }, 500);
  }

  const now = Math.floor(Date.now() / 1000);
  const fileId = generateId();

  // Insert into transfer_files
  await db.prepare(
    `INSERT INTO transfer_files (
      id, transfer_id, submission_id, r2_key, original_filename,
      safe_filename, file_size, mime_type, sha256_hash, download_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'application/octet-stream', ?, 0, ?)`
  ).bind(
    fileId,
    session.transfer_id,
    session.submission_id,
    session.r2_key,
    session.filename,
    session.filename,
    session.file_size,
    sha256_hash || null,
    now
  ).run();

  // Update parent transfer or submission stats
  if (session.transfer_id) {
    await db.prepare(
      `UPDATE transfers 
       SET total_size = total_size + ?, file_count = file_count + 1, updated_at = ? 
       WHERE id = ?`
    ).bind(session.file_size, now, session.transfer_id).run();
  } else if (session.submission_id) {
    await db.prepare(
      `UPDATE file_request_submissions 
       SET total_size = total_size + ?, file_count = file_count + 1 
       WHERE id = ?`
    ).bind(session.file_size, session.submission_id).run();
  }

  await db.prepare(
    `UPDATE upload_sessions SET status = 'completed' WHERE id = ?`
  ).bind(uploadId).run();

  return c.json({
    success: true,
    file: {
      id: fileId,
      filename: session.filename,
      file_size: session.file_size,
      sha256_hash: sha256_hash || null
    }
  });
});

// POST /api/uploads/:uploadId/abort - Cancel multipart upload
app.post('/:uploadId/abort', async (c) => {
  const db = c.env.DB;
  const bucket = c.env.BUCKET;
  if (!db || !bucket) return c.json({ error: 'Service unavailable' }, 503);

  const uploadId = c.req.param('uploadId');
  const session = await db.prepare(
    `SELECT * FROM upload_sessions WHERE id = ?`
  ).bind(uploadId).first();

  if (!session) {
    return c.json({ error: 'Upload session not found' }, 404);
  }

  try {
    const upload = bucket.resumeMultipartUpload(session.r2_key, session.r2_upload_id);
    if (upload && typeof upload.abort === 'function') {
      await upload.abort();
    }
  } catch (e) {}

  await db.prepare(
    `UPDATE upload_sessions SET status = 'aborted' WHERE id = ?`
  ).bind(uploadId).run();

  return c.json({ success: true, message: 'Upload aborted and cleaned' });
});

export default app;
