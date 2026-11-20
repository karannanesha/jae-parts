// Formatting + text helpers shared by the store, admin, functions and import scripts.

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const inrFmt2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** ₹1,950 — whole rupees shown without decimals */
export function inr(value, { decimals = false } = {}) {
  const n = Number(value) || 0;
  return '₹' + (decimals ? inrFmt2 : inrFmt).format(n);
}

export function discountPercent(price, mrp) {
  if (!mrp || !price || mrp <= price) return 0;
  return Math.round((1 - price / mrp) * 100);
}

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

/** Lower-case words and every 2+ char prefix of each word, for Firestore array-contains search. */
export function buildSearchTokens(...parts) {
  const tokens = new Set();
  const text = parts.flat().filter(Boolean).join(' ').toLowerCase();
  for (const raw of text.split(/[\s/,()+|]+/)) {
    const word = raw.replace(/[^a-z0-9-]/g, '');
    if (word.length < 2) continue;
    const variants = new Set([word, word.replace(/-/g, '')]);
    for (const v of variants) {
      for (let i = 2; i <= Math.min(v.length, 20); i++) tokens.add(v.slice(0, i));
    }
  }
  return [...tokens].slice(0, 400);
}

/** First searchable word of a query, matching buildSearchTokens' normalisation. */
export function primarySearchToken(query) {
  const words = String(query).toLowerCase().split(/[\s/,()+|]+/)
    .map((w) => w.replace(/[^a-z0-9-]/g, ''))
    .filter((w) => w.length >= 2)
    .sort((a, b) => b.length - a.length);
  return words[0] ? words[0].slice(0, 20) : '';
}

export function formatDate(ts, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!ts) return '—';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', opts);
}

export function formatDateTime(ts) {
  return formatDate(ts, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function isValidIndianMobile(v) {
  return /^[6-9]\d{9}$/.test(String(v).replace(/\D/g, '').slice(-10));
}

export function toE164India(v) {
  const digits = String(v).replace(/\D/g, '').slice(-10);
  return '+91' + digits;
}

export function isValidPin(v) {
  return /^[1-9]\d{5}$/.test(String(v).trim());
}

export function isValidGstin(v) {
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(v).trim().toUpperCase());
}
