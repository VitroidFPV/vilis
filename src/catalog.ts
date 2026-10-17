import { readFile, rename, writeFile } from 'node:fs/promises';
import type { ParseResult, Product, Category } from './parser.ts';

type PriceObservation = Pick<Product, 'alzaId' | 'couponCode' | 'discountPct' | 'priceWithoutCoupon' | 'priceAfterCoupon' | 'comparePrice'> & { observedAt: string };
export type Catalog = {
  products: Product[];
  categories: Category[];
  priceHistory: PriceObservation[];
};

function priceKey(product: Product | PriceObservation): string {
  return JSON.stringify([product.couponCode, product.discountPct, product.priceWithoutCoupon,
    product.priceAfterCoupon, product.comparePrice ?? null]);
}

export async function importSnapshot(path: string, parsed: ParseResult): Promise<{ added: number; changed: number; unchanged: number }> {
  if (parsed.loginState !== 'logged_out') {
    throw new Error('Refusing to import a page that does not identify itself as logged out');
  }
  if (parsed.cardsFound === 0 || parsed.products.length === 0 || parsed.errors.length) {
    throw new Error('Refusing to import an empty or partially parsed page');
  }
  let catalog: Catalog = { products: [], categories: [], priceHistory: [] };
  try {
    catalog = JSON.parse(await readFile(path, 'utf8')) as Catalog;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const products = new Map(catalog.products.map(product => [product.alzaId, product]));
  const categories = new Map(catalog.categories.map(category => [category.url, category]));
  let added = 0, changed = 0, unchanged = 0;
  for (const product of parsed.products) {
    const previous = products.get(product.alzaId);
    if (!previous) added++;
    else if (JSON.stringify(previous) !== JSON.stringify(product)) changed++;
    else unchanged++;
    products.set(product.alzaId, product);
    if (!previous || priceKey(previous) !== priceKey(product)) {
      catalog.priceHistory.push({
        alzaId: product.alzaId, couponCode: product.couponCode, discountPct: product.discountPct,
        priceWithoutCoupon: product.priceWithoutCoupon, priceAfterCoupon: product.priceAfterCoupon,
        ...(product.comparePrice !== undefined ? { comparePrice: product.comparePrice } : {}),
        observedAt: new Date().toISOString(),
      });
    }
  }
  for (const category of parsed.categories) categories.set(category.url, category);
  catalog.products = [...products.values()];
  catalog.categories = [...categories.values()];
  const temporary = `${path}.tmp`;
  await writeFile(temporary, JSON.stringify(catalog, null, 2) + '\n');
  await rename(temporary, path);
  return { added, changed, unchanged };
}
