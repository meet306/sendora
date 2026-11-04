import React, { useEffect, useState } from 'react';
import { formatBytes } from '../lib/crypto';
import { X, Download, File, Loader2 } from 'lucide-react';

export function FilePreviewModal({
  isOpen,
  file,
  transferId,
  unlockToken,
  onClose
}) {
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState('');
  const [previewError, setPreviewError] = useState(false);

  if (!isOpen || !file) return null;

  const ext = file.safe_filename?.split('.').pop().toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  const isPdf = ext === 'pdf';
  const isText = ['txt', 'md', 'json', 'js', 'py', 'css', 'html'].includes(ext);

  const tokenParam = unlockToken ? `?unlock_token=${encodeURIComponent(unlockToken)}` : '';
  const previewUrl = `/api/downloads/${transferId}/file/${file.id}/preview${tokenParam}`;
  const downloadUrl = `/api/downloads/${transferId}/file/${file.id}${tokenParam}`;

  useEffect(() => {
    setLoading(true);
    setPreviewError(false);
    setTextContent('');

    if (isText) {
      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Preview failed');
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(() => {
          setPreviewError(true);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [file.id, previewUrl, isText]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper-950/80 dark:bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 shadow-card dark:shadow-card-dark flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-paper-200 dark:border-obsidian-800 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-paper-900 dark:text-obsidian-50 truncate">
              {file.original_filename || file.safe_filename}
            </h3>
            <p className="text-xs font-mono text-paper-500 tabular-nums">
              {formatBytes(file.file_size)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={file.safe_filename}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-paper-400 hover:text-paper-700 dark:hover:text-obsidian-200 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-[300px] bg-paper-50 dark:bg-obsidian-950">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-paper-500">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="text-xs font-mono">Loading preview...</span>
            </div>
          )}

          {!loading && isImage && !previewError && (
            <img
              src={previewUrl}
              alt={file.safe_filename}
              className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-subtle"
              onError={() => setPreviewError(true)}
            />
          )}

          {!loading && isPdf && !previewError && (
            <iframe
              src={previewUrl}
              title={file.safe_filename}
              className="w-full h-[70vh] rounded-xl border border-paper-200 dark:border-obsidian-700"
            />
          )}

          {!loading && isText && !previewError && (
            <pre className="w-full h-full max-h-[70vh] p-4 font-mono text-xs text-paper-900 dark:text-obsidian-100 bg-white dark:bg-obsidian-900 rounded-xl border border-paper-200 dark:border-obsidian-700 overflow-auto whitespace-pre-wrap select-text">
              {textContent}
            </pre>
          )}

          {!loading && (!isImage && !isPdf && !isText || previewError) && (
            <div className="flex flex-col items-center justify-center text-center max-w-sm p-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-paper-200 dark:bg-obsidian-800 flex items-center justify-center text-paper-600 dark:text-obsidian-300">
                <File className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-paper-900 dark:text-obsidian-100">
                  Preview Not Available
                </h4>
                <p className="text-xs text-paper-500 leading-relaxed">
                  Direct browser preview is not supported for this format. You can download the file to inspect it locally.
                </p>
              </div>
              <a
                href={downloadUrl}
                download={file.safe_filename}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download ({formatBytes(file.file_size)})
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
