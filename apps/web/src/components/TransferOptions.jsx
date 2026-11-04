import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Clock,
  Download,
  MessageSquare,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * Generate a memorable, secure password e.g. "coral-falcon-482"
 */
function generateReadablePassword() {
  const adjectives = ['swift', 'amber', 'silent', 'bright', 'stone', 'iron', 'cedar', 'frost', 'solar', 'rapid'];
  const nouns = ['falcon', 'harbor', 'ridge', 'summit', 'vault', 'canyon', 'shield', 'beacon', 'river', 'arrow'];
  const num = Math.floor(100 + Math.random() * 900);
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}-${num}`;
}

export function TransferOptions({
  password,
  setPassword,
  expirationHours,
  setExpirationHours,
  maxDownloads,
  setMaxDownloads,
  message,
  setMessage
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPasswordToggle, setHasPasswordToggle] = useState(Boolean(password));
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const expirationOptions = [
    { label: '1 Hour', value: 1 },
    { label: '6 Hours', value: 6 },
    { label: '24 Hours', value: 24, isDefault: true },
    { label: '7 Days', value: 168 }
  ];

  const downloadLimitOptions = [
    { label: 'Unlimited', value: null, isDefault: true },
    { label: '1 Download', value: 1 },
    { label: '5 Downloads', value: 5 },
    { label: '10 Downloads', value: 10 }
  ];

  const handleTogglePassword = (enabled) => {
    setHasPasswordToggle(enabled);
    if (!enabled) {
      setPassword('');
      setShowPassword(false);
    } else if (!password) {
      // Auto-suggest strong password when toggled on
      setPassword(generateReadablePassword());
      setShowPassword(true);
    }
  };

  const handleGeneratePassword = () => {
    const newPass = generateReadablePassword();
    setPassword(newPass);
    setShowPassword(true);
  };

  const copyPasswordToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="rounded-2xl border border-paper-200 dark:border-obsidian-700 bg-paper-100/60 dark:bg-obsidian-800/40 overflow-hidden transition-all">
      {/* Accordion header button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-paper-200/50 dark:hover:bg-obsidian-700/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-paper-200 dark:bg-obsidian-700 flex items-center justify-center text-paper-700 dark:text-obsidian-200">
            {password ? <Lock className="w-3.5 h-3.5 text-accent" /> : <Unlock className="w-3.5 h-3.5 text-paper-400" />}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-paper-800 dark:text-obsidian-100 font-mono">
            Security, Expiration & Limits
          </span>
          {password && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-accent/10 text-accent font-semibold">
              Password Protected
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-paper-500 dark:text-obsidian-400 font-mono">
          <span>{isOpen ? 'Close' : 'Configure'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded drawer */}
      {isOpen && (
        <div className="p-5 pt-3 border-t border-paper-200 dark:border-obsidian-700 space-y-6">
          {/* 1. PASSWORD PROTECTION SECTION */}
          <div className="space-y-3 p-4 rounded-xl bg-white dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-700">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-paper-900 dark:text-obsidian-100 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-accent" />
                  Password Protection
                </label>
                <p className="text-[11px] text-paper-500 dark:text-obsidian-400">
                  {hasPasswordToggle
                    ? 'Recipients must enter this password before any files are revealed.'
                    : 'Disabled. Anyone with the sharing link can view and download files.'}
                </p>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => handleTogglePassword(!hasPasswordToggle)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hasPasswordToggle ? 'bg-accent' : 'bg-paper-300 dark:bg-obsidian-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    hasPasswordToggle ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Password input when enabled */}
            {hasPasswordToggle && (
              <div className="pt-2 space-y-2 animate-fade-in">
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={hasPasswordToggle}
                    placeholder="Enter custom password or use generator..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-24 pl-3.5 py-2 text-xs font-mono rounded-xl bg-paper-50 dark:bg-obsidian-800 border border-paper-300 dark:border-obsidian-600 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-paper-900 dark:text-obsidian-100"
                  />

                  {/* Actions inside password input */}
                  <div className="absolute right-2 flex items-center gap-1">
                    {password && (
                      <button
                        type="button"
                        onClick={copyPasswordToClipboard}
                        className="p-1 text-paper-400 hover:text-paper-700 dark:hover:text-obsidian-200 transition-colors"
                        title="Copy Password"
                      >
                        {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-paper-400 hover:text-paper-700 dark:hover:text-obsidian-200 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-accent" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-accent hover:underline flex items-center gap-1 font-mono font-medium"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Random Password
                  </button>

                  {password && (
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[10px]">
                      ✓ Secured with PBKDF2 WebCrypto
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. AUTOMATIC EXPIRATION SECTION */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-paper-900 dark:text-obsidian-100">
              <Clock className="w-3.5 h-3.5 text-accent" />
              Automatic File Expiration
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {expirationOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setExpirationHours(opt.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-mono font-medium border text-center transition-all ${
                    expirationHours === opt.value
                      ? 'border-accent bg-accent/5 dark:bg-accent/10 text-accent font-bold shadow-subtle'
                      : 'border-paper-200 dark:border-obsidian-700 hover:border-paper-300 dark:hover:border-obsidian-600 text-paper-700 dark:text-obsidian-300 bg-white dark:bg-obsidian-900'
                  }`}
                >
                  {opt.label}
                  {opt.isDefault && <span className="block text-[9px] font-sans text-paper-400 font-normal">Default</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 3. DOWNLOAD LIMITS */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-paper-900 dark:text-obsidian-100">
              <Download className="w-3.5 h-3.5 text-accent" />
              Download Limits (Atomic Self-Destruct)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {downloadLimitOptions.map((opt) => (
                <button
                  type="button"
                  key={String(opt.value)}
                  onClick={() => setMaxDownloads(opt.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-mono font-medium border text-center transition-all ${
                    maxDownloads === opt.value
                      ? 'border-accent bg-accent/5 dark:bg-accent/10 text-accent font-bold shadow-subtle'
                      : 'border-paper-200 dark:border-obsidian-700 hover:border-paper-300 dark:hover:border-obsidian-600 text-paper-700 dark:text-obsidian-300 bg-white dark:bg-obsidian-900'
                  }`}
                >
                  {opt.label}
                  {opt.isDefault && <span className="block text-[9px] font-sans text-paper-400 font-normal">Default</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 4. TRANSFER NOTE */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-paper-900 dark:text-obsidian-100">
              <MessageSquare className="w-3.5 h-3.5 text-accent" />
              Recipient Message / Note (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={1000}
              placeholder="Add an encrypted note for the recipient..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-white dark:bg-obsidian-900 border border-paper-200 dark:border-obsidian-700 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-paper-900 dark:text-obsidian-100 resize-none placeholder:text-paper-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}
