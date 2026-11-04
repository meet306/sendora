#!/usr/bin/env node
// Sendora Admin Provisioning Script
// Generates PBKDF2 hash & salt for initial admin account setup

import crypto from 'node:crypto';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.randomBytes(16).toString('hex');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { hash, salt };
}

async function main() {
  const args = process.argv.slice(2);
  const username = args[0] || 'admin';
  const password = args[1] || crypto.randomBytes(12).toString('base64url');

  console.log('--- Sendora Admin User Generation ---');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log('Generating cryptographically secure PBKDF2 hash (100,000 iterations)...');

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  console.log('\nGenerated Credentials:');
  console.log(`ID:            ${id}`);
  console.log(`Salt:          ${salt}`);
  console.log(`Password Hash: ${hash}`);

  console.log('\n--- D1 SQL Execution Command ---');
  console.log('To provision this administrator in your local Cloudflare D1 database:');
  console.log(`npx wrangler d1 execute sendora-db --local --command="INSERT INTO admin_users (id, username, password_hash, password_salt, role, created_at) VALUES ('${id}', '${username.toLowerCase()}', '${hash}', '${salt}', 'admin', ${now});"`);

  console.log('\nTo provision in your REMOTE production Cloudflare D1 database:');
  console.log(`npx wrangler d1 execute sendora-db --remote --command="INSERT INTO admin_users (id, username, password_hash, password_salt, role, created_at) VALUES ('${id}', '${username.toLowerCase()}', '${hash}', '${salt}', 'admin', ${now});"`);
}

main().catch(console.error);
