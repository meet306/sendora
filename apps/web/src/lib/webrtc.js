// Sendora Direct - High-Performance WebRTC P2P DataChannel Transfer Engine
// Streams large movies, videos, and files directly device-to-device over local Wi-Fi with backpressure
// 100% JavaScript ES Module - Zero external dependencies

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

// 64 KB per chunk is the optimal frame size for WebRTC DataChannels across Chrome, Safari, Firefox, Edge
const CHUNK_SIZE = 64 * 1024;
// Buffer watermark threshold: 2 MB
const MAX_BUFFERED_AMOUNT = 2 * 1024 * 1024;

/**
 * Checks if a file or MIME type is an in-browser playable video
 * @param {string} filename
 * @param {string} mime
 * @returns {boolean}
 */
export function isPlayableVideo(filename = '', mime = '') {
  const videoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'];
  if (videoMimes.some(m => mime.toLowerCase().includes(m))) return true;
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['mp4', 'webm', 'mov', 'mkv', 'm4v', 'ogv'].includes(ext);
}

/**
 * Format bytes to readable string with 2 decimal places
 */
export function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '0 KB/s';
  if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

/**
 * P2PSender - Runs on the device sharing the movie/file (Laptop)
 */
export class P2PSender {
  constructor({ file, onProgress, onStatusChange, onError }) {
    this.file = file;
    this.onProgress = onProgress || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.onError = onError || (() => {});

    this.pc = null;
    this.dataChannel = null;
    this.isTransferring = false;
    this.isAborted = false;

    // Transfer speed telemetry
    this.startTime = 0;
    this.lastSampleTime = 0;
    this.lastSampleBytes = 0;
    this.currentSpeed = 0;
  }

