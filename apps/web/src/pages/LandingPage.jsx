import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dropzone } from '../components/Dropzone';
import { TransferOptions } from '../components/TransferOptions';
import { UploadProgressModal } from '../components/UploadProgressModal';
import { api } from '../lib/api';
import { MultipartUploader } from '../lib/uploader';
import { useHistory } from '../context/HistoryContext';
import {
  Send,
  Download,
  FolderInput,
  Shield,
  Zap,
  Lock,
  Clock,
  Sparkles,
  ChevronRight,
  ArrowRight,
  HardDrive,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const { addSentTransfer } = useHistory();

  // Quick hero upload state
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [expirationHours, setExpirationHours] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(null);
  const [message, setMessage] = useState('');

  // Upload progression
  const [isUploading, setIsUploading] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(null);
  const [activeUploader, setActiveUploader] = useState(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  const handleStartUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please add at least one file to upload.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // 1. Create transfer record on backend
      const transfer = await api.createTransfer({
        title: files.length === 1 ? files[0].name : `${files.length} Files Transfer`,
        message: message || undefined,
        transfer_type: 'standard',
        password: password || undefined,
        expiration_hours: expirationHours,
        max_downloads: maxDownloads
      });

      // 2. Upload files in sequence
      for (let i = 0; i < files.length; i++) {
        setActiveFileIndex(i);
        const file = files[i];

        const uploader = new MultipartUploader({
          file,
          transferId: transfer.id,
          onProgress: (prog) => setCurrentProgress(prog)
        });

        setActiveUploader(uploader);
        await uploader.start();
      }

      // 3. Record in local history
      addSentTransfer({
        id: transfer.id,
        short_code: transfer.short_code,
        title: transfer.title,
        sender_token: transfer.sender_token,
        created_at: transfer.created_at,
        expires_at: transfer.expires_at,
        file_count: files.length,
        total_size: files.reduce((acc, f) => acc + f.size, 0)
      });

      // 4. Redirect to transfer success page
      navigate(`/transfer/${transfer.id}/success?key=${encodeURIComponent(transfer.sender_token)}`);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Transfer failed. Please try again.');
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    if (activeUploader) {
      activeUploader.cancel();
    }
    setIsUploading(false);
    setCurrentProgress(null);
  };

  const faqs = [
    {
      q: 'Do I need an account to send or receive files?',
      a: 'No. Sendora is completely anonymous. Anyone can send or receive files without creating an account or providing an email address.'
    },
    {
      q: 'What is the maximum file size supported?',
      a: 'You can upload individual files up to 200 MB each. There is no limit on the number of files per transfer.'
    },
    {
      q: 'How does automatic expiration work?',
      a: 'You choose how long your transfer stays active: 1 hour, 6 hours, 24 hours, or 7 days. Once the expiration time arrives, the files are immediately inaccessible and are permanently purged from private storage by automated background Cloudflare Cron triggers.'
    },
    {
      q: 'Can I protect transfers with a password?',
      a: 'Yes. You can optionally set a password. It is hashed using high-iteration PBKDF2 WebCrypto before storage, and recipients must provide the password before viewing or downloading any files.'
    },
    {
      q: 'What is the "Request Files" feature?',
      a: 'Request Files lets you create a dedicated upload dropzone. You share a unique link with clients or friends, and they upload files directly to you. Public uploaders cannot see other files submitted to that drop.'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Upload Progress Modal */}
      <UploadProgressModal
        isOpen={isUploading}
        currentFileIndex={activeFileIndex}
        totalFiles={files.length}
        progressData={currentProgress}
        onCancel={handleCancelUpload}
      />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden dot-grid border-b border-sendora-200/60 dark:border-sendora-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
            {/* Editorial Headline */}
            <div className="lg:col-span-6 space-y-6 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-sendora-100 dark:bg-sendora-800 text-sendora-800 dark:text-sendora-200 border border-sendora-200 dark:border-sendora-700">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Zero Account Required • 200 MB Free
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-sendora-900 dark:text-white leading-[1.08]">
                Your Files.<br />
                <span className="text-accent underline decoration-accent/20 decoration-wavy">One Link.</span><br />
                Anywhere.
              </h1>

              <p className="text-base sm:text-lg text-sendora-600 dark:text-sendora-400 max-w-lg leading-relaxed">
                Send files, receive files, and share securely. Powered by direct-to-storage multipart uploads and automatic expiration.
              </p>

              {/* Quick feature checklist */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-medium text-sendora-700 dark:text-sendora-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>PBKDF2 Password Protection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Instant QR Code Generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Strict Download Limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Automatic Expiry Cleanup</span>
                </div>
              </div>

              {/* Alternate action */}
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  to="/request"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sendora-300 dark:border-sendora-700 bg-white dark:bg-sendora-900 text-xs font-semibold text-sendora-900 dark:text-white hover:bg-sendora-50 dark:hover:bg-sendora-800 transition-colors shadow-subtle"
                >
                  <FolderInput className="w-4 h-4 text-accent" />
                  Need to receive files instead? Create a Drop
                </Link>
                <Link
                  to="/receive"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
                >
                  Enter Transfer Code <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Quick Hero Upload Studio */}
            <div className="lg:col-span-6">
              <div className="bg-white/90 dark:bg-sendora-900/90 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-premium backdrop-blur-md space-y-5">
                <div className="flex items-center justify-between border-b border-sendora-100 dark:border-sendora-800/80 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-sendora-900 dark:text-white">
                      Instant Transfer
                    </h2>
                    <p className="text-xs text-sendora-500">
                      Files are securely deleted after expiration
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-accent/10 text-accent">
                    Max 200 MB
                  </span>
                </div>

                <form onSubmit={handleStartUpload} className="space-y-4">
                  <Dropzone
                    files={files}
                    setFiles={setFiles}
                    error={error}
                    setError={setError}
                  />

                  {files.length > 0 && (
                    <TransferOptions
                      password={password}
                      setPassword={setPassword}
                      expirationHours={expirationHours}
                      setExpirationHours={setExpirationHours}
                      maxDownloads={maxDownloads}
                      setMaxDownloads={setMaxDownloads}
                      message={message}
                      setMessage={setMessage}
                    />
                  )}

                  <button
                    type="submit"
                    disabled={files.length === 0}
                    className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                      files.length > 0
                        ? 'bg-accent text-white hover:bg-accent-hover shadow-md hover:shadow-glow cursor-pointer'
                        : 'bg-sendora-200 dark:bg-sendora-800 text-sendora-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {files.length === 0
                      ? 'Add files to generate link'
                      : `Transfer ${files.length} ${files.length === 1 ? 'File' : 'Files'}`}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Core Workflows Section */}
      <section className="py-20 bg-white dark:bg-sendora-950 border-b border-sendora-200/60 dark:border-sendora-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
              Engineered For Two Directions
            </h2>
            <p className="text-3xl font-extrabold text-sendora-900 dark:text-white">
              Send files outwards or request them inwards.
            </p>
            <p className="text-sm text-sendora-600 dark:text-sendora-400">
              Traditional tools force everyone into shared drives. Sendora creates clean, single-purpose temporary bridges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Workflow 1: Send Files */}
            <div className="p-8 rounded-3xl bg-sendora-50 dark:bg-sendora-900/40 border border-sendora-200 dark:border-sendora-800 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Send className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-sendora-900 dark:text-white">
                  Send Files
                </h3>
                <p className="text-sm text-sendora-600 dark:text-sendora-400 leading-relaxed">
                  Upload photos, documents, archives, or entire code repositories. You get a shareable link, short 6-character code, and instant QR code.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-sendora-700 dark:text-sendora-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                  Optional PBKDF2 encryption password
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                  Automatic self-destruct after 1, 5, or 10 downloads
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                  Sender management key for instant early deletion
                </li>
              </ul>
              <Link
                to="/send"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-accent-hover pt-2"
              >
                Open Send Studio <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Workflow 2: Request Files */}
            <div className="p-8 rounded-3xl bg-sendora-50 dark:bg-sendora-900/40 border border-sendora-200 dark:border-sendora-800 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <FolderInput className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-sendora-900 dark:text-white">
                  Request Files (Dropzones)
                </h3>
                <p className="text-sm text-sendora-600 dark:text-sendora-400 leading-relaxed">
                  Collecting homework, invoices, or client deliverables? Create a branded drop link. People upload files to you without seeing what others uploaded.
                </p>
              </div>
              <ul className="space-y-2 text-xs text-sendora-700 dark:text-sendora-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                  Public uploaders never see past submissions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                  Private requester token unlocks received files
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                  Close dropzone anytime to freeze submissions
                </li>
              </ul>
              <Link
                to="/request"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline pt-2"
              >
                Create File Request <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Threat Defense Storytelling */}
      <section className="py-20 bg-sendora-50 dark:bg-sendora-900/20 border-b border-sendora-200/60 dark:border-sendora-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
              Security By Architecture
            </h2>
            <p className="text-3xl font-extrabold text-sendora-900 dark:text-white">
              Privacy is not a setting. It is the foundation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-sendora-900 dark:text-white">
                Private R2 Object Vault
              </h4>
              <p className="text-xs text-sendora-500 dark:text-sendora-400 leading-relaxed">
                Buckets have zero public URLs. Files are strictly accessible via short-lived, signed authorizations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-sendora-900 dark:text-white">
                Automated Cron Purge
              </h4>
              <p className="text-xs text-sendora-500 dark:text-sendora-400 leading-relaxed">
                Cloudflare Cron Triggers run continuously to purge expired files and metadata idempotently.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-500 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-sendora-900 dark:text-white">
                Zero Plaintext Passwords
              </h4>
              <p className="text-xs text-sendora-500 dark:text-sendora-400 leading-relaxed">
                Protected by PBKDF2 with 100,000 iterations and progressive rate-limiting lockouts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-sendora-900 dark:text-white">
                Anonymized Metadata
              </h4>
              <p className="text-xs text-sendora-500 dark:text-sendora-400 leading-relaxed">
                Client IP addresses are salted and hashed. We never store or display plaintext IPs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white dark:bg-sendora-950 border-b border-sendora-200/60 dark:border-sendora-800/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-sendora-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-sendora-500">
              Clear answers regarding privacy, file retention, and security.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-sendora-200 dark:border-sendora-800 bg-sendora-50/50 dark:bg-sendora-900/30 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-sm font-semibold text-sendora-900 dark:text-white hover:text-accent transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-sendora-400 transition-transform ${
                      openFaq === idx ? 'rotate-90 text-accent' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 pt-1 text-xs text-sendora-600 dark:text-sendora-400 leading-relaxed border-t border-sendora-200/50 dark:border-sendora-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
