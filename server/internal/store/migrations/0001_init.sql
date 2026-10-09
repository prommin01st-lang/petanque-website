CREATE TABLE admins (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  totp_secret_enc BLOB,            -- AES-GCM(nonce||ciphertext); NULL until setup
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  github_id INTEGER UNIQUE,        -- numeric GitHub user id; NULL = not linked
  github_login TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE recovery_codes (
  id INTEGER PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,         -- sha256 hex
  used_at TEXT
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,             -- sha256 hex of the random 32-byte cookie token
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,             -- 'password' (awaiting TOTP/setup) | 'full'
  csrf_token TEXT NOT NULL,
  auth_method TEXT NOT NULL,       -- 'password' | 'github'
  ip TEXT, user_agent TEXT,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL, name_th TEXT NOT NULL DEFAULT '',
  desc_en TEXT NOT NULL, desc_th TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  metric TEXT NOT NULL DEFAULT '',
  repo_url TEXT NOT NULL DEFAULT '', demo_url TEXT NOT NULL DEFAULT '',
  flagship INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE media (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,   -- <uuid>.<ext>
  original_name TEXT NOT NULL, mime TEXT NOT NULL,
  size INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL, title_th TEXT NOT NULL DEFAULT '',
  excerpt_en TEXT NOT NULL DEFAULT '', excerpt_th TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '', body_th TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  cover_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,            -- e.g. login.password, login.github, project.update
  entity TEXT NOT NULL DEFAULT '', entity_id TEXT NOT NULL DEFAULT '',
  ip TEXT, created_at TEXT NOT NULL
);
CREATE TABLE login_attempts (ip TEXT NOT NULL, at TEXT NOT NULL);
CREATE INDEX idx_posts_status ON posts(status, published_at DESC);
CREATE INDEX idx_login_attempts ON login_attempts(ip, at);
