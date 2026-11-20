import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@jae/shared/Icon.jsx';
import { useUi } from '../state/UiContext.jsx';
import { useAsync, useSeo } from '../lib/useAsync.js';
import { getFeatured, getBrands } from '../lib/catalog.js';
import ProductCard from '../components/ProductCard.jsx';
import { categoryHref } from '../components/Header.jsx';

function CategoryThumb({ cat, label = 'IMG' }) {
  return cat?.image ? <img src={cat.image} alt="" className="img-cover" loading="lazy" /> : <div className="ph" style={{ width: '100%', height: '100%' }}>{label}</div>;
}

function ModelFinder() {
  const navigate = useNavigate();
  const { categories } = useUi();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [part, setPart] = useState('');
  const partTypes = categories.list.filter((c) => !c.parentId && c.productCount > 0 && !/printer parts$/i.test(c.name));

  function go(e) {
    e.preventDefault();
    const q = [brand, model].filter(Boolean).join(' ').trim();
    if (!q && part) { navigate(categoryHref(categories.byId.get(part))); return; }
    navigate(`/search?q=${encodeURIComponent(q || 'printer')}${part ? `&cat=${part}` : ''}`);
  }

  return (
    <form className="finder" onSubmit={go}>
      <h2 style={{ fontSize: 15 }}>Find parts by printer model</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <label className="field">Brand
          <select className="select" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Any brand</option>
            {['HP', 'Canon', 'Epson', 'Brother', 'Samsung', 'Pantum', 'Kyocera', 'TVS'].map((b) => <option key={b}>{b}</option>)}
          </select>
        </label>
        <label className="field">Printer model
          <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. M1005, L3110" />
        </label>
        <label className="field">Part type
          <select className="select" value={part} onChange={(e) => setPart(e.target.value)}>
            <option value="">All parts</option>
            {partTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <button type="submit" className="btn btn-red btn-block">Show compatible parts <Icon name="arrowRight" size={18} strokeWidth={2} /></button>
    </form>
  );
}

function ProductRail({ section, categories }) {
  const cat = categories.bySlug.get(section.categorySlug);
  const { data, loading } = useAsync(() => (cat ? getFeatured(cat.id, 10) : Promise.resolve([])), [cat?.id]);
  if (!cat && categories.list.length) return null;
  return (
    <section className="container section">
      <div className="section-head">
        <div><div className="eyebrow" style={{ marginBottom: 8 }}>{section.eyebrow}</div><h2>{section.title}</h2></div>
        {cat && <Link to={categoryHref(cat, categories.byId)} style={{ fontWeight: 600 }}>View all {cat.productCount || ''} →</Link>}
      </div>
      <div className="pgrid">
        {(loading || !data) && Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton" style={{ height: 400 }} />)}
        {data?.slice(0, 10).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

export default function Home() {
  const { settings, categories, setOverlay } = useUi();
  const brands = useAsync(getBrands, []);
  useSeo('Printer Parts Supplier | Import Quality Parts | All India Supply', 'Printer spare parts for HP, Canon, Epson, Brother and Samsung. 655+ parts, PAN India delivery, GST invoice, cash on delivery.');

  const heroTiles = useMemo(
    () => settings.home.heroTileSlugs.map((s) => categories.bySlug.get(s)).filter(Boolean),
    [settings.home.heroTileSlugs, categories],
  );
  const tiles = useMemo(
    () => categories.list.filter((c) => c.showOnHome !== false && !/printer parts$|^refurbished/i.test(c.name) && !c.parentId)
      .sort((a, b) => (b.productCount || 0) - (a.productCount || 0)).slice(0, 12),
    [categories],
  );
  const types = [
    ['laserjet-printer-parts', 'HP, Canon, Brother, Samsung', 'var(--navy-900)', '#fff'],
    ['inkjet-printer-parts', 'Epson EcoTank, Canon PIXMA, HP', '#fff', 'var(--navy-900)'],
    ['dot-matrix-printer-parts', 'Epson LX / LQ / PLQ, TVS', '#fff', 'var(--navy-900)'],
    ['refurbished-printer', 'Tested, ready to use', 'var(--red-50)', '#8E0F15'],
  ].map(([slug, sub, bg, fg]) => ({ cat: categories.bySlug.get(slug), sub, bg, fg })).filter((t) => t.cat);
  const enabled = new Map(settings.home.sections.map((s) => [s.id, s]));
  const on = (id) => enabled.get(id)?.enabled !== false;

  return (
    <>
      {on('hero') && (
        <section className="hero">
          <div className="container hero-grid">
            <div className="stack" style={{ gap: 24 }}>
              <div className="eyebrow">Printer spare parts supplier · Mumbai · Since 2019</div>
              <h1>The right part for every printer, shipped across India.</h1>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55, color: 'var(--muted)', maxWidth: 520 }}>
                Parts for HP, Canon, Epson, Brother, Samsung and more — from logic cards and fuser units to pickup rollers and print heads.
              </p>
              <ModelFinder />
              <div className="row wrap" style={{ gap: 8 }}>
                <span className="muted" style={{ fontSize: 13, marginRight: 4 }}>Popular:</span>
                {settings.home.popularSearches.map((s) => <Link key={s} className="chip" to={`/search?q=${encodeURIComponent(s)}`}>{s}</Link>)}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
              {heroTiles.map((c) => (
                <Link key={c.id} to={categoryHref(c, categories.byId)} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 168 }}><CategoryThumb cat={c} label={`${c.name.toUpperCase()} PHOTO`} /></div>
                  <div className="row" style={{ padding: '14px 16px', justifyContent: 'space-between', gap: 8 }}>
                    <div><div style={{ font: '600 16px var(--font-display)', color: 'var(--navy-900)' }}>{c.name}</div><div className="muted" style={{ fontSize: 13 }}>{c.productCount || 0} parts</div></div>
                    <Icon name="arrowRight" style={{ color: 'var(--red-700)' }} strokeWidth={2} />
                  </div>
                </Link>
              ))}
              {heroTiles.length === 0 && Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" style={{ height: 230 }} />)}
            </div>
          </div>
        </section>
      )}

      {on('trust') && (
        <section className="container" style={{ paddingTop: 24 }}>
          <div className="trust">
            {[
              ['truck', 'PAN India delivery', 'Check delivery by PIN code'],
              ['receipt', 'GST invoice', 'Add your GSTIN at checkout'],
              ['wallet', 'COD, UPI & cards', 'Secure payments via Razorpay'],
              ['shield', '7-day replacement', 'For manufacturing defects'],
            ].map(([icon, title, sub]) => (
              <div key={title} className="trust-item"><Icon name={icon} size={28} style={{ color: '#FF5A60' }} /><div><b>{title}</b><small>{sub}</small></div></div>
            ))}
          </div>
        </section>
      )}

      {on('categories') && (
        <section className="container section">
          <div className="section-head">
            <div><div className="eyebrow" style={{ marginBottom: 8 }}>Shop by part type</div><h2 style={{ fontSize: 34 }}>Every component, organised</h2></div>
            <Link to="/shop/" style={{ fontWeight: 600 }}>All {categories.list.length || ''} categories →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
            {tiles.map((c) => (
              <Link key={c.id} to={categoryHref(c, categories.byId)} className="cat-tile">
                <span className="cat-thumb"><CategoryThumb cat={c} /></span>
                <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{c.name}</span><span className="muted" style={{ fontSize: 12 }}>{c.productCount || 0} parts</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {on('types') && types.length > 0 && (
        <section className="container" style={{ paddingTop: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
            {types.map(({ cat, sub, bg, fg }) => (
              <Link key={cat.id} to={categoryHref(cat)} style={{ borderRadius: 16, padding: 24, minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: bg, color: fg, border: bg === '#fff' ? '1px solid var(--line)' : 0 }}>
                <span className="mono" style={{ fontSize: 12, opacity: 0.8 }}>{cat.productCount || 0} PARTS</span>
                <span><span style={{ display: 'block', font: '700 24px var(--font-display)' }}>{cat.name}</span><span style={{ fontSize: 14, opacity: 0.85 }}>{sub}</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {on('brands') && brands.data?.length > 0 && (
        <section className="container" style={{ paddingTop: 48 }}>
          <div className="card row wrap" style={{ gap: 10, padding: '18px 22px' }}>
            <span style={{ font: '600 14px var(--font-display)', color: 'var(--navy-900)', marginRight: 8 }}>Shop by brand</span>
            {brands.data.map((b) => <Link key={b.id} className="chip" style={{ height: 38, fontWeight: 600 }} to={`/search?q=${encodeURIComponent(b.name)}`}>{b.name}</Link>)}
          </div>
        </section>
      )}

      {settings.home.sections.filter((s) => s.id.startsWith('rail-') && s.enabled !== false).map((s) => (
        <ProductRail key={s.id} section={s} categories={categories} />
      ))}

      {on('cta') && (
        <section className="container section">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16 }}>
            <div className="card card-pad stack" style={{ gap: 14 }}>
              <div className="eyebrow">Guide</div>
              <h3 style={{ fontSize: 26 }}>The 10 most-used logic cards</h3>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.55 }}>What a formatter board does, how to tell when it has failed, and the models we replace most often.</p>
              <Link to="/10-most-used-logic-cards/" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>Read the guide</Link>
            </div>
            <div className="stack" style={{ gap: 14, background: 'var(--red-600)', color: '#fff', borderRadius: 16, padding: 28 }}>
              <div className="eyebrow" style={{ color: '#FFE1E2' }}>Can't find your part?</div>
              <h3 style={{ fontSize: 26, color: '#fff' }}>Send us the part number or a photo on WhatsApp</h3>
              <p style={{ margin: 0, lineHeight: 1.55, color: '#FFE9EA' }}>Our team will check stock and confirm compatibility with your printer model.</p>
              <div className="row wrap" style={{ gap: 10 }}>
                <a className="btn" style={{ background: '#fff', color: 'var(--navy-900)' }} href={`https://wa.me/${settings.contact.whatsapp}`} target="_blank" rel="noreferrer">Chat on WhatsApp</a>
                <button type="button" className="btn" style={{ border: '1px solid #FFB3B6', color: '#fff', background: 'transparent' }} onClick={() => setOverlay('enquiry')}>Send an enquiry</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
