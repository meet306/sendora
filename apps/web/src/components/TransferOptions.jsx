import React, { useState } from 'react';
import { Lock, Clock, Download, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

export function TransferOptions({
  password,
  setPassword,
  expirationHours,
  setExpirationHours,
  maxDownloads,
  setMaxDownloads,
  message,
  setMessage
}) {
  const [isOpen, setIsOpen] = useState(false);

  const expirationOptions = [
    { label: '1 Hour', value: 1 },
    { label: '6 Hours', value: 6 },
    { label: '24 Hours', value: 24, isDefault: true },
    { label: '7 Days', value: 168 }
  ];

  const downloadLimitOptions = [
    { label: 'Unlimited', value: null, isDefault: true },
    { label: '1 Download', value: 1 },
    { label: '5 Downloads', value: 5 },
    { label: '10 Downloads', value: 10 }
  ];

  return (
    <div className="bg-white dark:bg-sendora-900/60 rounded-2xl border border-sendora-200 dark:border-sendora-800 overflow-hidden transition-all">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-sendora-50 dark:hover:bg-sendora-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-sendora-700 dark:text-sendora-300">
            Transfer Security & Expiration Options
          </span>
          {password && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Password Protected
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-sendora-500">
          <span>{isOpen ? 'Collapse' : 'Customize'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded options */}
      {isOpen && (
        <div className="p-5 pt-2 border-t border-sendora-100 dark:border-sendora-800 space-y-5">
          {/* Expiration selector */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-sendora-800 dark:text-sendora-200">
              <Clock className="w-3.5 h-3.5 text-accent" />
              Automatic Expiration
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
                      : 'border-sendora-200 dark:border-sendora-700 hover:border-sendora-300 dark:hover:border-sendora-600 text-sendora-700 dark:text-sendora-300'
                  }`}
                >
                  {opt.label}
                  {opt.isDefault && <span className="block text-[9px] font-mono text-sendora-400">Default</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Download limits */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-sendora-800 dark:text-sendora-200">
              <Download className="w-3.5 h-3.5 text-accent" />
              Download Limit
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {downloadLimitOptions.map((opt) => (
                <button
                  type="button"
                  key={String(opt.value)}
                  onClick={() => setMaxDownloads(opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    maxDownloads === opt.value
                      ? 'border-accent bg-accent/10 text-accent font-semibold shadow-sm'
                      : 'border-sendora-200 dark:border-sendora-700 hover:border-sendora-300 dark:hover:border-sendora-600 text-sendora-700 dark:text-sendora-300'
                  }`}
                >
                  {opt.label}
                  {opt.isDefault && <span className="block text-[9px] font-mono text-sendora-400">Default</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Password protection */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-sendora-800 dark:text-sendora-200">
              <Lock className="w-3.5 h-3.5 text-accent" />
              Password Protection (Optional)
            </label>
            <input
              type="password"
              placeholder="Leave empty for public link, or set a secure password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800/60 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-sendora-100 placeholder:text-sendora-400"
            />
            {password && (
              <p className="text-[11px] text-sendora-500 font-mono">
                Recipients will be required to enter this password before accessing file names or downloads.
              </p>
            )}
          </div>

          {/* Transfer note */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-sendora-800 dark:text-sendora-200">
              <MessageSquare className="w-3.5 h-3.5 text-accent" />
              Transfer Message (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add a brief note for the recipient..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800/60 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-sendora-100 placeholder:text-sendora-400 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
