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
  EyeOff,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  FolderArchive,
  ShieldCheck
} from 'lucide-react';

export function TransferDetailsPage() {
  const { id } = useParams();
  const { addReceivedTransfer } = useHistory();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Password unlock state
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        setError(err.message || 'Transfer unavailable or expired');
        setLoading(false);
      });
  }, [id, unlockToken]);

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
      setUnlockError(err.message || 'Incorrect password. Please verify and try again.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!transfer?.files || transfer.files.length === 0) return;
    setDownloadingAll(true);

    for (const file of transfer.files) {
      const tokenParam = unlockToken ? `?unlock_token=${encodeURIComponent(unlockToken)}` : '';
      const downloadUrl = `/api/downloads/${transfer.id}/file/${file.id}${tokenParam}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.safe_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(r => setTimeout(r, 600));
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
        <p className="text-xs font-mono text-paper-500">Checking transfer authorization...</p>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-paper-900 dark:text-obsidian-100">
          Transfer Expired or Inaccessible
        </h2>
        <p className="text-xs text-paper-500 leading-relaxed">
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
          <div className="w-12 h-12 rounded-2xl bg-paper-100 dark:bg-obsidian-800 text-accent flex items-center justify-center mx-auto mb-3 border border-paper-200 dark:border-obsidian-700">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-paper-900 dark:text-obsidian-100">
            Password Protected
          </h1>
          <p className="text-xs text-paper-500 max-w-xs mx-auto leading-relaxed">
            The sender protected this transfer. Enter the password to unlock and access files.
          </p>
        </div>

        <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 md:p-8 shadow-card dark:shadow-card-dark space-y-5">
          <form onSubmit={handleUnlockPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-paper-700 dark:text-obsidian-300 mb-1.5 font-bold">
                Enter Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Password..."
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setUnlockError(null);
                  }}
                  className="w-full pr-10 pl-4 py-2.5 text-xs font-mono rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-paper-900 dark:text-obsidian-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-paper-400 hover:text-paper-700 dark:hover:text-obsidian-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-accent" />}
                </button>
              </div>
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
              className="w-full py-3 px-4 rounded-xl bg-accent text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock Transfer'}
            </button>
          </form>

          <div className="pt-3 border-t border-paper-100 dark:border-obsidian-800 flex items-center justify-between text-[11px] font-mono text-paper-400">
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
      <FilePreviewModal
        isOpen={Boolean(selectedPreviewFile)}
        file={selectedPreviewFile}
        transferId={transfer.id}
        unlockToken={unlockToken}
        onClose={() => setSelectedPreviewFile(null)}
      />

      {/* Transfer Header Card */}
      <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 md:p-8 shadow-card dark:shadow-card-dark space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-paper-100 dark:border-obsidian-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-accent/10 text-accent">
                SND-{transfer.short_code}
              </span>
              {transfer.has_password && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Password Verified
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-paper-900 dark:text-obsidian-50">
              {transfer.title || 'Shared Transfer'}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-paper-100 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 flex items-center gap-1.5 text-paper-700 dark:text-obsidian-300">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span>{countdown.label}</span>
            </div>
          </div>
        </div>

        {transfer.message && (
          <div className="p-4 rounded-xl bg-paper-50 dark:bg-obsidian-800/40 border border-paper-100 dark:border-obsidian-800 text-xs text-paper-700 dark:text-obsidian-300 leading-relaxed">
            <span className="font-bold block mb-1 text-paper-900 dark:text-obsidian-100 font-mono uppercase text-[10px]">
              Note from Sender:
            </span>
            {transfer.message}
          </div>
        )}

        {transfer.max_downloads && (
          <div className="text-[11px] font-mono text-paper-500">
            Download Availability: {transfer.download_count} of {transfer.max_downloads} maximum downloads claimed.
          </div>
        )}
      </div>

      {/* Case 1: Clipboard Text View */}
      {transfer.transfer_type === 'clipboard' && transfer.clipboard_text && (
        <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 md:p-8 shadow-card dark:shadow-card-dark space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-paper-700 dark:text-obsidian-300 font-bold">
              Shared Text Snippet
            </h3>
            <button
              onClick={copyClipboardSnippet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-paper-200 dark:border-obsidian-700 text-xs font-semibold text-paper-700 dark:text-obsidian-300 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors"
            >
              {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSnippet ? 'Copied' : 'Copy Snippet'}
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-paper-50 dark:bg-obsidian-950 font-mono text-xs text-paper-900 dark:text-obsidian-100 border border-paper-200/60 dark:border-obsidian-800 overflow-x-auto whitespace-pre-wrap select-text">
            {transfer.clipboard_text}
          </pre>
        </div>
      )}

      {/* Case 2: Files Listing View */}
      {transfer.transfer_type !== 'clipboard' && (
        <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 md:p-8 shadow-card dark:shadow-card-dark space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-paper-900 dark:text-obsidian-50 uppercase tracking-wider font-mono">
                Files In Transfer ({transfer.files?.length || 0})
              </h3>
              <p className="text-xs text-paper-500 font-mono">
                Total payload: {formatBytes(transfer.total_size)}
              </p>
            </div>

            {transfer.files && transfer.files.length > 1 && (
              <button
                type="button"
                disabled={downloadingAll}
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
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

          {/* Files List */}
          <div className="space-y-2.5">
            {transfer.files?.map((file) => {
              const tokenParam = unlockToken ? `?unlock_token=${encodeURIComponent(unlockToken)}` : '';
              const downloadUrl = `/api/downloads/${transfer.id}/file/${file.id}${tokenParam}`;

              return (
                <div
                  key={file.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-paper-50 dark:bg-obsidian-800/40 border border-paper-200/60 dark:border-obsidian-700/60 hover:border-paper-300 dark:hover:border-obsidian-600 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-obsidian-800 flex items-center justify-center border border-paper-200 dark:border-obsidian-700 flex-shrink-0">
                      {getFileTypeIcon(file.safe_filename, file.mime_type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-paper-900 dark:text-obsidian-100 truncate">
                        {file.original_filename || file.safe_filename}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-paper-400 dark:text-obsidian-500 tabular-nums">
                        <span>{formatBytes(file.file_size)}</span>
                        {file.sha256_hash && (
                          <span
                            className="text-[10px] hover:text-accent cursor-pointer truncate max-w-[130px]"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-paper-200 dark:border-obsidian-700 text-xs font-semibold text-paper-700 dark:text-obsidian-300 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>

                    <a
                      href={downloadUrl}
                      download={file.safe_filename}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
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
