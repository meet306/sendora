import React, { useRef, useState } from 'react';
import { formatBytes } from '../lib/crypto';
import {
  UploadCloud,
  File,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Code,
  X,
  FolderUp,
  AlertCircle
} from 'lucide-react';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

/**
 * Return appropriate Lucide icon by mime type or file extension
 */
export function getFileTypeIcon(filename = '', mimeType = '') {
  const ext = filename.split('.').pop().toLowerCase();

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <Image className="w-4 h-4 text-emerald-500" />;
  }
  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return <Film className="w-4 h-4 text-purple-500" />;
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return <Music className="w-4 h-4 text-amber-500" />;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return <Archive className="w-4 h-4 text-accent" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'go', 'rs', 'sql'].includes(ext)) {
    return <Code className="w-4 h-4 text-blue-500" />;
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return <FileText className="w-4 h-4 text-red-500" />;
  }
  return <File className="w-4 h-4 text-paper-500" />;
}

export function Dropzone({ files, setFiles, error, setError }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleFilesAdded = (incomingList) => {
    setError(null);
    const addedFiles = Array.from(incomingList);
    const valid = [];
    const oversized = [];

    for (const f of addedFiles) {
      if (f.size > MAX_FILE_SIZE) {
        oversized.push(f.name);
      } else {
        valid.push(f);
      }
    }

    if (oversized.length > 0) {
      setError(`The following files exceed the 200 MB limit: ${oversized.join(', ')}`);
    }

    if (valid.length > 0) {
      setFiles((prev) => [...prev, ...valid]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full space-y-4">
      {/* Tactile Drop Stage */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 p-8 md:p-12 text-center transition-all ${
          isDragOver
            ? 'border-accent bg-accent/5 dark:bg-accent/10 scale-[1.005]'
            : 'border-paper-300/80 dark:border-obsidian-700 bg-white/70 dark:bg-obsidian-900/40 hover:border-paper-400 dark:hover:border-obsidian-600'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
          className="hidden"
        />
        <input
          type="file"
          ref={folderInputRef}
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isDragOver
                ? 'bg-accent text-white scale-110 shadow-glow'
                : 'bg-paper-100 dark:bg-obsidian-800 text-paper-700 dark:text-obsidian-200 border border-paper-200 dark:border-obsidian-700'
            }`}
          >
            <UploadCloud className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-paper-900 dark:text-obsidian-100">
              {isDragOver ? 'Release to stage files' : 'Drop files or folders here'}
            </h3>
            <p className="text-xs text-paper-500 dark:text-obsidian-400">
              Drag & drop any format or browse your device
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-paper-100 hover:bg-paper-200 dark:bg-obsidian-800 dark:hover:bg-obsidian-700 text-paper-800 dark:text-obsidian-200 border border-paper-200 dark:border-obsidian-700 transition-colors"
            >
              Browse Files
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-paper-100 hover:bg-paper-200 dark:bg-obsidian-800 dark:hover:bg-obsidian-700 text-paper-800 dark:text-obsidian-200 border border-paper-200 dark:border-obsidian-700 transition-colors"
            >
              <FolderUp className="w-3.5 h-3.5 text-accent" />
              Upload Folder
            </button>
          </div>

          <div className="text-[11px] font-mono text-paper-400 dark:text-obsidian-500 pt-1">
            Up to 200 MB per file • Direct Cloudflare storage
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected files table */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-obsidian-900 rounded-2xl border border-paper-200 dark:border-obsidian-700 p-4 space-y-3 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-mono text-paper-600 dark:text-obsidian-400 border-b border-paper-100 dark:border-obsidian-800 pb-2.5">
            <span>
              {files.length} {files.length === 1 ? 'file' : 'files'} ({formatBytes(totalSize)})
            </span>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-red-500 hover:text-red-600 font-sans text-xs transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-paper-50 dark:bg-obsidian-800/40 border border-paper-200/60 dark:border-obsidian-700/60 group hover:border-paper-300 dark:hover:border-obsidian-600 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-obsidian-800 flex items-center justify-center border border-paper-200 dark:border-obsidian-700 flex-shrink-0">
                    {getFileTypeIcon(file.name, file.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-paper-900 dark:text-obsidian-100 truncate max-w-md">
                      {file.name}
                    </p>
                    <p className="text-[11px] font-mono text-paper-400 dark:text-obsidian-500 tabular-nums">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1 rounded-lg text-paper-400 hover:text-red-500 hover:bg-paper-200/60 dark:hover:bg-obsidian-700 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
