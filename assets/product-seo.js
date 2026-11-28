/* Метаданные карточек: один источник для браузера и готового HTML (_build/product_seo.cjs). */
(function (root) {
  'use strict';
  const BASE = 'https://homeart.pro/';
  const text = value => String(value || '').replace(/\s+/g, ' ').trim();
  function describe(p) {
    const name = text(p.name), brand = text(p.brand), url = p.canonical || BASE + 'product-card.html?id=' + encodeURIComponent(p.id);
    const variant = text(p.variant);
    const title = `${name}${variant ? ' · ' + variant : ''} · ${brand} — ${p.order ? 'под заказ' : 'в наличии'} | HOMEART`;
    const lead = text(p.lead).replace(/[.\s]+$/, '');
    let summary = lead;
    if (summary.length > 170) {
      const end = summary.lastIndexOf('. ', 170);
      summary = end >= 55 ? summary.slice(0, end) : summary.slice(0, 167).replace(/\s+\S*$/, '') + '…';
    }
    const description = `${name} ${brand}.${variant ? ' ' + (text(p.variantLabel) || 'Размеры') + ': ' + variant + '.' : ''}${summary ? ' ' + summary + (summary.endsWith('…') ? '' : '.') : ''} ${p.order ? 'Под заказ в HOMEART, Москва. Отделку и цену уточнит менеджер.' : 'В наличии в шоуруме HOMEART: Москва, 3-я Фрунзенская, 1.'}`;
    const image = new URL(p.image, BASE).href;
    const product = { '@type': 'Product', '@id': url + '#product', name: `${name}${variant ? ' · ' + variant : ''} ${brand}`, url,
      description, image: [image], sku: p.id, brand: { '@type': 'Brand', name: brand }, category: text(p.group) };
    // «Цена по запросу» не является нулевой ценой. Нет цены/отзывов — не выдумываем Offer/Review.
    if (!p.order && Number.isFinite(p.price) && p.price > 0) product.offers = {
      '@type': 'Offer', url, price: p.price, priceCurrency: 'EUR', availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'HOMEART', url: BASE }
    };
    const crumbs = [{ name: 'Главная', item: BASE }, { name: 'Каталог', item: p.canonical ? BASE + 'catalog/' : BASE + 'catalog.html' }];
    if (p.group) crumbs.push({ name: p.group, item: p.category || BASE + 'catalog.html?cat=' + encodeURIComponent(p.group) });
    crumbs.push({ name, item: url });
    return { title, description, url, image, schema: { '@context': 'https://schema.org', '@graph': [product,
      { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })) }] } };
  }
  function apply(p) {
    const d = root.document;
    const m = describe({ ...p, canonical: d.body.dataset.canonical, category: d.body.dataset.categoryUrl });
    d.title = m.title;
    function meta(attr, key, value) {
      const found = [...d.head.querySelectorAll(`meta[${attr}="${key}"]`)];
      const el = found.shift() || d.createElement('meta');
      found.forEach(n => n.remove()); el.setAttribute(attr, key); el.content = value;
      if (!el.parentNode) d.head.append(el);
    }
    meta('name', 'description', m.description);
    for (const [key, value] of Object.entries({ title: m.title, description: m.description, url: m.url, image: m.image, type: 'product', 'image:alt': `${p.name} ${p.brand}` })) meta('property', 'og:' + key, value);
    // Ранее эти размеры относились к общей картинке каталога, теперь у товара собственное фото.
    d.head.querySelectorAll('meta[property="og:image:width"], meta[property="og:image:height"]').forEach(n => n.remove());
    meta('name', 'twitter:title', m.title); meta('name', 'twitter:description', m.description); meta('name', 'twitter:image', m.image);
    const links = [...d.head.querySelectorAll('link[rel="canonical"]')], link = links.shift() || d.createElement('link');
    links.forEach(n => n.remove()); link.rel = 'canonical'; link.href = m.url; if (!link.parentNode) d.head.append(link);
    let schema = d.getElementById('productSchema');
    if (!schema) { schema = d.createElement('script'); schema.type = 'application/ld+json'; schema.id = 'productSchema'; d.head.append(schema) }
    schema.textContent = JSON.stringify(m.schema).replace(/</g, '\\u003c');
    return m;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { describe };
  else root.HAProductSEO = { describe, apply };
})(typeof window !== 'undefined' ? window : globalThis);
