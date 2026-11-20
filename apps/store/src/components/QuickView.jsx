import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@jae/shared/Icon.jsx';
import { inr, discountPercent } from '@jae/shared/format.js';
import { useUi } from '../state/UiContext.jsx';
import { useCart } from '../state/CartContext.jsx';
import ProductImage from './ProductImage.jsx';

export default function QuickView() {
  const { overlay, setOverlay } = useUi();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  if (overlay?.type !== 'quickview') return null;
  const p = overlay.product;
  const off = discountPercent(p.price, p.mrp);
  const inStock = p.inStock !== false;
  const close = () => { setOverlay(null); setQty(1); };

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={p.name} style={{ maxWidth: 820, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div style={{ minHeight: 300, borderRight: '1px solid var(--line-soft)' }}><ProductImage product={p} /></div>
        <div className="stack" style={{ padding: 24, gap: 12, position: 'relative' }}>
          <button type="button" className="icon-btn" aria-label="Close" onClick={close} style={{ position: 'absolute', top: 12, right: 12 }}><Icon name="close" size={18} /></button>
          <span className="mono muted" style={{ fontSize: 11, paddingRight: 48 }}>{[p.brand, p.partNo].filter(Boolean).join(' · ').toUpperCase()}</span>
          <h2 style={{ fontSize: 22, paddingRight: 40 }}>{p.name}</h2>
          <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
            <span className="price" style={{ fontSize: 26 }}>{inr(p.price)}</span>
            {off > 0 && <span className="mrp">{inr(p.mrp)}</span>}
            <span className="muted" style={{ fontSize: 12 }}>+GST</span>
          </div>
          <span className={`stock-dot${inStock ? '' : ' out'}`}>{inStock ? 'In stock · ships in 24h' : 'Sold out'}</span>
          <div className="row" style={{ gap: 8, marginTop: 'auto' }}>
            <div className="qty sm">
              <button type="button" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button type="button" aria-label="Increase" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
            <button type="button" className="btn btn-red grow" disabled={!inStock} onClick={() => { add(p, qty); close(); }}>Add to cart</button>
          </div>
          <Link to={`/product/${p.slug}/`} onClick={close} style={{ fontSize: 14, fontWeight: 600 }}>View full details →</Link>
        </div>
      </div>
    </div>
  );
}
