import robotsParser from 'robots-parser';
import { parseSavedHtml } from '../src/parser.ts';

const userAgent = 'AlzaDnyLocalResearch/0.1';
const robotsUrl = 'https://www.alza.cz/robots.txt';
const pageUrl = 'https://www.alza.cz/alza-dny/e40.htm';

async function requestText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent, Accept: 'text/html,text/plain' },
  });
  const body = await response.text();
  const bytes = new TextEncoder().encode(body).byteLength;
  if (bytes > 5_000_000) throw new Error('Response exceeded 5 MB');
  return {
    status: response.status,
    challenge: response.headers.get('cf-mitigated') === 'challenge',
    contentType: response.headers.get('content-type') ?? '',
    bytes,
    body,
  };
}

function summary(response) {
  return {
    status: response.status,
    challenge: response.challenge,
    contentType: response.contentType,
    bytes: response.bytes,
  };
}

export default {
  async fetch(request, env) {
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/' || pathname === '/health') {
        await env.DB.prepare('SELECT 1').first();
        return Response.json({ status: 'ok', database: 'ok' });
      }
      if (pathname !== '/probe') return new Response('Not found', { status: 404 });
      const robots = await requestText(robotsUrl);
      if (robots.status !== 200 || robots.challenge) {
        return Response.json({ robots: summary(robots), page: null });
      }
      if (robotsParser(robotsUrl, robots.body).isAllowed(pageUrl, userAgent) !== true) {
        return Response.json({ robots: summary(robots), allowed: false, page: null });
      }
      const page = await requestText(pageUrl);
      const parsed = page.status === 200 && !page.challenge && page.contentType.includes('text/html')
        ? parseSavedHtml(page.body)
        : null;
      return Response.json({
        robots: summary(robots), allowed: true, page: summary(page),
        parsed: parsed && {
          loginState: parsed.loginState,
          cardsFound: parsed.cardsFound,
          productsParsed: parsed.products.length,
          categoriesParsed: parsed.categories.length,
          errors: parsed.errors,
        },
      });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
  },
};
