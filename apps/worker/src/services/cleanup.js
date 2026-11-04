// Cleanup Service for Cloudflare Cron Triggers & Administrative maintenance
// Ensures idempotent, resilient garbage collection of expired transfers, files, and orphaned multipart uploads
import { getStorageBucket } from './storage.js';

/**
 * Execute automated cleanup cycle
 * @param {object} env - Cloudflare worker environment bindings (DB, BUCKET)
 * @returns {Promise<{ deletedTransfers: number, deletedFiles: number, cleanedSessions: number, errors: string[] }>}
 */
export async function runCleanupJob(env) {
  const db = env.DB;
  const bucket = getStorageBucket(env);
  const now = Math.floor(Date.now() / 1000);
  const errors = [];
  let deletedTransfers = 0;
  let deletedFiles = 0;
  let cleanedSessions = 0;

  try {
    // 1. Find active transfers that have expired
    const expiredTransfersQuery = await db.prepare(
      `SELECT id, short_code FROM transfers 
       WHERE status = 'active' AND expires_at <= ? 
       LIMIT 100`
    ).bind(now).all();

    const expiredTransfers = expiredTransfersQuery.results || [];

    for (const transfer of expiredTransfers) {
      try {
        // Fetch files associated with this transfer
        const filesQuery = await db.prepare(
          `SELECT id, r2_key FROM transfer_files WHERE transfer_id = ?`
        ).bind(transfer.id).all();

        const files = filesQuery.results || [];

        // Delete physical R2 objects
        for (const file of files) {
          try {
            if (bucket && file.r2_key) {
              await bucket.delete(file.r2_key);
              deletedFiles++;
            }
          } catch (fileErr) {
            errors.push(`Failed to delete R2 object ${file.r2_key}: ${fileErr.message}`);
          }
        }

        // Mark transfer as expired in D1
        await db.prepare(
          `UPDATE transfers SET status = 'expired', updated_at = ? WHERE id = ?`
        ).bind(now, transfer.id).run();

        deletedTransfers++;
      } catch (transferErr) {
        errors.push(`Failed cleaning transfer ${transfer.id}: ${transferErr.message}`);
      }
    }

    // 2. Clean up deleted transfers that still have physical files (e.g. from early deletion errors)
    const pendingDeletedQuery = await db.prepare(
      `SELECT tf.id, tf.r2_key FROM transfer_files tf
       JOIN transfers t ON tf.transfer_id = t.id
       WHERE t.status = 'deleted'
       LIMIT 100`
    ).all();

    const pendingDeletedFiles = pendingDeletedQuery.results || [];
    for (const file of pendingDeletedFiles) {
      try {
        if (bucket && file.r2_key) {
          await bucket.delete(file.r2_key);
        }
        await db.prepare(`DELETE FROM transfer_files WHERE id = ?`).bind(file.id).run();
      } catch (delErr) {
        errors.push(`Failed purging deleted file ${file.id}: ${delErr.message}`);
      }
    }

    // 3. Find abandoned upload sessions older than 24 hours
    const staleSessionCutoff = now - (24 * 3600);
    const staleSessionsQuery = await db.prepare(
      `SELECT id, r2_upload_id, r2_key FROM upload_sessions
       WHERE status IN ('initiated', 'uploading') AND created_at <= ?
       LIMIT 50`
    ).bind(staleSessionCutoff).all();

    const staleSessions = staleSessionsQuery.results || [];
    for (const session of staleSessions) {
      try {
        if (bucket && session.r2_upload_id && session.r2_key) {
          try {
            const upload = bucket.resumeMultipartUpload(session.r2_key, session.r2_upload_id);
            if (upload && typeof upload.abort === 'function') {
              await upload.abort();
            }
          } catch (abortErr) {
            // Already aborted or not found in R2
          }
        }
        await db.prepare(
          `UPDATE upload_sessions SET status = 'aborted' WHERE id = ?`
        ).bind(session.id).run();
        cleanedSessions++;
      } catch (sessErr) {
        errors.push(`Failed aborting stale upload ${session.id}: ${sessErr.message}`);
      }
    }

    // 4. Clean expired rate-limiting lookup attempts older than 24 hours
    await db.prepare(
      `DELETE FROM lookup_attempts WHERE last_attempt_at <= ?`
    ).bind(now - (24 * 3600)).run();

    // 5. Clean expired admin sessions
    await db.prepare(
      `DELETE FROM admin_sessions WHERE expires_at <= ?`
    ).bind(now).run();

    // 6. Record audit log entry for automated cleanup
    if (deletedTransfers > 0 || deletedFiles > 0 || cleanedSessions > 0) {
      await db.prepare(
        `INSERT INTO audit_logs (id, event_type, actor_type, actor_id, metadata_json, ip_hash, created_at)
         VALUES (?, 'automated_cleanup', 'system', 'cron', ?, 'system', ?)`
      ).bind(
        crypto.randomUUID ? crypto.randomUUID() : `cleanup-${now}`,
        JSON.stringify({ deletedTransfers, deletedFiles, cleanedSessions, errorsCount: errors.length }),
        now
      ).run();
    }

  } catch (err) {
    errors.push(`Fatal cleanup error: ${err.message}`);
  }

  return {
    deletedTransfers,
    deletedFiles,
    cleanedSessions,
    errors
  };
}

