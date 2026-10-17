import { readFile, rename, writeFile } from "node:fs/promises"
import { get } from "node:https"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"

const robotsParser: (
	url: string,
	text: string,
) => { isAllowed: (url: string, userAgent: string) => boolean | undefined } =
	createRequire(import.meta.url)("robots-parser")

const catalogUrl = "https://www.alza.cz/catalog"

type CatalogLink = { name: string; url: string }
type CatalogCategory = CatalogLink & { children: CatalogLink[] }

function isCatalogLink(value: unknown): value is CatalogLink {
	if (typeof value !== "object" || value === null) return false
	const link = value as Record<string, unknown>
	if (typeof link.name !== "string" || !link.name.trim()) return false
	if (typeof link.url !== "string") return false
	try {
		const url = new URL(link.url)
		return url.protocol === "https:" && url.hostname === "www.alza.cz"
	} catch {
		return false
	}
}

function validateCatalog(value: unknown): CatalogCategory[] {
	if (!Array.isArray(value) || value.length < 15)
		throw new Error(
			`Catalog has ${Array.isArray(value) ? value.length : 0} categories; keeping the existing snapshot`,
		)
	let childCount = 0
	const seen = new Set<string>()
	for (const category of value) {
		if (
			!isCatalogLink(category) ||
			!("children" in category) ||
			!Array.isArray(category.children)
		)
			throw new Error("Catalog contains an invalid category")
		if (seen.has(category.url))
			throw new Error("Catalog contains duplicate categories")
		seen.add(category.url)
		if (!category.children.every(isCatalogLink))
			throw new Error("Catalog contains an invalid subcategory")
		childCount += category.children.length
	}
	if (childCount < 100)
		throw new Error(
			"Catalog has fewer than 100 subcategories; keeping the existing snapshot",
		)
	return value
}

function catalogLink(
	$: cheerio.CheerioAPI,
	element: Parameters<cheerio.CheerioAPI>[0],
): CatalogLink | null {
	const link = $(element)
	const name = link.text().trim().replace(/\s+/g, " ")
	const href = link.attr("href")
	if (!name || !href) return null
	try {
		const url = new URL(href, catalogUrl)
		if (url.protocol !== "https:" || url.hostname !== "www.alza.cz") return null
		return { name, url: url.href }
	} catch {
		return null
	}
}

function parseCatalog(html: string): CatalogCategory[] {
	const $ = cheerio.load(html)
	const main = $("main")
		.filter(
			(_, element) =>
				$(element).children("h1").first().text().trim() === "Catalog",
		)
		.first()
	const grid = main.children("div").first()
	let categories: CatalogCategory[] = []
	const seen = new Set<string>()

	grid.children("div").each((_, element) => {
		const node = $(element)
		const parent = node.children("a").has("h2").first()
		const category = catalogLink($, parent)
		if (!category || seen.has(category.url)) return
		seen.add(category.url)

		const children: CatalogLink[] = []
		const childUrls = new Set<string>()
		node
			.children("div")
			.first()
			.children("a")
			.each((_, childElement) => {
				const child = catalogLink($, childElement)
				if (child && !childUrls.has(child.url)) {
					childUrls.add(child.url)
					children.push(child)
				}
			})
		categories.push({ ...category, children })
	})
	if (
		categories.length < 15 ||
		categories.reduce(
			(total, category) => total + category.children.length,
			0,
		) < 100
	) {
		// Alza streams most category links in Next.js flight data instead of initial HTML.
		const flightCategories: CatalogCategory[] = []
		const seenRoots = new Set<string>()
		const subcategoryAnchors: { key: string; url: string }[] = []
		const seenSubcategories = new Set<string>()
		let stream = ""
		$("script").each((_, element) => {
			const script = $(element).html() ?? ""
			const match = /self\.__next_f\.push\((\[1,"(?:\\.|[^"\\])*"\])\)/.exec(
				script,
			)
			if (!match) return
			const payload: unknown = JSON.parse(match[1])
			if (Array.isArray(payload) && typeof payload[1] === "string")
				stream += payload[1]
		})

		function heading(value: unknown): string | null {
			if (Array.isArray(value)) {
				if (value[0] === "$" && value[1] === "h2") {
					const name = value[3]?.children
					return typeof name === "string" ? name.trim() : null
				}
				for (const nested of value) {
					const name = heading(nested)
					if (name) return name
				}
			} else if (value && typeof value === "object") {
				for (const nested of Object.values(value)) {
					const name = heading(nested)
					if (name) return name
				}
			}
			return null
		}

		function collect(value: unknown): void {
			if (Array.isArray(value)) {
				if (value[0] === "$" && value[1] === "a") {
					const url = value[3]?.href
					const key = value[2]
					if (typeof url === "string") {
						if (typeof key === "string" && key.startsWith("subcat-")) {
							if (!seenSubcategories.has(key)) {
								seenSubcategories.add(key)
								subcategoryAnchors.push({ key, url })
							}
						} else {
							const name = heading(value[3]?.children)
							if (name && !seenRoots.has(url)) {
								seenRoots.add(url)
								flightCategories.push({ name, url, children: [] })
							}
						}
					}
				}
				for (const nested of value) collect(nested)
			} else if (value && typeof value === "object") {
				for (const nested of Object.values(value)) collect(nested)
			}
		}

		for (const line of stream.split("\n")) {
			if (!line.includes("subcat-") && !line.includes("h2")) continue
			const record = /^[0-9a-f]+:(.*)$/i.exec(line)
			if (record) collect(JSON.parse(record[1]))
		}
		const parents = [...flightCategories].sort(
			(a, b) => b.name.length - a.name.length,
		)
		for (const { key, url } of subcategoryAnchors) {
			const parent = parents.find((category) =>
				key.startsWith(`subcat-${category.name}-`),
			)
			if (parent) {
				parent.children.push({
					name: key.slice(`subcat-${parent.name}-`.length).trim(),
					url,
				})
			}
		}
		categories = flightCategories
	}

	return validateCatalog(categories)
}

