import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@jae/shared/Icon.jsx';
import { inr } from '@jae/shared/format.js';
import { useCart } from '../state/CartContext.jsx';

export default function MiniCart() {
  const { items, totals, open, setOpen, setQty, remove } = useCart();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <>
      <div className="backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Your cart">
        <div className="row" style={{ justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: 18 }}>Your cart ({totals.count})</h2>
          <button type="button" className="icon-btn" aria-label="Close cart" onClick={() => setOpen(false)}><Icon name="close" size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {items.length === 0 && <div className="empty">Your cart is empty.</div>}
          {items.map((i) => (
            <div key={i.id} className="row" style={{ gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--line-soft)', alignItems: 'flex-start' }}>
              <span style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flex: 'none', border: '1px solid var(--line-soft)' }}>
                {i.image ? <img src={i.image} alt="" className="img-cover" /> : <div className="ph" style={{ width: '100%', height: '100%' }}>IMG</div>}
              </span>
              <div className="grow">
                <Link to={`/product/${i.slug}/`} onClick={() => setOpen(false)} style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, display: 'block' }}>{i.name}</Link>
                <div className="row" style={{ gap: 10, marginTop: 8 }}>
                  <div className="qty sm">
                    <button type="button" aria-label="Decrease" onClick={() => setQty(i.id, i.qty - 1)}>−</button>
                    <span>{i.qty}</span>
                    <button type="button" aria-label="Increase" onClick={() => setQty(i.id, i.qty + 1)}>+</button>
                  </div>
                  <b style={{ fontSize: 14 }}>{inr(i.price * i.qty)}</b>
                </div>
              </div>
              <button type="button" className="icon-btn" aria-label={`Remove ${i.name}`} style={{ border: 0, width: 36, height: 36 }} onClick={() => remove(i.id)}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="stack" style={{ padding: '16px 18px', gap: 10, borderTop: '1px solid var(--line)' }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 15 }}><span>Subtotal</span><b style={{ fontFamily: 'var(--font-display)' }}>{inr(totals.subtotal, { decimals: true })}</b></div>
            <div className="muted" style={{ fontSize: 12 }}>GST and shipping calculated at checkout</div>
            <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Link to="/cart/" className="btn btn-outline" onClick={() => setOpen(false)}>View cart</Link>
              <Link to="/checkout/" className="btn btn-red" onClick={() => setOpen(false)}>Checkout</Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
