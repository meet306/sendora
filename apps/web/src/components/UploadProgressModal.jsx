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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper-950/80 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 md:p-8 shadow-card dark:shadow-card-dark space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              {status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : status === 'hashing' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-paper-900 dark:text-obsidian-100">
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
              <p className="text-xs text-paper-500 truncate max-w-[200px]">
                {filename}
              </p>
            </div>
          </div>

          <span className="text-sm font-mono font-bold text-accent tabular-nums">
            {progress}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-2 rounded-full bg-paper-100 dark:bg-obsidian-800 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-paper-400 dark:text-obsidian-500 tabular-nums">
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
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-paper-50 dark:bg-obsidian-800/40 border border-paper-100 dark:border-obsidian-800">
          <div>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-paper-400">
              Transfer Speed
            </span>
            <span className="text-xs font-mono font-bold text-paper-800 dark:text-obsidian-200 tabular-nums">
              {formatSpeed(speed)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-paper-400">
              Time Remaining
            </span>
            <span className="text-xs font-mono font-bold text-paper-800 dark:text-obsidian-200 tabular-nums">
              {eta > 0 ? formatDuration(eta) : 'Calculating...'}
            </span>
          </div>
        </div>

        {/* Cancel button */}
        {status !== 'completed' && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            Cancel Upload
          </button>
        )}
      </div>
    </div>
  );
}
