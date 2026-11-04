import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import workerApp from '../worker/src/index.js';
import { getLocalWorkerEnv } from '../worker/src/local-dev-adapter.js';

/**
 * Custom Vite plugin to serve Sendora Worker API routes in local development
 * Gives a seamless zero-configuration full-stack dev experience
 */
function sendoraApiPlugin() {
  let localEnv = null;

  return {
    name: 'sendora-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api')) {
          return next();
        }

        try {
          if (!localEnv) {
            localEnv = getLocalWorkerEnv();
          }
          const origin = `http://${req.headers.host || 'localhost:5173'}`;
          const fullUrl = new URL(req.url, origin);

          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value) {
              headers.set(key, Array.isArray(value) ? value.join(', ') : value);
            }
          }

          let body = null;
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            const chunks = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            if (chunks.length > 0) {
              body = Buffer.concat(chunks);
            }
          }

          const webReq = new Request(fullUrl.toString(), {
            method: req.method,
            headers,
            body: body && body.length > 0 ? body : undefined,
            // @ts-ignore
            duplex: 'half'
          });

          const webRes = await workerApp.fetch(webReq, localEnv, {
            waitUntil: (p) => Promise.resolve(p)
          });

          res.statusCode = webRes.status;
          for (const [k, v] of webRes.headers.entries()) {
            res.setHeader(k, v);
          }

          if (webRes.body) {
            const reader = webRes.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (err) {
          console.error('Local dev API server error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), sendoraApiPlugin()],
  server: {
    port: 5173
  }
});
