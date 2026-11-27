import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  Film,
  RotateCcw,
  PictureInPicture,
  Check
} from 'lucide-react';
import { formatBytes } from '../lib/crypto';

/**
 * Format seconds to HH:MM:SS or MM:SS
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function MovieStreamPlayer({
  videoUrl,
  filename,
  fileSize,
  downloadUrl,
  autoPlay = false
}) {
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [copied, setCopied] = useState(false);

  // Time update handler
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (autoPlay) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Seek
  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  // Volume
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  // Fullscreen
  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await playerContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        // Fallback for iOS Safari
        if (videoRef.current && videoRef.current.webkitEnterFullscreen) {
          videoRef.current.webkitEnterFullscreen();
        }
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Picture in picture
  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  // Playback rate cycle (1x -> 1.25x -> 1.5x -> 2x)
  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Player Frame */}
      <div
        ref={playerContainerRef}
        className="relative group bg-black rounded-2xl overflow-hidden border border-paper-300 dark:border-obsidian-700 shadow-premium dark:shadow-premium-dark select-none"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          className="w-full max-h-[70vh] object-contain bg-black cursor-pointer"
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Big Center Play Overlay (when paused) */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer transition-opacity"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-vermilion text-white flex items-center justify-center shadow-glow transition-transform hover:scale-110 active:scale-95">
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-0.5" />
            </div>
          </div>
        )}

        {/* Custom Cinematic Bottom Controls */}
        <div
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 sm:p-5 transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Scrubber Range */}
          <div className="relative mb-3 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-vermilion"
            />
          </div>

          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between text-white text-xs font-mono">
            {/* Left Controls: Play/Pause, Volume, Time */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              <div className="flex items-center gap-1.5 group/volume">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-vermilion hidden sm:block"
                />
              </div>

              <div className="text-[11px] tabular-nums text-white/80">
                <span>{formatTime(currentTime)}</span>
                <span className="mx-1 text-white/40">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Speed, PiP, Fullscreen */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={cycleSpeed}
                className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-bold tracking-wider transition-colors"
                title="Change Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {document.pictureInPictureEnabled && (
                <button
                  type="button"
                  onClick={togglePip}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors hidden sm:block"
                  title="Picture in Picture"
                >
                  <PictureInPicture className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Movie Information & Actions Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-paper-100 dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-vermilion/10 text-vermilion border border-vermilion/20">
              ⚡ Local Wi-Fi Stream
            </span>
            <span className="text-xs text-paper-500 dark:text-obsidian-400 font-mono">
              {formatBytes(fileSize)}
            </span>
          </div>
          <h3 className="font-extrabold text-sm sm:text-base text-paper-950 dark:text-obsidian-50 truncate max-w-md">
            {filename}
          </h3>
          <p className="text-[11px] text-paper-500 dark:text-obsidian-400 font-mono">
            Zero internet bandwidth consumed • Streamed directly from sender's device storage
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <a
            href={downloadUrl || videoUrl}
            download={filename}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white text-xs font-bold uppercase tracking-wider transition-all shadow-subtle"
          >
            <Download className="w-4 h-4" /> Save Movie to Device
          </a>
        </div>
      </div>
    </div>
  );
}
