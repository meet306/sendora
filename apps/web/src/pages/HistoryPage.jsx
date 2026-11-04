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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-paper-900 dark:text-obsidian-50">
            Transfer History
          </h1>
          <p className="text-xs text-paper-500 mt-1">
            Transfers created or accessed on this device.
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

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-paper-100 dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-700 text-xs text-paper-700 dark:text-obsidian-300 flex items-start gap-3 shadow-subtle">
        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" />
        <div className="leading-relaxed">
          <strong className="text-paper-900 dark:text-white">Local Browser Cache:</strong> This transfer history is stored strictly inside your local browser cache. It is never synchronized across devices, never transmitted to any third party, and can be cleared anytime.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-paper-100 dark:bg-obsidian-800 w-fit border border-paper-200 dark:border-obsidian-700">
        <button
          type="button"
          onClick={() => setActiveTab('sent')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'sent'
              ? 'bg-white dark:bg-obsidian-900 text-paper-900 dark:text-white shadow-subtle'
              : 'text-paper-500 dark:text-obsidian-400 hover:text-paper-900'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-accent" />
          Sent Transfers ({sentTransfers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('received')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'received'
              ? 'bg-white dark:bg-obsidian-900 text-paper-900 dark:text-white shadow-subtle'
              : 'text-paper-500 dark:text-obsidian-400 hover:text-paper-900'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-accent" />
          Received Transfers ({receivedTransfers.length})
        </button>
      </div>

      {/* Tab Content: Sent Transfers */}
      {activeTab === 'sent' && (
        <div className="space-y-3">
          {sentTransfers.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 text-paper-400 text-xs">
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
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-700 shadow-card dark:shadow-card-dark"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/10 text-accent uppercase">
                        SND-{item.short_code}
                      </span>
                      <span className={`text-[10px] font-mono tabular-nums ${countdown.isExpired ? 'text-red-500' : 'text-emerald-500'}`}>
                        {countdown.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-paper-900 dark:text-obsidian-100 truncate">
                      {item.title || 'Untitled Transfer'}
                    </h3>
                    <p className="text-[11px] font-mono text-paper-400 tabular-nums">
                      {item.file_count || 0} files • {formatBytes(item.total_size || 0)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Link
                      to={`/transfer/${item.id}/success?key=${encodeURIComponent(item.sender_token || '')}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
                    >
                      Manage <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => removeSentTransfer(item.id)}
                      className="p-1.5 rounded-xl text-paper-400 hover:text-red-500 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors"
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
            <div className="p-12 text-center bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 text-paper-400 text-xs">
              No received transfers logged in this browser.
            </div>
          ) : (
            receivedTransfers.map((item) => {
              const countdown = getCountdown(item.expires_at);
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-700 shadow-card dark:shadow-card-dark"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/10 text-accent uppercase">
                        SND-{item.short_code}
                      </span>
                      <span className={`text-[10px] font-mono tabular-nums ${countdown.isExpired ? 'text-red-500' : 'text-emerald-500'}`}>
                        {countdown.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-paper-900 dark:text-obsidian-100 truncate">
                      {item.title || 'Received Transfer'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Link
                      to={`/t/${item.short_code}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
                    >
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => removeReceivedTransfer(item.id)}
                      className="p-1.5 rounded-xl text-paper-400 hover:text-red-500 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors"
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
