import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { QRCodeCard } from '../components/QRCodeCard';
import { FolderInput, Lock, Clock, ArrowRight, ShieldCheck, CheckCircle2, Copy, Check } from 'lucide-react';

export function RequestFilesPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [expirationHours, setExpirationHours] = useState(24);
  const [maxSubmissions, setMaxSubmissions] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdRequest, setCreatedRequest] = useState(null);
  const [copiedManageLink, setCopiedManageLink] = useState(false);

  const expirationOptions = [
    { label: '1 Hour', value: 1 },
    { label: '6 Hours', value: 6 },
    { label: '24 Hours', value: 24, isDefault: true },
    { label: '7 Days', value: 168 }
  ];

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for this file request');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.createFileRequest({
        title: title.trim(),
        description: description.trim() || undefined,
        password: password.trim() || undefined,
        expiration_hours: expirationHours,
        max_submissions: maxSubmissions ? parseInt(maxSubmissions, 10) : undefined
      });

      setCreatedRequest(res);
    } catch (err) {
      setError(err.message || 'Failed to create file request');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedManageLink(true);
      setTimeout(() => setCopiedManageLink(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (createdRequest) {
    const publicDropUrl = `${window.location.origin}/r/${createdRequest.short_code}`;
    const manageUrl = `${window.location.origin}/request/${createdRequest.id}/manage?key=${encodeURIComponent(createdRequest.requester_token)}`;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8 animate-fade-in">
        {/* Banner */}
        <div className="flex items-center gap-3 p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
              File Drop Created Successfully
            </h1>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Share the public link with anyone to collect files directly into your private vault.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Public Link & QR */}
          <div className="md:col-span-6 space-y-4">
            <QRCodeCard
              url={publicDropUrl}
              shortCode={createdRequest.short_code}
              title={`File Drop: ${createdRequest.title}`}
            />
          </div>

          {/* Requester Secret Management Link */}
          <div className="md:col-span-6 space-y-6">
            <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
                  Private Management Link
                </h3>
              </div>

              <p className="text-xs text-sendora-500 leading-relaxed">
                Save this link! It contains your private requester token and is the <strong>only way</strong> you can view and download submissions. Public uploaders cannot access this.
              </p>

              <div className="p-3 rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 space-y-1">
                <span className="text-[10px] font-mono text-sendora-400 uppercase">
                  Management URL
                </span>
                <p className="text-xs font-mono text-sendora-800 dark:text-sendora-200 truncate">
                  {manageUrl}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(manageUrl)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-sendora-300 dark:border-sendora-700 text-xs font-medium text-sendora-800 dark:text-sendora-200 hover:bg-sendora-100 dark:hover:bg-sendora-800 transition-colors"
                >
                  {copiedManageLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copiedManageLink ? 'Copied' : 'Copy Key Link'}
                </button>

                <Link
                  to={`/request/${createdRequest.id}/manage?key=${encodeURIComponent(createdRequest.requester_token)}`}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                >
                  Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 md:py-20 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
          <FolderInput className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-sendora-900 dark:text-white">
          Request Files
        </h1>
        <p className="text-xs text-sendora-500 max-w-sm mx-auto leading-relaxed">
          Create a secure dropbox link. Clients, coworkers, or friends can upload files directly to you without seeing each other's submissions.
        </p>
      </div>

      <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-premium space-y-6">
        <form onSubmit={handleCreateRequest} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-sendora-800 dark:text-sendora-200 mb-1.5">
              Request Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Invoices, Wedding Photos, Design Assets..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-sendora-800 dark:text-sendora-200 mb-1.5">
              Instructions for Uploaders (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Please upload your signed contract in PDF format..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-white resize-none"
            />
          </div>

          {/* Expiration selector */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-sendora-800 dark:text-sendora-200">
              <Clock className="w-3.5 h-3.5 text-accent" />
              Dropzone Active Duration
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {expirationOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setExpirationHours(opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    expirationHours === opt.value
                      ? 'border-accent bg-accent/10 text-accent font-semibold shadow-sm'
                      : 'border-sendora-200 dark:border-sendora-700 text-sendora-700 dark:text-sendora-300'
                  }`}
                >
                  {opt.label}
                  {opt.isDefault && <span className="block text-[9px] font-mono text-sendora-400">Default</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Password Protection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-sendora-800 dark:text-sendora-200 mb-1.5">
              <Lock className="w-3.5 h-3.5 text-accent" />
              Upload Password (Optional)
            </label>
            <input
              type="password"
              placeholder="Leave empty for public drop, or require a password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-white"
            />
          </div>

          {error && (
            <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full py-3.5 px-6 rounded-xl bg-accent text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            Create File Request Link
          </button>
        </form>
      </div>
    </div>
  );
}
