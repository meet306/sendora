import React from 'react';
import { ShieldCheck, Lock, Trash2, EyeOff } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 space-y-8 animate-fade-in">
      <div className="space-y-2 border-b border-sendora-200 dark:border-sendora-800 pb-6">
        <div className="flex items-center gap-2 text-accent text-xs font-mono font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          Transparency & Zero-Knowledge Architecture
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-sendora-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-xs text-sendora-500 font-mono">
          Last revised: November 2026 • Effective immediately
        </p>
      </div>

      <div className="space-y-6 text-sm text-sendora-700 dark:text-sendora-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-sendora-900 dark:text-white flex items-center gap-2">
            1. No User Accounts & No Personal Profiling
          </h2>
          <p>
            Sendora is designed from the ground up to operate without user accounts. We do not require, collect, or store your name, email address, physical location, or contact list. There are no tracking pixels, advertising beacons, or third-party marketing SDKs embedded in the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sendora-900 dark:text-white flex items-center gap-2">
            2. Ephemeral Storage & Automatic Deletion
          </h2>
          <p>
            All uploaded files and accompanying transfer notes are transient. When creating a transfer, you select an expiration window of 1 hour, 6 hours, 24 hours, or 7 days. Once the expiration timestamp is reached, the files become inaccessible instantly, and our automated Cloudflare Cron Triggers purge the underlying objects from physical cloud storage (Cloudflare R2).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sendora-900 dark:text-white flex items-center gap-2">
            3. IP Anonymization & Security Rate Limiting
          </h2>
          <p>
            To prevent automated abuse, denial of service attacks, and brute-force password guessing, our edge infrastructure processes client IP addresses. However, Sendora never stores raw, plaintext IP addresses in our relational database. All IP addresses are irreversibly salted and hashed via SHA-256 before being referenced in lookup rate-limiting records.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sendora-900 dark:text-white flex items-center gap-2">
            4. Cryptographic Password Protection
          </h2>
          <p>
            When you assign an optional password to a transfer, it is hashed client-side or at edge runtime using PBKDF2 with 100,000 iterations and a unique salt. Sendora operators have zero visibility into your plaintext passwords. Unauthenticated users cannot view file names, sizes, or metadata without first providing the correct password.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-sendora-900 dark:text-white flex items-center gap-2">
            5. Early Deletion Rights
          </h2>
          <p>
            Senders receive a high-entropy secret management token upon upload. Using this token, the sender can trigger early deletion at any moment prior to scheduled expiration, instantly revoking public access and purging R2 objects.
          </p>
        </section>
      </div>
    </div>
  );
}
