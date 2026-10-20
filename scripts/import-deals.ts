import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import {
	nextListingUrl,
	listingUrl,
	productSql,
	runSql,
	type ObservedProduct,
} from "../src/import-deals.ts"
import { parseSavedHtml, type Product } from "../src/parser.ts"

const robotsParser: (
	url: string,
	text: string,
) => { isAllowed: (url: string, userAgent: string) => boolean | undefined } =
	createRequire(import.meta.url)("robots-parser")

const userAgent = "VilisManualImport/0.1"
const robotsUrl = "https://www.alza.cz/robots.txt"
const maxTotalPages = 3_000
const dataDir = resolve(".data/deals-import")
const wrangler = fileURLToPath(
	new URL("../node_modules/.bin/wrangler", import.meta.url),
)
const wranglerConfig = fileURLToPath(
	new URL("../cloudflare/wrangler.jsonc", import.meta.url),
)

type Manifest = {
	runId: string
	startedAt: string
	completedAt: string | null
	nextUrl: string | null
	pageCount: number
	listedTotal: number | null
}
type SavedPage = { url: string; fetchedAt: string; products: Product[] }

async function saveJson(path: string, value: unknown) {
	await writeFile(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`)
	await rename(`${path}.tmp`, path)
}

async function readJson<T>(path: string): Promise<T> {
	return JSON.parse(await readFile(path, "utf8")) as T
}

async function latestRunId(): Promise<string | null> {
	try {
		return (await readJson<{ runId: string }>(`${dataDir}/latest.json`)).runId
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
		throw error
	}
}

async function requestText(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: { "User-Agent": userAgent, Accept: "text/html,text/plain" },
		signal: AbortSignal.timeout(20_000),
	})
	if (!response.ok || response.headers.get("cf-mitigated") === "challenge")
		throw new Error(`${url}: HTTP ${response.status} or challenge`)
	const contentType = response.headers.get("content-type") ?? ""
	if (!contentType.includes(url === robotsUrl ? "text/plain" : "text/html"))
		throw new Error(`${url}: unexpected content type ${contentType}`)
	const reader = response.body?.getReader()
	if (!reader) throw new Error(`${url}: empty response`)
	const chunks: Uint8Array[] = []
	let bytes = 0
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		bytes += value.byteLength
		if (bytes > 5_000_000) {
			await reader.cancel()
			throw new Error(`${url}: response exceeded 5 MB`)
		}
		chunks.push(value)
	}
	const buffer = new Uint8Array(bytes)
	let offset = 0
	for (const chunk of chunks) {
		buffer.set(chunk, offset)
		offset += chunk.byteLength
	}
	return new TextDecoder().decode(buffer)
}

function option(args: string[], name: string): string | null {
	const index = args.indexOf(name)
	if (index < 0) return null
	if (!args[index + 1] || args[index + 1].startsWith("--"))
		throw new Error(`${name} needs a value`)
	return args[index + 1]
}

async function crawl(args: string[]) {
	const maxPagesArg = option(args, "--max-pages")
	const maxPages = maxPagesArg === null ? Infinity : Number(maxPagesArg)
	if (
		(!Number.isSafeInteger(maxPages) && maxPages !== Infinity) ||
		maxPages < 1
	)
		throw new Error("--max-pages must be a positive integer")
	const fromDir = option(args, "--from-dir")
	await mkdir(dataDir, { recursive: true })
	let runId = args.includes("--new") ? null : await latestRunId()
	let manifest = runId
		? await readJson<Manifest>(`${dataDir}/${runId}/manifest.json`)
		: null
	if (manifest?.completedAt) manifest = null
	if (!manifest) {
		runId = new Date().toISOString().replaceAll(/[-:.]/g, "")
		manifest = {
			runId,
			startedAt: new Date().toISOString(),
			completedAt: null,
			nextUrl: listingUrl,
			pageCount: 0,
			listedTotal: null,
		}
		await mkdir(`${dataDir}/${runId}`, { recursive: true })
		await saveJson(`${dataDir}/${runId}/manifest.json`, manifest)
		await saveJson(`${dataDir}/latest.json`, { runId })
	}
	const runDir = `${dataDir}/${manifest.runId}`
	const robots = fromDir
		? null
		: robotsParser(robotsUrl, await requestText(robotsUrl))
	let crawled = 0
	while (manifest.nextUrl && crawled < maxPages) {
		const page = manifest.pageCount + 1
		if (page > maxTotalPages)
			throw new Error(
				`Reached the safety limit of ${maxTotalPages} listing pages`,
			)
		const url = manifest.nextUrl
		if (robots?.isAllowed(url, userAgent) !== true && !fromDir)
			throw new Error(`${url}: disallowed or not confirmed by robots.txt`)
		const html = fromDir
			? await readFile(resolve(fromDir, `page-${page}.html`), "utf8")
			: await requestText(url)
		const parsed = parseSavedHtml(html)
		if (
			parsed.loginState !== "logged_out" ||
			parsed.cardsFound === 0 ||
			(page === 1 && parsed.listedTotal === null) ||
			parsed.errors.length
		)
			throw new Error(
				`Page ${page}: unsafe result (${parsed.loginState}, ${parsed.cardsFound} cards, ${parsed.errors.length} errors): ${parsed.errors.slice(0, 3).join("; ")}`,
			)
		const nextUrl = nextListingUrl(html, page)
		const fetchedAt = new Date().toISOString()
		await saveJson(`${runDir}/page-${page}.json`, {
			url,
			fetchedAt,
			products: parsed.products,
		} satisfies SavedPage)
		manifest.pageCount = page
		manifest.listedTotal ??= parsed.listedTotal
		manifest.nextUrl = nextUrl
		await saveJson(`${runDir}/manifest.json`, manifest)
		crawled++
		console.log(
			`Page ${page}: ${parsed.products.length} products; next ${nextUrl ?? "none"}`,
		)
		if (nextUrl && !fromDir && crawled < maxPages) await Bun.sleep(1_000)
	}
	if (!manifest.nextUrl) {
		const products = await collectProducts(runDir, manifest.pageCount)
		if (manifest.listedTotal && products.length < manifest.listedTotal * 0.98)
			throw new Error(
				`Only ${products.length} unique products from ${manifest.listedTotal} listed; crawl not marked complete`,
			)
		manifest.completedAt = new Date().toISOString()
		await saveJson(`${runDir}/manifest.json`, manifest)
		console.log(
			`Crawl complete: ${products.length} unique products in ${manifest.pageCount} pages (${manifest.runId})`,
		)
	} else {
		console.log(
			`Paused after ${crawled} pages. Run crawl again to resume ${manifest.runId}.`,
		)
	}
}

async function collectProducts(
	runDir: string,
	pageCount: number,
): Promise<ObservedProduct[]> {
	const products = new Map<number, ObservedProduct>()
	for (let page = 1; page <= pageCount; page++) {
		const saved = await readJson<SavedPage>(`${runDir}/page-${page}.json`)
		for (const product of saved.products)
			products.set(product.alzaId, { product, observedAt: saved.fetchedAt })
	}
	return [...products.values()]
}

async function runWrangler(mode: "--local" | "--remote", args: string[]) {
	const child = Bun.spawn(
		[
			wrangler,
			"d1",
			"execute",
			"alza-dny",
			"--config",
			wranglerConfig,
			mode,
			...args,
		],
		{ stdout: "inherit", stderr: "inherit" },
	)
	if ((await child.exited) !== 0)
		throw new Error(`Wrangler D1 command failed: ${args[0]}`)
}

async function upload(args: string[]) {
	const mode = args.includes("--remote")
		? "--remote"
		: args.includes("--local")
			? "--local"
			: null
	if (!mode || (args.includes("--remote") && args.includes("--local")))
		throw new Error("Choose exactly one of --local or --remote")
	const runId = option(args, "--run-id") ?? (await latestRunId())
	if (!runId || !/^[0-9TZ]+$/.test(runId))
		throw new Error("No valid run ID found")
	const runDir = `${dataDir}/${runId}`
	const manifest = await readJson<Manifest>(`${runDir}/manifest.json`)
	const sample = args.includes("--sample")
	if (!sample && (!manifest.completedAt || manifest.nextUrl))
		throw new Error("Crawl is incomplete; refusing to upload")
	if (sample && manifest.pageCount === 0)
		throw new Error("No saved pages to upload as a sample")
	const products = await collectProducts(runDir, manifest.pageCount)
	if (!products.length) throw new Error("No products to upload")
	const uploadRunId = sample ? `${runId}S${manifest.pageCount}` : runId
	const completedAt =
		manifest.completedAt ??
		products.reduce(
			(latest, item) => (item.observedAt > latest ? item.observedAt : latest),
			manifest.startedAt,
		)
	const sqlDir = sample
		? `${runDir}/sql-sample-${manifest.pageCount}`
		: `${runDir}/sql`
	await mkdir(sqlDir, { recursive: true })
	const statements = runSql(
		uploadRunId,
		manifest.startedAt,
		completedAt,
		manifest.listedTotal,
		manifest.pageCount,
		products.length,
		sample ? "sample" : "full",
	)
	await writeFile(`${sqlDir}/start.sql`, `${statements.start}\n`)
	for (let offset = 0; offset < products.length; offset += 100) {
		const batch = products.slice(offset, offset + 100)
		await writeFile(
			`${sqlDir}/batch-${String(offset / 100 + 1).padStart(4, "0")}.sql`,
			`${productSql(uploadRunId, batch)}\n`,
		)
	}
	await writeFile(`${sqlDir}/complete.sql`, `${statements.complete}\n`)
	console.log(
		`Uploading ${products.length} products in ${Math.ceil(products.length / 100)} batches to ${mode.slice(2)} D1`,
	)
	await runWrangler(mode, ["--file", `${sqlDir}/start.sql`])
	const batches = (await readdir(sqlDir))
		.filter((file) => /^batch-\d+\.sql$/.test(file))
		.sort()
	for (const [index, file] of batches.entries()) {
		await runWrangler(mode, ["--file", `${sqlDir}/${file}`])
		console.log(`Uploaded batch ${index + 1}/${batches.length}`)
	}
	await runWrangler(mode, ["--file", `${sqlDir}/complete.sql`])
	console.log(`Import ${uploadRunId} complete (${sample ? "sample" : "full"})`)
}

async function main() {
	const [command, ...args] = process.argv.slice(2)
	if (command === "crawl") await crawl(args)
	else if (command === "upload") await upload(args)
	else
		throw new Error(
			"Usage: bun run import:deals crawl [--new] [--max-pages N] [--from-dir DIR] | upload (--local | --remote) [--sample] [--run-id ID]",
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
