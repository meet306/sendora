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
    return <Image className="w-5 h-5 text-blue-500" />;
  }
  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return <Film className="w-5 h-5 text-purple-500" />;
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return <Music className="w-5 h-5 text-amber-500" />;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return <Archive className="w-5 h-5 text-emerald-500" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'go', 'rs', 'sql'].includes(ext)) {
    return <Code className="w-5 h-5 text-pink-500" />;
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  return <File className="w-5 h-5 text-sendora-500" />;
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
      {/* Drop Zone Box */}
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
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all ${
          isDragOver
            ? 'border-accent bg-accent/5 dark:bg-accent/10 scale-[1.01]'
            : 'border-sendora-300 dark:border-sendora-800 bg-white/60 dark:bg-sendora-900/40 hover:border-sendora-400 dark:hover:border-sendora-700'
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

        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              isDragOver
                ? 'bg-accent text-white scale-110 shadow-glow'
                : 'bg-sendora-100 dark:bg-sendora-800 text-sendora-600 dark:text-sendora-300'
            }`}
          >
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-sendora-900 dark:text-white">
              {isDragOver ? 'Drop files here' : 'Drop your files here to start'}
            </h3>
            <p className="text-xs text-sendora-500 dark:text-sendora-400">
              Drag & drop any file or click to browse from device.
            </p>
          </div>

          {/* Action pills */}
          <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-sendora-100 hover:bg-sendora-200 dark:bg-sendora-800 dark:hover:bg-sendora-700 text-sendora-800 dark:text-sendora-200 transition-colors"
            >
              Browse Files
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-sendora-100 hover:bg-sendora-200 dark:bg-sendora-800 dark:hover:bg-sendora-700 text-sendora-800 dark:text-sendora-200 transition-colors"
            >
              <FolderUp className="w-3.5 h-3.5 text-accent" />
              Upload Folder
            </button>
          </div>

          <div className="pt-2 text-[11px] font-mono text-sendora-400">
            Up to 200 MB per file • End-to-end encrypted transfer
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Staged Files List */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-sendora-900/60 rounded-2xl border border-sendora-200 dark:border-sendora-800 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-sendora-600 dark:text-sendora-400 border-b border-sendora-100 dark:border-sendora-800/80 pb-2.5">
            <span>
              {files.length} {files.length === 1 ? 'file' : 'files'} selected ({formatBytes(totalSize)})
            </span>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-red-500 hover:text-red-600 dark:hover:text-red-400 font-normal transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-sendora-50 dark:bg-sendora-800/40 border border-sendora-200/60 dark:border-sendora-800 group hover:border-sendora-300 dark:hover:border-sendora-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-sendora-800 flex items-center justify-center border border-sendora-200/60 dark:border-sendora-700 flex-shrink-0">
                    {getFileTypeIcon(file.name, file.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-sendora-900 dark:text-sendora-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] font-mono text-sendora-500 dark:text-sendora-400">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1 rounded-lg text-sendora-400 hover:text-red-500 hover:bg-sendora-200/50 dark:hover:bg-sendora-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
