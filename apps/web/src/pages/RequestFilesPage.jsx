import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { QRCodeCard } from '../components/QRCodeCard';
import { FolderInput, Lock, Clock, ArrowRight, ShieldCheck, CheckCircle2, Copy, Check, Eye, EyeOff } from 'lucide-react';

export function RequestFilesPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasPasswordToggle, setHasPasswordToggle] = useState(false);
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
        password: hasPasswordToggle && password.trim() ? password.trim() : undefined,
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
        <div className="flex items-center gap-3 p-5 rounded-3xl bg-white dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-700 shadow-card dark:shadow-card-dark">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-paper-900 dark:text-obsidian-100">
              File Dropzone Created
            </h1>
            <p className="text-xs text-paper-500">
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
            <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 space-y-4 shadow-card dark:shadow-card-dark">
              <div className="flex items-center gap-2 text-accent">
                <ShieldCheck className="w-4 h-4" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
                  Private Management Key
                </h3>
              </div>

              <p className="text-xs text-paper-500 leading-relaxed">
                Save this link! It contains your private requester token and is the <strong>exclusive key</strong> to inspect and download submissions. Public uploaders cannot access this.
              </p>

              <div className="p-3 rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 space-y-1">
                <span className="text-[10px] font-mono text-paper-400 uppercase">
                  Management URL
                </span>
                <p className="text-xs font-mono text-paper-800 dark:text-obsidian-200 truncate">
                  {manageUrl}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(manageUrl)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-paper-300 dark:border-obsidian-700 text-xs font-semibold text-paper-800 dark:text-obsidian-200 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors"
                >
                  {copiedManageLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copiedManageLink ? 'Copied' : 'Copy Key Link'}
                </button>

                <Link
                  to={`/request/${createdRequest.id}/manage?key=${encodeURIComponent(createdRequest.requester_token)}`}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
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
        <div className="w-10 h-10 rounded-xl bg-paper-100 dark:bg-obsidian-800 text-accent flex items-center justify-center mx-auto mb-3 border border-paper-200 dark:border-obsidian-700">
          <FolderInput className="w-5 h-5" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-paper-900 dark:text-obsidian-50">
          Request Files
        </h1>
        <p className="text-xs text-paper-500 max-w-sm mx-auto leading-relaxed">
          Create a private dropbox link. Clients or collaborators upload files directly to you without seeing each other's submissions.
        </p>
      </div>

      <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 md:p-8 shadow-card dark:shadow-card-dark space-y-6">
        <form onSubmit={handleCreateRequest} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-paper-800 dark:text-obsidian-200 mb-1.5">
              Request Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Financial Invoices, Project Assets..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 text-xs rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 text-paper-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-paper-800 dark:text-obsidian-200 mb-1.5">
              Instructions for Uploaders (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Please provide signed PDF documents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 text-paper-900 dark:text-white resize-none"
            />
          </div>

          {/* Expiration options */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-paper-800 dark:text-obsidian-200">
              <Clock className="w-3.5 h-3.5 text-accent" />
              Dropzone Active Lifetime
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {expirationOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setExpirationHours(opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-medium border text-center transition-all ${
                    expirationHours === opt.value
                      ? 'border-accent bg-accent/10 text-accent font-bold shadow-subtle'
                      : 'border-paper-200 dark:border-obsidian-700 text-paper-700 dark:text-obsidian-300'
                  }`}
                >
                  {opt.label}
                  {opt.isDefault && <span className="block text-[9px] font-sans text-paper-400">Default</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Password Protection Toggle */}
          <div className="p-4 rounded-xl bg-paper-50 dark:bg-obsidian-800/40 border border-paper-200 dark:border-obsidian-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-paper-800 dark:text-obsidian-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent" />
                Require Password to Submit
              </span>
              <button
                type="button"
                onClick={() => setHasPasswordToggle(!hasPasswordToggle)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  hasPasswordToggle ? 'bg-accent' : 'bg-paper-300 dark:bg-obsidian-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    hasPasswordToggle ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {hasPasswordToggle && (
              <div className="relative flex items-center pt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={hasPasswordToggle}
                  placeholder="Enter dropzone password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2 text-xs font-mono rounded-xl bg-white dark:bg-obsidian-800 border border-paper-300 dark:border-obsidian-600 text-paper-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-paper-400 hover:text-paper-700 dark:hover:text-obsidian-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-accent" />}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full py-3.5 px-6 rounded-xl bg-accent text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            Create File Request Link
          </button>
        </form>
      </div>
    </div>
  );
}
