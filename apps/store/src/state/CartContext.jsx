import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { round2 } from '@jae/shared/format.js';

// Cart lives in localStorage. Prices here are for display only — the
// createOrder Cloud Function re-reads every price from Firestore at checkout.

const CartContext = createContext(null);
const KEY = 'jae.cart.v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [open, setOpen] = useState(false);
  const [coupon, setCoupon] = useState('');

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage full or blocked */ }
  }, [items]);

  const add = useCallback((product, qty = 1, { silent = false } = {}) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i));
      return [...prev, {
        id: product.id,
        slug: product.slug,
        name: product.name,
        partNo: product.partNo || '',
        price: product.price,
        mrp: product.mrp || product.price,
        gstRate: product.gstRate ?? 18,
        image: product.images?.[0]?.url || '',
        qty,
      }];
    });
    if (!silent) setOpen(true);
  }, []);

  const setQty = useCallback((id, qty) => {
    setItems((prev) => (qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty } : i))));
  }, []);

  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  /** Refresh names/prices from fresh product docs (e.g. after loading the cart page). */
  const sync = useCallback((products) => {
    const byId = new Map(products.map((p) => [p.id, p]));
    setItems((prev) => prev.filter((i) => byId.has(i.id)).map((i) => {
      const p = byId.get(i.id);
      return { ...i, name: p.name, price: p.price, mrp: p.mrp || p.price, gstRate: p.gstRate ?? 18, image: p.images?.[0]?.url || i.image };
    }));
  }, []);

  const totals = useMemo(() => {
    let subtotal = 0, gst = 0, savings = 0, count = 0;
    for (const i of items) {
      const line = i.price * i.qty;
      subtotal += line;
      gst += line * (i.gstRate / 100);
      savings += Math.max(0, (i.mrp - i.price) * i.qty);
      count += i.qty;
    }
    return { subtotal: round2(subtotal), gst: round2(gst), savings: round2(savings), count, total: round2(subtotal + gst) };
  }, [items]);

  const value = { items, add, setQty, remove, clear, sync, totals, open, setOpen, coupon, setCoupon };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