  async initializeOffer(onLocalCandidate) {
    this.pc = new RTCPeerConnection(ICE_CONFIG);

    this.pc.onicecandidate = (event) => {
      if (event.candidate && onLocalCandidate) {
        onLocalCandidate(event.candidate.toJSON());
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.onStatusChange(this.pc.connectionState);
    };

    // Create reliable binary data channel
    this.dataChannel = this.pc.createDataChannel('sendora-transfer', {
      ordered: true
    });
    this.dataChannel.binaryType = 'arraybuffer';
    this.dataChannel.bufferedAmountLowThreshold = 512 * 1024; // 512 KB

    this.dataChannel.onopen = () => {
      this.onStatusChange('connected');
      setTimeout(() => this.startTransfer(), 50);
    };

    this.dataChannel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'receiver_ready') {
            this.startTransfer();
          }
        } catch (e) {}
      }
    };

    this.dataChannel.onerror = (err) => {
      this.onError(new Error(`P2P DataChannel error: ${err.message || 'Unknown'}`));
    };

    this.dataChannel.onclose = () => {
      if (this.isTransferring && !this.isAborted) {
        this.onStatusChange('disconnected');
      }
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Wait briefly for local ICE candidates (host Wi-Fi IP) so they are baked directly into offer.sdp
    // This allows the receiver to connect in under 300ms without waiting for candidate roundtrips
    await new Promise((resolve) => {
      if (this.pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        const check = () => {
          if (this.pc.iceGatheringState === 'complete') {
            this.pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        this.pc.addEventListener('icegatheringstatechange', check);
        setTimeout(resolve, 800);
      }
    });

    return {
      type: this.pc.localDescription.type,
      sdp: this.pc.localDescription.sdp
    };
  }

  async applyAnswer(answer) {
    if (!this.pc) return;
    if (this.pc.signalingState !== 'stable') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async addIceCandidate(candidate) {
    if (!this.pc || !candidate) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('ICE candidate addition failed:', e.message);
    }
  }

  async startTransfer() {
    if (this.isTransferring || !this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }

    this.isTransferring = true;
    this.startTime = Date.now();
    this.lastSampleTime = this.startTime;
    this.lastSampleBytes = 0;

    const totalBytes = this.file.size;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);

    // 1. Send file metadata header packet
    const header = JSON.stringify({
      type: 'start',
      name: this.file.name,
      size: totalBytes,
      mime: this.file.type || 'application/octet-stream',
      totalChunks,
      chunkSize: CHUNK_SIZE
    });
    this.dataChannel.send(header);

    // 2. Stream chunks with backpressure
    let offset = 0;
    let chunkIndex = 0;

    const waitForBufferDrain = () => {
      return new Promise((resolve) => {
        let timer;
        const handler = () => {
          clearTimeout(timer);
          this.dataChannel.removeEventListener('bufferedamountlow', handler);
          resolve();
        };
        this.dataChannel.addEventListener('bufferedamountlow', handler);
        // Safety timeout so transfer never hangs if browser event is delayed
        timer = setTimeout(handler, 80);
      });
    };

    while (offset < totalBytes) {
      if (this.isAborted) return;

      // Handle backpressure so we don't overflow WebRTC memory on 2GB+ files
      if (this.dataChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        await waitForBufferDrain();
      }

      const chunkSlice = this.file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await chunkSlice.arrayBuffer();

      this.dataChannel.send(buffer);
      offset += buffer.byteLength;
      chunkIndex++;

      // Speed & ETA calculations (sampled every 400ms)
      const now = Date.now();
      const elapsedSinceSample = (now - this.lastSampleTime) / 1000;
      if (elapsedSinceSample >= 0.4) {
        const bytesDelta = offset - this.lastSampleBytes;
        this.currentSpeed = bytesDelta / elapsedSinceSample;
        this.lastSampleTime = now;
        this.lastSampleBytes = offset;
      }

      const progress = Math.min(100, Math.round((offset / totalBytes) * 100));
      const remainingBytes = totalBytes - offset;
      const eta = this.currentSpeed > 0 ? Math.ceil(remainingBytes / this.currentSpeed) : 0;

      this.onProgress({
        status: 'transferring',
        progress,
        bytesSent: offset,
        totalBytes,
        speed: this.currentSpeed,
        speedFormatted: formatSpeed(this.currentSpeed),
        eta,
        chunk: chunkIndex,
        totalChunks
      });
    }

    // 3. Send transfer completion message
    this.dataChannel.send(JSON.stringify({ type: 'done' }));

    this.onProgress({
      status: 'completed',
      progress: 100,
      bytesSent: totalBytes,
      totalBytes,
      speed: 0,
      eta: 0
    });
    this.onStatusChange('completed');
  }

  cancel() {
    this.isAborted = true;
    this.isTransferring = false;
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch (e) {}
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch (e) {}
    }
  }
}

/**
 * P2PReceiver - Runs on the device receiving the movie/file (Phone, Tablet, Laptop)
 */
export class P2PReceiver {
  constructor({ onProgress, onComplete, onStatusChange, onError }) {
    this.onProgress = onProgress || (() => {});
    this.onComplete = onComplete || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.onError = onError || (() => {});

    this.pc = null;
    this.dataChannel = null;

    // Incoming file assembly
    this.fileMetadata = null;
    this.chunks = [];
    this.receivedBytes = 0;

    // Speed telemetry
    this.startTime = 0;
    this.lastSampleTime = 0;
    this.lastSampleBytes = 0;
    this.currentSpeed = 0;
  }

