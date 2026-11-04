import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatBytes, getCountdown } from '../lib/crypto';
import { getFileTypeIcon } from '../components/Dropzone';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { useHistory } from '../context/HistoryContext';
import {
  Download,
  Lock,
  Clock,
  Eye,
  FileText,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
  FolderArchive
} from 'lucide-react';

export function TransferDetailsPage() {
  const { id } = useParams();
  const { addReceivedTransfer } = useHistory();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Password unlock dialog state
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockToken, setUnlockToken] = useState(() => {
    return sessionStorage.getItem(`sendora_unlock_${id}`) || '';
  });
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState(null);

  // Expiry countdown
  const [countdown, setCountdown] = useState({ label: '', isExpired: false });

  // Preview modal state
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);

  // Clipboard copy state
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Download All status
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getTransfer(id, { unlockToken })
      .then((data) => {
        setTransfer(data);
        setLoading(false);

        // Record in history if unlocked
        if (!data.requires_password) {
          addReceivedTransfer({
            id: data.id,
            short_code: data.short_code,
            title: data.title || 'Received Transfer',
            expires_at: data.expires_at,
            file_count: data.file_count,
            total_size: data.total_size
          });
        }
      })
      .catch((err) => {
        setError(err.message || 'Transfer unavailable');
        setLoading(false);
      });
  }, [id, unlockToken]);

  // Real-time expiry ticker
  useEffect(() => {
    if (!transfer?.expires_at) return;

    const interval = setInterval(() => {
      setCountdown(getCountdown(transfer.expires_at));
    }, 1000);

    setCountdown(getCountdown(transfer.expires_at));
    return () => clearInterval(interval);
  }, [transfer?.expires_at]);

  const handleUnlockPassword = async (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setUnlocking(true);
    setUnlockError(null);

    try {
      const res = await api.unlockTransfer(id, passwordInput.trim());
      setUnlockToken(res.unlock_token);
      sessionStorage.setItem(`sendora_unlock_${id}`, res.unlock_token);
      // Re-fetch transfer
      const full = await api.getTransfer(id, { unlockToken: res.unlock_token });
      setTransfer(full);
      addReceivedTransfer({
        id: full.id,
        short_code: full.short_code,
        title: full.title || 'Received Transfer',
        expires_at: full.expires_at,
        file_count: full.file_count,
        total_size: full.total_size
      });
    } catch (err) {
      setUnlockError(err.message || 'Incorrect password');
    } finally {
      setUnlocking(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!transfer?.files || transfer.files.length === 0) return;
    setDownloadingAll(true);

    // Sequential trigger for individual browser downloads
    for (const file of transfer.files) {
      const tokenParam = unlockToken ? `?unlock_token=${encodeURIComponent(unlockToken)}` : '';
      const downloadUrl = `/api/downloads/${transfer.id}/file/${file.id}${tokenParam}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.safe_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(r => setTimeout(r, 600)); // Delay between downloads to prevent browser blocking
    }

    setDownloadingAll(false);
  };

  const copyClipboardSnippet = async () => {
    if (!transfer?.clipboard_text) return;
    try {
      await navigator.clipboard.writeText(transfer.clipboard_text);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-xs font-mono text-sendora-500">Decrypting transfer status...</p>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-sendora-900 dark:text-white">
          Transfer Expired or Inaccessible
        </h2>
        <p className="text-xs text-sendora-500 leading-relaxed">
          {error || 'This transfer may have reached its download limit, expired, or been removed by the sender.'}
        </p>
        <Link
          to="/receive"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold"
        >
          Try Another Code
        </Link>
      </div>
    );
  }

  // Password Protected State: STRICT PRIVACY REQUIREMENT - zero file metadata shown!
  if (transfer.requires_password) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16 md:py-24 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-sendora-900 dark:text-white">
            Password Protected
          </h1>
          <p className="text-xs text-sendora-500 max-w-xs mx-auto leading-relaxed">
            The sender protected this transfer. Enter the password to unlock and preview files.
          </p>
        </div>

        <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-premium space-y-5">
          <form onSubmit={handleUnlockPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-sendora-700 dark:text-sendora-300 mb-1.5">
                Transfer Password
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setUnlockError(null);
                }}
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-white"
              />
            </div>

            {unlockError && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 animate-shake">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={unlocking || !passwordInput.trim()}
              className="w-full py-3 px-4 rounded-xl bg-accent text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
            >
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock Transfer'}
            </button>
          </form>

          <div className="pt-3 border-t border-sendora-100 dark:border-sendora-800 flex items-center justify-between text-[11px] font-mono text-sendora-400">
            <span>SND-{transfer.short_code}</span>
            <span>{countdown.label}</span>
          </div>
        </div>
      </div>
    );
  }

  // Authorized Transfer View
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8 animate-fade-in">
      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={Boolean(selectedPreviewFile)}
        file={selectedPreviewFile}
        transferId={transfer.id}
        unlockToken={unlockToken}
        onClose={() => setSelectedPreviewFile(null)}
      />

      {/* Transfer Header Card */}
      <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sendora-100 dark:border-sendora-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-accent/10 text-accent">
                SND-{transfer.short_code}
              </span>
              {transfer.has_password && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Password Verified
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-sendora-900 dark:text-white">
              {transfer.title || 'Shared Transfer'}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 flex items-center gap-1.5 text-sendora-700 dark:text-sendora-300">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span>{countdown.label}</span>
            </div>
          </div>
        </div>

        {/* Sender message if any */}
        {transfer.message && (
          <div className="p-4 rounded-2xl bg-sendora-50 dark:bg-sendora-800/40 border border-sendora-100 dark:border-sendora-800 text-xs text-sendora-700 dark:text-sendora-300 leading-relaxed">
            <span className="font-semibold block mb-1 text-sendora-900 dark:text-white font-mono uppercase text-[10px]">
              Note from Sender:
            </span>
            {transfer.message}
          </div>
        )}

        {/* Download limit indicator */}
        {transfer.max_downloads && (
          <div className="text-[11px] font-mono text-sendora-500">
            Download Availability: {transfer.download_count} of {transfer.max_downloads} maximum downloads claimed.
          </div>
        )}
      </div>

      {/* Case 1: Clipboard Text View */}
      {transfer.transfer_type === 'clipboard' && transfer.clipboard_text && (
        <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-sendora-700 dark:text-sendora-300 font-semibold">
              Shared Text Snippet
            </h3>
            <button
              onClick={copyClipboardSnippet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sendora-200 dark:border-sendora-700 text-xs font-medium text-sendora-700 dark:text-sendora-300 hover:bg-sendora-100 dark:hover:bg-sendora-800 transition-colors"
            >
              {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSnippet ? 'Copied' : 'Copy Snippet'}
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-sendora-50 dark:bg-sendora-950 font-mono text-xs text-sendora-900 dark:text-sendora-100 border border-sendora-200/60 dark:border-sendora-800 overflow-x-auto whitespace-pre-wrap select-text">
            {transfer.clipboard_text}
          </pre>
        </div>
      )}

      {/* Case 2: Files Listing View */}
      {transfer.transfer_type !== 'clipboard' && (
        <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-sendora-900 dark:text-white uppercase tracking-wider font-mono">
                Files In Transfer ({transfer.files?.length || 0})
              </h3>
              <p className="text-xs text-sendora-500">
                Total payload: {formatBytes(transfer.total_size)}
              </p>
            </div>

            {transfer.files && transfer.files.length > 1 && (
              <button
                type="button"
                disabled={downloadingAll}
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {downloadingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Downloading...
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-3.5 h-3.5" /> Download All Files
                  </>
                )}
              </button>
            )}
          </div>

          {/* Files Table */}
          <div className="space-y-3">
            {transfer.files?.map((file) => {
              const tokenParam = unlockToken ? `?unlock_token=${encodeURIComponent(unlockToken)}` : '';
              const downloadUrl = `/api/downloads/${transfer.id}/file/${file.id}${tokenParam}`;

              return (
                <div
                  key={file.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-sendora-50 dark:bg-sendora-800/40 border border-sendora-200/60 dark:border-sendora-800 hover:border-sendora-300 dark:hover:border-sendora-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-sendora-800 flex items-center justify-center border border-sendora-200/60 dark:border-sendora-700 flex-shrink-0">
                      {getFileTypeIcon(file.safe_filename, file.mime_type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-sendora-900 dark:text-white truncate">
                        {file.original_filename || file.safe_filename}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-sendora-500">
                        <span>{formatBytes(file.file_size)}</span>
                        {file.sha256_hash && (
                          <span
                            className="text-[10px] text-sendora-400 hover:text-accent cursor-pointer truncate max-w-[140px]"
                            title={`SHA-256: ${file.sha256_hash}`}
                          >
                            • SHA: {file.sha256_hash.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewFile(file)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sendora-200 dark:border-sendora-700 text-xs font-medium text-sendora-700 dark:text-sendora-300 hover:bg-sendora-100 dark:hover:bg-sendora-800 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>

                    <a
                      href={downloadUrl}
                      download={file.safe_filename}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
