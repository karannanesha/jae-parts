import { useEffect, useMemo, useState } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { slugify } from '@jae/shared/format.js';
import { db, storage } from '../firebase.js';
import { useLiveCollection } from '../lib/data.js';
import { ToggleRow } from '../components/ui.jsx';

const BLANK = { name: '', slug: '', parentId: '', description: '', image: '', order: 100, showOnHome: true, showInMenu: true, seo: { title: '', description: '' } };

function BrandList() {
  const { data } = useLiveCollection('brands');
  const [name, setName] = useState('');
  async function add(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    await setDoc(doc(db, 'brands', slugify(n)), { name: n, slug: slugify(n), productCount: 0, createdAt: serverTimestamp() }, { merge: true });
    setName('');
  }
  return (
    <section className="panel">
      <h2>Brands</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {[...data].sort((a, b) => (b.productCount || 0) - (a.productCount || 0)).map((b) => (
          <div key={b.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
            <b style={{ fontSize: 14 }}>{b.name}</b>
            <div className="mono muted" style={{ fontSize: 11 }}>{b.productCount || 0} PRODUCTS</div>
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8, color: 'var(--red-800)' }} onClick={() => window.confirm(`Delete brand ${b.name}? Products keep their brand text.`) && deleteDoc(doc(db, 'brands', b.id))}>Delete</button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="row" style={{ gap: 8 }}>
        <input className="input" style={{ height: 40 }} aria-label="New brand name" placeholder="New brand name" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn btn-navy btn-sm">Add brand</button>
      </form>
    </section>
  );
}

export default function Categories() {
  const { data, loading } = useLiveCollection('categories');
  const [selId, setSelId] = useState(null);
  const [f, setF] = useState(BLANK);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const isNew = selId === 'new';

  const tree = useMemo(() => {
    const parents = data.filter((c) => !c.parentId).sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
    return parents.flatMap((p) => [p, ...data.filter((c) => c.parentId === p.id).sort((a, b) => a.name.localeCompare(b.name))]);
  }, [data]);

  useEffect(() => {
    if (isNew) { setF(BLANK); return; }
    const c = data.find((x) => x.id === selId);
    if (c) setF({ ...BLANK, ...c, parentId: c.parentId || '', seo: { ...BLANK.seo, ...c.seo } });
  }, [selId, data, isNew]);

  const set = (k, v) => setF((cur) => ({ ...cur, [k]: v }));

  async function save() {
    if (!f.name.trim()) { setMsg('Name is required'); return; }
    const slug = slugify(f.slug || f.name);
    const id = isNew ? slug : selId;
    if (isNew && data.some((c) => c.id === id)) { setMsg('A category with this URL already exists'); return; }
    const { id: _ignore, productCount, ...rest } = f; // productCount is maintained by Cloud Functions
    await setDoc(doc(db, 'categories', id), { ...rest, name: f.name.trim(), slug, parentId: f.parentId || null, order: Number(f.order) || 100, updatedAt: serverTimestamp() }, { merge: true });
    setMsg('Saved');
    setSelId(id);
  }

  async function uploadImage(file) {
    const id = isNew ? slugify(f.slug || f.name || 'new') : selId;
    const snap = await uploadBytes(ref(storage, `categories/${id}-${Date.now()}`), file, { contentType: file.type });
    set('image', await getDownloadURL(snap.ref));
  }

  async function remove() {
    const children = data.filter((c) => c.parentId === selId);
    if (children.length) { setMsg('Move or delete its sub-categories first'); return; }
    if (!window.confirm(`Delete category “${f.name}”? Products stay but lose this category.`)) return;
    await deleteDoc(doc(db, 'categories', selId));
    setSelId(null);
  }

  return (
    <div className="page">
      <div className="page-title">
        <div><h1>Categories &amp; brands</h1><div className="muted" style={{ fontSize: 13 }}>{data.length} categories</div></div>
        <button type="button" className="btn btn-red btn-sm" onClick={() => { setSelId('new'); setMsg(''); }}>+ New category</button>
      </div>
      <div className="row wrap" style={{ gap: 18, alignItems: 'flex-start' }}>
        <div className="panel" style={{ flex: '1 1 340px', maxWidth: 420, padding: 12, gap: 2 }}>
          <input className="input" style={{ height: 40, marginBottom: 6 }} aria-label="Filter categories" placeholder="Filter categories" value={filter} onChange={(e) => setFilter(e.target.value)} />
          {loading && <div className="skeleton" style={{ height: 300 }} />}
          {tree.filter((c) => !filter || c.name.toLowerCase().includes(filter.toLowerCase())).map((c) => (
            <button key={c.id} type="button" onClick={() => { setSelId(c.id); setMsg(''); }} className="row" style={{ gap: 10, minHeight: 40, padding: `0 10px 0 ${c.parentId ? 32 : 10}px`, borderRadius: 8, border: 0, cursor: 'pointer', textAlign: 'left', background: c.id === selId ? '#EEF2FA' : 'transparent', fontWeight: c.parentId ? 500 : 600, fontSize: 14 }}>
              <span className="grow">{c.name}</span><span className="mono muted" style={{ fontSize: 11 }}>{c.productCount || 0}</span>
            </button>
          ))}
        </div>
        <div className="stack" style={{ flex: '999 1 420px', minWidth: 0, gap: 18 }}>
          {selId ? (
            <section className="panel">
              <h2>{isNew ? 'New category' : f.name} {!isNew && <span className="mono muted" style={{ fontSize: 12 }}>{f.productCount || 0} PRODUCTS</span>}</h2>
              <div className="row wrap" style={{ gap: 16, alignItems: 'flex-start' }}>
                <label style={{ width: 120, height: 120, borderRadius: 12, overflow: 'hidden', flex: 'none', border: '1px solid var(--line)', cursor: 'pointer', position: 'relative' }}>
                  {f.image ? <img src={f.image} alt="" className="img-cover" /> : <span className="ph" style={{ width: '100%', height: '100%' }}>UPLOAD IMAGE</span>}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                </label>
                <div className="stack grow" style={{ gap: 12, flex: '1 1 260px' }}>
                  <div className="grid-2">
                    <label className="field">Name<input className="input" value={f.name} onChange={(e) => { set('name', e.target.value); if (isNew) set('slug', slugify(e.target.value)); }} /></label>
                    <label className="field">Parent<select className="select" value={f.parentId} onChange={(e) => set('parentId', e.target.value)}><option value="">— None (top level) —</option>{data.filter((c) => !c.parentId && c.id !== selId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                  </div>
                  <div className="grid-2">
                    <label className="field">URL slug<input className="input mono" value={f.slug} disabled={!isNew} onChange={(e) => set('slug', e.target.value)} /></label>
                    <label className="field">Sort order<input className="input mono" type="number" value={f.order} onChange={(e) => set('order', e.target.value)} /></label>
                  </div>
                </div>
              </div>
              <label className="field">Intro text (top of the category page)<textarea className="textarea" value={f.description} onChange={(e) => set('description', e.target.value)} /></label>
              <div className="grid-2">
                <label className="field">Meta title<input className="input" value={f.seo.title} onChange={(e) => set('seo', { ...f.seo, title: e.target.value })} /></label>
                <label className="field">Meta description<input className="input" value={f.seo.description} onChange={(e) => set('seo', { ...f.seo, description: e.target.value })} /></label>
              </div>
              <ToggleRow label="Show tile on home page" checked={f.showOnHome !== false} onChange={(v) => set('showOnHome', v)} />
              <ToggleRow label="Show in “Browse categories” menu" checked={f.showInMenu !== false} onChange={(v) => set('showInMenu', v)} />
              <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                {msg && <span style={{ marginRight: 'auto', fontSize: 13, fontWeight: 600, color: msg === 'Saved' ? 'var(--green-700)' : 'var(--red-800)' }}>{msg}</span>}
                {!isNew && <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--red-800)' }} onClick={remove}>Delete</button>}
                <button type="button" className="btn btn-navy btn-sm" onClick={save}>Save category</button>
              </div>
            </section>
          ) : <div className="panel muted">Select a category to edit it, or create a new one.</div>}
          <BrandList />
        </div>
      </div>
    </div>
  );
}
