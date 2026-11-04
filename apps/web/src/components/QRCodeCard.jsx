import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, Share2 } from 'lucide-react';

export function QRCodeCard({ url, shortCode, title }) {
  const canvasRef = useRef(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 180,
        margin: 1.5,
        color: {
          dark: '#16171C',
          light: '#FFFFFF'
        }
      }).catch(err => console.error('QR generation error:', err));
    }
  }, [url]);

  const copyToClipboard = async (text, setCopied) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const downloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `sendora-qr-${shortCode || 'transfer'}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Sendora File Transfer',
          text: `Download files securely via Sendora (Code: ${shortCode})`,
          url: url
        });
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Share error:', err);
      }
    } else {
      copyToClipboard(url, setCopiedLink);
    }
  };

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl border border-paper-200 dark:border-obsidian-700 p-6 space-y-6 shadow-card dark:shadow-card-dark">
      {/* QR Canvas Box */}
      <div className="flex flex-col items-center justify-center p-4 bg-paper-50 dark:bg-obsidian-800/40 rounded-2xl border border-paper-100 dark:border-obsidian-800">
        <div className="p-3 bg-white rounded-2xl shadow-subtle border border-paper-100">
          <canvas ref={canvasRef} className="rounded-lg" />
        </div>
        <p className="mt-3 text-[11px] font-mono text-paper-500">
          Scan with mobile camera to download
        </p>
      </div>

      {/* Codes and copy controls */}
      <div className="space-y-3">
        {/* Short Code Badge */}
        {shortCode && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-paper-50 dark:bg-obsidian-800/50 border border-paper-200 dark:border-obsidian-700">
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-paper-400">
                Transfer Code
              </span>
              <span className="text-base font-mono font-bold tracking-widest text-paper-900 dark:text-obsidian-50">
                SND-{shortCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(`SND-${shortCode}`, setCopiedCode)}
              className="p-2 rounded-lg text-paper-600 dark:text-obsidian-300 hover:bg-paper-200 dark:hover:bg-obsidian-700 transition-colors"
              title="Copy Short Code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Share Link Box */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-paper-50 dark:bg-obsidian-800/50 border border-paper-200 dark:border-obsidian-700">
          <div className="min-w-0 pr-2">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-paper-400">
              Shareable Direct Link
            </span>
            <p className="text-xs font-mono text-paper-800 dark:text-obsidian-200 truncate">
              {url}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(url, setCopiedLink)}
            className="p-2 rounded-lg text-paper-600 dark:text-obsidian-300 hover:bg-paper-200 dark:hover:bg-obsidian-700 transition-colors flex-shrink-0"
            title="Copy Share Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={downloadQR}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-paper-300 dark:border-obsidian-700 text-xs font-semibold text-paper-800 dark:text-obsidian-200 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download QR
          </button>
          <button
            type="button"
            onClick={shareNative}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Link
          </button>
        </div>
      </div>
    </div>
  );
}
