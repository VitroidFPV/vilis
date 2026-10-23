import { readFile, rename, writeFile } from "node:fs/promises"
import { get } from "node:https"
import { fileURLToPath } from "node:url"
import {
	fetchCatalog,
	parseCatalog,
	userAgent,
	type TextResponse,
} from "../src/catalog.ts"

const outputPath = fileURLToPath(
	new URL("../app/data/catalog.json", import.meta.url),
)

function requestText(url: URL): Promise<TextResponse> {
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

async function main() {
	const args = process.argv.slice(2)
	if (args.length !== 0 && (args.length !== 2 || args[0] !== "--from-file")) {
		throw new Error(
			"Usage: bun run catalog:update [--from-file path-to-saved-catalog.html]",
		)
	}
	const categories = args.length
		? parseCatalog(await readFile(args[1], "utf8"))
		: await fetchCatalog(requestText)
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
