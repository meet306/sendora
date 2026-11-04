import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { QRCodeCard } from '../components/QRCodeCard';
import { api } from '../lib/api';
import { formatBytes, getCountdown } from '../lib/crypto';
import {
  CheckCircle2,
  Trash2,
  Clock,
  Download,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  Loader2
} from 'lucide-react';

export function TransferSuccessPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const senderToken = searchParams.get('key');

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Early deletion state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Countdown state
  const [countdown, setCountdown] = useState({ label: '', isExpired: false });

  useEffect(() => {
    // Subtle celebratory confetti
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#10B981', '#F59E0B']
    });

    // Fetch transfer details with sender token
    api.getTransfer(id, { senderToken })
      .then((data) => {
        setTransfer(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Transfer not found');
        setLoading(false);
      });
  }, [id, senderToken]);

  // Update countdown every second
  useEffect(() => {
    if (!transfer?.expires_at) return;

    const interval = setInterval(() => {
      setCountdown(getCountdown(transfer.expires_at));
    }, 1000);

    setCountdown(getCountdown(transfer.expires_at));
    return () => clearInterval(interval);
  }, [transfer?.expires_at]);

  const handleDeleteEarly = async () => {
    if (!senderToken) {
      alert('Sender management token missing. Unable to delete.');
      return;
    }

    setDeleting(true);
    try {
      await api.deleteTransfer(id, senderToken);
      setDeleteSuccess(true);
      setTransfer(prev => ({ ...prev, status: 'deleted' }));
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-xs font-mono text-sendora-500">Loading transfer details...</p>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-sendora-900 dark:text-white">
          Transfer Not Accessible
        </h2>
        <p className="text-xs text-sendora-500 leading-relaxed">
          {error || 'This transfer may have been deleted or expired.'}
        </p>
        <Link
          to="/send"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Start New Transfer
        </Link>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/t/${transfer.short_code}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8 animate-fade-in">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
              Transfer Ready & Encrypted
            </h1>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Your files have been safely staged to private storage.
            </p>
          </div>
        </div>

        <Link
          to="/send"
          className="text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:underline"
        >
          Send Another Transfer →
        </Link>
      </div>

      {deleteSuccess && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>Transfer and all associated storage objects have been permanently deleted.</span>
        </div>
      )}

      {/* Main Grid: QR & Links on Left, Details on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: QR and Share Card */}
        <div className="md:col-span-6 space-y-4">
          <QRCodeCard
            url={shareUrl}
            shortCode={transfer.short_code}
            title={transfer.title}
          />
        </div>

        {/* Right Column: Metadata, Countdown, and Early Deletion */}
        <div className="md:col-span-6 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-sendora-900 dark:text-white uppercase tracking-wider font-mono">
              Transfer Specifications
            </h3>

            <div className="space-y-3 divide-y divide-sendora-100 dark:divide-sendora-800 text-xs">
              <div className="flex items-center justify-between pt-2">
                <span className="text-sendora-500">Transfer Name</span>
                <span className="font-semibold text-sendora-900 dark:text-white truncate max-w-[200px]">
                  {transfer.title || 'Untitled Transfer'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3">
                <span className="text-sendora-500">Payload Size</span>
                <span className="font-mono font-medium text-sendora-900 dark:text-white">
                  {formatBytes(transfer.total_size)} ({transfer.file_count} {transfer.file_count === 1 ? 'file' : 'files'})
                </span>
              </div>

              <div className="flex items-center justify-between pt-3">
                <span className="text-sendora-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  Auto-Expiry Countdown
                </span>
                <span className="font-mono font-semibold text-accent">
                  {countdown.label}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3">
                <span className="text-sendora-500 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-accent" />
                  Download Limit
                </span>
                <span className="font-mono text-sendora-900 dark:text-white">
                  {transfer.max_downloads ? `${transfer.download_count} / ${transfer.max_downloads} downloads` : 'Unlimited'}
                </span>
              </div>
            </div>
          </div>

          {/* Sender Early Deletion Management Card */}
          {senderToken && transfer.status === 'active' && (
            <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono">
                  Sender Management • Early Deletion
                </h4>
              </div>

              <p className="text-xs text-sendora-500 leading-relaxed">
                As the sender, you have the exclusive management key. You can delete this transfer immediately, invalidating all links and purging the files from storage.
              </p>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/60 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  Delete This Transfer Early
                </button>
              ) : (
                <div className="space-y-2 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 animate-shake">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDeleteEarly}
                      className="py-2 px-3 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete Now'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="py-2 px-3 rounded-xl border border-sendora-300 dark:border-sendora-700 text-xs font-medium text-sendora-700 dark:text-sendora-300 hover:bg-white dark:hover:bg-sendora-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
