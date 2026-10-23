import { fetchTierPrices, type TierPrice } from "../../utils/tier-prices"

type Statement = {
	bind: (...values: (string | number)[]) => Statement
	first: <T>() => Promise<T | null>
	run: () => Promise<unknown>
}
type Database = { prepare: (sql: string) => Statement }

const cacheDurationMs = 30 * 60 * 1000

export default defineEventHandler(async (event) => {
	const id = Number(getRouterParam(event, "id"))
	if (!Number.isSafeInteger(id) || id <= 0)
		throw createError({ statusCode: 400, statusMessage: "Invalid product ID" })
	const db = (event.context.cloudflare as { env: { DB: Database } } | undefined)
		?.env.DB
	if (!db)
		throw createError({
			statusCode: 503,
			statusMessage: "Database unavailable",
		})
	const product = await db
		.prepare("SELECT alza_id FROM products WHERE alza_id = ?")
		.bind(id)
		.first<{ alza_id: number }>()
	if (!product)
		throw createError({ statusCode: 404, statusMessage: "Product not found" })
	const cached = await db
		.prepare(
			"SELECT fetched_at, prices_json FROM tier_prices WHERE alza_id = ?",
		)
		.bind(id)
		.first<{ fetched_at: number; prices_json: string }>()
	if (cached && Date.now() - cached.fetched_at < cacheDurationMs) {
		try {
			return {
				id: String(id),
				prices: JSON.parse(cached.prices_json) as TierPrice[],
			}
		} catch {
			/* Refresh an invalid cache entry. */
		}
	}
	try {
		const prices = await fetchTierPrices(id)
		await db
			.prepare(
				`INSERT INTO tier_prices (alza_id, fetched_at, prices_json) VALUES (?, ?, ?)
			ON CONFLICT(alza_id) DO UPDATE SET fetched_at = excluded.fetched_at, prices_json = excluded.prices_json`,
			)
			.bind(id, Date.now(), JSON.stringify(prices))
			.run()
		return { id: String(id), prices }
	} catch (error) {
		console.error("Could not load Alza tier prices", id, error)
		throw createError({
			statusCode: 502,
			statusMessage: "Tier prices unavailable",
		})
	}
})
