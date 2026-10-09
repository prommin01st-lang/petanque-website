-- AUTOINCREMENT ids are never reused, so a refund by id can only ever delete
-- the row its own reservation inserted.
CREATE TABLE login_attempts_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  at TEXT NOT NULL
);
INSERT INTO login_attempts_new(ip, at) SELECT ip, at FROM login_attempts;
DROP TABLE login_attempts;
ALTER TABLE login_attempts_new RENAME TO login_attempts;
CREATE INDEX idx_login_attempts ON login_attempts(ip, at);
