import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatBytes } from '../lib/crypto';
import { getFileTypeIcon } from '../components/Dropzone';
import {
  FolderInput,
  Download,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  ShieldCheck,
  File,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export function RequestManagePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [requesterToken, setRequesterToken] = useState(searchParams.get('key') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionSuccess, setActionSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchManagementData = (tokenToUse) => {
    setLoading(true);
    api.getRequestManagement(id, tokenToUse)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Unauthorized or request not found');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (requesterToken) {
      fetchManagementData(requesterToken);
    } else {
      setLoading(false);
    }
  }, [id, requesterToken]);

  const handleCloseRequest = async () => {
    try {
      await api.closeFileRequest(id, requesterToken);
      setActionSuccess('File request has been closed to new uploads.');
      fetchManagementData(requesterToken);
    } catch (err) {
      alert(`Error closing request: ${err.message}`);
    }
  };

  const handleDeleteRequest = async () => {
    try {
      await api.deleteFileRequest(id, requesterToken);
      alert('Request and all submissions permanently deleted.');
      navigate('/');
    } catch (err) {
      alert(`Deletion error: ${err.message}`);
    }
  };

  if (!requesterToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 space-y-6">
        <div className="text-center space-y-2">
          <Lock className="w-10 h-10 text-accent mx-auto" />
          <h2 className="text-xl font-bold text-sendora-900 dark:text-white">
            Requester Token Required
          </h2>
          <p className="text-xs text-sendora-500">
            Enter the private management key provided when you created this file drop.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchManagementData(requesterToken);
          }}
          className="space-y-4"
        >
          <input
            type="password"
            placeholder="Paste secret requester token..."
            value={requesterToken}
            onChange={(e) => setRequesterToken(e.target.value)}
            className="w-full px-4 py-2.5 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 text-sendora-900 dark:text-white"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-accent text-white text-xs font-semibold"
          >
            Access Submissions
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-xs font-mono text-sendora-500">Loading submissions...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-sendora-900 dark:text-white">Access Denied</h2>
        <p className="text-xs text-sendora-500">{error || 'Invalid management token'}</p>
        <Link to="/request" className="text-xs font-semibold text-accent hover:underline">
          Create New Request
        </Link>
      </div>
    );
  }

  const { request, submissions } = data;
  const totalFiles = submissions.reduce((sum, s) => sum + (s.files?.length || 0), 0);
  const totalBytes = submissions.reduce((sum, s) => sum + s.total_size, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8 animate-fade-in">
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header Overview Card */}
      <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sendora-100 dark:border-sendora-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <FolderInput className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  SND-{request.short_code}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-semibold ${
                    request.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-sendora-100 text-sendora-600 dark:bg-sendora-800 dark:text-sendora-400'
                  }`}
                >
                  {request.status}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-sendora-900 dark:text-white mt-1">
                {request.title}
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {request.status === 'active' && (
              <button
                type="button"
                onClick={handleCloseRequest}
                className="px-3.5 py-2 rounded-xl border border-sendora-200 dark:border-sendora-700 text-xs font-semibold text-sendora-700 dark:text-sendora-300 hover:bg-sendora-100 dark:hover:bg-sendora-800 transition-colors"
              >
                Close Dropzone
              </button>
            )}

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                Delete Request
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDeleteRequest}
                className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Confirm Delete All
              </button>
            )}
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-sendora-50 dark:bg-sendora-800/40 border border-sendora-100 dark:border-sendora-800">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sendora-400">
              Submissions
            </span>
            <p className="text-lg font-bold text-sendora-900 dark:text-white">
              {submissions.length}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-sendora-50 dark:bg-sendora-800/40 border border-sendora-100 dark:border-sendora-800">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sendora-400">
              Total Files
            </span>
            <p className="text-lg font-bold text-sendora-900 dark:text-white">
              {totalFiles}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-sendora-50 dark:bg-sendora-800/40 border border-sendora-100 dark:border-sendora-800">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sendora-400">
              Total Stored
            </span>
            <p className="text-lg font-bold text-sendora-900 dark:text-white">
              {formatBytes(totalBytes)}
            </p>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-sendora-700 dark:text-sendora-300">
          Submissions Received ({submissions.length})
        </h2>

        {submissions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 text-sendora-400 text-xs">
            No submissions yet. Share your drop link to receive files.
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub, idx) => (
              <div
                key={sub.id}
                className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-sendora-100 dark:border-sendora-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-sendora-900 dark:text-white">
                      Submission #{submissions.length - idx} {sub.submitter_note ? `• "${sub.submitter_note}"` : ''}
                    </h3>
                    <p className="text-[11px] font-mono text-sendora-400">
                      Delivered {new Date(sub.created_at * 1000).toLocaleString()} • {formatBytes(sub.total_size)}
                    </p>
                  </div>

                  <span className="text-xs font-mono text-accent font-semibold">
                    {sub.files?.length || 0} files
                  </span>
                </div>

                {/* Sub-files table */}
                <div className="space-y-2">
                  {sub.files?.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-sendora-50 dark:bg-sendora-800/40 border border-sendora-200/50 dark:border-sendora-800 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getFileTypeIcon(f.safe_filename, f.mime_type)}
                        <span className="font-medium text-sendora-900 dark:text-white truncate">
                          {f.original_filename || f.safe_filename}
                        </span>
                        <span className="text-[11px] font-mono text-sendora-400">
                          ({formatBytes(f.file_size)})
                        </span>
                      </div>

                      <a
                        href={`/api/downloads/${sub.id}/file/${f.id}`}
                        download={f.safe_filename}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
