# Alza Dny automation handoff

## Goal and current scope

The goal is to fetch public Alza Dny listings without a browser, parse products and coupon prices, and eventually store price changes. The user chose **probe only for now**. No remote storage or schedule is active.

## Working Cloudflare probe

`cloudflare/probe.mjs` is a Cloudflare Worker. It fetches `https://www.alza.cz/robots.txt`, checks the rules for its research user agent, then fetches one listing page and runs the existing parser in `src/parser.ts`. It returns status and parse counts, not raw HTML or product data.

On 17 October 2026, a deployed Worker returned HTTP 200 for both `robots.txt` and `https://www.alza.cz/alza-dny/e40.htm`. The page identified itself as logged out. The parser found 24 cards, parsed 24 products and 19 category links, and reported no errors. The deployed Worker ran in a temporary Cloudflare account. That deployment expires if it is not claimed; the source and Wrangler configuration remain in `cloudflare/`.

To repeat the probe without Cloudflare login:

```bash
npx --yes wrangler@latest deploy --config cloudflare/wrangler.jsonc --temporary
```

## Earlier fetch results

- Local Node.js native HTTPS fetched pages 1 and 2. Each page yielded 24 valid logged-out products; the two pages had 48 distinct products. Plain Node `fetch` received a Cloudflare challenge.
- Convex cloud actions received HTTP 403 with `cf-mitigated: challenge` for `robots.txt` from native HTTPS, Node `fetch`, HTTP/2, and the default runtime. Header changes and the mobile host did not help. The Convex integration is in the local Git stash named `Convex integration (Alza challenge from cloud)` (`stash@{0}` when this file was written). The ignored `.env.local` remains in the workspace.
- A temporary Netlify function received the same 403 challenge for `robots.txt` with native HTTPS and built-in `fetch`. Its site was deleted, and its project files were removed.

## Code and next decision

The local CLI in `src/cli.ts` can parse saved HTML or fetch one live page and import valid logged-out results into a local JSON catalog. `src/catalog.ts` deduplicates products and adds price observations only when price or coupon data changes. `npm run check` and `npm test` pass.

If the user later requests persistent automation, first decide where data should live. Cloudflare D1 would keep fetching and storage on Cloudflare. Convex would require the Worker to send validated data to a protected Convex ingestion function. A permanent Cloudflare deployment and a schedule are still needed for either choice.
