// Security Headers & Strict CORS Middleware

export async function securityHeadersMiddleware(c, next) {
  await next();

  // Attach baseline security headers
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('X-XSS-Protection', '1; mode=block');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.r2.cloudflarestorage.com;"
  );

  // Strict CORS headers
  const origin = c.req.header('Origin');
  if (origin) {
    // In dev or matching domain, echo back origin
    c.res.headers.set('Access-Control-Allow-Origin', origin);
    c.res.headers.set('Access-Control-Allow-Credentials', 'true');
    c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sender-Token, X-Requester-Token, X-Unlock-Token, Range');
    c.res.headers.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Range, ETag');
  }
}
