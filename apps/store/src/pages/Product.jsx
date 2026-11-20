import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '@jae/shared/Icon.jsx';
import { inr, discountPercent, isValidPin } from '@jae/shared/format.js';
import { useAsync, useSeo } from '../lib/useAsync.js';
import { getProductBySlug, getProductsByCategory, checkPincode } from '../lib/catalog.js';
import { useCart } from '../state/CartContext.jsx';
import { useUi } from '../state/UiContext.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { categoryHref } from '../components/Header.jsx';

export function PinCheck({ compact = false }) {
  const [pin, setPin] = useState(() => { try { return localStorage.getItem('jae.pin') || ''; } catch { return ''; } });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const { settings } = useUi();

  async function check(e) {
    e?.preventDefault();
    if (!isValidPin(pin)) { setResult({ error: 'Enter a valid 6-digit PIN code' }); return; }
    setBusy(true);
    try {
      localStorage.setItem('jae.pin', pin);
      const r = await checkPincode(pin);
      setResult(r ? { ok: true, ...r } : { ok: true, generic: true });
    } catch {
      setResult({ ok: true, generic: true });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={check} className="stack" style={{ gap: 10, background: compact ? 'transparent' : 'var(--bg)', borderRadius: 12, padding: compact ? 0 : 14 }}>
      <label htmlFor="pin" style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{compact ? 'Deliver to PIN code' : 'Check delivery'}</label>
      <div className="row" style={{ gap: 8 }}>
        <input id="pin" className="input mono" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="400001" style={{ flex: 1 }} />
        <button type="submit" className="btn btn-navy" disabled={busy}>Check</button>
      </div>
      {result?.error && <div className="field-error">{result.error}</div>}
      {result?.ok && (
        <div className="row wrap" style={{ gap: '6px 16px', fontSize: 13 }}>
          {result.generic
            ? <span>We deliver across India · {settings.shipping.estimateText}</span>
            : <span>Delivery to <b>{result.city || pin}</b> in {result.days || '2–6'} days</span>}
          {(result.generic || result.cod !== false) && settings.payments.cod && <span style={{ color: 'var(--green-700)', fontWeight: 600 }}>Cash on delivery available</span>}
        </div>
      )}
    </form>
  );
}

const TABS = ['Description', 'Specifications', 'Compatibility', 'Return & replacement'];

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { categories, settings } = useUi();
  const { add } = useCart();
  const { data: p, loading } = useAsync(() => getProductBySlug(slug), [slug]);
  const related = useAsync(async () => {
    if (!p?.primaryCategoryId) return [];
    const all = await getProductsByCategory(p.primaryCategoryId);
    return all.filter((x) => x.id !== p.id).slice(0, 5);
  }, [p?.id]);

  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setImg(0); setQty(1); setTab(0); setZoom(false); }, [slug]);

  useSeo(p ? (p.seo?.title || `${p.name}${p.partNo ? ` (${p.partNo})` : ''}`) : null, p ? (p.seo?.description || `${p.name} at ${inr(p.price)} + GST. PAN India delivery, COD available.`) : null);

  if (loading) return <div className="container" style={{ paddingTop: 40 }}><div className="skeleton" style={{ height: 520 }} /></div>;
  if (!p) return <div className="container empty"><h1>Product not found</h1><p>It may have been renamed or removed. <Link to="/shop/">Browse all products</Link></p></div>;

  const off = discountPercent(p.price, p.mrp);
  const inStock = p.inStock !== false;
  const lowStock = typeof p.stock === 'number' && p.stock > 0 && p.stock <= (p.lowStockAt || 5);
  const primary = categories.byId.get(p.primaryCategoryId);
  const parent = primary?.parentId ? categories.byId.get(primary.parentId) : null;
  const images = p.images?.length ? p.images : [null];
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const share = encodeURIComponent(`${p.name} — ${url}`);
  const gstRate = p.gstRate ?? 18;

  return (
    <>
      <div className="container row wrap" style={{ justifyContent: 'space-between', gap: 12, paddingTop: 20 }}>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <Link to="/">Home</Link><span>/</span>
          {parent && <><Link to={categoryHref(parent)}>{parent.name}</Link><span>/</span></>}
          {primary && <><Link to={categoryHref(primary, categories.byId)}>{primary.name}</Link><span>/</span></>}
          <span style={{ color: 'var(--ink)' }}>{p.partNo || p.brand || 'Product'}</span>
        </nav>
      </div>

      <section className="container pdp-grid">
        <div>
          <div className={`gallery-main${zoom ? ' zoomed' : ''}`} onClick={() => setZoom((z) => !z)} role="button" tabIndex={0} aria-label={zoom ? 'Zoom out' : 'Zoom in'} onKeyDown={(e) => e.key === 'Enter' && setZoom((z) => !z)}>
            {images[img] ? <img src={images[img].url} alt={images[img].alt || p.name} /> : <div className="ph" style={{ width: '100%', height: '100%' }}>PRODUCT PHOTO</div>}
            {off > 0 && <span className="badge badge-red" style={{ position: 'absolute', top: 14, left: 14, height: 28 }}>−{off}%</span>}
            <span className="icon-btn" style={{ position: 'absolute', right: 14, bottom: 14 }} aria-hidden="true"><Icon name="zoom" size={18} /></span>
          </div>
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((im, i) => (
                <button key={im?.url || i} type="button" className={i === img ? 'active' : ''} aria-label={`Show photo ${i + 1}`} onClick={() => { setImg(i); setZoom(false); }}>
                  <img src={im.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card stack" style={{ padding: 28, gap: 18 }}>
          <div className="row wrap" style={{ gap: 8 }}>
            {p.brand && <span className="chip active" style={{ cursor: 'default' }}>{p.brand}</span>}
            {primary && <Link className="chip" to={categoryHref(primary, categories.byId)}>{primary.name}</Link>}
            {p.condition === 'refurbished' && <span className="status tone-amber">Refurbished</span>}
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>{p.name}</h1>
          <div className="row wrap" style={{ gap: '8px 20px', fontSize: 13, color: 'var(--muted-2)' }}>
            {p.partNo && <span>Part no. <b className="mono" style={{ color: 'var(--ink)' }}>{p.partNo}</b></span>}
            {p.sku && <span>SKU <b className="mono" style={{ color: 'var(--ink)' }}>{p.sku}</b></span>}
            <span>Condition <b style={{ color: 'var(--ink)' }}>{p.condition === 'refurbished' ? 'Refurbished' : 'New'}</b></span>
          </div>
          <div className="row wrap" style={{ gap: 12, alignItems: 'baseline', padding: '16px 0', borderTop: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)' }}>
            <span className="price" style={{ fontSize: 40 }}>{inr(p.price)}</span>
            <span className="muted" style={{ fontSize: 14 }}>+ {gstRate}% GST</span>
            {off > 0 && <>
              <span style={{ fontSize: 16, color: 'var(--faint)', textDecoration: 'line-through' }}>MRP {inr(p.mrp)}</span>
              <span className="status tone-red" style={{ borderRadius: 6 }}>You save {inr(p.mrp - p.price)}</span>
            </>}
          </div>
          <div className="row wrap" style={{ gap: '10px 20px', fontSize: 14 }}>
            <span className={`stock-dot${inStock ? '' : ' out'}`} style={{ fontSize: 14 }}>{!inStock ? 'Out of stock' : lowStock ? `In stock — only ${p.stock} left` : 'In stock'}</span>
            <span className="muted">GST invoice available</span>
          </div>
          {p.compatibleModels?.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Compatible printers</div>
              <div className="row wrap" style={{ gap: 6 }}>{p.compatibleModels.map((m) => <span key={m} className="chip" style={{ cursor: 'default', background: 'var(--bg)' }}>{m}</span>)}</div>
            </div>
          )}
          <PinCheck />
          <div className="row wrap" style={{ gap: 10 }}>
            <div className="qty">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
            <button type="button" className="btn btn-outline btn-lg" style={{ flex: '1 1 160px' }} disabled={!inStock} onClick={() => add(p, qty)}>Add to cart</button>
            <button type="button" className="btn btn-red btn-lg" style={{ flex: '1 1 160px' }} disabled={!inStock} onClick={() => { add(p, qty, { silent: true }); navigate('/checkout/'); }}>Buy now</button>
          </div>
          <div className="row wrap" style={{ justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
            <a href={`https://wa.me/${settings.contact.whatsapp}?text=${encodeURIComponent(`Hi, is this compatible with my printer? ${p.name} ${url}`)}`} target="_blank" rel="noreferrer" className="row" style={{ gap: 8, color: 'var(--green-700)', fontWeight: 600 }}>
              <Icon name="whatsapp" /> Not sure it fits? Ask on WhatsApp
            </a>
            <div className="row" style={{ gap: 6 }}>
              <span className="muted" style={{ marginRight: 4 }}>Share</span>
              <a className="icon-btn" style={{ width: 38, height: 38 }} aria-label="Share on WhatsApp" href={`https://wa.me/?text=${share}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} /></a>
              <a className="icon-btn" style={{ width: 38, height: 38 }} aria-label="Share on Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"><Icon name="facebook" size={16} /></a>
              <a className="icon-btn" style={{ width: 38, height: 38 }} aria-label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"><Icon name="linkedin" size={16} /></a>
              <button type="button" className="icon-btn" style={{ width: 38, height: 38 }} aria-label="Copy link" onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Icon name={copied ? 'check' : 'link'} size={16} /></button>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingTop: 28 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div role="tablist" className="tabs">
            {TABS.map((t, i) => <button key={t} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)}>{t}</button>)}
          </div>
          <div className="prose" style={{ padding: '28px 32px', maxWidth: 900 }} role="tabpanel">
            {tab === 0 && (p.description
              ? <div dangerouslySetInnerHTML={{ __html: p.description }} />
              : <p className="muted">No description yet.</p>)}
            {tab === 1 && (
              <div>
                {p.brand && <div className="spec-row"><div>Brand</div><div>{p.brand}</div></div>}
                {p.partNo && <div className="spec-row"><div>OEM part number</div><div className="mono">{p.partNo}</div></div>}
                {(p.specs || []).map((s) => <div key={s.k} className="spec-row"><div>{s.k}</div><div>{s.v}</div></div>)}
              </div>
            )}
            {tab === 2 && (
              <p>{p.compatibleModels?.length ? `Fits: ${p.compatibleModels.join(', ')}.` : 'Compatibility details are in the product name.'} Can't see your model? Send the model number from the label on your printer to us on WhatsApp and we'll confirm.</p>
            )}
            {tab === 3 && (
              <>
                <p><b>Replacement only, within 7 days of delivery.</b> We replace parts with a verified manufacturing defect or a shipping error. Send photos or a short video of the fault to start a claim.</p>
                <p>We can't accept returns for parts ordered by mistake or damaged during installation. <Link to="/return-policy/">Read the full policy</Link></p>
              </>
            )}
          </div>
        </div>
      </section>

      {related.data?.length > 0 && (
        <section className="container section">
          <h2 style={{ fontSize: 28, marginBottom: 20 }}>Related parts</h2>
          <div className="pgrid">{related.data.map((r) => <ProductCard key={r.id} product={r} />)}</div>
        </section>
      )}

      <div className="sticky-buy" style={{ marginTop: 48 }}>
        <div className="container row wrap" style={{ gap: '12px 20px', paddingTop: 12, paddingBottom: 12 }}>
          <span style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line-soft)', flex: 'none' }}><ProductImage product={p} label="IMG" /></span>
          <div className="grow" style={{ flex: '1 1 220px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
            <div style={{ font: '700 16px var(--font-display)', color: 'var(--navy-900)' }}>{inr(p.price)} <span className="muted" style={{ font: '400 12px var(--font-body)' }}>+GST</span></div>
          </div>
          <button type="button" className="btn btn-outline" disabled={!inStock} onClick={() => add(p, qty)}>Add to cart</button>
          <button type="button" className="btn btn-red" disabled={!inStock} onClick={() => { add(p, qty, { silent: true }); navigate('/checkout/'); }}>Buy now</button>
        </div>
      </div>
    </>
  );
}
