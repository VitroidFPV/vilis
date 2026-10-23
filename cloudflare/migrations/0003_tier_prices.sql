CREATE TABLE IF NOT EXISTS tier_prices (
  alza_id INTEGER PRIMARY KEY REFERENCES products(alza_id),
  fetched_at INTEGER NOT NULL,
  prices_json TEXT NOT NULL
);
