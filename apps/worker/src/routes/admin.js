// Admin Operations & Metrics Route
import { Hono } from 'hono';
import { z } from 'zod';
import {
  generateId,
  generateSecretToken,
  sha256,
  verifyPassword,
  anonymizeIp
} from '../services/crypto.js';
import { checkRateLimit, resetRateLimit } from '../middleware/rateLimit.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import { runCleanupJob } from '../services/cleanup.js';

const app = new Hono();

// POST /api/admin/login
app.post('/login', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid payload' }, 400);
  }

  const { username, password } = body;
  if (!username || !password) {
    return c.json({ error: 'Username and password required' }, 400);
  }

  // Rate limit login attempts: 5 attempts per 15 minutes
  const rate = await checkRateLimit(c, 'admin_login', username.toLowerCase(), 5, 900);
  if (!rate.allowed) {
    return c.json({
      error: 'Account locked due to consecutive failed logins. Try again later.',
      retry_after: rate.retryAfter
    }, 429);
  }

  const user = await db.prepare(
    `SELECT * FROM admin_users WHERE username = ?`
  ).bind(username.toLowerCase().trim()).first();

  if (!user) {
    return c.json({
      error: 'Invalid credentials',
      remaining_attempts: rate.remainingAttempts
    }, 401);
  }

  const valid = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!valid) {
    return c.json({
      error: 'Invalid credentials',
      remaining_attempts: rate.remainingAttempts
    }, 401);
  }

  // Reset rate limit on success
  await resetRateLimit(c, 'admin_login', username.toLowerCase());

  // Create session (expires in 24 hours)
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (24 * 3600);
  const sessionToken = generateSecretToken();
  const sessionTokenHash = await sha256(sessionToken);

  await db.prepare(
    `INSERT INTO admin_sessions (id, user_id, session_token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(generateId(), user.id, sessionTokenHash, expiresAt, now).run();

  // Audit log
  const rawIp = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  const ipHash = await anonymizeIp(rawIp);
  await db.prepare(
    `INSERT INTO audit_logs (id, event_type, actor_type, actor_id, metadata_json, ip_hash, created_at)
     VALUES (?, 'admin_login_success', 'admin', ?, '{"action":"login"}', ?, ?)`
  ).bind(generateId(), user.id, ipHash, now).run();

  // Set secure cookie
  c.res.headers.set(
    'Set-Cookie',
    `sendora_admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
  );

  return c.json({
    success: true,
    token: sessionToken,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

// All routes below require admin authentication
app.use('/*', adminAuthMiddleware);

// GET /api/admin/stats - Overview metrics & dashboard chart datasets
app.get('/stats', async (c) => {
  const db = c.env.DB;
  const now = Math.floor(Date.now() / 1000);

  // Transfers counts
  const totalTransfers = await db.prepare(`SELECT COUNT(*) as count FROM transfers`).first();
  const activeTransfers = await db.prepare(`SELECT COUNT(*) as count FROM transfers WHERE status = 'active' AND expires_at > ?`).bind(now).first();
  const expiredTransfers = await db.prepare(`SELECT COUNT(*) as count FROM transfers WHERE status = 'expired' OR (status = 'active' AND expires_at <= ?)`).bind(now).first();

  // Storage and file counts
  const fileStats = await db.prepare(
    `SELECT COUNT(*) as total_files, COALESCE(SUM(file_size), 0) as total_storage FROM transfer_files`
  ).first();

  // Download counts
  const downloadStats = await db.prepare(`SELECT COUNT(*) as total_downloads FROM download_events`).first();

  // Requests stats
  const requestStats = await db.prepare(`SELECT COUNT(*) as total_requests, COALESCE(SUM(submission_count), 0) as total_submissions FROM file_requests`).first();

  // Abandoned/failed uploads
  const failedUploads = await db.prepare(`SELECT COUNT(*) as count FROM upload_sessions WHERE status = 'aborted'`).first();

  // Daily uploads over past 7 days
  const sevenDaysAgo = now - (7 * 86400);
  const dailyUploads = await db.prepare(
    `SELECT strftime('%Y-%m-%d', datetime(created_at, 'unixepoch')) as day, COUNT(*) as count
     FROM transfers
     WHERE created_at >= ?
     GROUP BY day
     ORDER BY day ASC`
  ).bind(sevenDaysAgo).all();

  // Daily downloads over past 7 days
  const dailyDownloads = await db.prepare(
    `SELECT strftime('%Y-%m-%d', datetime(downloaded_at, 'unixepoch')) as day, COUNT(*) as count
     FROM download_events
     WHERE downloaded_at >= ?
     GROUP BY day
     ORDER BY day ASC`
  ).bind(sevenDaysAgo).all();

  // Transfer types
  const transferTypes = await db.prepare(
    `SELECT transfer_type, COUNT(*) as count FROM transfers GROUP BY transfer_type`
  ).all();

  // Recent activity audit logs
  const recentLogs = await db.prepare(
    `SELECT id, event_type, actor_type, actor_id, metadata_json, created_at
     FROM audit_logs
     ORDER BY created_at DESC
     LIMIT 15`
  ).all();

  const storageUsedBytes = fileStats.total_storage || 0;
  // Free tier R2 soft ceiling: 10 GB (10,737,418,240 bytes)
  const freeTierLimit = 10 * 1024 * 1024 * 1024;
  const storagePercentage = Math.min(100, ((storageUsedBytes / freeTierLimit) * 100)).toFixed(1);

  return c.json({
    metrics: {
      total_transfers: totalTransfers.count || 0,
      active_transfers: activeTransfers.count || 0,
      expired_transfers: expiredTransfers.count || 0,
      total_files: fileStats.total_files || 0,
      storage_used_bytes: storageUsedBytes,
      storage_percentage: Number(storagePercentage),
      total_downloads: downloadStats.total_downloads || 0,
      total_requests: requestStats.total_requests || 0,
      total_submissions: requestStats.total_submissions || 0,
      failed_uploads: failedUploads.count || 0
    },
    charts: {
      daily_uploads: dailyUploads.results || [],
      daily_downloads: dailyDownloads.results || [],
      transfer_types: transferTypes.results || []
    },
    recent_activity: recentLogs.results || []
  });
});

// GET /api/admin/transfers - Paginated transfers table
app.get('/transfers', async (c) => {
  const db = c.env.DB;
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const transfers = await db.prepare(
    `SELECT id, short_code, title, transfer_type, total_size, file_count, download_count, max_downloads, status, expires_at, created_at
     FROM transfers
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();

  const total = await db.prepare(`SELECT COUNT(*) as count FROM transfers`).first();

  return c.json({
    transfers: transfers.results || [],
    page,
    total: total.count || 0,
    total_pages: Math.ceil((total.count || 0) / limit)
  });
});

// POST /api/admin/cleanup - Manual trigger for automated cleanup
app.post('/cleanup', async (c) => {
  const admin = c.get('adminUser');
  const result = await runCleanupJob(c.env);

  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    `INSERT INTO audit_logs (id, event_type, actor_type, actor_id, metadata_json, ip_hash, created_at)
     VALUES (?, 'admin_manual_cleanup', 'admin', ?, ?, 'admin', ?)`
  ).bind(generateId(), admin.id, JSON.stringify(result), now).run();

  return c.json({
    success: true,
    summary: result
  });
});

// POST /api/admin/logout
app.post('/logout', async (c) => {
  const db = c.env.DB;
  const token = c.req.header('Authorization')?.slice(7);
  if (token) {
    const tokenHash = await sha256(token);
    await db.prepare(`DELETE FROM admin_sessions WHERE session_token_hash = ?`).bind(tokenHash).run();
  }

  c.res.headers.set('Set-Cookie', 'sendora_admin_session=; Path=/; Max-Age=0');
  return c.json({ success: true, message: 'Logged out' });
});

export default app;

