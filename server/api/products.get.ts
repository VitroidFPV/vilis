type Statement = {
	bind: (...values: (string | number)[]) => Statement
	first: <T>() => Promise<T | null>
	all: <T>() => Promise<{ results: T[] }>
}
type Database = { prepare: (sql: string) => Statement }

type ImportRun = {
	id: string
	scope: "full" | "sample"
	completedAt: string
	productCount: number
	pageCount: number
}
type ProductRow = {
	alzaId: number
	orderCode: string
	name: string
	url: string
	imageUrl: string | null
	couponCode: string
	discountPct: number
	priceWithoutCoupon: number
	priceAfterCoupon: number
	comparePrice: number | null
	observedAt: string
}

export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const page = query.page === undefined ? 1 : Number(query.page)
	const limit = query.limit === undefined ? 24 : Number(query.limit)
	if (
		!Number.isSafeInteger(page) ||
		page < 1 ||
		page > 10_000 ||
		!Number.isSafeInteger(limit) ||
		limit < 1 ||
		limit > 100
	) {
		throw createError({ statusCode: 400, statusMessage: "Invalid pagination" })
	}
	const db = (event.context.cloudflare as { env: { DB: Database } } | undefined)
		?.env.DB
	if (!db)
		throw createError({
			statusCode: 503,
			statusMessage: "Database unavailable",
		})
	const run = await db
		.prepare(
			`SELECT id, scope, completed_at AS completedAt, product_count AS productCount, page_count AS pageCount
		 FROM import_runs WHERE status = 'complete'
		 ORDER BY completed_at DESC LIMIT 1`,
		)
		.first<ImportRun>()
	if (!run) return { run: null, products: [], page, limit }
	const { results } = await db
		.prepare(
			`SELECT p.alza_id AS alzaId, p.order_code AS orderCode, p.name, p.url,
		 p.image_url AS imageUrl, o.coupon_code AS couponCode,
		 o.discount_pct AS discountPct, o.price_without_coupon AS priceWithoutCoupon,
		 o.price_after_coupon AS priceAfterCoupon, o.compare_price AS comparePrice,
		 o.observed_at AS observedAt
		 FROM price_observations o JOIN products p ON p.alza_id = o.alza_id
		 WHERE o.run_id = ? ORDER BY p.name, p.alza_id LIMIT ? OFFSET ?`,
		)
		.bind(run.id, limit, (page - 1) * limit)
		.all<ProductRow>()
	return { run, products: results, page, limit }
})
