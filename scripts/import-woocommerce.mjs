// Import the live jaepart.com catalogue (WooCommerce) into Firestore.
//
// Uses WooCommerce's PUBLIC Store API — no API keys needed. Safe to re-run: documents are
// keyed by the WooCommerce id / slug and overwritten with merge.
//
//   node scripts/import-woocommerce.mjs --emulators                      → into local emulators
//   node scripts/import-woocommerce.mjs                                   → into jae-parts-dev
//   … --keep-image-urls   don't copy photos to Firebase Storage (faster; photos stay on jaepart.com)
//   … --limit=50          only the first 50 products (for a quick test)
//
// Cleaning applied on the way in:
//   • HTML entities decoded, known typos fixed (ESPON → Epson, Formater → Formatter, …)
//   • ₹0 products imported as DRAFT so they can't be bought until priced
//   • OEM part number pulled out of the name, specs table parsed from the description
//   • URL slugs kept identical, so existing Google rankings carry over

import crypto from 'node:crypto';
import { db, bucket, publicUrl } from './lib/admin.mjs';
import { buildSearchTokens, slugify } from '@jae/shared/format.js';
import { DEFAULT_SETTINGS } from '@jae/shared/constants.js';
import { recount } from './recount.mjs';

const SOURCE = process.env.WC_SOURCE || 'https://jaepart.com';
const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const COPY_IMAGES = !args.has('keep-image-urls');
const LIMIT = args.has('limit') ? Number(args.get('limit')) : Infinity;
const RUN = new Date().toISOString();

// ---------- helpers ----------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };
const decode = (s) => String(s || '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const stripTags = (s) => decode(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const stripShortcodes = (s) => String(s || '').replace(/\[\/?[a-z_][^\]]*\]/gi, '');

const TYPOS = [[/\bespon\b/gi, 'Epson'], [/\bformater\b/gi, 'Formatter'], [/\bassembl\b/gi, 'Assembly'], [/\bdevloper\b/gi, 'Developer'], [/\bdoctore\b/gi, 'Doctor']];
const BRAND_CASE = { hp: 'HP', canon: 'Canon', epson: 'Epson', brother: 'Brother', samsung: 'Samsung', pantum: 'Pantum', kyocera: 'Kyocera', tvs: 'TVS', tsc: 'TSC', fujitsu: 'Fujitsu', 'kodak alaris': 'Kodak Alaris', xerox: 'Xerox', ricoh: 'Ricoh', olivetti: 'Olivetti' };
function cleanName(name) {
  let n = decode(name).replace(/\s+/g, ' ').trim();
  for (const [re, fix] of TYPOS) n = n.replace(re, fix);
  return n.replace(/\s+([,.)])/g, '$1').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
}
function normBrand(b) {
  if (!b) return '';
  const key = b.trim().toLowerCase();
  return BRAND_CASE[key] || b.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
function guessBrand(name) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(BRAND_CASE)) if (new RegExp(`\\b${key}\\b`).test(lower)) return BRAND_CASE[key];
  return '';
}
function extractPartNo(name) {
  const groups = [...name.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].replace(/part\s*no\.?\s*:?/i, '').trim());
  for (const g of groups) {
    const first = g.split(/[\/,]/)[0].trim();
    if (/\d/.test(first) && first.length >= 4 && first.length <= 24) return first.toUpperCase();
  }
  return '';
}
function parseSpecs(html) {
  const specs = [];
  for (const m of String(html || '').matchAll(/<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
    const k = stripTags(m[1]); const v = stripTags(m[2]);
    if (k && v && k.length < 60) specs.push({ k: k.charAt(0) + k.slice(1).toLowerCase(), v });
  }
  return specs;
}
function modelsFrom(specs) {
  const m = specs.find((s) => /^model/i.test(s.k));
  if (!m) return [];
  return [...new Set(m.v.replace(/\([^)]*\)/g, '').split(/\s*[\/,]\s*/).map((x) => x.trim()).filter((x) => x.length >= 3 && x.length <= 60))].slice(0, 20);
}

