ALTER TABLE import_runs
  ADD COLUMN scope TEXT NOT NULL DEFAULT 'full'
  CHECK (scope IN ('full', 'sample'));
