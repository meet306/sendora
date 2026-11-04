// Universal Short Code Lookup Route
import { Hono } from 'hono';
import { checkRateLimit } from '../middleware/rateLimit.js';

const app = new Hono();

app.get('/:code', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const rawCode = c.req.param('code');
  // Clean short code: uppercase, strip 'SND-', whitespace
  const cleanCode = rawCode.trim().toUpperCase().replace(/^SND-/, '');

  // Rate limit short code guessing
  const rate = await checkRateLimit(c, 'short_code_lookup', cleanCode, 30, 60);
  if (!rate.allowed) {
    return c.json({
      error: 'Too many lookup attempts. Please wait.',
      retry_after: rate.retryAfter
    }, 429);
  }

  // 1. Look in transfers
  const transfer = await db.prepare(
    `SELECT id, short_code, status, expires_at FROM transfers WHERE short_code = ?`
  ).bind(cleanCode).first();

  if (transfer) {
    return c.json({
      found: true,
      type: 'transfer',
      id: transfer.id,
      short_code: transfer.short_code,
      status: transfer.status
    });
  }

  // 2. Look in file requests
  const request = await db.prepare(
    `SELECT id, short_code, status, expires_at FROM file_requests WHERE short_code = ?`
  ).bind(cleanCode).first();

  if (request) {
    return c.json({
      found: true,
      type: 'request',
      id: request.id,
      short_code: request.short_code,
      status: request.status
    });
  }

  return c.json({
    found: false,
    error: 'Code not found. Please verify the 6-character code.'
  }, 404);
});

export default app;
