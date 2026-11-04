import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-paper-100/60 dark:bg-obsidian-950 border-t border-paper-200 dark:border-obsidian-800 transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Vision */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-paper-900 dark:text-obsidian-50">
                Sendora
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Edge Vault Active
              </span>
            </div>
            <p className="text-xs text-paper-600 dark:text-obsidian-400 max-w-sm leading-relaxed">
              "Your Files. One Link. Anywhere." Temporary cloud file transfers and secure dropboxes. Automatic expiration, zero accounts required.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-paper-500 dark:text-obsidian-400 pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                Private R2
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent" />
                PBKDF2
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-accent" />
                Cron Purge
              </span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-paper-900 dark:text-obsidian-100 font-bold mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-paper-600 dark:text-obsidian-400">
              <li>
                <Link to="/send" className="hover:text-accent transition-colors">
                  Send Files
                </Link>
              </li>
              <li>
                <Link to="/receive" className="hover:text-accent transition-colors">
                  Receive Transfer
                </Link>
              </li>
              <li>
                <Link to="/request" className="hover:text-accent transition-colors">
                  Request Files
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-accent transition-colors">
                  Local History
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Operations */}
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-paper-900 dark:text-obsidian-100 font-bold mb-3">
              Governance
            </h4>
            <ul className="space-y-2 text-xs text-paper-600 dark:text-obsidian-400">
              <li>
                <Link to="/privacy" className="hover:text-accent transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-accent transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-accent transition-colors">
                  Operations Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-paper-200/80 dark:border-obsidian-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-paper-500 dark:text-obsidian-400">
          <p>© {new Date().getFullYear()} Sendora. Engineered for Cloudflare D1 & R2.</p>
          <p>Zero tracking cookies. Transient storage only.</p>
        </div>
      </div>
    </footer>
  );
}
