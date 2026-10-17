import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.alza.cz/alza-dny/e40.htm';

export type Product = {
  alzaId: number;
  orderCode: string;
  name: string;
  url: string;
  imageUrl?: string;
  couponCode: string;
  discountPct: number;
  priceWithoutCoupon: number;
  priceAfterCoupon: number;
  comparePrice?: number;
};

export type Category = { name: string; url: string };
export type ParseResult = {
  loginState: 'logged_in' | 'logged_out' | 'unknown';
  listedTotal: number | null;
  cardsFound: number;
  products: Product[];
  categories: Category[];
  errors: string[];
};

function amount(text: string): number | null {
  const match = text.trim().match(/^([\d\s\u00a0\u202f]+)(?:,-)?$/);
  if (!match) return null;
  const value = Number(match[1].replace(/\s/g, ''));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function alzaUrl(href: string | undefined): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, BASE_URL);
    return url.protocol === 'https:' && url.hostname === 'www.alza.cz' ? url.href : null;
  } catch {
    return null;
  }
}

export function parseSavedHtml(html: string): ParseResult {
  const loginState = html.match(/user_login_state\\?":\\?"(logged_in|logged_out)\\?"/)?.[1] as
    'logged_in' | 'logged_out' | undefined;
  const $ = cheerio.load(html);
  const cards = $('.browsingitem');
  const products: Product[] = [];
  const errors: string[] = [];
  const seenIds = new Set<number>();

  cards.each((index, element) => {
    const card = $(element);
    const id = Number(card.attr('data-id'));
    const orderCode = card.attr('data-code')?.trim() ?? '';
    const name = card.find('a.name').first().text().trim();
    const url = alzaUrl(card.find('a.name').first().attr('href'));
    const rawImage = card.find('img.box-image').first().attr('src');
    const couponCode = card.find('[data-coupon-code]').first().attr('data-coupon-code')?.trim() ?? '';
    const discountMatch = /^ALZADNY(\d{1,2})$/i.exec(couponCode);
    const priceWithoutCoupon = amount(card.find('.ads-pb__price-value').first().text());
    const priceAfterCoupon = amount(card.find('.coupon-block__price').first().text());
    const compareText = card.find('.ads-pb__original-price--strike').first().text().trim();
    const comparePrice = compareText ? amount(compareText) : null;
    const discountPct = discountMatch ? Number(discountMatch[1]) : null;

    if (!Number.isSafeInteger(id) || id <= 0 || !orderCode || !name || !url ||
        discountPct === null || discountPct <= 0 || discountPct >= 100 ||
        priceWithoutCoupon === null || priceAfterCoupon === null ||
        (compareText && comparePrice === null)) {
      errors.push(`Card ${index + 1} (${orderCode || 'unknown'}): missing or invalid product field`);
      return;
    }
    if (seenIds.has(id)) {
      errors.push(`Card ${index + 1} (${orderCode}): duplicate product ID ${id}`);
      return;
    }
    const expectedPrice = Math.round(priceWithoutCoupon * (100 - discountPct) / 100);
    if (Math.abs(priceAfterCoupon - expectedPrice) > 1) {
      errors.push(`Card ${index + 1} (${orderCode}): coupon price ${priceAfterCoupon} differs from expected ${expectedPrice}`);
      return;
    }
    seenIds.add(id);
    let imageUrl: string | undefined;
    if (rawImage) {
      try { imageUrl = new URL(rawImage, BASE_URL).href; } catch { /* image is optional */ }
    }
    products.push({
      alzaId: id, orderCode, name, url, ...(imageUrl ? { imageUrl } : {}),
      couponCode, discountPct, priceWithoutCoupon, priceAfterCoupon,
      ...(comparePrice !== null ? { comparePrice } : {}),
    });
  });

  const categories: Category[] = [];
  const seenUrls = new Set<string>();
  $('a.category-tiles__tile').not('.category-tiles__tile--boost').each((_, element) => {
    const tile = $(element);
    const url = alzaUrl(tile.attr('href'));
    const name = tile.find('.category-tiles__tile-name').first().text().trim();
    if (url && name && !seenUrls.has(url)) {
      seenUrls.add(url);
      categories.push({ name, url });
    }
  });

  const listedTotal = amount($('span.numberItem').first().text());
  return { loginState: loginState ?? 'unknown', listedTotal, cardsFound: cards.length, products, categories, errors };
}
