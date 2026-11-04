import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ShieldCheck, Lock, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

export function AdminLoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.adminLogin(username, password);
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
        <div className="w-10 h-10 rounded-xl bg-paper-900 dark:bg-white text-white dark:text-obsidian-950 flex items-center justify-center mx-auto mb-3 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-accent" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-paper-900 dark:text-obsidian-50">
          Operations Portal
        </h1>
        <p className="text-xs text-paper-500">
          Restricted administrative access. Monitored and rate-limited.
        </p>
      </div>

      <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 md:p-8 shadow-card dark:shadow-card-dark space-y-6">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-paper-700 dark:text-obsidian-300 mb-1.5 font-bold">
              Admin Username
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 text-xs rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 text-paper-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-paper-700 dark:text-obsidian-300 mb-1.5 font-bold">
              Admin Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-4 py-2 text-xs font-mono rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-200 dark:border-obsidian-700 text-paper-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-paper-400 hover:text-paper-700 dark:hover:text-obsidian-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-accent" />}
              </button>
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
            disabled={loading || !username || !password}
            className="w-full py-3.5 px-6 rounded-xl bg-accent text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Authenticate Session'}
          </button>
        </form>

        <div className="pt-4 border-t border-paper-100 dark:border-obsidian-800 text-center">
          <p className="text-[11px] font-mono text-paper-400">
            Default local credentials: <code className="text-paper-700 dark:text-obsidian-300">admin</code> / <code className="text-paper-700 dark:text-obsidian-300">admin-password</code>
          </p>
        </div>
      </div>
    </div>
  );
}
