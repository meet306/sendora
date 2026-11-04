import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  Send,
  Download,
  FolderInput,
  History,
  Sun,
  Moon,
  Search,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [quickCode, setQuickCode] = useState('');

  const handleQuickJump = (e) => {
    e.preventDefault();
    const clean = quickCode.trim().toUpperCase().replace(/^SND-/, '');
    if (clean) {
      navigate(`/receive?code=${clean}`);
      setQuickCode('');
    }
  };

  const navLinks = [
    { name: 'Send Files', path: '/send', icon: Send },
    { name: 'Receive', path: '/receive', icon: Download },
    { name: 'Request Files', path: '/request', icon: FolderInput },
    { name: 'History', path: '/history', icon: History }
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-sendora-950/80 border-b border-sendora-200/80 dark:border-sendora-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-sendora-900 dark:bg-white text-white dark:text-sendora-900 flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105">
            <svg
              className="w-5 h-5 text-accent dark:text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
              <path d="M12 12v9" />
              <path d="m16 16-4-4-4 4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-lg text-sendora-900 dark:text-white leading-none">
              Sendora
            </span>
            <span className="text-[10px] font-mono text-sendora-500 dark:text-sendora-400 tracking-wider uppercase mt-0.5">
              Secure Cloud
            </span>
          </div>
        </Link>

        {/* Primary Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sendora-100 text-sendora-900 dark:bg-sendora-800 dark:text-white font-semibold'
                    : 'text-sendora-600 hover:text-sendora-900 hover:bg-sendora-100/60 dark:text-sendora-400 dark:hover:text-white dark:hover:bg-sendora-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : ''}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Quick Code Lookup & Utilities */}
        <div className="flex items-center gap-3">
          {/* Quick jump form */}
          <form onSubmit={handleQuickJump} className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sendora-400" />
            <input
              type="text"
              placeholder="Enter transfer code..."
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value)}
              className="w-44 lg:w-48 pl-8 pr-7 py-1.5 text-xs font-mono bg-sendora-100/70 dark:bg-sendora-900/70 border border-sendora-200 dark:border-sendora-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sendora-900 dark:text-sendora-100 placeholder:text-sendora-400 transition-all uppercase"
            />
            {quickCode && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-accent hover:text-accent-hover"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-sendora-600 hover:text-sendora-900 hover:bg-sendora-100 dark:text-sendora-400 dark:hover:text-white dark:hover:bg-sendora-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amberAccent" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
