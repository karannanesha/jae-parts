import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Icon from '@jae/shared/Icon.jsx';
import { inr } from '@jae/shared/format.js';
import { useUi } from '../state/UiContext.jsx';
import { useAsync, useSeo } from '../lib/useAsync.js';
import { getProductsByCategory, getProductsPage, searchProducts } from '../lib/catalog.js';
import ProductCard from '../components/ProductCard.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { categoryHref } from '../components/Header.jsx';

const SORTS = {
  popular: ['Most popular', (a, b) => Number(!!b.featured) - Number(!!a.featured) || (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)],
  latest: ['Latest', (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)],
  priceAsc: ['Price: low to high', (a, b) => a.price - b.price],
  priceDesc: ['Price: high to low', (a, b) => b.price - a.price],
};

function useShopProducts({ cat, q, catFilter }) {
  const [allPages, setAllPages] = useState({ items: [], cursor: null, done: false, loading: false });
  const mode = q ? 'search' : cat ? 'category' : 'all';

  const fixed = useAsync(async () => {
    if (mode === 'search') {
      const r = await searchProducts(q, 300);
      return catFilter ? r.filter((p) => p.categoryIds?.includes(catFilter)) : r;
    }
    if (mode === 'category') return getProductsByCategory(cat.id);
    return null;
  }, [mode, q, cat?.id, catFilter]);

  const loadMore = async () => {
    if (allPages.loading || allPages.done) return;
    setAllPages((s) => ({ ...s, loading: true }));
    const page = await getProductsPage({ pageSize: 48, after: allPages.cursor });
    setAllPages((s) => ({ items: [...s.items, ...page.items], cursor: page.cursor, done: page.done, loading: false }));
  };

  useEffect(() => {
    if (mode === 'all' && allPages.items.length === 0 && !allPages.done) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (mode === 'all') return { items: allPages.items, loading: allPages.loading && allPages.items.length === 0, more: !allPages.done, loadMore, moreLoading: allPages.loading };
  return { items: fixed.data || [], loading: fixed.loading, error: fixed.error, more: false };
}

export default function Shop() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const catFilter = params.get('cat') || '';
  const { categories } = useUi();
  const cat = slug ? categories.bySlug.get(slug) : null;
  const waitingForCats = slug && categories.list.length === 0;

  const { items, loading, more, loadMore, moreLoading } = useShopProducts({ cat, q, catFilter });

  const [model, setModel] = useState('');
  const [minP, setMinP] = useState('');
  const [maxP, setMaxP] = useState('');
  const [brands, setBrands] = useState([]);
  const [types, setTypes] = useState([]);
  const [stock, setStock] = useState('any');
  const [sort, setSort] = useState('popular');
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [view, setView] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { setPage(1); setBrands([]); setTypes([]); setModel(''); setMinP(''); setMaxP(''); }, [slug, q]);
  useEffect(() => { setPage(1); }, [model, minP, maxP, brands, types, stock, sort, perPage]);

  const title = q ? `Results for “${q}”` : cat ? cat.name : 'All products';
  useSeo(cat?.seo?.title || title, cat?.seo?.description || (cat?.description || '').slice(0, 155));

  // Facets from the loaded products.
  const facets = useMemo(() => {
    const brandCount = new Map();
    const typeCount = new Map();
    for (const p of items) {
      if (p.brand) brandCount.set(p.brand, (brandCount.get(p.brand) || 0) + 1);
      for (const id of p.categoryIds || []) {
        const c = categories.byId.get(id);
        if (c && !c.parentId && c.id !== cat?.id && !/printer parts$/i.test(c.name)) typeCount.set(id, (typeCount.get(id) || 0) + 1);
      }
    }
    return {
      brands: [...brandCount].sort((a, b) => b[1] - a[1]),
      types: [...typeCount].sort((a, b) => b[1] - a[1]).map(([id, n]) => [categories.byId.get(id), n]),
    };
  }, [items, categories, cat?.id]);

  const filtered = useMemo(() => {
    const m = model.trim().toLowerCase().replace(/[\s-]/g, '');
    const lo = Number(minP) || 0;
    const hi = Number(maxP) || Infinity;
    return items
      .filter((p) => p.price >= lo && p.price <= hi)
      .filter((p) => !brands.length || brands.includes(p.brand))
      .filter((p) => !types.length || types.some((t) => p.categoryIds?.includes(t)))
      .filter((p) => stock === 'any' || (stock === 'in' ? p.inStock !== false : p.inStock === false))
      .filter((p) => !m || `${p.name} ${(p.compatibleModels || []).join(' ')}`.toLowerCase().replace(/[\s-]/g, '').includes(m))
      .sort(SORTS[sort][1]);
  }, [items, model, minP, maxP, brands, types, stock, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);
  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const parent = cat?.parentId ? categories.byId.get(cat.parentId) : null;
  const subcats = cat ? (cat.children?.length ? cat.children : parent?.children || []) : [];
  const activeChips = [
    ...brands.map((b) => [b, () => toggle(brands, setBrands, b)]),
    ...types.map((t) => [categories.byId.get(t)?.name, () => toggle(types, setTypes, t)]),
    ...(minP || maxP ? [[`${minP ? inr(minP) : '₹0'} – ${maxP ? inr(maxP) : 'any'}`, () => { setMinP(''); setMaxP(''); }]] : []),
    ...(stock !== 'any' ? [[stock === 'in' ? 'In stock' : 'Out of stock', () => setStock('any')]] : []),
    ...(model ? [[`Model: ${model}`, () => setModel('')]] : []),
  ];

  if (slug && !waitingForCats && !cat) {
    return <div className="container empty"><h1>Category not found</h1><p><Link to="/shop/">Browse all products</Link></p></div>;
  }

  return (
    <>
      <section className="page-head">
        <div className="container stack" style={{ gap: 14 }}>
          <nav aria-label="Breadcrumb" className="breadcrumb">
            <Link to="/">Home</Link><span>/</span>
            {parent && <><Link to={categoryHref(parent)}>{parent.name}</Link><span>/</span></>}
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{title}</span>
          </nav>
          <div className="row wrap" style={{ justifyContent: 'space-between', gap: 20, alignItems: 'flex-end' }}>
            <div style={{ maxWidth: 760 }}>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', letterSpacing: '-0.02em', marginBottom: 8 }}>{title}</h1>
              {cat?.description && <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{cat.description}</p>}
            </div>
            <span className="mono muted" style={{ fontSize: 13 }}>{loading ? '…' : `${items.length}${more ? '+' : ''} PRODUCTS`}</span>
          </div>
          {subcats.length > 0 && (
            <div className="row wrap" style={{ gap: 8 }}>
              {(parent || cat) && <Link to={categoryHref(parent || cat)} className={`chip${!parent ? ' active' : ''}`}>All {(parent || cat).name.toLowerCase()}</Link>}
              {subcats.map((c) => <Link key={c.id} to={categoryHref(c, categories.byId)} className={`chip${c.id === cat?.id ? ' active' : ''}`}>{c.name} <span className="muted">{c.productCount || ''}</span></Link>)}
            </div>
          )}
        </div>
      </section>

      <div className="container shop-layout">
        <aside aria-label="Filters" className={`filters${showFilters ? '' : ' collapsed'}`}>
          <button type="button" className="btn btn-ghost mobile-only" onClick={() => setShowFilters((s) => !s)}>{showFilters ? 'Hide filters' : `Filters${activeChips.length ? ` (${activeChips.length})` : ''}`}</button>
          <div className="fbox">
            <h3>Printer model</h3>
            <label className="sr-only" htmlFor="f-model">Filter by printer model</label>
            <input id="f-model" className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. LaserJet M1005" />
          </div>
          <div className="fbox">
            <h3>Price</h3>
            <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label className="field">Min ₹<input className="input" inputMode="numeric" value={minP} onChange={(e) => setMinP(e.target.value.replace(/\D/g, ''))} /></label>
              <label className="field">Max ₹<input className="input" inputMode="numeric" value={maxP} onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ''))} /></label>
            </div>
          </div>
          {facets.types.length > 0 && (
            <div className="fbox">
              <h3>Part type</h3>
              {facets.types.slice(0, 12).map(([c, n]) => (
                <label key={c.id} className="checkbox"><input type="checkbox" checked={types.includes(c.id)} onChange={() => toggle(types, setTypes, c.id)} /><span>{c.name}</span><span className="fcount">{n}</span></label>
              ))}
            </div>
          )}
          {facets.brands.length > 0 && (
            <div className="fbox">
              <h3>Brand</h3>
              {facets.brands.map(([b, n]) => (
                <label key={b} className="checkbox"><input type="checkbox" checked={brands.includes(b)} onChange={() => toggle(brands, setBrands, b)} /><span>{b}</span><span className="fcount">{n}</span></label>
              ))}
            </div>
          )}
          <div className="fbox">
            <h3>Availability</h3>
            {[['any', 'Any'], ['in', 'In stock'], ['out', 'Out of stock']].map(([v, l]) => (
              <label key={v} className="checkbox"><input type="radio" name="stock" checked={stock === v} onChange={() => setStock(v)} /><span>{l}</span></label>
            ))}
          </div>
        </aside>

        <div className="shop-main">
          <div className="toolbar">
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>
              {filtered.length ? <>Showing <b style={{ color: 'var(--ink)' }}>{(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)}</b> of {filtered.length} results</> : 'No results'}
            </span>
            <div className="row" style={{ gap: 6, marginLeft: 'auto', fontSize: 13, color: 'var(--muted-2)' }}>Show
              {[12, 20, 40].map((n) => <button key={n} type="button" className={`chip${perPage === n ? ' active' : ''}`} style={{ height: 32 }} onClick={() => setPerPage(n)}>{n}</button>)}
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="icon-btn" aria-label="Grid view" aria-pressed={view === 'grid'} style={view === 'grid' ? { borderColor: 'var(--navy-900)' } : { color: 'var(--muted-2)' }} onClick={() => setView('grid')}><Icon name="grid" size={18} /></button>
              <button type="button" className="icon-btn" aria-label="List view" aria-pressed={view === 'list'} style={view === 'list' ? { borderColor: 'var(--navy-900)' } : { color: 'var(--muted-2)' }} onClick={() => setView('list')}><Icon name="list" size={18} /></button>
            </div>
            <label htmlFor="sort" className="sr-only">Sort by</label>
            <select id="sort" className="select" style={{ width: 'auto', minWidth: 200 }} value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, [l]]) => <option key={k} value={k}>Sort: {l}</option>)}
            </select>
          </div>

          {activeChips.length > 0 && (
            <div className="row wrap" style={{ gap: 8 }}>
              {activeChips.map(([label, clear]) => <button key={label} type="button" className="chip" onClick={clear}>{label} <span aria-hidden="true" className="muted">✕</span></button>)}
              <button type="button" onClick={() => { setBrands([]); setTypes([]); setMinP(''); setMaxP(''); setStock('any'); setModel(''); }} style={{ border: 0, background: 'none', color: 'var(--red-700)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Clear all</button>
            </div>
          )}

          {loading || waitingForCats ? (
            <div className="pgrid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" style={{ height: 400 }} />)}</div>
          ) : shown.length === 0 ? (
            <div className="card empty">
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>No parts match</h2>
              <p style={{ margin: 0 }}>Try removing a filter, or send us the part number on WhatsApp — we stock more than is listed.</p>
            </div>
          ) : view === 'grid' ? (
            <div className="pgrid">{shown.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              {shown.map((p) => (
                <Link key={p.id} to={`/product/${p.slug}/`} className="row" style={{ gap: 14, padding: 14, borderBottom: '1px solid var(--line-soft)' }}>
                  <span style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', flex: 'none', border: '1px solid var(--line-soft)' }}><ProductImage product={p} label="IMG" /></span>
                  <span className="grow"><span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)' }}>{p.name}</span><span className="muted mono" style={{ fontSize: 12 }}>{[p.brand, p.partNo].filter(Boolean).join(' · ')}</span></span>
                  <span className="price" style={{ fontSize: 18 }}>{inr(p.price)}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="stack" style={{ alignItems: 'center', gap: 16, paddingTop: 12 }}>
            {more && <button type="button" className="btn btn-navy btn-lg" onClick={loadMore} disabled={moreLoading}>{moreLoading ? 'Loading…' : 'Load more products'}</button>}
            {pages > 1 && (
              <nav aria-label="Pagination" className="row wrap" style={{ gap: 6, justifyContent: 'center' }}>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" className={`chip${n === page ? ' active' : ''}`} style={{ minWidth: 44, height: 44, justifyContent: 'center', borderRadius: 10 }} aria-current={n === page ? 'page' : undefined} onClick={() => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{n}</button>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
