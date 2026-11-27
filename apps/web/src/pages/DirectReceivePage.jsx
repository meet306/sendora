import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { P2PReceiver, isPlayableVideo } from '../lib/webrtc';
import { formatBytes } from '../lib/crypto';
import { MovieStreamPlayer } from '../components/MovieStreamPlayer';
import {
  Zap,
  Wifi,
  Film,
  Download,
  Check,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Laptop
} from 'lucide-react';

export function DirectReceivePage() {
  const { roomId: paramRoomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState('');
  const activeRoomId = paramRoomId || searchParams.get('code') || '';

  const [step, setStep] = useState(activeRoomId ? 'connecting' : 'enter_code'); // 'enter_code' | 'connecting' | 'transferring' | 'completed' | 'error'
  const [fileMetadata, setFileMetadata] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Transfer Telemetry
  const [progress, setProgress] = useState(0);
  const [receivedBytes, setReceivedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [speedFormatted, setSpeedFormatted] = useState('0 MB/s');
  const [eta, setEta] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Completed State
  const [downloadUrl, setDownloadUrl] = useState('');
  const [completedFile, setCompletedFile] = useState(null);

  const receiverRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Manual code submit
  const handleCodeSubmit = (e) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (clean) {
      navigate(`/direct/${clean}`);
    }
  };

  useEffect(() => {
    if (!activeRoomId) {
      setStep('enter_code');
      return;
    }

    let isCancelled = false;

    async function initP2PReceiver() {
      setStep('connecting');
      setErrorMessage('');

      try {
        // 1. Fetch room metadata & SDP offer
        const room = await api.getP2PRoom(activeRoomId);
        if (isCancelled) return;

        setFileMetadata({
          name: room.filename,
          size: room.fileSize,
          type: room.fileType,
          isVideo: isPlayableVideo(room.filename, room.fileType)
        });
        setTotalBytes(room.fileSize);

        // 2. Initialize P2P Receiver
        const receiver = new P2PReceiver({
          onProgress: (p) => {
            if (isCancelled) return;
            setProgress(p.progress);
            setReceivedBytes(p.receivedBytes || 0);
            setSpeedFormatted(p.speedFormatted || '0 MB/s');
            setEta(p.eta || 0);
            if (p.status === 'transferring') {
              setStep('transferring');
            }
          },
          onComplete: (res) => {
            if (isCancelled) return;
            setDownloadUrl(res.downloadUrl);
            setCompletedFile(res);
            setStep('completed');
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          },
          onStatusChange: (status) => {
            if (isCancelled) return;
            setConnectionStatus(status);
          },
          onError: (err) => {
            if (isCancelled) return;
            setErrorMessage(err.message);
            setStep('error');
          }
        });
        receiverRef.current = receiver;

        // 3. Process SDP offer & generate SDP answer with live candidate streaming
        const answer = await receiver.handleOffer(room.offer, async (cand) => {
          try {
            await api.sendP2PCandidate(activeRoomId, { role: 'receiver', candidate: cand });
          } catch (e) {}
        });

        // 4. Send SDP answer to signaling server
        await api.sendP2PAnswer(activeRoomId, {
          answer: {
            type: answer.type,
            sdp: answer.sdp
          }
        });

        // Apply any sender ICE candidates already available
        if (room.senderCandidates && room.senderCandidates.length > 0) {
          for (const cand of room.senderCandidates) {
            await receiver.addIceCandidate(cand);
          }
        }

        // 5. Start candidate polling (fast 400ms interval for immediate pairing)
        pollTimerRef.current = setInterval(async () => {
          try {
            const pollData = await api.pollP2PRoom(activeRoomId, 'receiver');
            if (pollData.candidates && pollData.candidates.length > 0 && receiverRef.current) {
              for (const cand of pollData.candidates) {
                await receiverRef.current.addIceCandidate(cand);
              }
            }
          } catch (e) {}
        }, 400);
      } catch (err) {
        if (isCancelled) return;
        setErrorMessage(err.message || 'Direct transfer room not found or expired');
        setStep('error');
      }
    }

    initP2PReceiver();

    return () => {
      isCancelled = true;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (receiverRef.current) receiverRef.current.cancel();
    };
  }, [activeRoomId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-10 animate-fade-in">
      {/* Editorial Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-paper-200/80 dark:bg-obsidian-800 text-vermilion text-[11px] font-mono font-semibold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          Sendora Direct • Local Receiver
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-paper-950 dark:text-obsidian-50">
          Direct Device-to-Device Receiver
        </h1>
        <p className="text-xs sm:text-sm text-paper-600 dark:text-obsidian-400 font-normal">
          Receive movies and files directly over your local Wi-Fi. Zero internet data consumed.
        </p>
      </div>

      {/* State 0: Enter Room Code Manually (if no URL param) */}
      {step === 'enter_code' && (
        <div className="max-w-md mx-auto bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-300 dark:border-obsidian-700 p-8 shadow-card dark:shadow-card-dark space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-paper-100 dark:bg-obsidian-800 text-vermilion flex items-center justify-center mx-auto shadow-subtle">
            <Wifi className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-paper-950 dark:text-obsidian-100">
              Enter Transfer Code
            </h2>
            <p className="text-xs text-paper-500 font-mono">
              Type the direct room code shown on the sender's screen (e.g. D-8K2MA9)
            </p>
          </div>

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="D-XXXXXX"
              className="w-full text-center text-xl font-mono font-bold tracking-widest px-4 py-3 rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-300 dark:border-obsidian-700 text-paper-950 dark:text-obsidian-50 focus:border-vermilion outline-none"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-subtle"
            >
              Connect to Sender <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* State 1: Connecting & Establishing P2P Handshake */}
      {step === 'connecting' && (
        <div className="max-w-md mx-auto bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-300 dark:border-obsidian-700 p-8 sm:p-10 shadow-premium dark:shadow-premium-dark text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-paper-100 dark:bg-obsidian-800 text-vermilion flex items-center justify-center mx-auto shadow-subtle">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold text-vermilion uppercase tracking-widest">
              Connecting via Local Wi-Fi
            </span>
            <h2 className="text-2xl font-extrabold text-paper-950 dark:text-obsidian-50">
              Establishing Direct Link...
            </h2>
            <p className="text-xs text-paper-500 font-mono">
              Pairing device with sender room: <strong className="text-paper-900 dark:text-obsidian-200">{activeRoomId}</strong>
            </p>
          </div>

          {fileMetadata && (
            <div className="p-4 rounded-2xl bg-paper-50 dark:bg-obsidian-800/60 border border-paper-200 dark:border-obsidian-800 text-xs font-mono space-y-1 text-left">
              <span className="text-[10px] text-paper-400 uppercase tracking-wider block">Incoming File:</span>
              <p className="font-bold text-paper-950 dark:text-obsidian-100 truncate">{fileMetadata.name}</p>
              <p className="text-paper-500">{formatBytes(fileMetadata.size)}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 text-xs font-mono text-paper-500">
            <div className="flex items-center gap-1.5 text-paper-700 dark:text-obsidian-300">
              <Laptop className="w-4 h-4 text-vermilion" /> Laptop
            </div>
            <span className="w-6 border-t border-dashed border-paper-400" />
            <div className="flex items-center gap-1.5 text-paper-700 dark:text-obsidian-300">
              <Smartphone className="w-4 h-4 text-vermilion" /> This Device
            </div>
          </div>

          <p className="text-[11px] text-paper-400 dark:text-obsidian-500 font-mono">
            💡 For fastest speed, ensure your laptop and phone are on the same Wi-Fi network.
          </p>
        </div>
      )}

      {/* State 2: Active Transferring Progress */}
      {step === 'transferring' && (
        <div className="max-w-xl mx-auto bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-300 dark:border-obsidian-700 p-8 sm:p-10 shadow-premium dark:shadow-premium-dark space-y-8 animate-fade-in text-center">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Direct Streaming Active
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-paper-950 dark:text-obsidian-50">
              Receiving File...
            </h2>
            <p className="text-xs font-mono text-paper-500 truncate max-w-sm mx-auto">
              {fileMetadata?.name}
            </p>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between text-xs font-mono">
              <span className="text-3xl sm:text-4xl font-extrabold text-vermilion tabular-nums">
                {progress}%
              </span>
              <span className="text-paper-500 dark:text-obsidian-400 tabular-nums font-bold">
                {formatBytes(receivedBytes)} / {formatBytes(totalBytes)}
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
                {eta > 0 ? `${eta}s` : 'Finalizing...'}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-paper-400 dark:text-obsidian-500 font-mono">
            Direct peer-to-peer transmission • No cellular data consumed
          </p>
        </div>
      )}

      {/* State 3: Completed Transfer */}
      {step === 'completed' && completedFile && (
        <div className="space-y-6 animate-fade-in">
          {/* If video: render the full in-browser movie stream player without forcing download */}
          {completedFile.isVideo ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-paper-100 dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Check className="w-4 h-4 stroke-[3]" /> Streaming Ready • 0 MB Saved to Phone Storage
                </div>
                <span className="text-paper-500 font-bold">
                  {formatBytes(completedFile.fileSize)}
                </span>
              </div>

              {/* Full In-Browser Video Player */}
              <MovieStreamPlayer
                videoUrl={completedFile.downloadUrl}
                downloadUrl={completedFile.downloadUrl}
                filename={completedFile.filename}
                fileSize={completedFile.fileSize}
                autoPlay={false}
              />

              <div className="text-center pt-2">
                <p className="text-[11px] text-paper-400 dark:text-obsidian-500 font-mono">
                  Playing directly from browser memory over local Wi-Fi. No file is stored on your phone unless you click "Save Movie".
                </p>
              </div>
            </div>
          ) : (
            /* Non-video file completed card */
            <div className="max-w-lg mx-auto bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-300 dark:border-obsidian-700 p-8 sm:p-12 shadow-premium dark:shadow-premium-dark text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-subtle">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-paper-950 dark:text-obsidian-50">
                  File Received!
                </h2>
                <p className="text-xs text-paper-500 font-mono">
                  Transferred at local Wi-Fi speed with zero internet data.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-paper-50 dark:bg-obsidian-800/40 border border-paper-200 dark:border-obsidian-800 text-xs font-mono space-y-1">
                <p className="font-bold text-paper-900 dark:text-obsidian-100 truncate">
                  {completedFile.filename}
                </p>
                <p className="text-paper-500">
                  {formatBytes(completedFile.fileSize)}
                </p>
              </div>

              <a
                href={completedFile.downloadUrl}
                download={completedFile.filename}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-subtle"
              >
                <Download className="w-4 h-4" /> Save File to Device
              </a>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {step === 'error' && (
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-red-900 dark:text-red-200">
              Connection Failed
            </h3>
            <p className="text-xs text-red-700 dark:text-red-400 font-mono">
              {errorMessage || 'The direct room may have expired or devices are on different networks.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/direct')}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Try Another Code
          </button>
        </div>
      )}
    </div>
  );
}
