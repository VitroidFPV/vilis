import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { Database } from "bun:sqlite"
import {
	listingUrl,
	nextListingUrl,
	productSql,
	runSql,
} from "../src/import-deals.ts"
import type { Product } from "../src/parser.ts"

const product: Product = {
	alzaId: 123,
	orderCode: "PHONE1",
	name: "Joe's phone",
	url: "https://www.alza.cz/phone-d123.htm",
	couponCode: "ALZADNY15",
	discountPct: 15,
	priceWithoutCoupon: 1000,
	priceAfterCoupon: 850,
}

test("follows only the next public listing page", () => {
	const html = `<a href="/alza-dny/e40-p2.htm">2</a><a href="/alza-dny/e40-p3.htm">3</a>`
	assert.equal(
		nextListingUrl(html, 1),
		"https://www.alza.cz/alza-dny/e40-p2.htm",
	)
	assert.equal(nextListingUrl(html, 3), null)
	assert.equal(
		nextListingUrl(
			'<a href="https://other.example/alza-dny/e40-p2.htm">2</a>',
			1,
		),
		null,
	)
	assert.equal(listingUrl, "https://www.alza.cz/alza-dny/e40.htm")
})

test("generated import SQL is idempotent and preserves quoted names", async () => {
	const db = new Database(":memory:")
	db.exec(
		await readFile(
			new URL("../cloudflare/migrations/0001_deal_import.sql", import.meta.url),
			"utf8",
		),
	)
	db.exec(
		await readFile(
			new URL(
				"../cloudflare/migrations/0002_import_scope.sql",
				import.meta.url,
			),
			"utf8",
		),
	)
	const run = runSql(
		"20261020T120000Z",
		"2026-10-20T12:00:00Z",
		"2026-10-20T12:10:00Z",
		1,
		1,
		1,
	)
	const batch = productSql("20261020T120000Z", [
		{ product, observedAt: "2026-10-20T12:10:00Z" },
	])
	db.exec(run.start)
	db.exec(batch)
	db.exec(batch)
	db.exec(run.complete)
	assert.equal(
		(
			db.query("SELECT name FROM products WHERE alza_id = 123").get() as {
				name: string
			}
		).name,
		"Joe's phone",
	)
	assert.equal(
		(
			db.query("SELECT COUNT(*) AS count FROM price_observations").get() as {
				count: number
			}
		).count,
		1,
	)
	assert.equal(
		(db.query("SELECT status FROM import_runs").get() as { status: string })
			.status,
		"complete",
	)
	const sample = runSql(
		"20261020T120000ZS3",
		"2026-10-20T12:00:00Z",
		"2026-10-20T12:10:00Z",
		100,
		3,
		1,
		"sample",
	)
	db.exec(sample.start)
	db.exec(sample.complete)
	assert.equal(
		(
			db
				.query("SELECT scope FROM import_runs WHERE id = '20261020T120000ZS3'")
				.get() as { scope: string }
		).scope,
		"sample",
	)
	db.close()
})

test("saved-page crawl resumes and only completes after the last page", async () => {
	const workspace = await mkdtemp(join(tmpdir(), "vilis-import-"))
	try {
		const pages = join(workspace, "pages")
		await mkdir(pages)
		for (const page of [1, 2]) {
			await writeFile(
				join(pages, `page-${page}.html`),
				`<script>"user_login_state":"logged_out"</script>
				<span class="numberItem">2</span>
				<div class="browsingitem" data-id="${page}" data-code="P${page}">
				  <a class="name" href="/product-d${page}.htm">Product ${page}</a>
				  <div data-coupon-code="ALZADNY15"><span class="coupon-block__price">850,-</span></div>
				  <span class="ads-pb__price-value">1 000,-</span>
				</div>
				${page === 1 ? '<a href="/alza-dny/e40-p2.htm">2</a>' : ""}`,
			)
		}
		const script = new URL("../scripts/import-deals.ts", import.meta.url)
			.pathname
		async function run(...args: string[]) {
			const child = Bun.spawn(
				[process.execPath, script, "crawl", "--from-dir", pages, ...args],
				{
					cwd: workspace,
					stdout: "pipe",
					stderr: "pipe",
				},
			)
			const code = await child.exited
			assert.equal(code, 0, await new Response(child.stderr).text())
		}
		await run("--max-pages", "1")
		const dataDir = join(workspace, ".data/deals-import")
		const { runId } = JSON.parse(
			await readFile(join(dataDir, "latest.json"), "utf8"),
		)
		let manifest = JSON.parse(
			await readFile(join(dataDir, runId, "manifest.json"), "utf8"),
		)
		assert.equal(manifest.completedAt, null)
		assert.equal(manifest.pageCount, 1)
		await run()
		manifest = JSON.parse(
			await readFile(join(dataDir, runId, "manifest.json"), "utf8"),
		)
		assert.equal(manifest.pageCount, 2)
		assert.ok(manifest.completedAt)
	} finally {
		await rm(workspace, { recursive: true, force: true })
	}
})
