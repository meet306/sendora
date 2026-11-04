// Admin session verification middleware
import { sha256 } from '../services/crypto.js';

export async function adminAuthMiddleware(c, next) {
  const db = c.env.DB;
  if (!db) {
    return c.json({ error: 'Database service unavailable' }, 503);
  }

  // Support Authorization: Bearer <token> or Cookie: sendora_admin_session=<token>
  let token = null;
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    const cookieHeader = c.req.header('Cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/sendora_admin_session=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!token) {
    return c.json({ error: 'Unauthorized administrative access' }, 401);
  }

  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);

  // Look up active session
  const session = await db.prepare(
    `SELECT s.id, s.user_id, s.expires_at, u.username, u.role
     FROM admin_sessions s
     JOIN admin_users u ON s.user_id = u.id
     WHERE s.session_token_hash = ? AND s.expires_at > ?`
  ).bind(tokenHash, now).first();

  if (!session) {
    return c.json({ error: 'Session expired or invalid' }, 401);
  }

  // Attach authenticated admin to context
  c.set('adminUser', {
    id: session.user_id,
    username: session.username,
    role: session.role
  });

  return next();
}
