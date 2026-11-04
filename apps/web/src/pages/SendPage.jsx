import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropzone } from '../components/Dropzone';
import { TransferOptions } from '../components/TransferOptions';
import { UploadProgressModal } from '../components/UploadProgressModal';
import { api } from '../lib/api';
import { MultipartUploader } from '../lib/uploader';
import { useHistory } from '../context/HistoryContext';
import { Send, FileText, UploadCloud } from 'lucide-react';

export function SendPage() {
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

  // Clipboard sharing state
  const [clipboardTitle, setClipboardTitle] = useState('');
  const [clipboardText, setClipboardText] = useState('');
  const [clipboardPassword, setClipboardPassword] = useState('');
  const [clipboardExpiration, setClipboardExpiration] = useState(24);

  // Upload progress
  const [isUploading, setIsUploading] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(null);
  const [activeUploader, setActiveUploader] = useState(null);

  const handleSendFiles = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please add at least one file to upload.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
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
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Transfer failed. Please check inputs and try again.');
      setIsUploading(false);
    }
  };

  const handleSendClipboard = async (e) => {
    e.preventDefault();
    if (!clipboardText.trim()) {
      setError('Please enter some text or code to share.');
      return;
    }

    setError(null);
    try {
      const transfer = await api.createTransfer({
        title: clipboardTitle || 'Shared Text Snippet',
        transfer_type: 'clipboard',
        clipboard_text: clipboardText,
        password: clipboardPassword || undefined,
        expiration_hours: clipboardExpiration,
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
    } catch (err) {
      setError(err.message || 'Failed to share text snippet');
    }
  };

  const handleCancelUpload = () => {
    if (activeUploader) {
      activeUploader.cancel();
    }
    setIsUploading(false);
    setCurrentProgress(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8">
      <UploadProgressModal
        isOpen={isUploading}
        currentFileIndex={activeFileIndex}
        totalFiles={files.length}
        progressData={currentProgress}
        onCancel={handleCancelUpload}
      />

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-paper-900 dark:text-obsidian-50">
          Send Files
        </h1>
        <p className="text-xs text-paper-500">
          Stage files or paste code snippets. Generates a temporary link and QR code.
        </p>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-paper-100 dark:bg-obsidian-800 w-fit border border-paper-200 dark:border-obsidian-700">
        <button
          type="button"
          onClick={() => {
            setActiveTab('files');
            setError(null);
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'files'
              ? 'bg-white dark:bg-obsidian-900 text-paper-900 dark:text-white shadow-subtle'
              : 'text-paper-500 dark:text-obsidian-400 hover:text-paper-900'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5 text-accent" />
          Files & Folders
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('clipboard');
            setError(null);
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'clipboard'
              ? 'bg-white dark:bg-obsidian-900 text-paper-900 dark:text-white shadow-subtle'
              : 'text-paper-500 dark:text-obsidian-400 hover:text-paper-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-accent" />
          Secure Clipboard
        </button>
      </div>

      {/* Tab 1: File Transfer Studio */}
      {activeTab === 'files' && (
        <form onSubmit={handleSendFiles} className="space-y-6">
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
              ? 'Stage files to start transfer'
              : `Start Transfer (${files.length} ${files.length === 1 ? 'File' : 'Files'})`}
          </button>
        </form>
      )}

      {/* Tab 2: Clipboard Sharing */}
      {activeTab === 'clipboard' && (
        <form onSubmit={handleSendClipboard} className="space-y-6 bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 md:p-8 shadow-card dark:shadow-card-dark">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-paper-800 dark:text-obsidian-200 mb-1.5">
                Snippet Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. API Keys, Meeting Notes, SSH Config..."
                value={clipboardTitle}
                onChange={(e) => setClipboardTitle(e.target.value)}
                className="w-full px-4 py-2 text-xs rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 text-paper-900 dark:text-obsidian-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-paper-800 dark:text-obsidian-200 mb-1.5">
                Paste Text / Code Snippet
              </label>
              <textarea
                rows={8}
                required
                placeholder="Paste code, credentials, temporary notes, or markdown here..."
                value={clipboardText}
                onChange={(e) => setClipboardText(e.target.value)}
                className="w-full p-4 font-mono text-xs rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 text-paper-900 dark:text-obsidian-100 select-text resize-y"
              />
            </div>

            <TransferOptions
              password={clipboardPassword}
              setPassword={setClipboardPassword}
              expirationHours={clipboardExpiration}
              setExpirationHours={setClipboardExpiration}
              maxDownloads={maxDownloads}
              setMaxDownloads={setMaxDownloads}
              message=""
              setMessage={() => {}}
            />
          </div>

          <button
            type="submit"
            disabled={!clipboardText.trim()}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              clipboardText.trim()
                ? 'bg-accent text-white hover:bg-accent-hover shadow-sm'
                : 'bg-paper-200 dark:bg-obsidian-800 text-paper-400 dark:text-obsidian-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            Generate Temporary Snippet Link
          </button>
        </form>
      )}
    </div>
  );
}
