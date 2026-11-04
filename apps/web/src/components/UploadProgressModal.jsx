import React from 'react';
import { formatBytes, formatSpeed, formatDuration } from '../lib/crypto';
import { UploadCloud, XCircle, CheckCircle2, Loader2 } from 'lucide-react';

export function UploadProgressModal({
  isOpen,
  currentFileIndex,
  totalFiles,
  progressData,
  onCancel
}) {
  if (!isOpen) return null;

  const {
    status = 'uploading',
    progress = 0,
    filename = '',
    bytesUploaded = 0,
    totalBytes = 0,
    speed = 0,
    eta = 0,
    part = 1,
    totalParts = 1
  } = progressData || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sendora-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-premium space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
              {status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : status === 'hashing' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-sendora-900 dark:text-white">
                {status === 'hashing'
                  ? 'Verifying Integrity (SHA-256)...'
                  : status === 'initiating'
                  ? 'Preparing R2 Storage...'
                  : status === 'finalizing'
                  ? 'Finalizing Transfer...'
                  : status === 'completed'
                  ? 'Upload Complete'
                  : `Uploading (${currentFileIndex + 1}/${totalFiles})`}
              </h3>
              <p className="text-xs text-sendora-500 dark:text-sendora-400 truncate max-w-[220px]">
                {filename}
              </p>
            </div>
          </div>

          <span className="text-sm font-mono font-bold text-accent">
            {progress}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-2.5 rounded-full bg-sendora-100 dark:bg-sendora-800 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-sendora-500 dark:text-sendora-400">
            <span>
              {formatBytes(bytesUploaded)} of {formatBytes(totalBytes)}
            </span>
            {totalParts > 1 && (
              <span>
                Part {part} of {totalParts}
              </span>
            )}
          </div>
        </div>

        {/* Real-time metrics grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-sendora-50 dark:bg-sendora-800/40 border border-sendora-100 dark:border-sendora-800">
          <div>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-sendora-400">
              Transfer Speed
            </span>
            <span className="text-xs font-mono font-semibold text-sendora-800 dark:text-sendora-200">
              {formatSpeed(speed)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-sendora-400">
              Time Remaining
            </span>
            <span className="text-xs font-mono font-semibold text-sendora-800 dark:text-sendora-200">
              {eta > 0 ? formatDuration(eta) : 'Calculating...'}
            </span>
          </div>
        </div>

        {/* Cancel button */}
        {status !== 'completed' && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            Cancel Upload
          </button>
        )}
      </div>
    </div>
  );
}
