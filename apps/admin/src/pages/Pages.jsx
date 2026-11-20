import { useEffect, useState } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { slugify, formatDate } from '@jae/shared/format.js';
import { db } from '../firebase.js';
import { useLiveCollection } from '../lib/data.js';
import RichText from '../components/RichText.jsx';
import { ToggleRow } from '../components/ui.jsx';

const BLANK = { title: '', slug: '', summary: '', html: '', published: true, seo: { title: '', description: '' } };

export default function Pages() {
  const { data } = useLiveCollection('pages');
  const [sel, setSel] = useState(null);
  const [f, setF] = useState(BLANK);
  const [msg, setMsg] = useState('');
  const isNew = sel === 'new';
  const storeUrl = import.meta.env.VITE_STORE_URL || 'https://jae-parts-dev.web.app';

  useEffect(() => {
    if (isNew) { setF(BLANK); return; }
    const p = data.find((x) => x.id === sel);
    if (p) setF({ ...BLANK, ...p, slug: p.id, seo: { ...BLANK.seo, ...p.seo } });
  }, [sel, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));

  async function save() {
    if (!f.title.trim()) { setMsg('Title is required'); return; }
    const id = isNew ? slugify(f.slug || f.title) : sel;
    const { slug: _s, id: _i, ...rest } = f;
    await setDoc(doc(db, 'pages', id), { ...rest, title: f.title.trim(), updatedAt: serverTimestamp() }, { merge: true });
    setSel(id); setMsg('Saved');
  }

  return (
    <div className="page">
      <div className="page-title">
        <div><h1>Pages</h1><div className="muted" style={{ fontSize: 13 }}>About, policies and guides — shown at jaepart.com/&lt;url&gt;/</div></div>
        <button type="button" className="btn btn-red btn-sm" onClick={() => { setSel('new'); setMsg(''); }}>+ New page</button>
      </div>
      <div className="row wrap" style={{ gap: 18, alignItems: 'flex-start' }}>
        <div className="panel" style={{ flex: '1 1 300px', maxWidth: 380, padding: 10, gap: 4 }}>
          {data.map((p) => (
            <button key={p.id} type="button" onClick={() => { setSel(p.id); setMsg(''); }} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 0, cursor: 'pointer', background: p.id === sel ? '#EEF2FA' : 'transparent' }}>
              <b style={{ display: 'block', fontSize: 14 }}>{p.title}</b>
              <span className="mono muted" style={{ fontSize: 11 }}>/{p.id}/ · {p.published ? 'published' : 'draft'} · {formatDate(p.updatedAt)}</span>
            </button>
          ))}
          {data.length === 0 && <div className="muted" style={{ padding: 12 }}>No pages yet — run the import script or create one.</div>}
        </div>
        {sel ? (
          <section className="panel" style={{ flex: '999 1 520px' }}>
            <div className="grid-2">
              <label className="field">Title<input className="input" value={f.title} onChange={(e) => { set('title', e.target.value); if (isNew) set('slug', slugify(e.target.value)); }} /></label>
              <label className="field">URL<input className="input mono" value={f.slug} disabled={!isNew} onChange={(e) => set('slug', e.target.value)} /></label>
            </div>
            <label className="field">Summary (under the title)<input className="input" value={f.summary} onChange={(e) => set('summary', e.target.value)} /></label>
            <div className="field">Content<RichText value={f.html} onChange={(v) => set('html', v)} /></div>
            <div className="grid-2">
              <label className="field">Meta title<input className="input" value={f.seo.title} onChange={(e) => set('seo', { ...f.seo, title: e.target.value })} /></label>
              <label className="field">Meta description<input className="input" value={f.seo.description} onChange={(e) => set('seo', { ...f.seo, description: e.target.value })} /></label>
            </div>
            <ToggleRow label="Published" checked={f.published} onChange={(v) => set('published', v)} />
            <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
              {msg && <span style={{ marginRight: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--green-700)' }}>{msg}</span>}
              {!isNew && <a className="btn btn-ghost btn-sm" href={`${storeUrl}/${sel}/`} target="_blank" rel="noreferrer">View ↗</a>}
              {!isNew && <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--red-800)' }} onClick={() => window.confirm(`Delete page “${f.title}”?`) && deleteDoc(doc(db, 'pages', sel)).then(() => setSel(null))}>Delete</button>}
              <button type="button" className="btn btn-navy btn-sm" onClick={save}>Save page</button>
            </div>
          </section>
        ) : <div className="panel muted" style={{ flex: '999 1 520px' }}>Select a page to edit.</div>}
      </div>
    </div>
  );
}
