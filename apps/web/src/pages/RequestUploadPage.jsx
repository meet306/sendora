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
  Loader2,
  Eye,
  EyeOff
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
  const [showPassword, setShowPassword] = useState(false);
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
      const session = await api.createSubmission(id, {
        note: note || undefined,
        password: password || undefined
      });

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
        <p className="text-xs font-mono text-paper-500">Connecting to file drop...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-paper-900 dark:text-obsidian-100">
          Dropzone Closed or Expired
        </h2>
        <p className="text-xs text-paper-500 leading-relaxed">
          {error || 'This file request has ended or been closed by the requester.'}
        </p>
        <Link to="/" className="inline-block text-xs font-semibold text-accent hover:underline font-mono">
          Go to Sendora Home
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 md:py-24 text-center space-y-6 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-paper-900 dark:text-obsidian-100">
            Files Delivered Successfully
          </h1>
          <p className="text-xs text-paper-500 max-w-sm mx-auto leading-relaxed">
            Your {files.length} {files.length === 1 ? 'file has' : 'files have'} been securely deposited into the requester's private vault.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-paper-100 dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-800 text-xs text-paper-600 dark:text-obsidian-300 font-mono">
          The requester will be able to review and download your submission.
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
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
      <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 md:p-8 shadow-card dark:shadow-card-dark space-y-4">
        <div className="flex items-center justify-between border-b border-paper-100 dark:border-obsidian-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-paper-100 dark:bg-obsidian-800 text-accent flex items-center justify-center border border-paper-200 dark:border-obsidian-700">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-paper-400">
                File Request Dropzone
              </span>
              <h1 className="text-xl font-bold text-paper-900 dark:text-obsidian-50">
                {request.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-paper-50 dark:bg-obsidian-800 text-[11px] font-mono text-paper-600 dark:text-obsidian-300 border border-paper-200 dark:border-obsidian-700">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>{countdown.label}</span>
          </div>
        </div>

        {request.description && (
          <p className="text-xs text-paper-600 dark:text-obsidian-300 leading-relaxed">
            {request.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-[11px] font-mono text-paper-500">
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

        <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 space-y-4 shadow-card dark:shadow-card-dark">
          <div>
            <label className="block text-xs font-bold text-paper-800 dark:text-obsidian-200 mb-1.5">
              Identifying Name / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe - Signed Agreement"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2 text-xs rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 text-paper-900 dark:text-white"
            />
          </div>

          {request.has_password && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-paper-800 dark:text-obsidian-200 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-accent" />
                Dropzone Password (Required by Requester)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password to authorize submission..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 text-xs font-mono rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 text-paper-900 dark:text-white"
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
          )}
        </div>

        <button
          type="submit"
          disabled={files.length === 0}
          className={`w-full py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            files.length > 0
              ? 'bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-glow'
              : 'bg-paper-200 dark:bg-obsidian-800 text-paper-400 dark:text-obsidian-600 cursor-not-allowed'
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