async function getJson(path) {
  const res = await fetch(`${SOURCE}${path}`, { headers: { 'User-Agent': 'jae-import/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return { data: await res.json(), total: Number(res.headers.get('x-wp-total')) || 0, pages: Number(res.headers.get('x-wp-totalpages')) || 1 };
}

async function copyImage(src, productId, idx) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get('content-type') || 'image/jpeg';
  const ext = (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').split(';')[0];
  const path = `products/${productId}/${idx + 1}.${ext}`;
  const token = crypto.randomUUID();
  await bucket.file(path).save(buf, { contentType: type, metadata: { cacheControl: 'public, max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } } });
  return { path, url: publicUrl(path, token) };
}

// ---------- 1. categories ----------
console.log(`Importing from ${SOURCE} …`);
const { data: wcCats } = await getJson('/wp-json/wc/store/v1/products/categories?per_page=100');
const catSlugById = new Map(wcCats.map((c) => [c.id, c.slug]));
const catById = new Map(wcCats.map((c) => [c.id, c]));
let batch = db.batch();
for (const c of wcCats) {
  batch.set(db.doc(`categories/${c.slug}`), {
    name: decode(c.name),
    slug: c.slug,
    parentId: c.parent ? catSlugById.get(c.parent) || null : null,
    description: stripTags(c.description).replace(/\s*:\s*/, ': ').slice(0, 1200),
    image: c.image?.src || '',
    order: 100,
    showOnHome: true,
    showInMenu: true,
    wcId: c.id,
    updatedAt: new Date(),
  }, { merge: true });
}
await batch.commit();
console.log(`✓ ${wcCats.length} categories`);

// ---------- 2. products ----------
const products = [];
for (let page = 1; products.length < LIMIT; page++) {
  const { data, pages } = await getJson(`/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
  products.push(...data);
  process.stdout.write(`  fetched ${products.length}\r`);
  if (page >= pages || data.length === 0) break;
}
const list = products.slice(0, LIMIT);
console.log(`\n✓ fetched ${list.length} products`);

const TYPE_SLUGS = new Set(['laserjet-printer-parts', 'inkjet-printer-parts', 'dot-matrix-printer-parts']);
const report = { draftZeroPrice: [], imageErrors: 0 };
let written = 0;
batch = db.batch();
let inBatch = 0;

for (const [i, wc] of list.entries()) {
  const id = String(wc.id);
  const name = cleanName(wc.name);
  const minor = wc.prices?.currency_minor_unit ?? 2;
  const price = Number(wc.prices?.price || 0) / 10 ** minor;
  const mrp = Number(wc.prices?.regular_price || wc.prices?.price || 0) / 10 ** minor;
  const specs = parseSpecs(wc.description);
  const brandSpec = specs.find((s) => /^brand$/i.test(s.k))?.v.split(/[,/]/)[0];
  const brand = normBrand(wc.brands?.[0]?.name) || normBrand(brandSpec) || guessBrand(name);
  const categoryIds = (wc.categories || []).map((c) => c.slug);
  const withParent = (wc.categories || []).filter((c) => catById.get(c.id)?.parent);
  const nonType = categoryIds.filter((s) => !TYPE_SLUGS.has(s));
  const primaryCategoryId = withParent[0]?.slug || nonType[0] || categoryIds[0] || '';
  const partNo = extractPartNo(name);

  let images = (wc.images || []).map((im) => ({ url: im.src, alt: decode(im.alt) || name }));
  if (COPY_IMAGES && images.length) {
    const copied = [];
    for (const [idx, im] of images.entries()) {
      try { copied.push({ ...(await copyImage(im.url, id, idx)), alt: im.alt }); } catch { report.imageErrors++; copied.push(im); }
    }
    images = copied;
  }

  const status = price > 0 ? 'published' : 'draft';
  if (status === 'draft') report.draftZeroPrice.push(name);
  const compatibleModels = modelsFrom(specs);

  batch.set(db.doc(`products/${id}`), {
    name,
    slug: wc.slug,
    brand,
    partNo,
    sku: wc.sku || '',
    condition: /refurb/i.test(name) || categoryIds.includes('refurbished-printer') ? 'refurbished' : 'new',
    price: Math.round(price * 100) / 100,
    mrp: Math.round(Math.max(mrp, price) * 100) / 100,
    gstRate: 18,
    stock: null,
    lowStockAt: 5,
    inStock: wc.is_in_stock !== false,
    status,
    featured: false,
    badge: '',
    codAllowed: true,
    categoryIds,
    primaryCategoryId,
    compatibleModels,
    description: stripShortcodes(wc.description || ''),
    specs,
    images,
    seo: { title: '', description: '' },
    searchTokens: buildSearchTokens(name, partNo, brand, compatibleModels),
    wcId: wc.id,
    importedAt: RUN,
    createdAt: new Date(),
    updatedAt: new Date(Date.now() - i * 1000), // keep WooCommerce order for "Latest"
  }, { merge: true });
  written++;
  if (++inBatch >= 200) { await batch.commit(); batch = db.batch(); inBatch = 0; process.stdout.write(`  wrote ${written}/${list.length}\r`); }
}
if (inBatch) await batch.commit();
console.log(`\n✓ wrote ${written} products${COPY_IMAGES ? ' (photos copied to Storage)' : ''}`);

// ---------- 3. content pages ----------
const KEEP_PAGES = ['about-us', 'return-policy', 'privacy-policy', '10-most-used-logic-cards'];
try {
  const { data: pages } = await getJson('/wp-json/wp/v2/pages?per_page=100&_fields=slug,title,content,excerpt');
  for (const p of pages.filter((x) => KEEP_PAGES.includes(x.slug))) {
    await db.doc(`pages/${p.slug}`).set({
      title: stripTags(p.title?.rendered).replace(/:\s*$/, ''),
      summary: stripTags(p.excerpt?.rendered).slice(0, 220),
      html: stripShortcodes(p.content?.rendered || '').replace(/<script[\s\S]*?<\/script>/gi, ''),
      published: true,
      seo: { title: '', description: '' },
      importedAt: RUN,
      updatedAt: new Date(),
    }, { merge: true });
  }
  console.log(`✓ pages: ${KEEP_PAGES.join(', ')} (review their formatting in Admin › Pages)`);
} catch (e) {
  console.warn('! Could not import pages:', e.message);
}

// ---------- 4. default settings ----------
const settingsRef = db.doc('settings/store');
if (!(await settingsRef.get()).exists) {
  await settingsRef.set({ ...DEFAULT_SETTINGS, business: { gstin: '', state: 'Maharashtra', invoicePrefix: 'JAE-' }, updatedAt: new Date() });
  console.log('✓ created settings/store with defaults');
}

// ---------- 5. counts + report ----------
await recount();
console.log('\nSummary');
console.log(`  products imported:     ${written}`);
console.log(`  saved as DRAFT (₹0):   ${report.draftZeroPrice.length}${report.draftZeroPrice.length ? `\n    - ${report.draftZeroPrice.join('\n    - ')}` : ''}`);
console.log(`  photos that failed:    ${report.imageErrors} (kept the jaepart.com URL)`);
console.log(`  without SKU:           ${list.filter((p) => !p.sku).length} — add SKUs in Admin › Products`);
process.exit(0);
