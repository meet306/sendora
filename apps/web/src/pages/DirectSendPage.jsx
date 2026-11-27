import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { api } from '../lib/api';
import { P2PSender, isPlayableVideo } from '../lib/webrtc';
import { formatBytes } from '../lib/crypto';
import {
  Zap,
  Wifi,
  Film,
  File,
  Copy,
  Check,
  QrCode,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
  Smartphone,
  Laptop
} from 'lucide-react';

export function DirectSendPage() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState('select'); // 'select' | 'waiting' | 'transferring' | 'completed' | 'error'
  const [isStarting, setIsStarting] = useState(false);

  // Room & Signaling
  const [roomId, setRoomId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Transfer Telemetry
  const [progress, setProgress] = useState(0);
  const [bytesSent, setBytesSent] = useState(0);
  const [speedFormatted, setSpeedFormatted] = useState('0 MB/s');
  const [eta, setEta] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('waiting'); // 'waiting' | 'connecting' | 'connected' | 'completed'

  const senderRef = useRef(null);
  const pollTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Start P2P session
  const startDirectSession = async () => {
    if (!file || isStarting) return;
    setIsStarting(true);
    setErrorMessage('');

    try {
      // 1. Initialize P2P Sender
      const sender = new P2PSender({
        file,
        onProgress: (p) => {
          setProgress(p.progress);
          setBytesSent(p.bytesSent || 0);
          setSpeedFormatted(p.speedFormatted || '0 MB/s');
          setEta(p.eta || 0);
          if (p.status === 'transferring') {
            setStep('transferring');
          } else if (p.status === 'completed') {
            setStep('completed');
          }
        },
        onStatusChange: (status) => {
          setConnectionStatus(status);
        },
        onError: (err) => {
          setErrorMessage(err.message);
          setStep('error');
        }
      });
      senderRef.current = sender;

      // 2. Generate SDP Offer with live candidate streaming
      let activeRoomId = null;
      const pendingCandidates = [];

      const offer = await sender.initializeOffer(async (candidate) => {
        if (activeRoomId) {
          try {
            await api.sendP2PCandidate(activeRoomId, { role: 'sender', candidate });
          } catch (e) {}
        } else {
          pendingCandidates.push(candidate);
        }
      });

      // 3. Register room with signaling API
      const res = await api.createP2PRoom({
        filename: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      });

      activeRoomId = res.roomId;
      setRoomId(res.roomId);

      // Flush candidates gathered before room ID was returned
      for (const cand of pendingCandidates) {
        try {
          await api.sendP2PCandidate(res.roomId, { role: 'sender', candidate: cand });
        } catch (e) {}
      }

      // Generate QR Code pointing to direct receiver
      const directUrl = `${window.location.origin}/direct/${res.roomId}`;
      const qrUrl = await QRCode.toDataURL(directUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#101115',
          light: '#FDFDFC'
        }
      });
      setQrDataUrl(qrUrl);

      // 4. Start high-frequency polling for receiver's SDP Answer & candidates (400ms)
      startSignalingPoll(res.roomId);
      setStep('waiting');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initialize direct P2P session');
      setStep('error');
    } finally {
      setIsStarting(false);
    }
  };

  // Poll for receiver handshake (fast 400ms interval for sub-second pairing)
  const startSignalingPoll = (targetRoomId) => {
    let answerApplied = false;

    pollTimerRef.current = setInterval(async () => {
      try {
        const pollData = await api.pollP2PRoom(targetRoomId, 'sender');

        // Apply SDP Answer once receiver connects
        if (pollData.answer && !answerApplied && senderRef.current) {
          answerApplied = true;
          await senderRef.current.applyAnswer(pollData.answer);
        }

        // Apply incoming receiver ICE candidates
        if (pollData.candidates && pollData.candidates.length > 0 && senderRef.current) {
          for (const cand of pollData.candidates) {
            await senderRef.current.addIceCandidate(cand);
          }
        }

        if (pollData.status === 'completed') {
          clearInterval(pollTimerRef.current);
        }
      } catch (err) {
        // Silent poll error or room closed
      }
    }, 400);
  };

  const copyDirectLink = () => {
    const directUrl = `${window.location.origin}/direct/${roomId}`;
    navigator.clipboard.writeText(directUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const cancelSession = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (senderRef.current) senderRef.current.cancel();
    if (roomId) api.closeP2PRoom(roomId);
    setStep('select');
    setFile(null);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (senderRef.current) senderRef.current.cancel();
    };
  }, []);

  const isVideo = file ? isPlayableVideo(file.name, file.type) : false;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-10 animate-fade-in">
      {/* Editorial Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-paper-200/80 dark:bg-obsidian-800 text-vermilion text-[11px] font-mono font-semibold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          Sendora Direct • Local Wi-Fi P2P
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-paper-950 dark:text-obsidian-50">
          Share Movies & Files Without Internet
        </h1>
        <p className="text-xs sm:text-sm text-paper-600 dark:text-obsidian-400 leading-relaxed font-normal">
          Direct device-to-device streaming over your local Wi-Fi. <strong className="text-paper-900 dark:text-obsidian-100 font-semibold">Unlimited file size</strong>, zero cloud storage, zero internet data consumed.
        </p>
      </div>

      {/* Step 1: File Selection Canvas */}
      {step === 'select' && (
        <div className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-3xl border-2 border-dashed transition-all p-8 sm:p-14 text-center ${
              dragActive
                ? 'border-vermilion bg-vermilion-subtle/50 dark:bg-vermilion/5 scale-[0.99]'
                : file
                ? 'border-paper-300 dark:border-obsidian-700 bg-paper-50 dark:bg-obsidian-900/60'
                : 'border-paper-300 dark:border-obsidian-800 hover:border-paper-400 dark:hover:border-obsidian-600 bg-white dark:bg-obsidian-950/40 cursor-pointer'
            }`}
          >
            {/* Input overlay: Only rendered when no file is selected so it never intercepts button clicks */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className={!file ? 'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10' : 'hidden'}
            />

            {!file ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-paper-100 dark:bg-obsidian-800 text-vermilion flex items-center justify-center mx-auto shadow-subtle">
                  <Wifi className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-base sm:text-lg text-paper-900 dark:text-obsidian-100">
                    Drop your movie or any large file here
                  </p>
                  <p className="text-xs text-paper-500 dark:text-obsidian-400 font-mono">
                    Any size (1GB, 4GB, 10GB+) • MP4, MKV, ZIP, ISO, Folders
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-vermilion text-white text-xs font-bold uppercase tracking-wider shadow-subtle hover:bg-vermilion-hover transition-colors"
                >
                  Browse Files from Laptop
                </button>
              </div>
            ) : (
              <div className="relative z-20 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-vermilion-subtle dark:bg-obsidian-800 text-vermilion flex items-center justify-center mx-auto shadow-subtle">
                  {isVideo ? <Film className="w-8 h-8" /> : <File className="w-8 h-8" />}
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-2">
                    {isVideo && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-vermilion/10 text-vermilion border border-vermilion/20">
                        🎬 Movie Stream Ready
                      </span>
                    )}
                    <span className="text-xs font-mono text-paper-500 dark:text-obsidian-400">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-paper-950 dark:text-obsidian-50 truncate" title={file.name}>
                    {file.name}
                  </h3>
                  <p className="text-xs text-paper-500 font-mono">
                    Ready to stream directly to your phone or tablet
                  </p>
                </div>
                <div className="relative z-30 flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-2 rounded-xl border border-paper-300 dark:border-obsidian-700 text-xs font-semibold text-paper-700 dark:text-obsidian-300 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors cursor-pointer"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    disabled={isStarting}
                    onClick={(e) => {
                      e.stopPropagation();
                      startDirectSession();
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-vermilion text-white text-xs font-bold uppercase tracking-wider shadow-subtle hover:bg-vermilion-hover transition-all cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Starting...
                      </>
                    ) : (
                      <>
                        Start Local Transfer <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Feature Explanation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-paper-100/60 dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-800 space-y-1.5">
              <div className="flex items-center gap-2 text-vermilion font-bold text-xs uppercase tracking-wider font-mono">
                <Wifi className="w-4 h-4" /> 100% Offline Wi-Fi
              </div>
              <p className="text-xs text-paper-600 dark:text-obsidian-400 leading-relaxed">
                Connects directly device-to-device. Your files never touch the cloud or consume cellular data.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-paper-100/60 dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-800 space-y-1.5">
              <div className="flex items-center gap-2 text-vermilion font-bold text-xs uppercase tracking-wider font-mono">
                <Zap className="w-4 h-4" /> 50 – 100+ MB/s Speeds
              </div>
              <p className="text-xs text-paper-600 dark:text-obsidian-400 leading-relaxed">
                Transfers at your router's full bandwidth. A complete 2GB movie transfers in ~30 seconds.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-paper-100/60 dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-800 space-y-1.5">
              <div className="flex items-center gap-2 text-vermilion font-bold text-xs uppercase tracking-wider font-mono">
                <Film className="w-4 h-4" /> Watch While Transferring
              </div>
              <p className="text-xs text-paper-600 dark:text-obsidian-400 leading-relaxed">
                Built-in browser movie player. Your phone can play the video directly with zero app installs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Waiting for Receiver (QR Code Screen) */}
      {step === 'waiting' && (
        <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-300 dark:border-obsidian-700 p-6 sm:p-10 shadow-premium dark:shadow-premium-dark space-y-8 text-center animate-fade-in">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-paper-100 dark:bg-obsidian-800 text-vermilion text-[11px] font-mono font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-vermilion animate-ping" />
              Waiting for Receiver to Connect
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-paper-950 dark:text-obsidian-50">
              Scan with your Phone Camera
            </h2>
            <p className="text-xs text-paper-500 font-mono">
              Make sure both devices are on the same Wi-Fi network
            </p>
          </div>

          {/* QR Code Presentation */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-paper-300 shadow-md inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan to Receive"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-vermilion" />
                </div>
              )}
            </div>

            {/* Room Code Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-paper-500 font-mono">Transfer Code:</span>
              <span className="px-3 py-1 rounded-lg bg-paper-100 dark:bg-obsidian-800 border border-paper-300 dark:border-obsidian-700 font-mono font-bold text-sm tracking-widest text-vermilion">
                {roomId}
              </span>
            </div>
          </div>

          {/* Link Copy Box */}
          <div className="max-w-md mx-auto flex items-center gap-2 p-1.5 rounded-xl bg-paper-100 dark:bg-obsidian-800/80 border border-paper-300 dark:border-obsidian-700">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/direct/${roomId}`}
              className="flex-1 bg-transparent px-3 text-xs font-mono text-paper-800 dark:text-obsidian-200 outline-none truncate"
            />
            <button
              type="button"
              onClick={copyDirectLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-paper-900 dark:bg-paper-100 text-white dark:text-obsidian-950 text-xs font-semibold hover:bg-paper-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Device Connection Bridge Graphic */}
          <div className="pt-2 flex items-center justify-center gap-6 text-paper-400 dark:text-obsidian-500 text-xs font-mono">
            <div className="flex items-center gap-2 text-vermilion">
              <Laptop className="w-5 h-5" />
              <span>Laptop (Sender)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-vermilion animate-pulse" />
              <span className="w-8 border-t border-dashed border-paper-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-vermilion animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              <span>Phone (Receiver)</span>
            </div>
          </div>

          <div className="pt-4 border-t border-paper-200 dark:border-obsidian-800">
            <button
              type="button"
              onClick={cancelSession}
              className="text-xs text-paper-500 hover:text-paper-900 dark:hover:text-obsidian-200 underline font-mono"
            >
              Cancel Transfer
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Active Transferring Progress */}
      {step === 'transferring' && (
        <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-300 dark:border-obsidian-700 p-8 sm:p-12 shadow-premium dark:shadow-premium-dark space-y-8 animate-fade-in text-center max-w-xl mx-auto">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Direct P2P Link Active
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-paper-950 dark:text-obsidian-50">
              Streaming to Phone...
            </h2>
            <p className="text-xs font-mono text-paper-500 dark:text-obsidian-400 truncate max-w-sm mx-auto">
              {file?.name}
            </p>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between text-xs font-mono">
              <span className="text-3xl font-extrabold text-vermilion tabular-nums">
                {progress}%
              </span>
              <span className="text-paper-500 dark:text-obsidian-400 tabular-nums font-bold">
                {formatBytes(bytesSent)} / {formatBytes(file?.size || 0)}
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-paper-100 dark:bg-obsidian-800 overflow-hidden p-0.5 border border-paper-200 dark:border-obsidian-700">
              <div
                className="h-full bg-vermilion rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Speed & ETA Meters */}
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-paper-50 dark:bg-obsidian-800/60 border border-paper-200 dark:border-obsidian-800 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-paper-500 font-bold">
                Local Wi-Fi Speed
              </span>
              <p className="text-lg font-bold font-mono text-paper-950 dark:text-obsidian-50 tabular-nums">
                {speedFormatted}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-paper-50 dark:bg-obsidian-800/60 border border-paper-200 dark:border-obsidian-800 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-paper-500 font-bold">
                Estimated Remaining
              </span>
              <p className="text-lg font-bold font-mono text-paper-950 dark:text-obsidian-50 tabular-nums">
                {eta > 0 ? `${eta} seconds` : 'Finalizing...'}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-paper-400 dark:text-obsidian-500 font-mono">
            ⚠️ Please keep this tab open until the transfer finishes
          </p>

          <button
            type="button"
            onClick={cancelSession}
            className="text-xs text-paper-500 hover:text-red-500 font-mono underline"
          >
            Abort Transfer
          </button>
        </div>
      )}

      {/* Step 4: Transfer Completed */}
      {step === 'completed' && (
        <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-300 dark:border-obsidian-700 p-8 sm:p-12 shadow-premium dark:shadow-premium-dark space-y-6 text-center max-w-lg mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-subtle">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-paper-950 dark:text-obsidian-50">
              Transfer Complete!
            </h2>
            <p className="text-xs text-paper-500 font-mono">
              The movie/file has been successfully sent to your recipient device.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-paper-50 dark:bg-obsidian-800/40 border border-paper-200 dark:border-obsidian-800 text-xs font-mono space-y-1">
            <p className="text-paper-700 dark:text-obsidian-300 font-bold truncate">
              {file?.name}
            </p>
            <p className="text-paper-500">
              {formatBytes(file?.size || 0)} delivered at local Wi-Fi speeds
            </p>
          </div>

          <button
            type="button"
            onClick={cancelSession}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-subtle"
          >
            Send Another File
          </button>
        </div>
      )}

      {/* Error state */}
      {step === 'error' && (
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-red-900 dark:text-red-200">
              Direct Transfer Interrupted
            </h3>
            <p className="text-xs text-red-700 dark:text-red-400 font-mono">
              {errorMessage || 'Connection failed. Verify both devices are on the same Wi-Fi network.'}
            </p>
          </div>
          <button
            type="button"
            onClick={cancelSession}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
