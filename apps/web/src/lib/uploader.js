// Client-side Multipart Upload Orchestrator
import { computeFileSHA256 } from './crypto.js';

export class MultipartUploader {
  /**
   * @param {object} options
   * @param {File} options.file
   * @param {string} [options.transferId]
   * @param {string} [options.submissionId]
   * @param {(status: object) => void} options.onProgress
   */
  constructor({ file, transferId, submissionId, onProgress }) {
    this.file = file;
    this.transferId = transferId;
    this.submissionId = submissionId;
    this.onProgress = onProgress || (() => {});

    this.aborted = false;
    this.abortController = new AbortController();
    this.uploadSession = null;
    this.completedParts = [];

    // Speed tracking
    this.startTime = null;
    this.bytesUploaded = 0;
    this.lastSampleTime = null;
    this.lastSampleBytes = 0;
    this.currentSpeed = 0;
  }

  /**
   * Start the multi-step upload process
   */
  async start() {
    this.startTime = Date.now();
    this.lastSampleTime = this.startTime;

    // 1. Calculate integrity hash (SHA-256)
    this.onProgress({
      status: 'hashing',
      progress: 0,
      filename: this.file.name,
      bytesUploaded: 0,
      totalBytes: this.file.size
    });

    let sha256Hash = null;
    try {
      sha256Hash = await computeFileSHA256(this.file, (hashProgress) => {
        if (!this.aborted) {
          this.onProgress({
            status: 'hashing',
            progress: hashProgress,
            filename: this.file.name,
            bytesUploaded: 0,
            totalBytes: this.file.size
          });
        }
      });
    } catch (err) {
      console.warn('SHA-256 computation skipped:', err);
    }

    if (this.aborted) return;

    // 2. Initiate multipart session
    this.onProgress({
      status: 'initiating',
      progress: 0,
      filename: this.file.name,
      bytesUploaded: 0,
      totalBytes: this.file.size
    });

    const initRes = await fetch('/api/uploads/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transfer_id: this.transferId,
        submission_id: this.submissionId,
        filename: this.file.name,
        file_size: this.file.size,
        mime_type: this.file.type || 'application/octet-stream',
        sha256_hash: sha256Hash
      }),
      signal: this.abortController.signal
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to initiate upload session');
    }

    this.uploadSession = await initRes.json();
    const { upload_id, chunk_size, total_parts } = this.uploadSession;

    // 3. Upload parts in sequence or controlled batches
    this.completedParts = [];
    this.bytesUploaded = 0;

    for (let partNumber = 1; partNumber <= total_parts; partNumber++) {
      if (this.aborted) break;

      const startByte = (partNumber - 1) * chunk_size;
      const endByte = Math.min(startByte + chunk_size, this.file.size);
      const chunk = this.file.slice(startByte, endByte);

      const partResult = await this.uploadPartWithRetry(upload_id, partNumber, chunk, 3);
      this.completedParts.push({
        partNumber,
        etag: partResult.etag
      });

      this.bytesUploaded += (endByte - startByte);

      // Speed & ETA calculations
      const now = Date.now();
      const elapsedSinceLastSample = (now - this.lastSampleTime) / 1000;
      if (elapsedSinceLastSample >= 0.5) {
        const bytesDelta = this.bytesUploaded - this.lastSampleBytes;
        this.currentSpeed = bytesDelta / elapsedSinceLastSample;
        this.lastSampleTime = now;
        this.lastSampleBytes = this.bytesUploaded;
      }

      const percent = Math.min(100, Math.round((this.bytesUploaded / this.file.size) * 100));
      const remainingBytes = this.file.size - this.bytesUploaded;
      const etaSeconds = this.currentSpeed > 0 ? Math.ceil(remainingBytes / this.currentSpeed) : 0;

      this.onProgress({
        status: 'uploading',
        progress: percent,
        filename: this.file.name,
        bytesUploaded: this.bytesUploaded,
        totalBytes: this.file.size,
        speed: this.currentSpeed,
        eta: etaSeconds,
        part: partNumber,
        totalParts: total_parts
      });
    }

    if (this.aborted) return;

    // 4. Complete multipart upload
    this.onProgress({
      status: 'finalizing',
      progress: 100,
      filename: this.file.name,
      bytesUploaded: this.file.size,
      totalBytes: this.file.size
    });

    const completeRes = await fetch(`/api/uploads/${upload_id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parts: this.completedParts,
        sha256_hash: sha256Hash
      }),
      signal: this.abortController.signal
    });

    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to complete file upload');
    }

    const finalData = await completeRes.json();

    this.onProgress({
      status: 'completed',
      progress: 100,
      filename: this.file.name,
      bytesUploaded: this.file.size,
      totalBytes: this.file.size,
      file: finalData.file
    });

    return finalData.file;
  }

  /**
   * Upload an individual part with retry capability
   */
  async uploadPartWithRetry(uploadId, partNumber, chunk, retriesLeft = 3) {
    try {
      // Step A: Obtain sign URL
      const signRes = await fetch(`/api/uploads/${uploadId}/part/${partNumber}/sign`, {
        signal: this.abortController.signal
      });

      if (!signRes.ok) throw new Error('Failed to sign upload part');
      const signData = await signRes.json();

      // Step B: Upload chunk
      const putRes = await fetch(signData.url, {
        method: signData.method || 'PUT',
        body: chunk,
        signal: this.abortController.signal
      });

      if (!putRes.ok) {
        throw new Error(`Upload of part ${partNumber} returned status ${putRes.status}`);
      }

      // If direct S3 presigned URL, ETag is returned in ETag response header
      let etag = putRes.headers.get('ETag') || putRes.headers.get('etag');
      if (!etag) {
        // If worker streaming proxy, ETag is in JSON response
        const json = await putRes.json().catch(() => ({}));
        etag = json.etag;
      }

      if (!etag) {
        etag = `part-${partNumber}`;
      }

      return { etag: etag.replace(/"/g, '') };
    } catch (err) {
      if (this.aborted) throw err;
      if (retriesLeft > 0) {
        console.warn(`Retrying part ${partNumber} (${retriesLeft} retries left)...`);
        await new Promise(r => setTimeout(r, 1000));
        return this.uploadPartWithRetry(uploadId, partNumber, chunk, retriesLeft - 1);
      }
      throw err;
    }
  }

  /**
   * Cancel and abort this upload
   */
  async cancel() {
    this.aborted = true;
    this.abortController.abort();

    if (this.uploadSession && this.uploadSession.upload_id) {
      try {
        await fetch(`/api/uploads/${this.uploadSession.upload_id}/abort`, {
          method: 'POST'
        });
      } catch (e) {
        // Ignore abort failure
      }
    }

    this.onProgress({
      status: 'cancelled',
      filename: this.file.name
    });
  }
}

