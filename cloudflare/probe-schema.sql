CREATE TABLE IF NOT EXISTS probe_products (
  alza_id INTEGER PRIMARY KEY,
  product_json TEXT NOT NULL,
  observed_at TEXT NOT NULL
);
