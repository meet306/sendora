#!/usr/bin/env node
/**
 * Sendora — Automated Cloudflare Production Deployment Engine
 * Provisions D1, R2, applies migrations, deploys Worker API, and publishes Pages frontend.
 * 100% JavaScript ES Module.
 */

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const WORKER_DIR = resolve(ROOT_DIR, 'apps/worker');
const WEB_DIR = resolve(ROOT_DIR, 'apps/web');
const WRANGLER_CONFIG_PATH = resolve(WORKER_DIR, 'wrangler.jsonc');

function printHeader(title) {
  console.log('\n======================================================');
  console.log(`  ${title}`);
  console.log('======================================================\n');
}

function runCmd(command, cwd = ROOT_DIR, env = process.env) {
  console.log(`> ${command} (in ${cwd})`);
  return execSync(command, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf-8',
    env: { ...process.env, ...env }
  });
}

async function main() {
  printHeader('SENDORA PRODUCTION DEPLOYMENT');

  // Step 1: Verify Wrangler Authentication
  console.log('[1/7] Verifying Cloudflare credentials...');
  try {
    const whoami = runCmd('npx wrangler whoami', WORKER_DIR);
    console.log(whoami.trim());
    if (whoami.includes('You are not authenticated')) {
      throw new Error('Not authenticated');
    }
  } catch (err) {
    console.error('\n⚠️  Cloudflare Wrangler is not authenticated.');
    console.log('Please log into your Cloudflare account by running:');
    console.log('   npx wrangler login\n');
    console.log('Or set the CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID environment variables.');
    process.exit(1);
  }

  // Step 2: D1 Database Provisioning
  console.log('\n[2/7] Checking Cloudflare D1 database (sendora-db)...');
  let databaseId = null;
  try {
    const listOutput = runCmd('npx wrangler d1 list --json', WORKER_DIR);
    const databases = JSON.parse(listOutput);
    const existing = databases.find(db => db.name === 'sendora-db');
    if (existing) {
      databaseId = existing.uuid;
      console.log(`✓ Existing D1 database found: ${databaseId}`);
    }
  } catch (e) {
    // continue
  }

  if (!databaseId) {
    console.log('Creating new D1 database: sendora-db...');
    try {
      const createOutput = runCmd('npx wrangler d1 create sendora-db', WORKER_DIR);
      console.log(createOutput);
      const match = createOutput.match(/database_id\s*=\s*"([^"]+)"/);
      if (match && match[1]) {
        databaseId = match[1];
      }
    } catch (e) {
      console.log('D1 create returned output: ' + e.message);
    }
  }

  // Update wrangler.jsonc with the real database_id
  if (databaseId) {
    console.log(`Writing database_id "${databaseId}" to wrangler.jsonc...`);
    let configStr = readFileSync(WRANGLER_CONFIG_PATH, 'utf-8');
    configStr = configStr.replace(/"database_id":\s*"[^"]*"/, `"database_id": "${databaseId}"`);
    writeFileSync(WRANGLER_CONFIG_PATH, configStr, 'utf-8');
  }

  // Step 3: R2 Storage Bucket Provisioning
  console.log('\n[3/7] Provisioning Cloudflare R2 bucket (sendora-storage)...');
  try {
    runCmd('npx wrangler r2 bucket create sendora-storage', WORKER_DIR);
    console.log('✓ R2 bucket created: sendora-storage');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('✓ R2 bucket already exists: sendora-storage');
    } else {
      console.log('R2 bucket notice: ' + (e.stdout || e.message).trim());
    }
  }

  // Apply CORS
  const corsPath = resolve(ROOT_DIR, 'r2-cors.json');
  if (existsSync(corsPath)) {
    console.log('Applying R2 CORS policy for direct uploads...');
    try {
      runCmd(`npx wrangler r2 bucket cors set sendora-storage --file="${corsPath}"`, WORKER_DIR);
      console.log('✓ R2 CORS rules configured successfully.');
    } catch (e) {
      console.warn('⚠️ Notice setting CORS: ' + (e.stdout || e.message).trim());
    }
  }

  // Step 4: Run D1 Schema Migrations
  console.log('\n[4/7] Applying database schema migrations to remote D1...');
  try {
    const migrationFile = resolve(WORKER_DIR, 'migrations/0001_initial_schema.sql');
    const migOutput = runCmd(`npx wrangler d1 execute sendora-db --remote --file="${migrationFile}"`, WORKER_DIR);
    console.log(migOutput.trim());
    console.log('✓ Database schema up to date.');
  } catch (e) {
    console.error('Migration error: ' + (e.stdout || e.message));
  }

  // Step 5: Deploy Cloudflare Worker API
  console.log('\n[5/7] Deploying Cloudflare Worker API...');
  let workerUrl = '';
  try {
    const deployOutput = runCmd('npx wrangler deploy', WORKER_DIR);
    console.log(deployOutput);
    const urlMatch = deployOutput.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.workers\.dev/);
    if (urlMatch) {
      workerUrl = urlMatch[0];
      console.log(`✓ Cloudflare Worker live at: ${workerUrl}`);
    }
  } catch (e) {
    console.error('Worker deploy failed: ' + (e.stdout || e.message));
    process.exit(1);
  }

  // Step 6: Build Web Frontend
  console.log('\n[6/7] Building production web frontend...');
  const apiBase = workerUrl ? `${workerUrl}/api` : '/api';
  console.log(`Target API URL: ${apiBase}`);
  try {
    runCmd('pnpm --filter sendora-web build', ROOT_DIR, { VITE_API_URL: apiBase });
    console.log('✓ Frontend build complete: apps/web/dist');
  } catch (e) {
    console.error('Frontend build failed: ' + (e.stdout || e.message));
    process.exit(1);
  }

  // Step 7: Deploy to Cloudflare Pages
  console.log('\n[7/7] Publishing frontend to Cloudflare Pages...');
  try {
    const distPath = resolve(WEB_DIR, 'dist');
    const pagesOutput = runCmd(`npx wrangler pages deploy "${distPath}" --project-name=sendora --branch=main`, ROOT_DIR);
    console.log(pagesOutput);
    console.log('\n🎉 SENDORA IS NOW FULLY DEPLOYED AND LIVE!');
  } catch (e) {
    console.error('Pages deployment notice: ' + (e.stdout || e.message));
  }
}

main().catch(err => {
  console.error('Fatal deployment error:', err);
  process.exit(1);
});
