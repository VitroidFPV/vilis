type TierName = "Gold" | "Silver" | "ISIC" | "Bronze" | "B2B" | "Basic"
type Price = { amount: number; type: number | null; coupon: boolean }
type Tier = {
	name: TierName
	hidden: boolean
	main: Price | null
	selected: Price | null
	promos: Price[]
}

export type TierPrice = { label: string; price: number }

const groups: Record<TierName, string> = {
	Gold: "p_pg4_e6c95",
	Silver: "p_pg3_36eef",
	ISIC: "p_pg3is1_2b2fc",
	Bronze: "p_pg5_44266",
	B2B: "p_pg6_6ce49",
	Basic: "p__26752",
}

function readPrice(value: unknown): Price | null {
	if (!value || typeof value !== "object") return null
	const v = value as Record<string, unknown>
	if (typeof v.primaryPrice !== "number" && typeof v.primaryPrice !== "string")
		return null
	let printed = String(v.primaryPrice)
		.trim()
		.replace(/\s/g, "")
		.replace(/(?:Kč|CZK)$/i, "")
		.replace(/[,.][-–—]$/, "")
	if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(printed))
		printed = printed.replace(/\./g, "")
	if (!/^\d+(?:[,.]\d{1,2})?$/.test(printed)) return null
	const amount = Number(printed.replace(",", "."))
	return Number.isFinite(amount) && amount > 0
		? {
				amount,
				type: typeof v.priceType === "number" ? v.priceType : null,
				coupon:
					typeof v.discountCouponCode === "string" && !!v.discountCouponCode,
			}
		: null
}

function pricingNode(
	value: unknown,
	depth = 0,
): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || depth > 30) return null
	const node = value as Record<string, unknown>
	if (node.mainPriceTag || Array.isArray(node.promoPrices)) return node
	for (const child of Object.values(node)) {
		const found = pricingNode(child, depth + 1)
		if (found) return found
	}
	return null
}

function parseTier(name: TierName, value: unknown): Tier {
	const pricing = pricingNode(value)
	if (
		!pricing ||
		!pricing.mainPriceTag ||
		typeof pricing.mainPriceTag !== "object"
	)
		throw new Error(`Missing ${name} pricing`)
	const mainTag = pricing.mainPriceTag as Record<string, unknown>
	const main = readPrice(mainTag)
	if (!main) throw new Error(`Invalid ${name} price`)
	const promos = Array.isArray(pricing.promoPrices)
		? pricing.promoPrices
				.map(readPrice)
				.filter((price): price is Price => !!price)
		: []
	const selected = [main, ...promos].reduce((best, price) =>
		price.amount < best.amount ? price : best,
	)
	const compare = readPrice({ primaryPrice: mainTag.comparePrice })
	const discountBase = compare ?? (selected !== main ? main : null)
	const hidden =
		name !== "Basic" &&
		((mainTag.priceGroupType === 0 && mainTag.priceType !== 7) ||
			((mainTag.priceType === 7 || mainTag.priceType === 4) &&
				(!discountBase || selected.amount === discountBase.amount)))
	return { name, hidden, main, selected, promos }
}

const requestHeaders = {
	Accept: "application/json",
	"User-Agent": "VilisTierPrices/0.1",
	"Sec-Fetch-Site": "none",
}

async function requestJson(url: URL): Promise<unknown> {
	const response = await fetch(url, {
		headers: requestHeaders,
		signal: AbortSignal.timeout(8_000),
	})
	if (
		!response.ok ||
		response.headers.get("cf-mitigated") === "challenge" ||
		!response.headers.get("content-type")?.includes("json")
	)
		throw new Error(`Alza price request returned HTTP ${response.status}`)
	const body = await response.text()
	if (body.length > 2_000_000) throw new Error("Price response too large")
	return JSON.parse(body)
}

async function fetchTier(id: number, name: TierName): Promise<Tier> {
	const url = new URL(
		`https://webapi.alza.cz/api/commodity/v1/${id}/detailPriceInfoV3`,
	)
	url.searchParams.set("country", "CZ")
	url.searchParams.set("pgrik", groups[name])
	url.searchParams.set("ucik", "null")
	try {
		return parseTier(name, await requestJson(url))
	} catch (error) {
		throw new Error(`${name}: ${String(error)}`, { cause: error })
	}
}

function isicPrice(isic: Tier, basic: Tier): number | null {
	const list = isic.main!.amount
	const base = basic.main!.amount
	if (list >= base) return null
	let best: number | null = null
	for (const kind of [1, 2]) {
		const own = isic.promos.filter((p) => p.type === kind && !p.coupon)
		const standard = basic.promos.filter((p) => p.type === kind && !p.coupon)
		const mine = own.sort((a, b) => a.amount - b.amount)[0]
		const theirs = standard.sort((a, b) => a.amount - b.amount)[0]
		if (mine && (!theirs || Math.abs(mine.amount - theirs.amount) >= 0.005)) {
			if (mine.amount < list) best = Math.min(best ?? Infinity, mine.amount)
		} else if (theirs) {
			const adjusted = Math.round(list - (base - theirs.amount))
			if (adjusted > 0 && adjusted < list)
				best = Math.min(best ?? Infinity, adjusted)
		}
	}
	return isic.selected!.coupon ? (best ?? list) : best
}

// Tier ids, visibility rules, and the conditional Silver/Bronze fetch follow fxalza's
// Alza implementation: https://github.com/danielsebesta/fxalza (MIT license).
export async function fetchTierPrices(id: number): Promise<TierPrice[]> {
	const byName = new Map<TierName, Tier>()
	for (const name of ["Basic", "Gold", "ISIC", "B2B"] as TierName[])
		byName.set(name, await fetchTier(id, name))
	const basic = byName.get("Basic")!
	const gold = byName.get("Gold")!
	if (!gold.hidden && gold.main!.amount < basic.main!.amount - 0.004) {
		for (const name of ["Silver", "Bronze"] as TierName[])
			byName.set(name, await fetchTier(id, name))
	}
	const rows: { names: TierName[]; list: number; price: number }[] = []
	for (const name of [
		"Gold",
		"Silver",
		"ISIC",
		"Bronze",
		"B2B",
	] as TierName[]) {
		const tier = byName.get(name)
		if (!tier || tier.hidden || tier.main!.amount >= basic.main!.amount - 0.004)
			continue
		const price =
			(name === "ISIC" ? isicPrice(tier, basic) : null) ?? tier.selected!.amount
		rows.push({ names: [name], list: tier.main!.amount, price })
	}
	const bronze = rows.find((row) => row.names[0] === "Bronze")
	const b2bIndex = rows.findIndex((row) => row.names[0] === "B2B")
	if (
		bronze &&
		b2bIndex >= 0 &&
		Math.abs(bronze.list - rows[b2bIndex]!.list) < 0.005 &&
		Math.abs(bronze.price - rows[b2bIndex]!.price) < 0.005
	)
		rows.splice(b2bIndex, 1)
	for (let i = 0; i < rows.length; i++) {
		for (let j = rows.length - 1; j > i; j--) {
			if (
				Math.abs(rows[i]!.list - rows[j]!.list) < 0.005 &&
				Math.abs(rows[i]!.price - rows[j]!.price) < 0.005
			) {
				rows[i]!.names.push(...rows[j]!.names)
				rows.splice(j, 1)
			}
		}
	}
	return rows.map((row) => ({ label: row.names.join("/"), price: row.price }))
}
