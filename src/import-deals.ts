import * as cheerio from "cheerio"
import type { Product } from "./parser.ts"

export const listingUrl = "https://www.alza.cz/alza-dny/e40.htm"
export type ObservedProduct = { product: Product; observedAt: string }

export function nextListingUrl(html: string, page: number): string | null {
	const expected = `https://www.alza.cz/alza-dny/e40-p${page + 1}.htm`
	const $ = cheerio.load(html)
	let found = false
	$("a[href]").each((_, element) => {
		if (found) return
		try {
			found = new URL($(element).attr("href")!, listingUrl).href === expected
		} catch {
			// Ignore malformed links.
		}
	})
	return found ? expected : null
}

function sql(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return "NULL"
	if (typeof value === "number") {
		if (!Number.isSafeInteger(value))
			throw new Error("Invalid number in import")
		return String(value)
	}
	return `'${value.replaceAll("\0", "").replaceAll("'", "''")}'`
}

export function productSql(runId: string, products: ObservedProduct[]): string {
	if (products.length === 0) throw new Error("Cannot upload an empty batch")
	const productRows = products.map(
		({ product: p }) =>
			`(${[p.alzaId, p.orderCode, p.name, p.url, p.imageUrl].map(sql).join(", ")})`,
	)
	const observationRows = products.map(
		({ product: p, observedAt }) =>
			`(${[
				runId,
				p.alzaId,
				observedAt,
				p.couponCode,
				p.discountPct,
				p.priceWithoutCoupon,
				p.priceAfterCoupon,
				p.comparePrice,
			]
				.map(sql)
				.join(", ")})`,
	)
	return [
		"INSERT INTO products (alza_id, order_code, name, url, image_url) VALUES",
		`${productRows.join(",\n")} ON CONFLICT(alza_id) DO UPDATE SET order_code=excluded.order_code, name=excluded.name, url=excluded.url, image_url=excluded.image_url;`,
		"INSERT INTO price_observations (run_id, alza_id, observed_at, coupon_code, discount_pct, price_without_coupon, price_after_coupon, compare_price) VALUES",
		`${observationRows.join(",\n")} ON CONFLICT(run_id, alza_id) DO NOTHING;`,
	].join("\n")
}

export function runSql(
	runId: string,
	startedAt: string,
	completedAt: string,
	listedTotal: number | null,
	pageCount: number,
	productCount: number,
	scope: "full" | "sample" = "full",
): { start: string; complete: string } {
	return {
		start: `INSERT INTO import_runs (id, started_at, source_url, listed_total, page_count, product_count, status, scope) VALUES (${[runId, startedAt, listingUrl, listedTotal, pageCount, productCount, "uploading", scope].map(sql).join(", ")}) ON CONFLICT(id) DO NOTHING;`,
		complete: `UPDATE import_runs SET status='complete', completed_at=${sql(completedAt)} WHERE id=${sql(runId)};`,
	}
}
