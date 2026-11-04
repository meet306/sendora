import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHistory } from '../context/HistoryContext';
import { formatBytes, getCountdown } from '../lib/crypto';
import {
  History,
  Send,
  Download,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Clock,
  ArrowRight
} from 'lucide-react';

export function HistoryPage() {
  const {
    sentTransfers,
    receivedTransfers,
    removeSentTransfer,
    removeReceivedTransfer,
    clearAllHistory
  } = useHistory();

  const [activeTab, setActiveTab] = useState('sent'); // 'sent' | 'received'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8 animate-fade-in">
      {/* Page Title & Clear */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-sendora-900 dark:text-white">
            Transfer History
          </h1>
          <p className="text-xs text-sendora-500 mt-1">
            Transfers you have created or accessed on this browser.
          </p>
        </div>

        {(sentTransfers.length > 0 || receivedTransfers.length > 0) && (
          <button
            type="button"
            onClick={clearAllHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All History
          </button>
        )}
      </div>

      {/* Privacy Notice Banner (Requirement 6) */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="leading-relaxed">
          <strong>Private Local Storage:</strong> This transfer history is stored strictly inside your local browser cache. It is never synchronized across devices, never transmitted to any third party, and may disappear when your browser cookies or browsing history are cleared.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-sendora-100 dark:bg-sendora-900 w-fit border border-sendora-200 dark:border-sendora-800">
        <button
          type="button"
          onClick={() => setActiveTab('sent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'sent'
              ? 'bg-white dark:bg-sendora-800 text-sendora-900 dark:text-white shadow-sm'
              : 'text-sendora-600 dark:text-sendora-400 hover:text-sendora-900'
          }`}
        >
          <Send className="w-4 h-4 text-accent" />
          Sent Transfers ({sentTransfers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('received')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'received'
              ? 'bg-white dark:bg-sendora-800 text-sendora-900 dark:text-white shadow-sm'
              : 'text-sendora-600 dark:text-sendora-400 hover:text-sendora-900'
          }`}
        >
          <Download className="w-4 h-4 text-accent" />
          Received Transfers ({receivedTransfers.length})
        </button>
      </div>

      {/* Tab Content: Sent Transfers */}
      {activeTab === 'sent' && (
        <div className="space-y-3">
          {sentTransfers.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 text-sendora-400 text-xs">
              You haven't sent any transfers from this browser yet.
              <div className="pt-3">
                <Link to="/send" className="text-accent font-semibold hover:underline">
                  Start your first transfer →
                </Link>
              </div>
            </div>
          ) : (
            sentTransfers.map((item) => {
              const countdown = getCountdown(item.expires_at);
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 shadow-sm"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/10 text-accent uppercase">
                        SND-{item.short_code}
                      </span>
                      <span className={`text-[10px] font-mono ${countdown.isExpired ? 'text-red-500' : 'text-emerald-500'}`}>
                        {countdown.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-sendora-900 dark:text-white truncate">
                      {item.title || 'Untitled Transfer'}
                    </h3>
                    <p className="text-[11px] font-mono text-sendora-400">
                      {item.file_count || 0} files • {formatBytes(item.total_size || 0)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Link
                      to={`/transfer/${item.id}/success?key=${encodeURIComponent(item.sender_token || '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                    >
                      Manage <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => removeSentTransfer(item.id)}
                      className="p-1.5 rounded-xl text-sendora-400 hover:text-red-500 hover:bg-sendora-100 dark:hover:bg-sendora-800 transition-colors"
                      title="Remove from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Content: Received Transfers */}
      {activeTab === 'received' && (
        <div className="space-y-3">
          {receivedTransfers.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 text-sendora-400 text-xs">
              No received transfers logged in this browser.
            </div>
          ) : (
            receivedTransfers.map((item) => {
              const countdown = getCountdown(item.expires_at);
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-sendora-900 border border-sendora-200 dark:border-sendora-800 shadow-sm"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/10 text-accent uppercase">
                        SND-{item.short_code}
                      </span>
                      <span className={`text-[10px] font-mono ${countdown.isExpired ? 'text-red-500' : 'text-emerald-500'}`}>
                        {countdown.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-sendora-900 dark:text-white truncate">
                      {item.title || 'Received Transfer'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Link
                      to={`/t/${item.short_code}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                    >
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => removeReceivedTransfer(item.id)}
                      className="p-1.5 rounded-xl text-sendora-400 hover:text-red-500 hover:bg-sendora-100 dark:hover:bg-sendora-800 transition-colors"
                      title="Remove from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
