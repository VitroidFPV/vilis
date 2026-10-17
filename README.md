# Alza Dny

Work in progress for a site that displays public Alza Dny deals and price history. The frontend is a Nuxt app configured for Cloudflare Workers. Cloudflare D1 is planned for products and price observations; production ingestion is not implemented yet.

## What exists

- The Nuxt frontend currently displays a static category menu. Its Worker configuration is in the root `wrangler.jsonc` and does not yet have a D1 binding.
- `src/parser.ts` parses Alza Dny listing HTML into validated products and category links, and reports whether the page is logged out.
- `cloudflare/probe.mjs` is a deployed, single-page fetch probe. `/health` checks its D1 binding; `/probe` checks `robots.txt`, fetches one listing page, and returns parse counts. It does not store data.
- The `alza-dny` D1 database is bound to the probe as `DB`. A one-time experiment left 24 validated anonymous products in a disposable `probe_products` table. There is no production schema, ingestion job, or cron trigger.

The parser's TypeScript configuration is in `tsconfig.probe.json`, separate from Nuxt's root `tsconfig.json`.

The Worker is at https://alza-dny-fetch-probe.vitroid05.workers.dev. The root route is equivalent to `/health`.

## Development

Requires Bun 1.4.2. Wrangler also uses Node.js locally; Cloudflare Workers Builds provides both runtimes.

```bash
bun install --frozen-lockfile
bun run build
bun run deploy --dry-run
```

To deploy the frontend manually after signing in with Wrangler, run `bun run deploy`. To deploy the probe, run Wrangler with `--config cloudflare/wrangler.jsonc`.

For automatic frontend deploys, connect this repository to a new Worker named `alza-dny` in Cloudflare Workers Builds. Use the repository root as the root directory, `bun run build` as the build command, and `bun run deploy` as the deploy command. Set the build variable `BUN_VERSION=1.4.2`, matching `package.json` and `bun.lock`. Cloudflare installs dependencies before running the build command.

The frontend Worker is separate from `alza-dny-fetch-probe`; do not connect the probe Worker to this frontend build configuration.

The ignored `research/` directory contains the original HTML snapshots and earlier investigation. Saved browser pages may contain visitor identifiers, so keep them out of Git.

## Next work

Add a binding to the same D1 database when the Nuxt app needs stored products. Define the production D1 schema and bounded ingestion flow when implementing product storage; the `probe_products` table is only evidence that a Worker can write parsed data. Keep fetching manual until a permitted, reliable update schedule is established.
