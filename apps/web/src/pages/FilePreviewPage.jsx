import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatBytes } from '../lib/crypto';
import { ArrowLeft, Download, File, Loader2 } from 'lucide-react';

export function FilePreviewPage() {
  const { id, fileId } = useParams();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [textContent, setTextContent] = useState('');

  const unlockToken = sessionStorage.getItem(`sendora_unlock_${id}`) || '';

  useEffect(() => {
    api.getTransfer(id, { unlockToken })
      .then((data) => {
        const found = data.files?.find(f => f.id === fileId);
        if (!found) throw new Error('File not found in transfer');
        setFile(found);

        const ext = found.safe_filename?.split('.').pop().toLowerCase() || '';
        const isText = ['txt', 'md', 'json', 'js', 'py', 'css', 'html'].includes(ext);

        if (isText) {
          const tokenParam = unlockToken ? `?unlock_token=${encodeURIComponent(unlockToken)}` : '';
          return fetch(`/api/downloads/${id}/file/${fileId}/preview${tokenParam}`)
            .then(res => res.text())
            .then(t => setTextContent(t));
        }
      })
      .catch((err) => {
        setError(err.message || 'Unable to preview file');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, fileId, unlockToken]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-xs font-mono text-sendora-500">Loading secure preview...</p>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-lg font-bold text-sendora-900 dark:text-white">Preview Unavailable</h2>
        <p className="text-xs text-sendora-500">{error || 'File not found'}</p>
        <Link
          to={`/t/${id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Transfer
        </Link>
      </div>
    );
  }

  const ext = file.safe_filename?.split('.').pop().toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  const isPdf = ext === 'pdf';
  const isText = ['txt', 'md', 'json', 'js', 'py', 'css', 'html'].includes(ext);

  const tokenParam = unlockToken ? `?unlock_token=${encodeURIComponent(unlockToken)}` : '';
  const previewUrl = `/api/downloads/${id}/file/${file.id}/preview${tokenParam}`;
  const downloadUrl = `/api/downloads/${id}/file/${file.id}${tokenParam}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={`/t/${id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-sendora-600 dark:text-sendora-400 hover:text-sendora-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Transfer
        </Link>

        <a
          href={downloadUrl}
          download={file.safe_filename}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> Download ({formatBytes(file.file_size)})
        </a>
      </div>

      {/* Preview Container */}
      <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 shadow-sm flex flex-col items-center justify-center min-h-[60vh]">
        {isImage && (
          <img
            src={previewUrl}
            alt={file.safe_filename}
            className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-sm"
          />
        )}

        {isPdf && (
          <iframe
            src={previewUrl}
            title={file.safe_filename}
            className="w-full h-[75vh] rounded-2xl border border-sendora-200 dark:border-sendora-800"
          />
        )}

        {isText && (
          <pre className="w-full h-[75vh] p-6 font-mono text-xs text-sendora-900 dark:text-sendora-100 bg-sendora-50 dark:bg-sendora-950 rounded-2xl border border-sendora-200 dark:border-sendora-800 overflow-auto whitespace-pre-wrap select-text">
            {textContent}
          </pre>
        )}

        {!isImage && !isPdf && !isText && (
          <div className="text-center space-y-3 p-8">
            <File className="w-16 h-16 text-sendora-400 mx-auto" />
            <h3 className="text-base font-bold text-sendora-900 dark:text-white">
              Inline Preview Not Supported
            </h3>
            <p className="text-xs text-sendora-500 max-w-sm">
              This file type cannot be rendered inline safely. Please download the file to inspect its contents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