  async handleOffer(offer, onLocalCandidate) {
    this.pc = new RTCPeerConnection(ICE_CONFIG);

    this.pc.onicecandidate = (event) => {
      if (event.candidate && onLocalCandidate) {
        onLocalCandidate(event.candidate.toJSON());
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.onStatusChange(this.pc.connectionState);
    };

    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.dataChannel.binaryType = 'arraybuffer';
      this.setupDataChannel();
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // Wait briefly for local ICE candidates (host Wi-Fi IP) so they are baked directly into answer.sdp
    await new Promise((resolve) => {
      if (this.pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        const check = () => {
          if (this.pc.iceGatheringState === 'complete') {
            this.pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        this.pc.addEventListener('icegatheringstatechange', check);
        setTimeout(resolve, 800);
      }
    });

    return {
      type: this.pc.localDescription.type,
      sdp: this.pc.localDescription.sdp
    };
  }

  async addIceCandidate(candidate) {
    if (!this.pc || !candidate) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('Receiver ICE candidate add error:', e.message);
    }
  }

  setupDataChannel() {
    const notifyReady = () => {
      this.onStatusChange('connected');
      try {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({ type: 'receiver_ready' }));
        }
      } catch (e) {}
    };

    if (this.dataChannel.readyState === 'open') {
      notifyReady();
    } else {
      this.dataChannel.onopen = notifyReady;
    }

    this.dataChannel.onerror = (err) => {
      this.onError(new Error(`DataChannel receive error: ${err.message || 'Unknown'}`));
    };

    this.dataChannel.onmessage = (event) => {
      const data = event.data;

      // Header or Control Message (string)
      if (typeof data === 'string') {
        try {
          const msg = JSON.parse(data);

          if (msg.type === 'start') {
            this.fileMetadata = msg;
            this.chunks = [];
            this.receivedBytes = 0;
            this.startTime = Date.now();
            this.lastSampleTime = this.startTime;
            this.lastSampleBytes = 0;

            this.onProgress({
              status: 'transferring',
              progress: 0,
              filename: msg.name,
              receivedBytes: 0,
              totalBytes: msg.size,
              speed: 0,
              eta: 0
            });
          } else if (msg.type === 'done') {
            this.finalizeDownload();
          }
        } catch (e) {
          console.warn('Unknown control message:', data);
        }
        return;
      }

      // Binary Chunk (ArrayBuffer)
      if (data instanceof ArrayBuffer) {
        this.chunks.push(data);
        this.receivedBytes += data.byteLength;

        const totalBytes = this.fileMetadata ? this.fileMetadata.size : this.receivedBytes;

        // Speed & ETA calculations
        const now = Date.now();
        const elapsedSinceSample = (now - this.lastSampleTime) / 1000;
        if (elapsedSinceSample >= 0.4) {
          const bytesDelta = this.receivedBytes - this.lastSampleBytes;
          this.currentSpeed = bytesDelta / elapsedSinceSample;
          this.lastSampleTime = now;
          this.lastSampleBytes = this.receivedBytes;
        }

        const progress = Math.min(100, Math.round((this.receivedBytes / totalBytes) * 100));
        const remainingBytes = Math.max(0, totalBytes - this.receivedBytes);
        const eta = this.currentSpeed > 0 ? Math.ceil(remainingBytes / this.currentSpeed) : 0;

        this.onProgress({
          status: 'transferring',
          progress,
          filename: this.fileMetadata?.name || 'file',
          receivedBytes: this.receivedBytes,
          totalBytes,
          speed: this.currentSpeed,
          speedFormatted: formatSpeed(this.currentSpeed),
          eta
        });
      }
    };
  }

  finalizeDownload() {
    if (!this.fileMetadata) return;

    const mime = this.fileMetadata.mime || 'application/octet-stream';
    const blob = new Blob(this.chunks, { type: mime });
    const downloadUrl = URL.createObjectURL(blob);
    const filename = this.fileMetadata.name;
    const isVideo = isPlayableVideo(filename, mime);

    this.onProgress({
      status: 'completed',
      progress: 100,
      filename,
      receivedBytes: this.fileMetadata.size,
      totalBytes: this.fileMetadata.size,
      speed: 0,
      eta: 0
    });

    this.onStatusChange('completed');

    this.onComplete({
      blob,
      downloadUrl,
      filename,
      fileSize: this.fileMetadata.size,
      mimeType: mime,
      isVideo
    });
  }

  cancel() {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch (e) {}
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch (e) {}
    }
  }
}
