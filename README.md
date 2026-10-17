# Alza Dny

Work in progress for a site that displays public Alza Dny deals and price history. The planned app is Nuxt on Cloudflare Workers, with Cloudflare D1 for products and price observations. The Nuxt app and production ingestion are not implemented yet.

## What exists

- `src/parser.ts` parses Alza Dny listing HTML into validated products and category links, and reports whether the page is logged out.
- `cloudflare/probe.mjs` is a deployed, single-page fetch probe. `/health` checks its D1 binding; `/probe` checks `robots.txt`, fetches one listing page, and returns parse counts. It does not store data.
- The `alza-dny` D1 database is bound to the probe as `DB`. A one-time experiment left 24 validated anonymous products in a disposable `probe_products` table. There is no production schema, ingestion job, or cron trigger.

The parser's TypeScript configuration is in `tsconfig.probe.json`, leaving the root `tsconfig.json` path for Nuxt when the app is added.

The Worker is at https://alza-dny-fetch-probe.vitroid05.workers.dev. The root route is equivalent to `/health`.

## Development

Requires Node.js 22 or later:

```bash
npm ci
npm run check
npm test
```

To deploy the probe after signing in with Wrangler:

```bash
npx --yes wrangler@latest deploy --config cloudflare/wrangler.jsonc
```

The ignored `research/` directory contains the original HTML snapshots and earlier investigation. Saved browser pages may contain visitor identifiers, so keep them out of Git.

## Next work

Build the Nuxt app as a separate Worker with a binding to the same D1 database. Define the production D1 schema and bounded ingestion flow when implementing product storage; the `probe_products` table is only evidence that a Worker can write parsed data. Keep fetching manual until a permitted, reliable update schedule is established.
