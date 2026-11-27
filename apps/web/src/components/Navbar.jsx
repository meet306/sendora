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
  Zap
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
    { name: 'Send', path: '/send', icon: Send },
    { name: 'Direct P2P', path: '/direct', icon: Zap },
    { name: 'Receive', path: '/receive', icon: Download },
    { name: 'Request Drop', path: '/request', icon: FolderInput },
    { name: 'History', path: '/history', icon: History }
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-paper-50/90 dark:bg-obsidian-950/90 border-b border-paper-200 dark:border-obsidian-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Geometric Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-paper-900 dark:bg-paper-50 text-white dark:text-obsidian-950 flex items-center justify-center font-bold transition-transform group-hover:scale-105 shadow-sm">
            <svg
              className="w-4 h-4 text-accent"
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
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold tracking-tight text-lg text-paper-900 dark:text-obsidian-50">
              Sendora
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-paper-200/80 text-paper-900 dark:bg-obsidian-800 dark:text-white font-bold'
                    : 'text-paper-600 hover:text-paper-900 hover:bg-paper-100 dark:text-obsidian-400 dark:hover:text-white dark:hover:bg-obsidian-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : ''}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Quick Code Lookup & Theme Switch */}
        <div className="flex items-center gap-2.5">
          <form onSubmit={handleQuickJump} className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-paper-400 dark:text-obsidian-500" />
            <input
              type="text"
              placeholder="Code (e.g. K7M2XP)..."
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value)}
              className="w-40 lg:w-44 pl-8 pr-7 py-1.5 text-xs font-mono bg-paper-100 dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-paper-900 dark:text-obsidian-100 placeholder:text-paper-400 dark:placeholder:text-obsidian-500 transition-all uppercase"
            />
            {quickCode && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-accent hover:opacity-80"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-paper-600 hover:text-paper-900 hover:bg-paper-200/50 dark:text-obsidian-400 dark:hover:text-white dark:hover:bg-obsidian-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
