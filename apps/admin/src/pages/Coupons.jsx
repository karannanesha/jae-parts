import { useState } from 'react';
import { doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { inr } from '@jae/shared/format.js';
import { db } from '../firebase.js';
import { useLiveCollection } from '../lib/data.js';
import { Switch, Empty } from '../components/ui.jsx';

const BLANK = { code: '', type: 'percent', value: 5, minCart: 0, maxUses: 0, firstOrderOnly: false, expiresAt: '' };

export default function Coupons() {
  const { data, loading } = useLiveCollection('coupons');
  const [f, setF] = useState(BLANK);
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF((c) => ({ ...c, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function create(e) {
    e.preventDefault();
    const code = f.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) { setMsg('Enter a code'); return; }
    if (data.some((c) => c.id === code)) { setMsg('That code already exists'); return; }
    await setDoc(doc(db, 'coupons', code), {
      code, type: f.type, value: Number(f.value) || 0, minCart: Number(f.minCart) || 0, maxUses: Number(f.maxUses) || 0,
      firstOrderOnly: !!f.firstOrderOnly, expiresAt: f.expiresAt || null, active: true, used: 0, createdAt: serverTimestamp(),
    });
    setF(BLANK); setMsg('Coupon created');
  }

  return (
    <div className="page">
      <div className="page-title"><div><h1>Coupons</h1><div className="muted" style={{ fontSize: 13 }}>Checked by the createOrder Cloud Function at checkout</div></div></div>
      <div className="row wrap" style={{ gap: 18, alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: '999 1 520px', minWidth: 0, overflow: 'hidden' }}>
          <div className="table-wrap"><table className="table" style={{ minWidth: 620 }}>
            <thead><tr><th>Code</th><th>Discount</th><th>Rules</th><th style={{ textAlign: 'right' }}>Used</th><th>Active</th><th /></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ fontWeight: 600 }}>{c.code}</td>
                  <td>{c.type === 'percent' ? `${c.value}%` : inr(c.value)} off</td>
                  <td className="muted" style={{ fontSize: 12 }}>{[c.minCart ? `Cart over ${inr(c.minCart)}` : '', c.firstOrderOnly ? 'First order only' : '', c.maxUses ? `Max ${c.maxUses} uses` : '', c.expiresAt ? `Until ${c.expiresAt}` : ''].filter(Boolean).join(' · ') || 'No limits'}</td>
                  <td style={{ textAlign: 'right' }}>{c.used || 0}</td>
                  <td><Switch checked={c.active} label={`${c.code} active`} onChange={(v) => updateDoc(doc(db, 'coupons', c.id), { active: v })} /></td>
                  <td style={{ textAlign: 'right' }}><button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--red-800)' }} onClick={() => window.confirm(`Delete coupon ${c.code}?`) && deleteDoc(doc(db, 'coupons', c.id))}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {!loading && data.length === 0 && <Empty>No coupons yet.</Empty>}
        </div>
        <form className="panel" style={{ flex: '1 1 320px', maxWidth: 400 }} onSubmit={create}>
          <h2>Create coupon</h2>
          <label className="field">Code<input className="input mono" value={f.code} onChange={set('code')} placeholder="WELCOME5" style={{ textTransform: 'uppercase' }} /></label>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label className="field">Type<select className="select" value={f.type} onChange={set('type')}><option value="percent">Percent</option><option value="flat">Flat ₹</option></select></label>
            <label className="field">Value<input className="input mono" type="number" min="0" value={f.value} onChange={set('value')} /></label>
          </div>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label className="field">Min cart (₹)<input className="input mono" type="number" min="0" value={f.minCart} onChange={set('minCart')} /></label>
            <label className="field">Max uses (0 = ∞)<input className="input mono" type="number" min="0" value={f.maxUses} onChange={set('maxUses')} /></label>
          </div>
          <label className="field">Expires on<input className="input" type="date" value={f.expiresAt} onChange={set('expiresAt')} /></label>
          <label className="checkbox"><input type="checkbox" checked={f.firstOrderOnly} onChange={set('firstOrderOnly')} />First order only</label>
          {msg && <div style={{ fontSize: 13, fontWeight: 600 }}>{msg}</div>}
          <button type="submit" className="btn btn-navy">Create coupon</button>
        </form>
      </div>
    </div>
  );
}
