# Alza Dny local probe

A local TypeScript parser and one-page live fetcher. It stores normalized products and change-only price observations in a local JSON file. Use anonymous pages for public prices; the importer rejects logged-in responses.

## Live check

Requires Node.js 22+:

```bash
npm ci
npm run parse -- --url https://www.alza.cz/alza-dny/e40.htm --state catalog.json
npm run parse -- --url https://www.alza.cz/alza-dny/e40-p2.htm --state catalog.json
```

Each command checks `robots.txt`, fetches one listing page, validates products and coupon prices, then imports them. Rerunning an unchanged page adds no duplicate products or price observations. `catalog.json` is ignored by Git. Without `--state`, the command prints parsed products and categories as JSON.

The live path uses Node's native HTTPS client with an honest research user agent and `Sec-Fetch-Site: none`. In this environment it returned 24 valid, logged-out products from each of pages 1 and 2, giving 48 distinct products. Plain Node `fetch` still receives a Cloudflare challenge; the header-dependent HTTPS behavior may change. No scheduled crawl or Convex fetch has been verified yet.

## Saved HTML and checks

```bash
npm run parse -- "research/Alza dny _ Alza.cz-2.html" --state catalog.json
npm run check
npm test
```

Saved-file mode makes no network requests. The provided anonymous snapshot produces 24 products and 19 category entry links. Category links do not establish a complete hierarchy. The ignored `research/` directory holds the raw snapshots and superseded probes; keep it private because saved pages can contain visitor identifiers.
