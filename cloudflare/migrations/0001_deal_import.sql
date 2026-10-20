CREATE TABLE IF NOT EXISTS import_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  source_url TEXT NOT NULL,
  listed_total INTEGER,
  page_count INTEGER NOT NULL,
  product_count INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('uploading', 'complete'))
);

CREATE TABLE IF NOT EXISTS products (
  alza_id INTEGER PRIMARY KEY,
  order_code TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS price_observations (
  run_id TEXT NOT NULL REFERENCES import_runs(id),
  alza_id INTEGER NOT NULL REFERENCES products(alza_id),
  observed_at TEXT NOT NULL,
  coupon_code TEXT NOT NULL,
  discount_pct INTEGER NOT NULL,
  price_without_coupon INTEGER NOT NULL,
  price_after_coupon INTEGER NOT NULL,
  compare_price INTEGER,
  PRIMARY KEY (run_id, alza_id)
);

CREATE INDEX IF NOT EXISTS price_observations_product
  ON price_observations(alza_id, observed_at DESC);
