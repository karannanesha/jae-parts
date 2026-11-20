import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_SETTINGS, INDIAN_STATES } from '@jae/shared/constants.js';
import { db } from '../firebase.js';
import { ToggleRow, Switch, TagInput } from '../components/ui.jsx';

const SECTION_LABELS = {
  hero: 'Hero & model finder', trust: 'Trust strip', categories: 'Category tiles', types: 'Printer type cards',
  brands: 'Brand strip', cta: 'Guide + WhatsApp cards',
};

function merge(data) {
  return {
    ...DEFAULT_SETTINGS, ...data,
    contact: { ...DEFAULT_SETTINGS.contact, ...data.contact },
    social: { ...DEFAULT_SETTINGS.social, ...data.social },
    shipping: { ...DEFAULT_SETTINGS.shipping, ...data.shipping },
    payments: { ...DEFAULT_SETTINGS.payments, ...data.payments },
    features: { ...DEFAULT_SETTINGS.features, ...data.features },
    analytics: { ...DEFAULT_SETTINGS.analytics, ...data.analytics },
    business: { gstin: '', state: 'Maharashtra', invoicePrefix: 'JAE-', ...data.business },
    home: { ...DEFAULT_SETTINGS.home, ...data.home },
  };
}

function PincodeImport() {
  const [msg, setMsg] = useState('');
  async function onFile(file) {
    const text = await file.text();
    const rows = text.split(/\r?\n/).map((l) => l.split(',').map((x) => x.trim())).filter((r) => /^[1-9]\d{5}$/.test(r[0]));
    setMsg(`Importing ${rows.length} PIN codes…`);
    for (let i = 0; i < rows.length; i += 450) {
      const batch = writeBatch(db);
      rows.slice(i, i + 450).forEach(([pin, city, state, days, cod]) => batch.set(doc(db, 'pincodes', pin), {
        city: city || '', state: state || '', days: days || '', cod: !/^(no|false|0)$/i.test(cod || 'yes'),
      }));
      await batch.commit();
    }
    setMsg(`Imported ${rows.length} PIN codes.`);
  }
  return (
    <div className="field">Serviceable PIN codes (CSV: pin,city,state,days,cod)
      <label className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>Upload CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>
      {msg && <span style={{ fontWeight: 500 }}>{msg}</span>}
      <span style={{ fontWeight: 500, color: 'var(--muted-2)' }}>PIN codes not in the list still show the general delivery estimate.</span>
    </div>
  );
}

