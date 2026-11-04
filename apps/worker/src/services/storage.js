// Unified Storage Engine for Sendora
// Dynamically supports Cloudflare R2 or Cloudflare Workers KV (100% Free with Zero Credit Card)

/**
 * Resolves a uniform storage bucket interface from the Worker environment
 * @param {object} env
 */
export function getStorageBucket(env) {
  // If R2 is bound and available, use native R2
  if (env.BUCKET) {
    return env.BUCKET;
  }

  // If Workers KV is bound (100% free without credit card), adapt KV as storage
  if (env.SENDORA_STORAGE) {
    const kv = env.SENDORA_STORAGE;

    return {
      async get(key) {
        const value = await kv.get(key, { type: 'arrayBuffer' });
        if (!value) return null;
        return {
          body: value,
          size: value.byteLength,
          arrayBuffer: async () => value
        };
      },

      async put(key, body) {
        let buffer;
        if (body instanceof ArrayBuffer) {
          buffer = body;
        } else if (body instanceof Uint8Array) {
          buffer = body.buffer;
        } else if (body && typeof body.arrayBuffer === 'function') {
          buffer = await body.arrayBuffer();
        } else {
          buffer = body;
        }
        await kv.put(key, buffer);
        return { key };
      },

      async delete(key) {
        await kv.delete(key);
      },

      async createMultipartUpload(key, options = {}) {
        const uploadId = crypto.randomUUID();
        return {
          key,
          uploadId
        };
      },

      resumeMultipartUpload(key, uploadId) {
        return {
          async uploadPart(partNumber, body) {
            let buffer;
            if (body instanceof ArrayBuffer) {
              buffer = body;
            } else if (body instanceof Uint8Array) {
              buffer = body.buffer;
            } else if (body && typeof body.arrayBuffer === 'function') {
              buffer = await body.arrayBuffer();
            } else {
              buffer = body;
            }
            const chunkKey = `_chunk:${uploadId}:${partNumber}`;
            await kv.put(chunkKey, buffer);
            return {
              partNumber,
              etag: `"${uploadId}-${partNumber}"`
            };
          },

          async complete(parts) {
            parts.sort((a, b) => a.partNumber - b.partNumber);
            const chunks = [];
            let totalLength = 0;

            for (const p of parts) {
              const chunkKey = `_chunk:${uploadId}:${p.partNumber}`;
              const chunkBuffer = await kv.get(chunkKey, { type: 'arrayBuffer' });
              if (chunkBuffer) {
                chunks.push(new Uint8Array(chunkBuffer));
                totalLength += chunkBuffer.byteLength;
                await kv.delete(chunkKey);
              }
            }

            const merged = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
              merged.set(chunk, offset);
              offset += chunk.length;
            }

            await kv.put(key, merged.buffer);
            return { key, etag: `"${uploadId}-complete"` };
          },

          async abort() {
            for (let i = 1; i <= 50; i++) {
              await kv.delete(`_chunk:${uploadId}:${i}`);
            }
          }
        };
      }
    };
  }

  return null;
}
