# Alza Dny automation handoff

## Goal and current scope

The goal is to fetch public Alza Dny listings without a browser, parse products and coupon prices, and eventually store price changes. A permanent probe Worker and D1 database are set up. A one-time experiment stored 24 anonymous products in a disposable probe table. No production ingestion or schedule is active.

## Working Cloudflare probe

`cloudflare/probe.mjs` is a Cloudflare Worker at `https://alza-dny-fetch-probe.vitroid05.workers.dev`. Its `/` and `/health` routes check the D1 binding with `SELECT 1`. Its `/probe` route fetches `https://www.alza.cz/robots.txt`, checks the rules for its research user agent, then fetches one listing page and runs the existing parser in `src/parser.ts`. It returns status and parse counts, not raw HTML or product data.

On 17 October 2026, the permanent Worker returned HTTP 200 for both `robots.txt` and `https://www.alza.cz/alza-dny/e40.htm`. The page identified itself as logged out. The parser found 24 cards, parsed 24 products and 19 category links, and reported no errors. The `alza-dny` D1 database was created in the Eastern Europe region and bound to this Worker as `DB`. A temporary write route fetched the same page and stored all 24 validated products as JSON in `probe_products`, then was removed. A remote D1 query confirmed 24 distinct IDs and readable coupon and price fields. `cloudflare/probe-schema.sql` records the probe table schema; there is no production schema yet.

To redeploy from a signed-in Wrangler session:

```bash
npx --yes wrangler@latest deploy --config cloudflare/wrangler.jsonc
```

## Earlier fetch results

- Local Node.js native HTTPS fetched pages 1 and 2. Each page yielded 24 valid logged-out products; the two pages had 48 distinct products. Plain Node `fetch` received a Cloudflare challenge.
- Convex cloud actions received HTTP 403 with `cf-mitigated: challenge` for `robots.txt` from native HTTPS, Node `fetch`, HTTP/2, and the default runtime. Header changes and the mobile host did not help. The Convex integration is in the local Git stash named `Convex integration (Alza challenge from cloud)` (`stash@{0}` when this file was written). The ignored `.env.local` remains in the workspace.
- A temporary Netlify function received the same 403 challenge for `robots.txt` with native HTTPS and built-in `fetch`. Its site was deleted, and its project files were removed.

## Code and next decision

The local CLI in `src/cli.ts` can parse saved HTML or fetch one live page and import valid logged-out results into a local JSON catalog. `src/catalog.ts` deduplicates products and adds price observations only when price or coupon data changes. `npm run check` and `npm test` pass.

If the user later requests persistent automation, add a D1 schema and ingestion logic, then measure a bounded pilot before choosing a schedule. The Nuxt frontend can be deployed to a separate Cloudflare Worker with access to the same D1 database. Neither the frontend nor a schedule exists yet.
