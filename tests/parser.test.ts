import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSavedHtml } from '../src/parser.ts';

function fixture(after = '850,-', before = '1&nbsp;000,-'): string {
  return `
    <script>window.dataLayer.push({"pv_user_details":{"user_login_state":"logged_out"}})</script>
    <span class="numberItem">1&nbsp;234</span>
    <a class="category-tiles__tile" href="/phones/alza-dny/e40.htm"><span class="category-tiles__tile-name">Phones &amp; tablets</span></a>
    <a class="category-tiles__tile" href="/phones/alza-dny/e40.htm"><span class="category-tiles__tile-name">Phones &amp; tablets</span></a>
    <a class="category-tiles__tile category-tiles__tile--boost" href="/promo/e19.htm"><span class="category-tiles__tile-name">Extra promotion</span></a>
    <div class="browsingitem" data-id="123" data-code="PHONE1">
      <a class="name" href="/phone-d123.htm">Phone &amp; charger</a>
      <img class="box-image" src="https://image.alza.cz/products/PHONE1.jpg?width=230&amp;height=230">
      <div data-coupon-code="ALZADNY15"><span class="coupon-block__price">${after}</span></div>
      <span class="ads-pb__price-value">${before}</span>
      <span class="ads-pb__original-price--strike">1 200,-</span>
    </div>`;
}

test('parses and validates the saved listing HTML', () => {
  const result = parseSavedHtml(fixture());
  assert.equal(result.listedTotal, 1234);
  assert.equal(result.loginState, 'logged_out');
  assert.equal(result.cardsFound, 1);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.categories, [{ name: 'Phones & tablets', url: 'https://www.alza.cz/phones/alza-dny/e40.htm' }]);
  assert.deepEqual(result.products[0], {
    alzaId: 123, orderCode: 'PHONE1', name: 'Phone & charger',
    url: 'https://www.alza.cz/phone-d123.htm',
    imageUrl: 'https://image.alza.cz/products/PHONE1.jpg?width=230&height=230',
    couponCode: 'ALZADNY15', discountPct: 15,
    priceWithoutCoupon: 1000, priceAfterCoupon: 850, comparePrice: 1200,
  });
  assert.equal(parseSavedHtml(fixture('900,-')).errors.length, 1);
});
