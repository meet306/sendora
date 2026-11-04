import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Send } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center space-y-6 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-paper-200/80 dark:bg-obsidian-800 text-vermilion flex items-center justify-center mx-auto border border-paper-300 dark:border-obsidian-700 shadow-subtle">
        <HelpCircle className="w-7 h-7" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="font-mono text-[11px] font-bold text-vermilion tracking-widest uppercase">
          Error 404 • Destination Void
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-paper-950 dark:text-obsidian-50">
          Transfer Not Found
        </h1>
        <p className="text-xs text-paper-500 dark:text-obsidian-400 leading-relaxed">
          The link you followed may be misspelled, expired, or the transfer was permanently purged by automated cron routines.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-vermilion text-white text-xs font-semibold hover:bg-vermilion-hover transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Homepage
        </Link>
        <Link
          to="/send"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-paper-300 dark:border-obsidian-700 text-xs font-semibold text-paper-800 dark:text-obsidian-200 hover:bg-paper-200/60 dark:hover:bg-obsidian-800 transition-colors"
        >
          <Send className="w-4 h-4" /> Send Files
        </Link>
      </div>
    </div>
  );
}
