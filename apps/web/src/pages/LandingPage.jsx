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
  ShieldCheck,
  Zap,
  Lock,
  Clock,
  Sparkles,
  ChevronRight,
  ArrowRight,
  HardDrive,
  CheckCircle,
  FileText
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const { addSentTransfer } = useHistory();

  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'clipboard'

  // Files state
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [expirationHours, setExpirationHours] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(null);
  const [message, setMessage] = useState('');

  // Clipboard state
  const [clipboardTitle, setClipboardTitle] = useState('');
  const [clipboardText, setClipboardText] = useState('');

  // Upload progression
  const [isUploading, setIsUploading] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(null);
  const [activeUploader, setActiveUploader] = useState(null);

  const [openFaq, setOpenFaq] = useState(null);

  const handleStartUpload = async (e) => {
    e.preventDefault();
    if (activeTab === 'files' && files.length === 0) {
      setError('Please select or drop at least one file.');
      return;
    }
    if (activeTab === 'clipboard' && !clipboardText.trim()) {
      setError('Please paste text or code to share.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      if (activeTab === 'files') {
        const transfer = await api.createTransfer({
          title: files.length === 1 ? files[0].name : `${files.length} Files Transfer`,
          message: message || undefined,
          transfer_type: 'standard',
          password: password || undefined,
          expiration_hours: expirationHours,
          max_downloads: maxDownloads
        });

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

        navigate(`/transfer/${transfer.id}/success?key=${encodeURIComponent(transfer.sender_token)}`);
      } else {
        const transfer = await api.createTransfer({
          title: clipboardTitle || 'Shared Snippet',
          transfer_type: 'clipboard',
          clipboard_text: clipboardText,
          password: password || undefined,
          expiration_hours: expirationHours,
          max_downloads: maxDownloads
        });

        addSentTransfer({
          id: transfer.id,
          short_code: transfer.short_code,
          title: transfer.title,
          sender_token: transfer.sender_token,
          created_at: transfer.created_at,
          expires_at: transfer.expires_at,
          file_count: 0,
          total_size: new TextEncoder().encode(clipboardText).length
        });

        navigate(`/transfer/${transfer.id}/success?key=${encodeURIComponent(transfer.sender_token)}`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Transfer failed. Please check inputs and retry.');
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
      a: 'You choose how long your transfer stays active: 1 hour, 6 hours, 24 hours, or 7 days. Once the expiration time arrives, the files become inaccessible immediately and are permanently purged from private storage by automated background Cloudflare Cron triggers.'
    },
    {
      q: 'How does password protection work?',
      a: 'You can optionally enable password protection. When enabled, the password is encrypted using high-iteration PBKDF2 WebCrypto before storage. Recipients must enter the password to view file names, sizes, or download any files.'
    },
    {
      q: 'What is the "Request Files" feature?',
      a: 'Request Files lets you create a dedicated upload dropzone. You share a unique link with clients or friends, and they upload files directly to you. Public uploaders cannot see other files submitted to that drop.'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <UploadProgressModal
        isOpen={isUploading}
        currentFileIndex={activeFileIndex}
        totalFiles={activeTab === 'files' ? files.length : 1}
        progressData={currentProgress}
        onCancel={handleCancelUpload}
      />

      {/* Editorial Hero Section */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 border-b border-paper-200 dark:border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-start">
            {/* Left Column: Swiss Editorial Headline */}
            <div className="lg:col-span-6 space-y-6 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono font-medium bg-paper-100 dark:bg-obsidian-800 text-paper-800 dark:text-obsidian-200 border border-paper-200 dark:border-obsidian-700">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Zero Accounts • 200 MB Limit • Automatic Purge
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-paper-900 dark:text-obsidian-50 leading-[1.05]">
                Your Files.<br />
                <span className="text-accent">One Link.</span><br />
                Anywhere.
              </h1>

              <p className="text-sm sm:text-base text-paper-600 dark:text-obsidian-400 max-w-md leading-relaxed">
                Send files, receive files, and share securely. Powered by direct-to-storage multipart uploads and automated background expiration.
              </p>

              {/* Architectural features list */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono text-paper-700 dark:text-obsidian-300">
                <div className="flex items-center gap-2">
                  <span className="text-accent font-bold">01.</span>
                  <span>PBKDF2 Password Vault</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-accent font-bold">02.</span>
                  <span>Direct R2 Multipart</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-accent font-bold">03.</span>
                  <span>Strict Download Limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-accent font-bold">04.</span>
                  <span>Hourly Cron Auto-Purge</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  to="/request"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-paper-300 dark:border-obsidian-700 bg-white dark:bg-obsidian-900 text-xs font-semibold text-paper-900 dark:text-obsidian-100 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors shadow-subtle"
                >
                  <FolderInput className="w-4 h-4 text-accent" />
                  Need to receive files? Create Dropzone
                </Link>

                <Link
                  to="/receive"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline font-mono"
                >
                  Enter Transfer Code <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Column: Tactile Upload Canvas */}
            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 md:p-8 shadow-card dark:shadow-card-dark space-y-5">
                {/* Segmented Mode Selector */}
                <div className="flex items-center justify-between border-b border-paper-100 dark:border-obsidian-800 pb-3">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-paper-100 dark:bg-obsidian-800">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('files');
                        setError(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'files'
                          ? 'bg-white dark:bg-obsidian-900 text-paper-900 dark:text-white shadow-subtle'
                          : 'text-paper-500 dark:text-obsidian-400 hover:text-paper-900'
                      }`}
                    >
                      Files & Folders
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('clipboard');
                        setError(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'clipboard'
                          ? 'bg-white dark:bg-obsidian-900 text-paper-900 dark:text-white shadow-subtle'
                          : 'text-paper-500 dark:text-obsidian-400 hover:text-paper-900'
                      }`}
                    >
                      Secure Text Snippet
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-paper-400 dark:text-obsidian-500">
                    200 MB Free
                  </span>
                </div>

                <form onSubmit={handleStartUpload} className="space-y-4">
                  {activeTab === 'files' ? (
                    <>
                      <Dropzone
                        files={files}
                        setFiles={setFiles}
                        error={error}
                        setError={setError}
                      />

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
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-paper-800 dark:text-obsidian-200 mb-1">
                          Snippet Title (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Configuration Keys, Private Notes..."
                          value={clipboardTitle}
                          onChange={(e) => setClipboardTitle(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 text-paper-900 dark:text-obsidian-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-paper-800 dark:text-obsidian-200 mb-1">
                          Text / Code Content
                        </label>
                        <textarea
                          rows={6}
                          required
                          placeholder="Paste sensitive text, markdown, or code here..."
                          value={clipboardText}
                          onChange={(e) => setClipboardText(e.target.value)}
                          className="w-full p-3 font-mono text-xs rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 text-paper-900 dark:text-obsidian-100 resize-none select-text"
                        />
                      </div>

                      <TransferOptions
                        password={password}
                        setPassword={setPassword}
                        expirationHours={expirationHours}
                        setExpirationHours={setExpirationHours}
                        maxDownloads={maxDownloads}
                        setMaxDownloads={setMaxDownloads}
                        message=""
                        setMessage={() => {}}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={activeTab === 'files' ? files.length === 0 : !clipboardText.trim()}
                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      (activeTab === 'files' ? files.length > 0 : clipboardText.trim())
                        ? 'bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-glow'
                        : 'bg-paper-200 dark:bg-obsidian-800 text-paper-400 dark:text-obsidian-600 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {activeTab === 'files'
                      ? files.length === 0
                        ? 'Select files to generate link'
                        : `Transfer ${files.length} ${files.length === 1 ? 'File' : 'Files'}`
                      : 'Generate Secure Snippet Link'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Workflows Breakdown */}
      <section className="py-16 md:py-24 border-b border-paper-200 dark:border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-xl space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-accent font-bold">
              Product Modality
            </h2>
            <p className="text-3xl font-extrabold text-paper-900 dark:text-obsidian-50 tracking-tight">
              Share outbound. Collect inbound.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Outbound Send */}
            <div className="p-8 rounded-3xl bg-white dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-700 space-y-4 shadow-subtle">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-paper-100 dark:bg-obsidian-800 flex items-center justify-center text-accent font-mono font-bold">
                  01
                </div>
                <span className="text-[11px] font-mono text-paper-400 uppercase">Outbound Transfer</span>
              </div>
              <h3 className="text-lg font-bold text-paper-900 dark:text-obsidian-100">
                Send Files Securely
              </h3>
              <p className="text-xs text-paper-600 dark:text-obsidian-400 leading-relaxed">
                Upload files or folders up to 200 MB. Generate an unguessable 6-digit code and QR code. Optional password protection with PBKDF2 WebCrypto, strict download limits, and automatic deletion.
              </p>
              <Link
                to="/send"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline pt-2 font-mono"
              >
                Open Send Studio →
              </Link>
            </div>

            {/* Inbound Request */}
            <div className="p-8 rounded-3xl bg-white dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-700 space-y-4 shadow-subtle">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-paper-100 dark:bg-obsidian-800 flex items-center justify-center text-accent font-mono font-bold">
                  02
                </div>
                <span className="text-[11px] font-mono text-paper-400 uppercase">Inbound Dropzone</span>
              </div>
              <h3 className="text-lg font-bold text-paper-900 dark:text-obsidian-100">
                Request Files (Dropzones)
              </h3>
              <p className="text-xs text-paper-600 dark:text-obsidian-400 leading-relaxed">
                Need to collect files from clients or students? Create a branded drop link. Third parties drop files directly to your vault. Public uploaders can never see what anyone else submitted.
              </p>
              <Link
                to="/request"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline pt-2 font-mono"
              >
                Create File Request →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-paper-900 dark:text-obsidian-50 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-paper-500">
              Clear principles regarding encryption, storage limits, and expiration.
            </p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-paper-200 dark:border-obsidian-700 bg-white dark:bg-obsidian-900 overflow-hidden shadow-subtle"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-paper-900 dark:text-obsidian-100 hover:text-accent transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-paper-400 transition-transform ${
                      openFaq === idx ? 'rotate-90 text-accent' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 pt-1 text-xs text-paper-600 dark:text-obsidian-400 leading-relaxed border-t border-paper-100 dark:border-obsidian-800">
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
