import React from 'react';
import { FileText, ShieldAlert } from 'lucide-react';

export function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 space-y-8 animate-fade-in">
      <div className="space-y-2 border-b border-sendora-200 dark:border-sendora-800 pb-6">
        <div className="flex items-center gap-2 text-accent text-xs font-mono font-semibold uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          Service Agreement & Acceptable Use
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-sendora-900 dark:text-white">
          Terms of Service
        </h1>
        <p className="text-xs text-sendora-500 font-mono">
          Last revised: November 2026 • Effective immediately
        </p>
      </div>

      <div className="space-y-6 text-sm text-sendora-700 dark:text-sendora-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-sendora-900 dark:text-white">
            1. Purpose of the Platform
          </h2>
          <p>
            Sendora provides a temporary, non-permanent cloud file transfer and dropbox utility. It is not designed or intended as a permanent cloud backup or archiving service. Files uploaded to Sendora are subject to strict maximum lifetimes (up to 7 days) and may self-destruct once download thresholds are met.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sendora-900 dark:text-white">
            2. Acceptable Use Policy
          </h2>
          <p>
            You agree to use Sendora solely for lawful purposes. You must not upload, transmit, or share:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Malicious software, trojans, ransomware, or executable exploit payloads.</li>
            <li>Child sexual abuse material (CSAM) or non-consensual imagery.</li>
            <li>Content that infringes copyrights, patents, or intellectual property rights.</li>
            <li>Material intended to conduct automated denial-of-service or unauthorized penetration testing.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sendora-900 dark:text-white">
            3. File Size and Quotas
          </h2>
          <p>
            The maximum permitted file size is 200 MB per file. Attempts to bypass chunk verification or exploit upload endpoints may result in immediate IP-based rate limiting or temporary lockout.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sendora-900 dark:text-white">
            4. Disclaimer of Warranties
          </h2>
          <p>
            The service is provided "as is" and "as available" without warranties of any kind. Sendora is not liable for data loss resulting from network interruptions, automated expiration, or sender early deletion.
          </p>
        </section>
      </div>
    </div>
  );
}
