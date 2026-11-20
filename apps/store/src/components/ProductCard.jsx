import { Link } from 'react-router-dom';
import Icon from '@jae/shared/Icon.jsx';
import { inr, discountPercent } from '@jae/shared/format.js';
import { useCart } from '../state/CartContext.jsx';
import { useUi } from '../state/UiContext.jsx';
import ProductImage from './ProductImage.jsx';

export default function ProductCard({ product: p }) {
  const { add } = useCart();
  const { setOverlay } = useUi();
  const off = discountPercent(p.price, p.mrp);
  const inStock = p.inStock !== false;
  const href = `/product/${p.slug}/`;

  return (
    <article className="pcard">
      <div className="pcard-media">
        <Link to={href} aria-label={p.name}><ProductImage product={p} /></Link>
        <div className="pcard-badges">
          {off > 0 && <span className="badge badge-red">−{off}%</span>}
          {p.badge && <span className="badge badge-navy">{p.badge}</span>}
        </div>
        <button type="button" className="icon-btn pcard-qv" aria-label={`Quick view: ${p.name}`} onClick={() => setOverlay({ type: 'quickview', product: p })}>
          <Icon name="eye" size={18} />
        </button>
      </div>
      <div className="pcard-body">
        <div className="pcard-meta">
          {p.brand && <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{p.brand}</span>}
          {p.partNo && <span className="code">{p.partNo}</span>}
        </div>
        <Link to={href} className="pcard-name">{p.name}</Link>
        <span className={`stock-dot${inStock ? '' : ' out'}`}>{inStock ? 'In stock · ships in 24h' : 'Sold out'}</span>
        <div className="price-row">
          <span className="price">{inr(p.price)}</span>
          {off > 0 && <span className="mrp">{inr(p.mrp)}</span>}
          <span className="gst-note">+GST</span>
        </div>
        <button type="button" className="btn btn-outline" disabled={!inStock} onClick={() => add(p, 1)}>
          <Icon name="plus" size={18} strokeWidth={2} />{inStock ? 'Add to cart' : 'Sold out'}
        </button>
      </div>
    </article>
  );
}
