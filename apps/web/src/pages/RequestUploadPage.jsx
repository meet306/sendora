import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Dropzone } from '../components/Dropzone';
import { UploadProgressModal } from '../components/UploadProgressModal';
import { MultipartUploader } from '../lib/uploader';
import { getCountdown } from '../lib/crypto';
import {
  FolderInput,
  Lock,
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Loader2
} from 'lucide-react';

export function RequestUploadPage() {
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Uploader fields
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState('');
  const [password, setPassword] = useState('');
  const [uploadError, setUploadError] = useState(null);

  // Upload progression
  const [isUploading, setIsUploading] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(null);
  const [activeUploader, setActiveUploader] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Countdown
  const [countdown, setCountdown] = useState({ label: '' });

  useEffect(() => {
    api.getFileRequest(id)
      .then((data) => {
        setRequest(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'File drop request is unavailable or closed');
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!request?.expires_at) return;
    const interval = setInterval(() => {
      setCountdown(getCountdown(request.expires_at));
    }, 1000);
    setCountdown(getCountdown(request.expires_at));
    return () => clearInterval(interval);
  }, [request?.expires_at]);

  const handleSubmitFiles = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setUploadError('Please select at least one file to upload');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      // 1. Create a submission session under this file request
      const session = await api.createSubmission(id, {
        note: note || undefined,
        password: password || undefined
      });

      // 2. Upload files in sequence directly to this submission
      for (let i = 0; i < files.length; i++) {
        setActiveFileIndex(i);
        const file = files[i];

        const uploader = new MultipartUploader({
          file,
          submissionId: session.submission_id,
          onProgress: (prog) => setCurrentProgress(prog)
        });

        setActiveUploader(uploader);
        await uploader.start();
      }

      setSubmitted(true);
      setIsUploading(false);
    } catch (err) {
      setUploadError(err.message || 'Failed to submit files. Check password or try again.');
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    if (activeUploader) {
      activeUploader.cancel();
    }
    setIsUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-xs font-mono text-sendora-500">Connecting to file drop...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-sendora-900 dark:text-white">
          Dropzone Closed or Expired
        </h2>
        <p className="text-xs text-sendora-500 leading-relaxed">
          {error || 'This file request has ended or been closed by the requester.'}
        </p>
        <Link to="/" className="inline-block text-xs font-semibold text-accent hover:underline">
          Go to Sendora Home
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 md:py-24 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-sendora-900 dark:text-white">
            Files Delivered Successfully!
          </h1>
          <p className="text-xs text-sendora-500 max-w-sm mx-auto leading-relaxed">
            Your {files.length} {files.length === 1 ? 'file has' : 'files have'} been securely deposited into the requester's vault.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-sendora-100 dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 text-xs text-sendora-600 dark:text-sendora-300">
          The requester will be able to download and review your submission.
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
        >
          Return to Sendora
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-8 animate-fade-in">
      <UploadProgressModal
        isOpen={isUploading}
        currentFileIndex={activeFileIndex}
        totalFiles={files.length}
        progressData={currentProgress}
        onCancel={handleCancelUpload}
      />

      {/* Header Info */}
      <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-sendora-100 dark:border-sendora-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-sendora-400">
                File Request Dropzone
              </span>
              <h1 className="text-xl font-bold text-sendora-900 dark:text-white">
                {request.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sendora-50 dark:bg-sendora-800 text-[11px] font-mono text-sendora-600 dark:text-sendora-300 border border-sendora-200 dark:border-sendora-700">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>{countdown.label}</span>
          </div>
        </div>

        {request.description && (
          <p className="text-xs text-sendora-600 dark:text-sendora-300 leading-relaxed">
            {request.description}
          </p>
        )}

        {/* Privacy Note */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-sendora-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Private submission: Other uploaders cannot see your files.</span>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmitFiles} className="space-y-6">
        <Dropzone
          files={files}
          setFiles={setFiles}
          error={uploadError}
          setError={setUploadError}
        />

        {/* Optional note & password inputs */}
        <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-sendora-800 dark:text-sendora-200 mb-1.5">
              Note or Identifying Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe - Project Proposal"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-white"
            />
          </div>

          {request.has_password && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-sendora-800 dark:text-sendora-200 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                Dropzone Password (Required by Requester)
              </label>
              <input
                type="password"
                required
                placeholder="Enter password to authorize upload..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-white"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={files.length === 0}
          className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            files.length > 0
              ? 'bg-accent text-white hover:bg-accent-hover shadow-md hover:shadow-glow cursor-pointer'
              : 'bg-sendora-200 dark:bg-sendora-800 text-sendora-400 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
          {files.length === 0
            ? 'Add files above to submit'
            : `Submit ${files.length} ${files.length === 1 ? 'File' : 'Files'}`}
        </button>
      </form>
    </div>
  );
}
