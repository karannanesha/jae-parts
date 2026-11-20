import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { inr, slugify, buildSearchTokens, discountPercent, round2 } from '@jae/shared/format.js';
import { GST_RATES } from '@jae/shared/constants.js';
import { db, storage } from '../firebase.js';
import { useLiveCollection } from '../lib/data.js';
import { ToggleRow, TagInput } from '../components/ui.jsx';
import RichText from '../components/RichText.jsx';

const BLANK = {
  name: '', slug: '', brand: '', partNo: '', sku: '', condition: 'new',
  price: 0, mrp: 0, gstRate: 18, hsn: '',
  stock: null, lowStockAt: 5, inStock: true,
  status: 'draft', featured: false, badge: '', codAllowed: true,
  categoryIds: [], primaryCategoryId: '', compatibleModels: [],
  description: '', specs: [{ k: 'Brand', v: '' }, { k: 'Type', v: '' }, { k: 'Model no.', v: '' }],
  images: [], seo: { title: '', description: '' }, weightGrams: null,
};

export default function ProductEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const cats = useLiveCollection('categories');
  const brands = useLiveCollection('brands');
  const [p, setP] = useState(BLANK);
  const [docId, setDocId] = useState(isNew ? doc(collection(db, 'products')).id : id);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    if (isNew) { setP(BLANK); setDocId(doc(collection(db, 'products')).id); setLoading(false); return; }
    setDocId(id);
    getDoc(doc(db, 'products', id)).then((s) => {
      if (s.exists()) setP({ ...BLANK, ...s.data(), seo: { ...BLANK.seo, ...s.data().seo } });
      setLoading(false);
    });
  }, [id, isNew]);

  const set = (k, v) => setP((cur) => ({ ...cur, [k]: v }));
  const num = (k) => (e) => set(k, e.target.value === '' ? null : Number(e.target.value));

  async function upload(files) {
    setUploading(true);
    try {
      const added = [];
      for (const file of files) {
        const path = `products/${docId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const snap = await uploadBytes(ref(storage, path), file, { contentType: file.type, cacheControl: 'public, max-age=31536000' });
        added.push({ path, url: await getDownloadURL(snap.ref), alt: p.name });
      }
      setP((cur) => ({ ...cur, images: [...cur.images, ...added] }));
    } catch (e) {
      console.error(e); setMsg('Upload failed — check Storage rules and your admin claim.');
    } finally { setUploading(false); }
  }

  function moveImage(i, dir) {
    const imgs = [...p.images];
    const j = i + dir;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    set('images', imgs);
  }

  async function removeImage(i) {
    const img = p.images[i];
    set('images', p.images.filter((_, x) => x !== i));
    if (img.path) deleteObject(ref(storage, img.path)).catch(() => {});
  }

  async function save() {
    setMsg('');
    if (!p.name.trim()) { setMsg('Name is required.'); return; }
    if (!p.categoryIds.length) { setMsg('Pick at least one category.'); return; }
    if (p.status === 'published' && !(p.price > 0)) { setMsg('Set a selling price above ₹0 before publishing.'); return; }
    const slug = slugify(p.slug || p.name);
    const clash = await getDocs(query(collection(db, 'products'), where('slug', '==', slug)));
    if (clash.docs.some((d) => d.id !== docId)) { setMsg(`Another product already uses the URL “${slug}”.`); return; }

    setSaving(true);
    const stock = typeof p.stock === 'number' ? p.stock : null;
    const data = {
      ...p,
      name: p.name.trim(),
      slug,
      price: round2(p.price || 0),
      mrp: round2(p.mrp || p.price || 0),
      stock,
      inStock: stock === null ? p.inStock !== false : stock > 0,
      primaryCategoryId: p.categoryIds.includes(p.primaryCategoryId) ? p.primaryCategoryId : p.categoryIds[p.categoryIds.length - 1],
      specs: p.specs.filter((s) => s.k.trim() && s.v.trim()),
      searchTokens: buildSearchTokens(p.name, p.partNo, p.sku, p.brand, p.compatibleModels),
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    };
    try {
      await setDoc(doc(db, 'products', docId), data, { merge: true });
      setMsg('Saved.');
      if (isNew) navigate(`/products/${docId}`, { replace: true });
    } catch (e) {
      console.error(e); setMsg('Could not save — check your connection and admin access.');
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!window.confirm(`Delete “${p.name}” permanently? This cannot be undone.`)) return;
    await deleteDoc(doc(db, 'products', docId));
    navigate('/products');
  }

  if (loading) return <div className="page"><div className="skeleton" style={{ height: 500 }} /></div>;
  const off = discountPercent(p.price, p.mrp);
  const gross = round2((p.price || 0) * (1 + (p.gstRate || 0) / 100));
  const storeUrl = import.meta.env.VITE_STORE_URL || 'https://jae-parts-dev.web.app';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="topbar-admin" style={{ position: 'sticky', top: 0, zIndex: 5 }}>
        <Link to="/products" className="btn btn-ghost btn-sm" aria-label="Back to products">←</Link>
        <div className="grow"><div className="muted" style={{ fontSize: 12 }}>Products / {isNew ? 'New' : 'Edit'}</div><div style={{ font: '700 18px var(--font-display)', color: 'var(--navy-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || 'New product'}</div></div>
        {msg && <span style={{ fontSize: 13, color: msg === 'Saved.' ? 'var(--green-700)' : 'var(--red-800)', fontWeight: 600 }}>{msg}</span>}
        {!isNew && p.status === 'published' && <a className="btn btn-ghost btn-sm" href={`${storeUrl}/product/${p.slug}/`} target="_blank" rel="noreferrer">View ↗</a>}
        <button type="button" className="btn btn-navy btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <div className="page row wrap" style={{ alignItems: 'flex-start', flexDirection: 'row' }}>
        <div className="stack" style={{ flex: '999 1 520px', minWidth: 0, gap: 16 }}>
          <section className="panel">
            <h2>Basic information</h2>
            <label className="field">Product name<input className="input" value={p.name} onChange={(e) => { set('name', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} /></label>
            <label className="field">URL
              <div className="row" style={{ border: '1px solid var(--line-2)', borderRadius: 9, overflow: 'hidden' }}>
                <span className="mono muted" style={{ background: 'var(--bg)', padding: '0 10px', alignSelf: 'stretch', display: 'flex', alignItems: 'center', fontSize: 12, borderRight: '1px solid var(--line)' }}>/product/</span>
                <input className="input mono" style={{ border: 0, borderRadius: 0 }} value={p.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
              </div>
            </label>
            <div className="field">Description<RichText value={p.description} onChange={(v) => set('description', v)} /></div>
          </section>

          <section className="panel">
            <h2>Photos <span className="muted" style={{ font: '500 12px var(--font-body)' }}>First photo is the cover</span></h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {p.images.map((img, i) => (
                <div key={img.url} className="stack" style={{ gap: 4 }}>
                  <div style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: i === 0 ? '2px solid var(--navy-900)' : '1px solid var(--line)' }}><img src={img.url} alt="" className="img-cover" /></div>
                  <div className="row" style={{ gap: 4, justifyContent: 'center' }}>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} aria-label="Move left" onClick={() => moveImage(i, -1)}>←</button>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} aria-label="Move right" onClick={() => moveImage(i, 1)}>→</button>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 8px', color: 'var(--red-800)' }} aria-label="Remove photo" onClick={() => removeImage(i)}>✕</button>
                  </div>
                </div>
              ))}
              <label style={{ aspectRatio: '1', borderRadius: 10, border: '1.5px dashed #9AA3B2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--navy-900)', fontSize: 12, fontWeight: 600, textAlign: 'center', padding: 8, cursor: 'pointer' }}>
                {uploading ? <span className="spinner" /> : '+ Upload photos'}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files?.length && upload([...e.target.files])} />
              </label>
            </div>
          </section>

          <section className="panel">
            <h2>Specifications <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('specs', [...p.specs, { k: '', v: '' }])}>+ Add row</button></h2>
            {p.specs.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 200px) 1fr 44px', gap: 8 }}>
                <input className="input" aria-label="Spec name" value={s.k} style={{ background: 'var(--bg)', fontWeight: 600 }} onChange={(e) => set('specs', p.specs.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} />
                <input className="input" aria-label="Spec value" value={s.v} onChange={(e) => set('specs', p.specs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} />
                <button type="button" className="btn btn-ghost" aria-label="Remove row" style={{ padding: 0 }} onClick={() => set('specs', p.specs.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </section>

          <section className="panel">
            <h2>Compatible printers</h2>
            <TagInput values={p.compatibleModels} onChange={(v) => set('compatibleModels', v)} placeholder="Type a printer model and press Enter" />
            <div className="muted" style={{ fontSize: 12 }}>Powers the model finder, search and “Printer model” filter on the store.</div>
          </section>

          <section className="panel">
            <h2>Search engine listing</h2>
            <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 14, background: '#FAFBFC' }}>
              <div style={{ fontSize: 12, color: 'var(--green-700)' }}>jaepart.com › product › {p.slug || slugify(p.name)}</div>
              <div style={{ fontSize: 18, color: '#1A0DAB', margin: '4px 0' }}>{p.seo.title || p.name || 'Product title'}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{p.seo.description || `${p.name} at ${inr(p.price)} + GST. PAN India delivery, COD available.`}</div>
            </div>
            <label className="field">Meta title <span style={{ fontWeight: 500, color: (p.seo.title || '').length > 60 ? 'var(--red-800)' : 'var(--green-700)' }}>{(p.seo.title || '').length} / 60</span>
              <input className="input" value={p.seo.title} onChange={(e) => set('seo', { ...p.seo, title: e.target.value })} /></label>
            <label className="field">Meta description <span style={{ fontWeight: 500, color: (p.seo.description || '').length > 160 ? 'var(--red-800)' : 'var(--green-700)' }}>{(p.seo.description || '').length} / 160</span>
              <textarea className="textarea" style={{ minHeight: 72 }} value={p.seo.description} onChange={(e) => set('seo', { ...p.seo, description: e.target.value })} /></label>
          </section>
        </div>

        <aside className="stack" style={{ flex: '1 1 300px', maxWidth: 380, gap: 16 }}>
          <section className="panel">
            <h2>Status</h2>
            <select className="select" value={p.status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
              <option value="published">Published</option><option value="draft">Draft</option><option value="hidden">Hidden</option>
            </select>
            <ToggleRow label="Featured on home page" checked={p.featured} onChange={(v) => set('featured', v)} />
            <label className="field">Badge (optional)<input className="input" value={p.badge} onChange={(e) => set('badge', e.target.value)} placeholder="Bestseller, Hot, Refurb…" /></label>
          </section>
          <section className="panel">
            <h2>Pricing</h2>
            <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="field">MRP (₹)<input className="input mono" type="number" min="0" step="0.01" value={p.mrp ?? ''} onChange={num('mrp')} /></label>
              <label className="field">Selling price (₹)<input className="input mono" type="number" min="0" step="0.01" value={p.price ?? ''} onChange={num('price')} /></label>
            </div>
            <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="field">GST rate<select className="select" value={p.gstRate} onChange={(e) => set('gstRate', Number(e.target.value))}>{GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}</select></label>
              <label className="field">HSN code<input className="input mono" value={p.hsn} onChange={(e) => set('hsn', e.target.value)} /></label>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--bg)', borderRadius: 8, padding: 10 }}>Customer pays {inr(gross, { decimals: true })} incl. GST{off ? ` · shows −${off}% badge` : ''}</div>
          </section>
          <section className="panel">
            <h2>Inventory</h2>
            <label className="field">SKU<input className="input mono" value={p.sku} onChange={(e) => set('sku', e.target.value)} /></label>
            <label className="field">OEM part number<input className="input mono" value={p.partNo} onChange={(e) => set('partNo', e.target.value)} /></label>
            <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="field">Stock qty<input className="input mono" type="number" min="0" placeholder="Not tracked" value={p.stock ?? ''} onChange={num('stock')} /></label>
              <label className="field">Low-stock alert<input className="input mono" type="number" min="0" value={p.lowStockAt ?? ''} onChange={num('lowStockAt')} /></label>
            </div>
            {p.stock === null && <ToggleRow label="In stock" sub="Used when stock qty is not tracked" checked={p.inStock !== false} onChange={(v) => set('inStock', v)} />}
          </section>
          <section className="panel">
            <h2>Organisation</h2>
            <div className="field">Categories
              <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 9, padding: '4px 10px' }}>
                {cats.data.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name)).flatMap((c) => [c, ...cats.data.filter((x) => x.parentId === c.id)]).map((c) => (
                  <label key={c.id} className="checkbox" style={{ paddingLeft: c.parentId ? 20 : 0, fontWeight: 500 }}>
                    <input type="checkbox" checked={p.categoryIds.includes(c.id)} onChange={() => set('categoryIds', p.categoryIds.includes(c.id) ? p.categoryIds.filter((x) => x !== c.id) : [...p.categoryIds, c.id])} />{c.name}
                  </label>
                ))}
              </div>
            </div>
            <label className="field">Main category (breadcrumb & related)
              <select className="select" value={p.primaryCategoryId} onChange={(e) => set('primaryCategoryId', e.target.value)}>
                <option value="">Auto</option>
                {p.categoryIds.map((cid) => <option key={cid} value={cid}>{cats.data.find((c) => c.id === cid)?.name || cid}</option>)}
              </select>
            </label>
            <label className="field">Brand
              <input className="input" list="brand-list" value={p.brand} onChange={(e) => set('brand', e.target.value)} />
              <datalist id="brand-list">{brands.data.map((b) => <option key={b.id} value={b.name} />)}</datalist>
            </label>
            <label className="field">Condition<select className="select" value={p.condition} onChange={(e) => set('condition', e.target.value)}><option value="new">New</option><option value="refurbished">Refurbished</option></select></label>
          </section>
          <section className="panel">
            <h2>Shipping</h2>
            <label className="field">Weight (g)<input className="input mono" type="number" min="0" value={p.weightGrams ?? ''} onChange={num('weightGrams')} /></label>
            <ToggleRow label="Cash on delivery allowed" checked={p.codAllowed !== false} onChange={(v) => set('codAllowed', v)} />
          </section>
          {!isNew && <button type="button" className="btn btn-ghost" style={{ color: 'var(--red-800)' }} onClick={remove}>Delete product</button>}
        </aside>
      </div>
    </div>
  );
}
