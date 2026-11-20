import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon, { StarLogo } from '@jae/shared/Icon.jsx';
import { inr } from '@jae/shared/format.js';
import { useCart } from '../state/CartContext.jsx';
import { useUi } from '../state/UiContext.jsx';
import { searchProducts } from '../lib/catalog.js';
import ProductImage from './ProductImage.jsx';

const NAV = [
  ['Laser printer parts', '/product-category/laserjet-printer-parts/'],
  ['Inkjet printer parts', '/product-category/inkjet-printer-parts/'],
  ['Dot matrix parts', '/product-category/dot-matrix-printer-parts/'],
  ['Toner parts', '/product-category/toner-spare-parts/'],
  ['Refurbished printers', '/product-category/refurbished-printer/'],
  ['All products', '/shop/'],
  ['Contact', '/contact-us/'],
];

export function categoryHref(cat, byId) {
  const parent = cat.parentId && byId?.get(cat.parentId);
  return parent ? `/product-category/${parent.slug}/${cat.slug}/` : `/product-category/${cat.slug}/`;
}

function SearchBox() {
  const { categories } = useUi();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrap = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return undefined; }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      searchProducts(term, 6)
        .then((r) => { if (id === seq.current) setResults(cat ? r.filter((p) => p.categoryIds?.includes(cat)) : r); })
        .catch(() => {})
        .finally(() => { if (id === seq.current) setLoading(false); });
    }, 220);
    return () => clearTimeout(t);
  }, [q, cat]);

  useEffect(() => {
    const onDoc = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function submit(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(q.trim())}${cat ? `&cat=${cat}` : ''}`);
  }

  const topCats = categories.list.filter((c) => !c.parentId);
  const matchingCats = q.trim().length >= 2
    ? categories.list.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 4)
    : [];

  return (
    <div className="searchbar" ref={wrap}>
      <form role="search" onSubmit={submit}>
        <label htmlFor="hdr-cat" className="sr-only">Category</label>
        <select id="hdr-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {topCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label htmlFor="hdr-q" className="sr-only">Search products</label>
        <input id="hdr-q" type="search" autoComplete="off" value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
          placeholder="Search part name, part no. (CB397-60001) or printer model" />
        <button type="submit" aria-label="Search"><Icon name="search" strokeWidth={2.2} /></button>
      </form>
      {open && q.trim().length >= 2 && (
        <div className="search-pop">
          <div className="sr-label">Products</div>
          {loading && results.length === 0 && <div className="sr-row muted">Searching…</div>}
          {!loading && results.length === 0 && <div className="sr-row muted">No products match “{q.trim()}”.</div>}
          {results.map((p) => (
            <Link key={p.id} to={`/product/${p.slug}/`} className="sr-row" onClick={() => setOpen(false)}>
              <span style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flex: 'none', border: '1px solid var(--line-soft)' }}><ProductImage product={p} label="IMG" /></span>
              <span className="grow"><span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                <span className="mono muted" style={{ fontSize: 11 }}>{p.partNo || p.brand}</span></span>
              <span style={{ font: '700 15px var(--font-display)', color: 'var(--navy-900)' }}>{inr(p.price)}</span>
            </Link>
          ))}
          {matchingCats.length > 0 && (
            <>
              <div className="sr-label">Categories</div>
              <div className="row wrap" style={{ gap: 6, padding: '0 16px 12px' }}>
                {matchingCats.map((c) => <Link key={c.id} className="chip" to={categoryHref(c, categories.byId)} onClick={() => setOpen(false)}>{c.name}</Link>)}
              </div>
            </>
          )}
          <button type="button" onClick={submit} style={{ width: '100%', minHeight: 48, border: 0, borderTop: '1px solid var(--line)', background: '#fff', fontWeight: 600, color: 'var(--red-700)', cursor: 'pointer' }}>
            See all results for “{q.trim()}” →
          </button>
        </div>
      )}
    </div>
  );
}

function MegaMenu({ onClose }) {
  const { categories } = useUi();
  const parents = categories.list.filter((c) => !c.parentId);
  return (
    <div className="mega" onMouseLeave={onClose}>
      <div className="container mega-grid">
        {parents.map((p) => (
          <div key={p.id} className="stack">
            <Link className="parent" to={categoryHref(p)} onClick={onClose}>{p.name}<span className="fcount">{p.productCount || ''}</span></Link>
            {p.children.map((c) => (
              <Link key={c.id} className="child" to={categoryHref(c, categories.byId)} onClick={onClose}>{c.name}<span className="fcount">{c.productCount || ''}</span></Link>
            ))}
          </div>
        ))}
        {parents.length === 0 && <span className="muted">Loading categories…</span>}
      </div>
    </div>
  );
}

export default function Header() {
  const { totals, setOpen } = useCart();
  const { settings, setOverlay } = useUi();
  const [mega, setMega] = useState(false);
  const location = useLocation();
  useEffect(() => setMega(false), [location.pathname]);
  const phones = settings.contact.phones;

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="container">
          <div className="group"><span>PAN India shipping</span><span>GST invoice on every order</span><span>Cash on delivery available</span></div>
          <div className="group">
            {phones.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, '')}`}>{p}</a>)}
            <Link to="/track-order/">Track order</Link>
          </div>
        </div>
      </div>
      <div className="container header-main">
        <button type="button" className="icon-btn mobile-only" aria-label="Browse categories" onClick={() => setMega((m) => !m)}><Icon name="menu" /></button>
        <Link to="/" className="brand" aria-label="Jay Ambe Enterprises home">
          <StarLogo />
          <span><span className="brand-name" style={{ display: 'block' }}>Jay Ambe Enterprises</span><span className="brand-sub">PRINTER PARTS</span></span>
        </Link>
        <SearchBox />
        <div className="header-actions">
          <a href={`https://wa.me/${settings.contact.whatsapp}`} target="_blank" rel="noreferrer" className="icon-btn desktop-only" aria-label="Chat on WhatsApp" style={{ borderColor: '#BFE8CF', background: 'var(--green-50)', color: 'var(--green-700)' }}><Icon name="whatsapp" size={22} /></a>
          <Link to="/my-account/" className="icon-btn" aria-label="My account"><Icon name="user" size={22} /></Link>
          <button type="button" className="cart-btn" onClick={() => setOpen(true)} aria-label={`Cart, ${totals.count} items`}>
            <span style={{ position: 'relative', display: 'inline-flex' }}><Icon name="cart" size={22} />
              {totals.count > 0 && <span className="cart-count">{totals.count}</span>}</span>
            <span className="desktop-only" style={{ marginLeft: 4 }}>{inr(totals.subtotal)}</span>
          </button>
        </div>
      </div>
      <nav className="mainnav desktop-only" aria-label="Main">
        <div className="container">
          <button type="button" className="cat-btn" aria-expanded={mega} onClick={() => setMega((m) => !m)}><Icon name="menu" size={18} strokeWidth={2} />Browse categories</button>
          {NAV.map(([label, to]) => <NavLink key={to} to={to} className="nav-link">{label}</NavLink>)}
          <button type="button" onClick={() => setOverlay('enquiry')} style={{ marginLeft: 'auto', border: 0, background: 'none', color: 'var(--red-700)', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 44 }}>Bulk enquiry →</button>
        </div>
      </nav>
      {mega && <MegaMenu onClose={() => setMega(false)} />}
    </header>
  );
}
