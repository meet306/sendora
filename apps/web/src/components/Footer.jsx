import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Zap, Server } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-sendora-950 border-t border-sendora-200 dark:border-sendora-800/80 transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Vision */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-xl text-sendora-900 dark:text-white">
                Sendora
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </span>
            </div>
            <p className="text-sm text-sendora-600 dark:text-sendora-400 max-w-sm leading-relaxed">
              "Your Files. One Link. Anywhere." Send files, receive files, and share securely with automatic expiration and zero account requirement.
            </p>
            <div className="flex items-center gap-4 text-xs text-sendora-500 dark:text-sendora-400 pt-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                Private R2 Vault
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent" />
                PBKDF2 Hashing
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-accent" />
                Auto-Purge Cron
              </span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-sendora-900 dark:text-sendora-100 font-semibold mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-sendora-600 dark:text-sendora-400">
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
                  Local Transfer History
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Administration */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-sendora-900 dark:text-sendora-100 font-semibold mb-3">
              Transparency
            </h4>
            <ul className="space-y-2 text-sm text-sendora-600 dark:text-sendora-400">
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
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-sendora-200 dark:border-sendora-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sendora-500 dark:text-sendora-400">
          <p>© {new Date().getFullYear()} Sendora Platform. Engineered with Cloudflare Workers & R2.</p>
          <p className="font-mono text-[11px]">No cookies or telemetry sold. Transient storage only.</p>
        </div>
      </div>
    </footer>
  );
}
