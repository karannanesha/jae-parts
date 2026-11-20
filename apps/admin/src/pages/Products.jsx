import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import Icon from '@jae/shared/Icon.jsx';
import { inr } from '@jae/shared/format.js';
import { db } from '../firebase.js';
import { useLiveCollection } from '../lib/data.js';
import { Thumb, Empty } from '../components/ui.jsx';

const TABS = [
  ['all', 'All', () => true],
  ['in', 'In stock', (p) => p.inStock !== false],
  ['out', 'Out of stock', (p) => p.inStock === false],
  ['draft', 'Drafts & hidden', (p) => p.status !== 'published'],
  ['fix', 'Needs fixing', (p) => !p.price || !p.images?.length],
];

function toCsv(rows) {
  const cols = ['id', 'name', 'slug', 'brand', 'partNo', 'sku', 'price', 'mrp', 'gstRate', 'stock', 'inStock', 'status'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export default function Products() {
  const navigate = useNavigate();
  const { data, loading } = useLiveCollection('products');
  const cats = useLiveCollection('categories');
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [brand, setBrand] = useState('');
  const [sel, setSel] = useState([]);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const PER = 50;

  const brands = useMemo(() => [...new Set(data.map((p) => p.brand).filter(Boolean))].sort(), [data]);
  const catName = useMemo(() => new Map(cats.data.map((c) => [c.id, c.name])), [cats.data]);
  const rows = useMemo(() => {
    const test = TABS.find((t) => t[0] === tab)[2];
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return data
      .filter(test)
      .filter((p) => !cat || p.categoryIds?.includes(cat))
      .filter((p) => !brand || p.brand === brand)
      .filter((p) => { const hay = `${p.name} ${p.partNo || ''} ${p.sku || ''} ${(p.compatibleModels || []).join(' ')}`.toLowerCase(); return words.every((w) => hay.includes(w)); })
      .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
  }, [data, tab, q, cat, brand]);
  const shown = rows.slice(page * PER, page * PER + PER);
  const allSel = shown.length > 0 && shown.every((p) => sel.includes(p.id));

  async function bulk(patch) {
    if (!sel.length) return;
    setBusy(true);
    for (let i = 0; i < sel.length; i += 450) {
      const batch = writeBatch(db);
      sel.slice(i, i + 450).forEach((id) => batch.update(doc(db, 'products', id), { ...patch, updatedAt: serverTimestamp() }));
      await batch.commit();
    }
    setSel([]);
    setBusy(false);
  }

  async function bulkDelete() {
    if (!sel.length || !window.confirm(`Delete ${sel.length} products permanently? This cannot be undone.`)) return;
    setBusy(true);
    for (let i = 0; i < sel.length; i += 450) {
      const batch = writeBatch(db);
      sel.slice(i, i + 450).forEach((id) => batch.delete(doc(db, 'products', id)));
      await batch.commit();
    }
    setSel([]);
    setBusy(false);
  }

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jae-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="page">
      <div className="page-title">
        <div><h1>Products</h1><div className="muted" style={{ fontSize: 13 }}>{data.length} products · live from Firestore</div></div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}><Icon name="download" size={16} />Export CSV</button>
          <Link to="/products/new" className="btn btn-red btn-sm">+ Add product</Link>
        </div>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="tabs-admin" role="tablist">
          {TABS.map(([k, label, test]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setPage(0); }}>{label} <span className="n">{data.filter(test).length}</span></button>
          ))}
        </div>
        <div className="row wrap" style={{ gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--line-soft)' }}>
          <input className="input" style={{ flex: '1 1 260px', height: 40 }} placeholder="Search name, part no., SKU, printer model" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label="Search products" />
          <select className="select" style={{ width: 'auto', height: 40 }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {cats.data.map((c) => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</option>)}
          </select>
          <select className="select" style={{ width: 'auto', height: 40 }} value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand">
            <option value="">All brands</option>{brands.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        {sel.length > 0 && (
          <div className="row wrap" style={{ gap: 10, padding: '10px 18px', background: 'var(--navy-900)', color: '#fff', fontSize: 13 }}>
            <b>{sel.length} selected</b>
            {[['Publish', { status: 'published' }], ['Hide', { status: 'hidden' }], ['Mark out of stock', { inStock: false, stock: 0 }], ['Mark in stock', { inStock: true }], ['Feature on home', { featured: true }]].map(([l, patch]) => (
              <button key={l} type="button" className="btn btn-sm" disabled={busy} style={{ background: 'transparent', color: '#fff', border: '1px solid #2C4378' }} onClick={() => bulk(patch)}>{l}</button>
            ))}
            <button type="button" className="btn btn-sm" disabled={busy} style={{ background: 'transparent', color: '#FF9EA2', border: '1px solid #2C4378' }} onClick={bulkDelete}>Delete</button>
          </div>
        )}
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 900 }}>
            <thead><tr>
              <th style={{ width: 30 }}><input type="checkbox" aria-label="Select all on this page" checked={allSel} onChange={() => setSel(allSel ? sel.filter((id) => !shown.some((p) => p.id === id)) : [...new Set([...sel, ...shown.map((p) => p.id)])])} /></th>
              <th>Product</th><th>SKU</th><th>Category</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Stock</th><th>Status</th>
            </tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className={`clickable${sel.includes(p.id) ? ' selected' : ''}`} onClick={() => navigate(`/products/${p.id}`)}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${p.name}`} checked={sel.includes(p.id)} onChange={() => setSel(sel.includes(p.id) ? sel.filter((x) => x !== p.id) : [...sel, p.id])} /></td>
                  <td><div className="row" style={{ gap: 10 }}><Thumb url={p.images?.[0]?.url} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, maxWidth: 380, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div><span className="mono muted" style={{ fontSize: 11 }}>{p.partNo || p.brand || ''}</span></div></div></td>
                  <td className="mono" style={{ color: p.sku ? 'var(--ink)' : 'var(--red-800)' }}>{p.sku || 'Missing'}</td>
                  <td className="muted">{catName.get(p.primaryCategoryId) || '—'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><b style={{ color: p.price ? 'var(--navy-900)' : 'var(--red-800)' }}>{inr(p.price)}</b>{p.mrp > p.price && <div className="muted" style={{ fontSize: 11, textDecoration: 'line-through' }}>{inr(p.mrp)}</div>}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: p.inStock === false ? 'var(--red-800)' : 'var(--ink)' }}>{typeof p.stock === 'number' ? p.stock : p.inStock === false ? 0 : '✓'}</td>
                  <td><span className={`status tone-${!p.price ? 'red' : p.status === 'published' ? (p.inStock === false ? 'amber' : 'green') : 'muted'}`}>{!p.price ? 'Fix price' : p.status === 'published' ? (p.inStock === false ? 'Out of stock' : 'Live') : p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <Empty>No products match.</Empty>}
          {loading && <div style={{ padding: 18 }}><div className="skeleton" style={{ height: 200 }} /></div>}
        </div>
        <div className="row wrap" style={{ justifyContent: 'space-between', gap: 10, padding: '14px 18px', fontSize: 13 }}>
          <span className="muted">Showing {rows.length ? page * PER + 1 : 0}–{Math.min((page + 1) * PER, rows.length)} of {rows.length}</span>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={(page + 1) * PER >= rows.length} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
