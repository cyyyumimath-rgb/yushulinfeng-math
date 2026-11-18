CREATE TABLE IF NOT EXISTS research_versions (
  id TEXT NOT NULL, version INTEGER NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL,
  data TEXT NOT NULL, edited_by TEXT NOT NULL, updated TEXT NOT NULL,
  PRIMARY KEY (id,version)
);
CREATE INDEX IF NOT EXISTS research_public ON research_versions(status,id,version);
CREATE TABLE IF NOT EXISTS diagnoses (
  id TEXT PRIMARY KEY, owner TEXT NOT NULL, mode TEXT NOT NULL, title TEXT NOT NULL,
  problem TEXT NOT NULL, work TEXT NOT NULL, details TEXT NOT NULL, consent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted', draft TEXT NOT NULL DEFAULT '', report TEXT NOT NULL DEFAULT '',
  created TEXT NOT NULL, updated TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS diagnoses_owner ON diagnoses(owner,created);
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY, task TEXT NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
  role TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS material_task ON materials(task);
CREATE TABLE IF NOT EXISTS material_chunks (
  file_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE, seq INTEGER NOT NULL, bytes BLOB NOT NULL,
  PRIMARY KEY(file_id,seq)
);