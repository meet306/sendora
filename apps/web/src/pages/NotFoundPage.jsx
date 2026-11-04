import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Send } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center space-y-5 animate-fade-in">
      <div className="w-16 h-16 rounded-3xl bg-sendora-100 dark:bg-sendora-800 text-sendora-600 dark:text-sendora-300 flex items-center justify-center mx-auto shadow-sm">
        <HelpCircle className="w-8 h-8 text-accent" />
      </div>

      <div className="space-y-2">
        <span className="font-mono text-xs font-bold text-accent tracking-widest uppercase">
          Error 404 • Lost in Transit
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-sendora-900 dark:text-white">
          Page Not Found
        </h1>
        <p className="text-xs text-sendora-500 max-w-sm mx-auto leading-relaxed">
          The link you followed may be incorrect, expired, or the file transfer was removed from our edge vault.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Homepage
        </Link>
        <Link
          to="/send"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-sendora-200 dark:border-sendora-700 text-xs font-semibold text-sendora-700 dark:text-sendora-300 hover:bg-sendora-100 dark:hover:bg-sendora-800 transition-colors"
        >
          <Send className="w-4 h-4" /> Send Files
        </Link>
      </div>
    </div>
  );
}
