import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropzone } from '../components/Dropzone';
import { TransferOptions } from '../components/TransferOptions';
import { UploadProgressModal } from '../components/UploadProgressModal';
import { api } from '../lib/api';
import { MultipartUploader } from '../lib/uploader';
import { useHistory } from '../context/HistoryContext';
import { Send, FileText, UploadCloud, Sparkles, Copy, Check } from 'lucide-react';

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
      {/* Upload Progress Modal */}
      <UploadProgressModal
        isOpen={isUploading}
        currentFileIndex={activeFileIndex}
        totalFiles={files.length}
        progressData={currentProgress}
        onCancel={handleCancelUpload}
      />

      {/* Page Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-sendora-900 dark:text-white">
          Send Files
        </h1>
        <p className="text-sm text-sendora-600 dark:text-sendora-400">
          Upload files or paste text snippets. Receive an instant shareable link and QR code.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-sendora-100 dark:bg-sendora-900 w-fit border border-sendora-200 dark:border-sendora-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab('files');
            setError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'files'
              ? 'bg-white dark:bg-sendora-800 text-sendora-900 dark:text-white shadow-sm'
              : 'text-sendora-600 dark:text-sendora-400 hover:text-sendora-900 dark:hover:text-white'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-accent" />
          Files & Folders
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('clipboard');
            setError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'clipboard'
              ? 'bg-white dark:bg-sendora-800 text-sendora-900 dark:text-white shadow-sm'
              : 'text-sendora-600 dark:text-sendora-400 hover:text-sendora-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-accent" />
          Clipboard Sharing
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
            className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              files.length > 0
                ? 'bg-accent text-white hover:bg-accent-hover shadow-md hover:shadow-glow cursor-pointer'
                : 'bg-sendora-200 dark:bg-sendora-800 text-sendora-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            {files.length === 0
              ? 'Add files above to continue'
              : `Start Transfer (${files.length} ${files.length === 1 ? 'File' : 'Files'})`}
          </button>
        </form>
      )}

      {/* Tab 2: Clipboard Sharing */}
      {activeTab === 'clipboard' && (
        <form onSubmit={handleSendClipboard} className="space-y-6 bg-white dark:bg-sendora-900/60 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-sendora-700 dark:text-sendora-300 mb-1.5">
                Snippet Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. API Configuration, Meeting Notes, SSH Public Key..."
                value={clipboardTitle}
                onChange={(e) => setClipboardTitle(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800/60 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-sendora-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-sendora-700 dark:text-sendora-300 mb-1.5">
                Paste Text / Code Snippet
              </label>
              <textarea
                rows={8}
                required
                placeholder="Paste code, credentials, temporary notes, or markdown here..."
                value={clipboardText}
                onChange={(e) => setClipboardText(e.target.value)}
                className="w-full p-4 font-mono text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800/60 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-sendora-100 select-text resize-y"
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
            className={`w-full py-3.5 px-6 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              clipboardText.trim()
                ? 'bg-accent text-white hover:bg-accent-hover shadow-md cursor-pointer'
                : 'bg-sendora-200 dark:bg-sendora-800 text-sendora-400 cursor-not-allowed'
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
