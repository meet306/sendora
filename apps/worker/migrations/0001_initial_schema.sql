-- Sendora Initial D1 Schema Migration
-- Designed for Cloudflare D1 (SQLite-compatible)

CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    short_code TEXT UNIQUE NOT NULL,
    sender_token_hash TEXT NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    title TEXT,
    message TEXT,
    transfer_type TEXT NOT NULL DEFAULT 'standard',
    clipboard_text TEXT,
    total_size INTEGER NOT NULL DEFAULT 0,
    file_count INTEGER NOT NULL DEFAULT 0,
    max_downloads INTEGER DEFAULT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transfers_short_code ON transfers(short_code);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_expires_at ON transfers(expires_at);

CREATE TABLE IF NOT EXISTS file_requests (
    id TEXT PRIMARY KEY,
    short_code TEXT UNIQUE NOT NULL,
    requester_token_hash TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    password_hash TEXT,
    password_salt TEXT,
    max_submissions INTEGER DEFAULT NULL,
    submission_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_file_requests_short_code ON file_requests(short_code);
CREATE INDEX IF NOT EXISTS idx_file_requests_expires_at ON file_requests(expires_at);

CREATE TABLE IF NOT EXISTS file_request_submissions (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES file_requests(id) ON DELETE CASCADE,
    submitter_note TEXT,
    file_count INTEGER NOT NULL DEFAULT 0,
    total_size INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_request_id ON file_request_submissions(request_id);

CREATE TABLE IF NOT EXISTS transfer_files (
    id TEXT PRIMARY KEY,
    transfer_id TEXT REFERENCES transfers(id) ON DELETE CASCADE,
    submission_id TEXT REFERENCES file_request_submissions(id) ON DELETE CASCADE,
    r2_key TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    safe_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    sha256_hash TEXT,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transfer_files_transfer_id ON transfer_files(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_files_submission_id ON transfer_files(submission_id);

CREATE TABLE IF NOT EXISTS upload_sessions (
    id TEXT PRIMARY KEY,
    transfer_id TEXT,
    submission_id TEXT,
    r2_upload_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    chunk_size INTEGER NOT NULL,
    total_parts INTEGER NOT NULL,
    completed_parts_json TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'initiated',
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_transfer_id ON upload_sessions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires_at ON upload_sessions(expires_at);

CREATE TABLE IF NOT EXISTS download_events (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    file_id TEXT,
    anonymized_ip_hash TEXT,
    user_agent_summary TEXT,
    downloaded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_download_events_transfer_id ON download_events(transfer_id);
CREATE INDEX IF NOT EXISTS idx_download_events_downloaded_at ON download_events(downloaded_at);

CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token_hash TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token_hash);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    metadata_json TEXT,
    ip_hash TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS lookup_attempts (
    id TEXT PRIMARY KEY,
    identifier_type TEXT NOT NULL,
    identifier TEXT NOT NULL,
    ip_hash TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_attempt_at INTEGER NOT NULL,
    locked_until INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lookup_attempts_lookup ON lookup_attempts(identifier_type, identifier, ip_hash);