const userAgent = "VilisCatalogRefresh/0.1"
const robotsUrl = "https://www.alza.cz/robots.txt"
const outputPath = fileURLToPath(
	new URL("../app/data/catalog.json", import.meta.url),
)

function requestText(url: URL): Promise<{
	status: number
	challenge: boolean
	contentType: string
	body: string
}> {
	return new Promise((resolve, reject) => {
		const request = get(
			url,
			{
				headers: {
					"User-Agent": userAgent,
					"Sec-Fetch-Site": "none",
				},
			},
			(response) => {
				const chunks: Buffer[] = []
				let bytes = 0
				response.on("data", (chunk: Buffer) => {
					bytes += chunk.length
					if (bytes > 5_000_000)
						request.destroy(new Error("Response exceeded 5 MB"))
					else chunks.push(chunk)
				})
				response.on("error", reject)
				response.on("end", () =>
					resolve({
						status: response.statusCode ?? 0,
						challenge: response.headers["cf-mitigated"] === "challenge",
						contentType: String(response.headers["content-type"] ?? ""),
						body: Buffer.concat(chunks).toString("utf8"),
					}),
				)
			},
		)
		request.setTimeout(15_000, () =>
			request.destroy(new Error("Request timed out")),
		)
		request.on("error", reject)
	})
}

async function fetchCatalog() {
	const robots = await requestText(new URL(robotsUrl))
	if (robots.status !== 200 || robots.challenge)
		throw new Error(`Could not check Alza robots.txt (HTTP ${robots.status})`)
	if (
		robotsParser(robotsUrl, robots.body).isAllowed(catalogUrl, userAgent) !==
		true
	)
		throw new Error("Catalog fetch disallowed by robots.txt")

	const page = await requestText(new URL(catalogUrl))
	if (
		page.status !== 200 ||
		page.challenge ||
		!page.contentType.includes("text/html")
	)
		throw new Error(`Catalog did not return HTML (HTTP ${page.status})`)
	return parseCatalog(page.body)
}

async function main() {
	const args = process.argv.slice(2)
	if (args.length !== 0 && (args.length !== 2 || args[0] !== "--from-file")) {
		throw new Error(
			"Usage: bun run catalog:update [--from-file path-to-saved-catalog.html]",
		)
	}
	const categories = args.length
		? parseCatalog(await readFile(args[1], "utf8"))
		: await fetchCatalog()
	const tempPath = `${outputPath}.tmp`
	await writeFile(tempPath, `${JSON.stringify(categories, null, "\t")}\n`)
	await rename(tempPath, outputPath)
	console.log(
		`Saved ${categories.length} categories and ${categories.reduce((total, category) => total + category.children.length, 0)} subcategories to app/data/catalog.json`,
	)
}

if (import.meta.main) {
	try {
		await main()
	} catch (error) {
		console.error(error instanceof Error ? error.message : error)
		process.exitCode = 1
	}
}
