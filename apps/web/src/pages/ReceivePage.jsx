import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Download, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export function ReceivePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      handleLookup(urlCode);
    }
  }, [searchParams]);

  const handleLookup = async (inputCode) => {
    let clean = (inputCode || code).trim();
    if (!clean) {
      setError('Please enter a 6-character transfer code or link');
      return;
    }

    // If full URL was pasted, extract path
    if (clean.includes('/t/')) {
      clean = clean.split('/t/')[1].split('?')[0];
    } else if (clean.includes('/r/')) {
      clean = clean.split('/r/')[1].split('?')[0];
    }

    clean = clean.toUpperCase().replace(/^SND-/, '');
    setError(null);
    setLoading(true);

    try {
      const res = await api.lookupCode(clean);
      if (res.type === 'transfer') {
        navigate(`/t/${res.short_code}`);
      } else if (res.type === 'request') {
        navigate(`/r/${res.short_code}`);
      } else {
        navigate(`/t/${clean}`);
      }
    } catch (err) {
      setError(err.message || 'Transfer code not found. Please verify and try again.');
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLookup(code);
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16 md:py-24 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-3">
          <Download className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-sendora-900 dark:text-white">
          Receive Files
        </h1>
        <p className="text-xs text-sendora-500 max-w-xs mx-auto leading-relaxed">
          Enter the 6-character code or paste a Sendora link to inspect and download your files.
        </p>
      </div>

      <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-premium space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-sendora-700 dark:text-sendora-300 mb-2">
              Enter Transfer Code
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-sendora-400 select-none">
                SND-
              </span>
              <input
                type="text"
                maxLength={20}
                required
                autoFocus
                placeholder="XXXXXX"
                value={code.toUpperCase().replace(/^SND-/, '')}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/^SND-/, ''));
                  setError(null);
                }}
                className="w-full pl-16 pr-4 py-3 font-mono font-bold tracking-widest text-base rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sendora-900 dark:text-white uppercase placeholder:tracking-normal placeholder:font-normal placeholder:text-sendora-400"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3.5 px-6 rounded-xl bg-accent text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Resolving Code...
              </>
            ) : (
              <>
                Access Files <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-sendora-100 dark:border-sendora-800 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-sendora-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Direct cryptographic verification via Cloudflare D1
          </div>
        </div>
      </div>
    </div>
  );
}