export default function Settings() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { getDoc(doc(db, 'settings', 'store')).then((snap) => setS(merge(snap.exists() ? snap.data() : {}))); }, []);
  if (!s) return <div className="page"><div className="skeleton" style={{ height: 400 }} /></div>;

  const upd = (group, key, value) => setS((cur) => ({ ...cur, [group]: { ...cur[group], [key]: value } }));
  const field = (group, key, label, props = {}) => (
    <label className="field">{label}<input className="input" value={s[group][key] ?? ''} onChange={(e) => upd(group, key, props.type === 'number' ? Number(e.target.value) : e.target.value)} {...props} /></label>
  );
  const sections = s.home.sections;
  const setSections = (list) => setS((cur) => ({ ...cur, home: { ...cur.home, sections: list } }));
  const move = (i, d) => { const l = [...sections]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setSections(l); };

  async function save() {
    await setDoc(doc(db, 'settings', 'store'), { ...s, updatedAt: serverTimestamp() });
    setMsg('Saved — the store picks this up on next page load.');
  }

  return (
    <div className="page">
      <div className="page-title">
        <div><h1>Store settings</h1><div className="muted" style={{ fontSize: 13 }}>Everything the storefront reads from settings/store</div></div>
        <div className="row" style={{ gap: 12 }}>{msg && <span style={{ fontSize: 13, color: 'var(--green-700)', fontWeight: 600 }}>{msg}</span>}<button type="button" className="btn btn-navy btn-sm" onClick={save}>Save all changes</button></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 16, alignItems: 'start' }}>
        <section className="panel">
          <h2>Home page sections</h2>
          <div className="muted" style={{ fontSize: 13, marginTop: -6 }}>Reorder with the arrows, toggle to hide. Product rails show a category's featured products.</div>
          {sections.map((sec, i) => (
            <div key={sec.id} className="stack" style={{ gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} aria-label="Move up" onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} aria-label="Move down" onClick={() => move(i, 1)}>↓</button>
                <span className="grow" style={{ fontSize: 14, fontWeight: 600 }}>{SECTION_LABELS[sec.id] || `Product rail: ${sec.title || sec.categorySlug}`}</span>
                <Switch checked={sec.enabled !== false} label={`Show ${sec.id}`} onChange={(v) => setSections(sections.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} />
              </div>
              {sec.id.startsWith('rail-') && (
                <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {[['eyebrow', 'Eyebrow'], ['title', 'Title'], ['categorySlug', 'Category URL slug']].map(([k, l]) => (
                    <input key={k} className="input" style={{ height: 36, fontSize: 12 }} aria-label={l} placeholder={l} value={sec[k] || ''} onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                  ))}
                </div>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSections([...sections, { id: `rail-${Date.now()}`, enabled: true, title: 'New rail', eyebrow: '', categorySlug: '' }])}>+ Add product rail</button>
          <div className="field">Popular searches (under the hero)<TagInput values={s.home.popularSearches} onChange={(v) => setS((c) => ({ ...c, home: { ...c.home, popularSearches: v } }))} placeholder="Add a search and press Enter" /></div>
          <div className="field">Hero tiles (category URL slugs)<TagInput values={s.home.heroTileSlugs} onChange={(v) => setS((c) => ({ ...c, home: { ...c.home, heroTileSlugs: v.slice(0, 4) } }))} placeholder="e.g. logic-card" /></div>
        </section>

        <section className="panel">
          <h2>Contact &amp; business details</h2>
          <div className="field">Phone numbers<TagInput values={s.contact.phones} onChange={(v) => upd('contact', 'phones', v)} placeholder="+91 93245 68457" /></div>
          <div className="field">Emails<TagInput values={s.contact.emails} onChange={(v) => upd('contact', 'emails', v)} placeholder="info@jaepart.com" /></div>
          {field('contact', 'whatsapp', 'WhatsApp number (digits with country code)', { placeholder: '919324568457' })}
          {field('contact', 'storeAddress', 'Store & dispatch address')}
          {field('contact', 'registeredAddress', 'Registered office address')}
          {field('contact', 'hours', 'Opening hours')}
          <div className="grid-2">
            {field('business', 'gstin', 'Store GSTIN (printed on invoices)')}
            <label className="field">State of registration<select className="select" value={s.business.state} onChange={(e) => upd('business', 'state', e.target.value)}>{INDIAN_STATES.map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>
          {field('business', 'invoicePrefix', 'Order number prefix')}
        </section>

        <section className="panel">
          <h2>Shipping</h2>
          <div className="grid-2">
            {field('shipping', 'flatRate', 'Flat shipping (₹, 0 = free)', { type: 'number', min: 0 })}
            {field('shipping', 'freeAbove', 'Free shipping above (₹, 0 = off)', { type: 'number', min: 0 })}
          </div>
          {field('shipping', 'estimateText', 'Delivery estimate text')}
          <PincodeImport />
        </section>

        <section className="panel">
          <h2>Payments</h2>
          <ToggleRow label="Razorpay (UPI, cards, net banking)" sub="Keys are set as Cloud Functions secrets, not here" checked={s.payments.razorpay} onChange={(v) => upd('payments', 'razorpay', v)} />
          <ToggleRow label="Cash on delivery" checked={s.payments.cod} onChange={(v) => upd('payments', 'cod', v)} />
          {field('payments', 'codMaxOrder', 'COD max order value (₹, 0 = no limit)', { type: 'number', min: 0 })}
        </section>

        <section className="panel">
          <h2>Social links</h2>
          {['facebook', 'instagram', 'youtube', 'linkedin'].map((k) => <div key={k}>{field('social', k, k[0].toUpperCase() + k.slice(1))}</div>)}
        </section>

        <section className="panel">
          <h2>Tracking &amp; compliance</h2>
          <ToggleRow label="Cookie consent banner" sub="Analytics load only after the visitor accepts" checked={s.features.cookieBanner} onChange={(v) => upd('features', 'cookieBanner', v)} />
          <ToggleRow label="Product reviews" sub="Coming soon — verified buyers only" checked={s.features.reviews} onChange={(v) => upd('features', 'reviews', v)} />
          {field('analytics', 'gtmId', 'Google Tag Manager ID', { placeholder: 'GTM-XXXXXXX' })}
        </section>
      </div>
    </div>
  );
}
