// Recalculate categories/{id}.productCount and brands/{id}.productCount from scratch.
//   node scripts/recount.mjs
import { pathToFileURL } from 'node:url';
import { db } from './lib/admin.mjs';
import { slugify } from '@jae/shared/format.js';

export async function recount() {
  const products = await db.collection('products').where('status', '==', 'published').get();
  const catCount = new Map();
  const brandCount = new Map();
  for (const d of products.docs) {
    const p = d.data();
    for (const c of p.categoryIds || []) catCount.set(c, (catCount.get(c) || 0) + 1);
    if (p.brand) brandCount.set(p.brand, (brandCount.get(p.brand) || 0) + 1);
  }
  const cats = await db.collection('categories').get();
  let batch = db.batch();
  let n = 0;
  const flush = async () => { if (n) { await batch.commit(); batch = db.batch(); n = 0; } };
  for (const c of cats.docs) { batch.set(c.ref, { productCount: catCount.get(c.id) || 0 }, { merge: true }); if (++n >= 400) await flush(); }
  for (const [name, count] of brandCount) {
    batch.set(db.doc(`brands/${slugify(name)}`), { name, slug: slugify(name), productCount: count }, { merge: true });
    if (++n >= 400) await flush();
  }
  await flush();
  console.log(`✓ Recounted ${cats.size} categories and ${brandCount.size} brands from ${products.size} published products`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await recount();
  process.exit(0);
}
