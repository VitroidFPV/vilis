import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { get } from 'node:https';
import { parseSavedHtml } from './parser.ts';
import { importSnapshot } from './catalog.ts';

const usage = 'Usage: npm run parse -- <saved.html> [--state catalog.json] | npm run parse -- --url https://www.alza.cz/alza-dny/e40.htm [--state catalog.json]';
const USER_AGENT = 'AlzaDnyLocalResearch/0.1';
const robotsParser = createRequire(import.meta.url)('robots-parser') as
  (url: string, text: string) => { isAllowed(url: string, userAgent: string): boolean | undefined };

function requestText(url: URL): Promise<{ status: number; contentType: string; body: string; challenged: boolean }> {
  return new Promise((resolve, reject) => {
    const request = get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        // Matches a direct browser navigation without carrying browser state or cookies.
        'Sec-Fetch-Site': 'none',
      },
    }, response => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 5_000_000) request.destroy(new Error('Response exceeded 5 MB'));
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({
        status: response.statusCode ?? 0,
        contentType: String(response.headers['content-type'] ?? ''),
        challenged: response.headers['cf-mitigated'] === 'challenge',
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.setTimeout(15_000, () => request.destroy(new Error('Request timed out')));
    request.on('error', reject);
  });
}

async function fetchPage(urlText: string): Promise<string> {
  const url = new URL(urlText);
  if (url.protocol !== 'https:' || url.hostname !== 'www.alza.cz') {
    throw new Error('Only HTTPS pages on www.alza.cz are accepted');
  }
  const robots = await requestText(new URL('https://www.alza.cz/robots.txt'));
  if (robots.status !== 200) throw new Error(`robots.txt returned HTTP ${robots.status}${robots.challenged ? ' (Cloudflare challenge)' : ''}; stopping before requesting the listing`);
  if (robotsParser('https://www.alza.cz/robots.txt', robots.body).isAllowed(url.href, USER_AGENT) !== true) {
    throw new Error(`robots.txt does not allow ${url.pathname} for ${USER_AGENT}`);
  }
  const response = await requestText(url);
  if (response.status !== 200) throw new Error(`Listing returned HTTP ${response.status}${response.challenged ? ' (Cloudflare challenge)' : ''}`);
  if (!response.contentType.toLowerCase().includes('text/html')) {
    throw new Error('Listing did not return HTML');
  }
  return response.body;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const stateIndex = args.indexOf('--state');
  const statePath = stateIndex >= 0 ? args.splice(stateIndex, 2)[1] : undefined;
  if (stateIndex >= 0 && !statePath) throw new Error('--state needs a file path');
  let html: string;
  if (args[0] === '--url' && args.length === 2) html = await fetchPage(args[1]);
  else if (args.length === 1 && !args[0].startsWith('--')) html = await readFile(args[0], 'utf8');
  else throw new Error(usage);

  const parsed = parseSavedHtml(html);
  const summary = {
    loginState: parsed.loginState,
    listedTotal: parsed.listedTotal, cardsFound: parsed.cardsFound,
    productsParsed: parsed.products.length, categoriesParsed: parsed.categories.length,
    errors: parsed.errors,
  };
  if (statePath) {
    const importResult = await importSnapshot(statePath, parsed);
    console.log(JSON.stringify({ ...summary, import: importResult }, null, 2));
  } else {
    console.log(JSON.stringify({ ...summary, products: parsed.products, categories: parsed.categories }, null, 2));
  }
  if (parsed.cardsFound === 0 || parsed.errors.length) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
