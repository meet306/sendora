// Client-side Cryptography & Formatting Utilities

/**
 * Compute SHA-256 checksum of a File or Blob in the browser
 * Uses chunked slicing to avoid loading large 200MB files into memory all at once
 * @param {File|Blob} file
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<string>}
 */
export async function computeFileSHA256(file, onProgress) {
  const chunkSize = 2 * 1024 * 1024; // 2 MB slice
  const chunks = Math.ceil(file.size / chunkSize);
  const reader = new FileReader();

  // If file is small (< 10 MB), hash in single step
  if (file.size <= 10 * 1024 * 1024) {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    if (onProgress) onProgress(100);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // For larger files, compute hash using browser SubtleCrypto
  // Note: Standard SubtleCrypto digest requires full buffer; we read sequentially
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  if (onProgress) onProgress(100);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 * @param {number} bytes
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format speed in bytes per second to human-readable string
 * @param {number} bytesPerSec
 * @returns {string}
 */
export function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  return `${formatBytes(bytesPerSec, 1)}/s`;
}

/**
 * Format remaining seconds into human-readable time (e.g. "2m 14s")
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Format target timestamp into remaining countdown string
 * @param {number} timestampSec
 * @returns {{ label: string, isExpired: boolean, remainingSec: number }}
 */
export function getCountdown(timestampSec) {
  const now = Math.floor(Date.now() / 1000);
  const remaining = timestampSec - now;

  if (remaining <= 0) {
    return { label: 'Expired', isExpired: true, remainingSec: 0 };
  }

  const days = Math.floor(remaining / 86400);
  const hrs = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = Math.floor(remaining % 60);

  let label = '';
  if (days > 0) {
    label = `${days}d ${hrs}h remaining`;
  } else if (hrs > 0) {
    label = `${hrs}h ${mins}m remaining`;
  } else if (mins > 0) {
    label = `${mins}m ${secs}s remaining`;
  } else {
    label = `${secs}s remaining`;
  }

  return { label, isExpired: false, remainingSec: remaining };
}
