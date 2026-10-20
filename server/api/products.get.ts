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
	const search = query.q === undefined ? "" : query.q
	const sort = query.sort === undefined ? "name" : query.sort
	const minDiscount =
		query.minDiscount === undefined ? 0 : Number(query.minDiscount)
	const maxPrice = query.maxPrice === undefined ? 0 : Number(query.maxPrice)
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
	if (typeof search !== "string" || search.trim().length > 100) {
		throw createError({ statusCode: 400, statusMessage: "Invalid search" })
	}
	const sortOrders: Record<string, string> = {
		name: "p.name ASC, p.alza_id ASC",
		discount: "o.discount_pct DESC, p.alza_id ASC",
		priceAsc: "o.price_after_coupon ASC, p.alza_id ASC",
		priceDesc: "o.price_after_coupon DESC, p.alza_id ASC",
	}
	if (typeof sort !== "string" || !Object.hasOwn(sortOrders, sort)) {
		throw createError({ statusCode: 400, statusMessage: "Invalid sort" })
	}
	if (
		!Number.isSafeInteger(minDiscount) ||
		minDiscount < 0 ||
		minDiscount > 100 ||
		!Number.isSafeInteger(maxPrice) ||
		maxPrice < 0
	) {
		throw createError({ statusCode: 400, statusMessage: "Invalid filters" })
	}
	const term = search.trim()
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
	if (!run) return { run: null, products: [], total: 0, page, limit }
	const filters: string[] = []
	const bindings: (string | number)[] = [run.id]
	if (term) {
		filters.push(
			"(instr(lower(p.name), lower(?)) > 0 OR instr(lower(p.order_code), lower(?)) > 0)",
		)
		bindings.push(term, term)
	}
	if (minDiscount) {
		filters.push("o.discount_pct >= ?")
		bindings.push(minDiscount)
	}
	if (maxPrice) {
		filters.push("o.price_after_coupon <= ?")
		bindings.push(maxPrice)
	}
	const filter = filters.length ? ` AND ${filters.join(" AND ")}` : ""
	const count = await db
		.prepare(
			`SELECT count(*) AS total
		 FROM price_observations o JOIN products p ON p.alza_id = o.alza_id
		 WHERE o.run_id = ?${filter}`,
		)
		.bind(...bindings)
		.first<{ total: number }>()
	const { results } = await db
		.prepare(
			`SELECT p.alza_id AS alzaId, p.order_code AS orderCode, p.name, p.url,
		 p.image_url AS imageUrl, o.coupon_code AS couponCode,
		 o.discount_pct AS discountPct, o.price_without_coupon AS priceWithoutCoupon,
		 o.price_after_coupon AS priceAfterCoupon, o.compare_price AS comparePrice,
		 o.observed_at AS observedAt
		 FROM price_observations o JOIN products p ON p.alza_id = o.alza_id
			WHERE o.run_id = ?${filter} ORDER BY ${sortOrders[sort]} LIMIT ? OFFSET ?`,
		)
		.bind(...bindings, limit, (page - 1) * limit)
		.all<ProductRow>()
	return { run, products: results, total: count?.total ?? 0, page, limit }
})
