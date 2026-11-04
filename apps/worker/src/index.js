// Sendora Cloudflare Worker API & Cron Trigger Entrypoint
// Pure JavaScript ES Module

import { Hono } from 'hono';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
import transfersRouter from './routes/transfers.js';
import uploadsRouter from './routes/uploads.js';
import downloadsRouter from './routes/downloads.js';
import requestsRouter from './routes/requests.js';
import lookupRouter from './routes/lookup.js';
import adminRouter from './routes/admin.js';
import { runCleanupJob } from './services/cleanup.js';

const app = new Hono();

// Global middleware
app.use('*', securityHeadersMiddleware);

// Handle preflight OPTIONS requests across all routes
app.options('*', (c) => {
  return c.text('', 204);
});

// Health check and system status
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'Sendora Worker API',
    timestamp: new Date().toISOString()
  });
});

// Mount module routes
app.route('/api/transfers', transfersRouter);
app.route('/api/uploads', uploadsRouter);
app.route('/api/downloads', downloadsRouter);
app.route('/api/requests', requestsRouter);
app.route('/api/lookup', lookupRouter);
app.route('/api/admin', adminRouter);

// 404 handler for API routes
app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled API Error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred'
  }, 500);
});

// Export Cloudflare Worker fetch & scheduled cron trigger handlers
export default {
  fetch: app.fetch,

  /**
   * Cloudflare Cron Trigger Handler
   * Configured in wrangler.jsonc (e.g. "0 * * * *" hourly)
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      runCleanupJob(env)
        .then((res) => {
          console.log(`Cron cleanup completed: ${res.deletedTransfers} transfers, ${res.deletedFiles} files purged.`);
        })
        .catch((err) => {
          console.error('Cron cleanup execution failed:', err);
        })
    );
  }
};
