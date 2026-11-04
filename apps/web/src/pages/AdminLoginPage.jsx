import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ShieldCheck, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export function AdminLoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.adminLogin(username, password);
      // Store session token
      sessionStorage.setItem('sendora_admin_token', res.token);
      sessionStorage.setItem('sendora_admin_user', JSON.stringify(res.user));
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-20 md:py-32 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-sendora-900 dark:bg-white text-white dark:text-sendora-900 flex items-center justify-center mx-auto mb-3 shadow-sm">
          <ShieldCheck className="w-6 h-6 text-accent" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-sendora-900 dark:text-white">
          Sendora Operations Portal
        </h1>
        <p className="text-xs text-sendora-500">
          Restricted administrative access. All attempts are monitored and rate-limited.
        </p>
      </div>

      <div className="bg-white dark:bg-sendora-900 rounded-3xl border border-sendora-200 dark:border-sendora-800 p-6 md:p-8 shadow-premium space-y-6">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-sendora-700 dark:text-sendora-300 mb-1.5">
              Admin Username
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-sendora-700 dark:text-sendora-300 mb-1.5">
              Admin Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl bg-sendora-50 dark:bg-sendora-800 border border-sendora-200 dark:border-sendora-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-white"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-3.5 px-6 rounded-xl bg-accent text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Authenticate Session'}
          </button>
        </form>

        <div className="pt-4 border-t border-sendora-100 dark:border-sendora-800 text-center">
          <p className="text-[11px] font-mono text-sendora-400">
            Initial administrator accounts are securely provisioned via CLI (`scripts/seed-admin.js`).
          </p>
        </div>
      </div>
    </div>
  );
}
