import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@jae/shared/Icon.jsx';
import { inr } from '@jae/shared/format.js';
import { useCart } from '../state/CartContext.jsx';
import { useUi } from '../state/UiContext.jsx';
import { useSeo } from '../lib/useAsync.js';
import { getProductsByIds } from '../lib/catalog.js';
import { PinCheck } from './Product.jsx';

export function shippingFor(subtotal, shipping) {
  if (!shipping) return 0;
  if (shipping.freeAbove && subtotal >= shipping.freeAbove) return 0;
  return Number(shipping.flatRate) || 0;
}

export function Steps({ current }) {
  return (
    <ol className="row wrap" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 14 }}>
      {['Cart', 'Details', 'Payment'].map((s, i) => (
        <li key={s} className="row" style={{ gap: 10, fontWeight: 600, fontSize: 14, color: i <= current ? 'var(--navy-900)' : 'var(--muted-2)' }}>
          {i > 0 && <span aria-hidden="true" style={{ width: 32, height: 2, background: 'var(--line-2)' }} />}
          <span className="step-n" style={i <= current ? undefined : { background: 'var(--line)', color: 'var(--muted)' }}>{i + 1}</span>{s}
        </li>
      ))}
    </ol>
  );
}

export default function Cart() {
  const { items, setQty, remove, totals, sync, coupon, setCoupon } = useCart();
  const { settings } = useUi();
  useSeo('Cart');

  // Refresh prices/names from Firestore when the cart opens.
  useEffect(() => {
    if (items.length) getProductsByIds(items.map((i) => i.id)).then(sync).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ship = shippingFor(totals.subtotal, settings.shipping);

  if (!items.length) {
    return (
      <div className="container empty">
        <h1 style={{ marginBottom: 12 }}>Your cart is empty</h1>
        <Link to="/shop/" className="btn btn-red">Browse parts</Link>
      </div>
    );
  }

  return (
    <div className="container stack" style={{ gap: 24, paddingTop: 32 }}>
      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 16 }}>
        <h1 style={{ fontSize: 36 }}>Your cart</h1>
        <Steps current={0} />
      </div>
      <div className="two-col">
        <div className="main">
          <div className="card" style={{ overflow: 'hidden' }}>
            {items.map((i) => (
              <div key={i.id} className="cart-line">
                <div className="row" style={{ gap: 14, minWidth: 0 }}>
                  <span style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', flex: 'none', border: '1px solid var(--line-soft)' }}>
                    {i.image ? <img src={i.image} alt="" className="img-cover" /> : <div className="ph" style={{ width: '100%', height: '100%' }}>IMG</div>}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/product/${i.slug}/`} style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{i.name}</Link>
                    {i.partNo && <div className="mono muted" style={{ fontSize: 12, marginTop: 4 }}>{i.partNo}</div>}
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{inr(i.price)} each {i.mrp > i.price && <span style={{ textDecoration: 'line-through', color: 'var(--faint)', marginLeft: 6 }}>{inr(i.mrp)}</span>}</div>
                  </div>
                </div>
                <div className="qty sm">
                  <button type="button" aria-label="Decrease" onClick={() => setQty(i.id, i.qty - 1)}>−</button>
                  <span>{i.qty}</span>
                  <button type="button" aria-label="Increase" onClick={() => setQty(i.id, i.qty + 1)}>+</button>
                </div>
                <b style={{ font: '700 17px var(--font-display)', color: 'var(--navy-900)', textAlign: 'right', minWidth: 90 }}>{inr(i.price * i.qty)}</b>
                <button type="button" className="icon-btn" aria-label={`Remove ${i.name}`} onClick={() => remove(i.id)}><Icon name="trash" size={16} /></button>
              </div>
            ))}
            <div className="row wrap" style={{ justifyContent: 'space-between', gap: 12, padding: '16px 20px' }}>
              <div className="row wrap" style={{ gap: 8 }}>
                <label htmlFor="coupon" className="sr-only">Coupon code</label>
                <input id="coupon" className="input mono" style={{ width: 200, textTransform: 'uppercase' }} placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
                <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>Applied at checkout</span>
              </div>
              <Link to="/shop/" style={{ fontWeight: 600, fontSize: 14 }}>← Continue shopping</Link>
            </div>
          </div>
          <div className="card row wrap" style={{ padding: '18px 20px', gap: '14px 28px', fontSize: 14, color: 'var(--ink-2)' }}>
            <span className="row" style={{ gap: 8 }}><Icon name="shield" style={{ color: 'var(--navy-900)' }} />Secure payments via Razorpay</span>
            <span className="row" style={{ gap: 8 }}><Icon name="receipt" style={{ color: 'var(--navy-900)' }} />GST invoice with every order</span>
            <span className="row" style={{ gap: 8 }}><Icon name="truck" style={{ color: 'var(--navy-900)' }} />Dispatched within 24 hours</span>
          </div>
        </div>
        <aside className="side card stack" style={{ padding: 22, gap: 14 }}>
          <h2 style={{ fontSize: 20 }}>Order summary</h2>
          <PinCheck compact />
          <div style={{ height: 1, background: 'var(--line-soft)' }} />
          <div className="sum-row"><span>Subtotal ({totals.count} items)</span><span>{inr(totals.subtotal, { decimals: true })}</span></div>
          <div className="sum-row"><span>GST</span><span>{inr(totals.gst, { decimals: true })}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{ship ? inr(ship) : 'Free'}</span></div>
          {totals.savings > 0 && <div className="sum-row" style={{ color: 'var(--green-700)' }}><span>You save on MRP</span><span>−{inr(totals.savings, { decimals: true })}</span></div>}
          <div style={{ height: 1, background: 'var(--line-soft)' }} />
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontWeight: 600 }}>Total</span><span className="price" style={{ fontSize: 28 }}>{inr(totals.total + ship, { decimals: true })}</span></div>
          <Link to="/checkout/" className="btn btn-red btn-lg btn-block">Proceed to checkout</Link>
        </aside>
      </div>
    </div>
  );
}
