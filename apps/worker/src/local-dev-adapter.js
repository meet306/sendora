// Local Development Adapter for Cloudflare D1 and R2
// Uses Node's built-in native SQLite (DatabaseSync) and filesystem storage
// 100% pure ES modules - zero external dependencies

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_STORAGE = path.resolve(__dirname, '../../../.local-storage');
const DB_FILE = path.join(ROOT_STORAGE, 'sendora-dev.sqlite');
const R2_DIR = path.join(ROOT_STORAGE, 'r2');
const MULTIPART_DIR = path.join(ROOT_STORAGE, 'multipart');

// Ensure directories exist
fs.mkdirSync(ROOT_STORAGE, { recursive: true });
fs.mkdirSync(R2_DIR, { recursive: true });
fs.mkdirSync(MULTIPART_DIR, { recursive: true });

/**
 * Initialize native SQLite database with Sendora D1 schema
 */
export function initLocalD1() {
  const sqlite = new DatabaseSync(DB_FILE);

  // Read and apply migration
  const migrationPath = path.resolve(__dirname, '../migrations/0001_initial_schema.sql');
  if (fs.existsSync(migrationPath)) {
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    sqlite.exec(migrationSql);
  }

  // Seed default admin user for local dev testing if not already present
  // Username: admin, Password: admin-password
  const existingAdmin = sqlite.prepare("SELECT id FROM admin_users WHERE username = 'admin'").get();
  if (!existingAdmin) {
    const adminId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    // Pre-calculated PBKDF2 hash for 'admin-password' with fixed dev salt
    const devSalt = '3d84a488da047f36f3d6272be15dbfc0';
    const devHash = 'd60df2f0712d23b7b5bda049c0e477f16bb6595d948bff76d65e2a50ded44470';

    sqlite.exec(`
      INSERT INTO admin_users (id, username, password_hash, password_salt, role, created_at)
      VALUES ('${adminId}', 'admin', '${devHash}', '${devSalt}', 'admin', ${now});
    `);
  }

  // D1-compatible interface wrapper
  return {
    prepare(sql) {
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          // Normalize undefined to null for sqlite
          this._params = params.map(p => (p === undefined ? null : p));
          return this;
        },
        async first() {
          const stmt = sqlite.prepare(this._sql);
          return stmt.get(...this._params) || null;
        },
        async all() {
          const stmt = sqlite.prepare(this._sql);
          const results = stmt.all(...this._params);
          return { results };
        },
        async run() {
          const stmt = sqlite.prepare(this._sql);
          const info = stmt.run(...this._params);
          return {
            meta: {
              changes: info.changes,
              last_row_id: Number(info.lastInsertRowid)
            }
          };
        }
      };
    }
  };
}

/**
 * Initialize local R2 bucket adapter
 */
export function initLocalR2() {
  return {
    async get(key) {
      const filePath = path.join(R2_DIR, key);
      if (!fs.existsSync(filePath)) return null;

      const stat = fs.statSync(filePath);
      const buffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('md5').update(buffer).digest('hex');

      return {
        key,
        size: stat.size,
        httpEtag: `"${hash}"`,
        body: buffer,
        writeHttpMetadata(headers) {
          headers.set('etag', `"${hash}"`);
        }
      };
    },

    async put(key, body) {
      const filePath = path.join(R2_DIR, key);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
        fs.writeFileSync(filePath, Buffer.from(body));
      } else if (typeof body === 'string') {
        fs.writeFileSync(filePath, body, 'utf-8');
      } else if (body && typeof body.pipe === 'function') {
        const out = fs.createWriteStream(filePath);
        await new Promise((resolve, reject) => {
          body.pipe(out);
          out.on('finish', resolve);
          out.on('error', reject);
        });
      } else {
        // Web stream / ReadableStream
        const reader = body.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        fs.writeFileSync(filePath, Buffer.concat(chunks));
      }

      return { key, etag: '"local-etag"' };
    },

    async delete(key) {
      const filePath = path.join(R2_DIR, key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    },

    async createMultipartUpload(key, options) {
      const uploadId = crypto.randomUUID();
      const sessionDir = path.join(MULTIPART_DIR, uploadId);
      fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify({ key, options }));
      return { uploadId, key };
    },

    resumeMultipartUpload(key, uploadId) {
      const sessionDir = path.join(MULTIPART_DIR, uploadId);

      return {
        async uploadPart(partNumber, body) {
          fs.mkdirSync(sessionDir, { recursive: true });
          const partFile = path.join(sessionDir, `part-${partNumber}.bin`);

          let buffer;
          if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
            buffer = Buffer.from(body);
          } else if (typeof body === 'string') {
            buffer = Buffer.from(body, 'utf-8');
          } else if (body && typeof body.getReader === 'function') {
            const reader = body.getReader();
            const chunks = [];
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
            }
            buffer = Buffer.concat(chunks);
          } else if (body && typeof body.pipe === 'function') {
            const chunks = [];
            for await (const chunk of body) {
              chunks.push(chunk);
            }
            buffer = Buffer.concat(chunks);
          } else {
            buffer = Buffer.from(await body.arrayBuffer());
          }

          fs.writeFileSync(partFile, buffer);
          const hash = crypto.createHash('md5').update(buffer).digest('hex');

          return {
            partNumber,
            etag: `"${hash}"`
          };
        },

        async complete(parts) {
          const targetPath = path.join(R2_DIR, key);
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });

          const outStream = fs.createWriteStream(targetPath);
          const sorted = parts.slice().sort((a, b) => a.partNumber - b.partNumber);

          for (const p of sorted) {
            const partFile = path.join(sessionDir, `part-${p.partNumber}.bin`);
            if (fs.existsSync(partFile)) {
              const chunk = fs.readFileSync(partFile);
              outStream.write(chunk);
            }
          }
          outStream.end();

          // Cleanup session directory
          fs.rmSync(sessionDir, { recursive: true, force: true });
          return { key, etag: '"completed-etag"' };
        },

        async abort() {
          fs.rmSync(sessionDir, { recursive: true, force: true });
          return true;
        }
      };
    }
  };
}

/**
 * Return full local Cloudflare Worker environment object
 */
export function getLocalWorkerEnv() {
  return {
    DB: initLocalD1(),
    BUCKET: initLocalR2(),
    ENVIRONMENT: 'development',
    MAX_FILE_SIZE_BYTES: 209715200,
    DEFAULT_EXPIRATION_HOURS: 24,
    APP_BASE_URL: 'http://localhost:5173'
  };
}
