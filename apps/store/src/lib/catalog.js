// Read-only catalogue queries for the storefront, with a small in-memory cache
// so moving between pages doesn't re-read the same documents.

import {
  collection, doc, getDoc, getDocs, query, where, limit, orderBy, startAfter, documentId,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { DEFAULT_SETTINGS } from '@jae/shared/constants.js';
import { primarySearchToken } from '@jae/shared/format.js';

const cache = new Map();
function cached(key, loader) {
  if (!cache.has(key)) {
    cache.set(key, loader().catch((err) => { cache.delete(key); throw err; }));
  }
  return cache.get(key);
}

const withId = (snap) => ({ id: snap.id, ...snap.data() });
const published = () => where('status', '==', 'published');

export function getSettings() {
  return cached('settings', async () => {
    const snap = await getDoc(doc(db, 'settings', 'store'));
    const data = snap.exists() ? snap.data() : {};
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      contact: { ...DEFAULT_SETTINGS.contact, ...data.contact },
      social: { ...DEFAULT_SETTINGS.social, ...data.social },
      shipping: { ...DEFAULT_SETTINGS.shipping, ...data.shipping },
      payments: { ...DEFAULT_SETTINGS.payments, ...data.payments },
      features: { ...DEFAULT_SETTINGS.features, ...data.features },
      home: { ...DEFAULT_SETTINGS.home, ...data.home },
    };
  });
}

/** All categories (≈60 docs), sorted by order then name, each with `children`. */
export function getCategories() {
  return cached('categories', async () => {
    const snap = await getDocs(collection(db, 'categories'));
    const list = snap.docs.map(withId).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
    const byId = new Map(list.map((c) => [c.id, { ...c, children: [] }]));
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) byId.get(c.parentId).children.push(c);
    }
    return { list: [...byId.values()], byId, bySlug: new Map([...byId.values()].map((c) => [c.slug, c])) };
  });
}

export function getBrands() {
  return cached('brands', async () => {
    const snap = await getDocs(collection(db, 'brands'));
    return snap.docs.map(withId).sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
  });
}

/** Every published product in a category (largest category is ~380 docs, fine to filter client-side). */
export function getProductsByCategory(categoryId) {
  return cached(`cat:${categoryId}`, async () => {
    const snap = await getDocs(query(collection(db, 'products'), published(), where('categoryIds', 'array-contains', categoryId)));
    return snap.docs.map(withId);
  });
}

/** Paged list of all published products, newest first. */
export async function getProductsPage({ pageSize = 48, after = null } = {}) {
  const parts = [collection(db, 'products'), published(), orderBy('updatedAt', 'desc'), limit(pageSize)];
  if (after) parts.splice(3, 0, startAfter(after));
  const snap = await getDocs(query(...parts));
  return { items: snap.docs.map(withId), cursor: snap.docs[snap.docs.length - 1] || null, done: snap.docs.length < pageSize };
}

export function getFeatured(categoryId, count = 10) {
  return cached(`featured:${categoryId}:${count}`, async () => {
    const all = await getProductsByCategory(categoryId);
    return [...all].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).slice(0, count);
  });
}

export function getProductBySlug(slug) {
  return cached(`p:${slug}`, async () => {
    const snap = await getDocs(query(collection(db, 'products'), published(), where('slug', '==', slug), limit(1)));
    return snap.empty ? null : withId(snap.docs[0]);
  });
}

export async function getProductsByIds(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30);
    const snap = await getDocs(query(collection(db, 'products'), published(), where(documentId(), 'in', chunk)));
    out.push(...snap.docs.map(withId));
  }
  return out;
}

/** Token search: Firestore finds candidates by the longest word, the rest is matched client-side. */
export async function searchProducts(text, max = 40) {
  const token = primarySearchToken(text);
  if (!token) return [];
  const snap = await getDocs(query(collection(db, 'products'), published(), where('searchTokens', 'array-contains', token), limit(120)));
  const words = String(text).toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  return snap.docs
    .map(withId)
    .filter((p) => {
      const hay = `${p.name} ${p.partNo || ''} ${p.brand || ''} ${(p.compatibleModels || []).join(' ')}`.toLowerCase().replace(/-/g, '');
      return words.every((w) => hay.includes(w.replace(/-/g, '')));
    })
    .slice(0, max);
}

export function getPage(slug) {
  return cached(`page:${slug}`, async () => {
    try {
      const snap = await getDoc(doc(db, 'pages', slug));
      return snap.exists() ? withId(snap) : null;
    } catch {
      return null; // unpublished pages are blocked by security rules
    }
  });
}

export async function checkPincode(pin) {
  const snap = await getDoc(doc(db, 'pincodes', String(pin)));
  return snap.exists() ? snap.data() : null;
}

export function productImage(p) {
  return p?.images?.[0]?.url || '';
}
