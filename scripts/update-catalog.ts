import { readFile, rename, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"

const robotsParser: (
	url: string,
	text: string,
) => { isAllowed: (url: string, userAgent: string) => boolean | undefined } =
	createRequire(import.meta.url)("robots-parser")

const catalogUrl = "https://www.alza.cz/en/catalog"

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
			"Catalog has fewer than 15 categories; keeping the existing snapshot",
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
	const categories: CatalogCategory[] = []
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

	return validateCatalog(categories)
}

const userAgent = "VilisCatalogRefresh/0.1"
const robotsUrl = "https://www.alza.cz/robots.txt"
const outputPath = fileURLToPath(
	new URL("../app/data/catalog.json", import.meta.url),
)

async function requestText(url: string) {
	const response = await fetch(url, {
		headers: { "User-Agent": userAgent, Accept: "text/html,text/plain" },
		signal: AbortSignal.timeout(30_000),
	})
	const body = await response.text()
	const bytes = new TextEncoder().encode(body).byteLength
	if (bytes > 5_000_000) throw new Error("Response exceeded 5 MB")
	return {
		status: response.status,
		challenge: response.headers.get("cf-mitigated") === "challenge",
		contentType: response.headers.get("content-type") ?? "",
		body,
	}
}

async function fetchCatalog() {
	const robots = await requestText(robotsUrl)
	if (robots.status !== 200 || robots.challenge)
		throw new Error(`Could not check Alza robots.txt (HTTP ${robots.status})`)
	if (
		robotsParser(robotsUrl, robots.body).isAllowed(catalogUrl, userAgent) !==
		true
	)
		throw new Error("Catalog fetch disallowed by robots.txt")

	const page = await requestText(catalogUrl)
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
