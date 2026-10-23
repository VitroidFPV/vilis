# Vilis

Work in progress for a site that displays public Alza Dny deals and price history. The frontend is a Nuxt app configured for Cloudflare Workers. Cloudflare D1 stores imported products and price observations; automated ingestion is not implemented yet.

## What exists

- The Nuxt frontend displays a checked-in snapshot of Alza's English catalog categories and reads imported deals through `/api/products`. Its Worker configuration and D1 binding are in the root `wrangler.jsonc`.
- `src/parser.ts` parses Alza Dny listing HTML into validated products and category links, and reports whether the page is logged out.
- `cloudflare/probe.mjs` is a deployed fetch probe. `/health` checks its D1 binding; `/probe` checks `robots.txt`, fetches one listing page, and returns parse counts. `/catalog-probe` checks `robots.txt`, fetches the catalog, and returns category counts using the same parser as the local updater. It does not store data.
- Product tier prices are fetched only when a card's price toggle is clicked. `/api/tier-prices/:id` requests Alza's price groups directly and caches the result in D1 for 30 minutes. Its tier IDs and selection rules are adapted from [fxalza](https://github.com/danielsebesta/fxalza) (MIT; see `THIRD_PARTY_NOTICES.md`). Apply migration `0003_tier_prices.sql` before deploying this endpoint. A remote Worker preview received HTTP 200 JSON for the Basic, Gold, ISIC, and B2B price groups on one product (October 2026); this does not guarantee future availability or prevent rate limits. Local development runs Nuxt under Bun because Node's `fetch` intermittently received HTTP 403 from the price API.
- The `alza-dny` D1 database is bound to both Workers as `DB`. A one-time experiment left 24 validated anonymous products in a disposable `probe_products` table. The first three listing pages have been imported remotely as a 72-product sample; there is no cron trigger.

The parser's TypeScript configuration is in `tsconfig.probe.json`, separate from Nuxt's root `tsconfig.json`.

The probe Worker is at https://alza-dny-fetch-probe.vitroid05.workers.dev. Its root route is equivalent to `/health`. The frontend is at https://vilis.vitroid05.workers.dev.

## Development

Requires Bun 1.4.2. Wrangler also uses Node.js locally; Cloudflare Workers Builds provides both runtimes.

```bash
bun install --frozen-lockfile
bun run build
bun run deploy --dry-run
```

## Refresh the category sidebar

Run `bun run catalog:update` to fetch `https://www.alza.cz/catalog` locally and update `app/data/catalog.json`. The script uses the native HTTPS request pattern from the original local product scraper, checks Alza's `robots.txt` and the response, then reads the two-level catalog from the page's streamed data. It rejects incomplete data and leaves the existing snapshot intact. Review the JSON diff before committing it. The deployed probe's `/catalog-probe` route runs the shared fetch, parse, and validation logic with Worker `fetch`, returning counts without updating the checked-in snapshot.

If Alza blocks the direct request, open the catalog URL in a browser, save the page as HTML, and run `bun run catalog:update --from-file /path/to/catalog.html`. The saved HTML is ignored by Git; do not commit browser-saved pages because they may contain visitor identifiers.

## Import Alza Dny deals manually

The importer follows the public listing's page links, validates every page, and saves parsed products in the ignored `.data/deals-import/` directory. It reads `robots.txt` at the start of each crawl invocation and checks each listing URL against it, waits at least one second between pages, and stops on a challenge, invalid data, or a missing page. Running `crawl` again resumes the latest incomplete run. `--new` starts a separate run. `--max-pages` limits one invocation for a smoke test; the result remains incomplete until the last page is reached.

```bash
bun run import:deals crawl --max-pages 2
bun run import:deals crawl
```

Only a complete crawl can be uploaded as a full import. Use `--sample` to upload the pages saved so far under a separate run ID marked `sample`. Apply the schema migrations to the **local** D1 database, then upload:

```bash
bunx wrangler d1 migrations apply alza-dny --local --config wrangler.jsonc
bun run import:deals upload --local
# Or, for an incomplete crawl:
bun run import:deals upload --sample --local
```

When the local result is reviewed, apply the same migration remotely and upload explicitly. These commands write to the production `alza-dny` database; neither is run automatically by the importer or frontend deploy.

```bash
bunx wrangler d1 migrations apply alza-dny --remote --config wrangler.jsonc
bun run import:deals upload --remote
# Or, for an incomplete crawl:
bun run import:deals upload --sample --remote
```

The `upload` command sends batches through Wrangler and is safe to rerun after an interrupted upload. An import run is marked complete only after every batch succeeds; its `scope` distinguishes a sample from a full crawl. Pass `--run-id ID` to upload an older saved run; the ID appears in the crawl completion message and `.data/deals-import/latest.json`. The tables are `products`, `price_observations`, and `import_runs`; the old `probe_products` table is untouched. `/api/products` returns the latest completed run with paginated product rows. Pass `q` to search product names and order codes; `total` counts matching products for pagination.

To deploy the frontend manually after signing in with Wrangler, run `bun run deploy`. To deploy the probe, run Wrangler with `--config cloudflare/wrangler.jsonc`.

Worker Previews bind `DB` to the separate `alza-dny-preview` D1 database. Apply new migrations to it before deploying a Preview:

```bash
bunx wrangler d1 migrations apply alza-dny-preview --remote --config cloudflare/wrangler.preview-migrations.jsonc
```

For automatic frontend deploys, connect this repository to a new Worker named `vilis` in Cloudflare Workers Builds. Use the repository root as the root directory, `bun run build` as the build command, and `bun run deploy` as the deploy command. Set the build variable `BUN_VERSION=1.4.2`, matching `package.json` and `bun.lock`. Cloudflare installs dependencies before running the build command.

The frontend Worker is separate from `alza-dny-fetch-probe`; do not connect the probe Worker to this frontend build configuration.

The ignored `research/` directory contains the original HTML snapshots and earlier investigation. Saved browser pages may contain visitor identifiers, so keep them out of Git.

## Next work

Connect the category navigation to the product API, then continue the full crawl when desired. Keep fetching manual until a permitted, reliable update schedule is established.
