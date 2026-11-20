import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, where, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import Icon from '@jae/shared/Icon.jsx';
import { inr, formatDate } from '@jae/shared/format.js';
import { ORDER_STATUS } from '@jae/shared/constants.js';
import { db, functions } from '../firebase.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useSeo } from '../lib/useAsync.js';
import PhoneOtp from '../components/PhoneOtp.jsx';

const trackOrderFn = httpsCallable(functions, 'trackOrder');
const STEPS = ['new', 'processing', 'shipped', 'delivered'];

function Timeline({ status, tracking }) {
  const idx = STEPS.indexOf(status === 'pending_payment' ? 'new' : status);
  const labels = { new: 'Order placed', processing: 'Packed', shipped: 'Shipped', delivered: 'Delivered' };
  if (status === 'cancelled') return <span className="status tone-muted">Cancelled</span>;
  return (
    <div className="stack">
      {STEPS.map((s, i) => (
        <div key={s} className="row" style={{ gap: 14, alignItems: 'stretch' }}>
          <div className="stack" style={{ alignItems: 'center' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', marginTop: 3, background: i < idx ? 'var(--navy-900)' : i === idx ? 'var(--red-600)' : 'var(--line-2)' }} />
            {i < STEPS.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 24, background: 'var(--line)' }} />}
          </div>
          <div style={{ paddingBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: i <= idx ? 'var(--ink)' : 'var(--muted-2)' }}>{labels[s]}</div>
            {s === 'shipped' && tracking?.number && i <= idx && <div className="muted" style={{ fontSize: 12 }}>{tracking.courier} · {tracking.number}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrackOrder() {
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const { data } = await trackOrderFn({ number: number.trim().toUpperCase(), phone: phone.replace(/\D/g, '').slice(-10) });
      setResult(data);
    } catch {
      setResult({ error: 'No order found with that ID and mobile number.' });
    } finally { setBusy(false); }
  }
  return (
    <form className="card card-pad stack" style={{ gap: 16 }} onSubmit={submit}>
      <span style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--red-50)', color: 'var(--red-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="truck" size={24} /></span>
      <div><h2 style={{ fontSize: 24 }}>Track your order</h2><p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>Enter the order ID from your confirmation SMS or email.</p></div>
      <label className="field">Order ID<input className="input mono" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="JAE-10482" /></label>
      <label className="field">Mobile number used for the order<input className="input" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98xxx xxxxx" /></label>
      <button type="submit" className="btn btn-navy" disabled={busy || !number || phone.replace(/\D/g, '').length < 10}>{busy ? 'Checking…' : 'Track'}</button>
      {result?.error && <div className="field-error">{result.error}</div>}
      {result?.status && <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 16 }}><Timeline status={result.status} tracking={result.tracking} /></div>}
    </form>
  );
}

function Orders({ user }) {
  const [orders, setOrders] = useState(null);
  const [openId, setOpenId] = useState(null);
  useEffect(() => {
    getDocs(query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc')))
      .then((s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch((e) => { console.error(e); setOrders([]); });
  }, [user.uid]);

  if (!orders) return <div className="skeleton" style={{ height: 200 }} />;
  if (!orders.length) return <div className="empty">No orders yet. <Link to="/shop/">Start shopping</Link></div>;
  return (
    <div className="table-wrap">
      <table className="table" style={{ minWidth: 640 }}>
        <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Payment</th><th style={{ textAlign: 'right' }}>Total</th><th /></tr></thead>
        <tbody>
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status] || ORDER_STATUS.new;
            return [
              <tr key={o.id}>
                <td className="mono">{o.number}</td>
                <td className="muted">{formatDate(o.createdAt)}</td>
                <td><span className={`status tone-${st.tone}`}>{st.label}</span></td>
                <td className="muted">{o.payment?.method === 'cod' ? 'COD' : 'Online'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(o.totals?.total, { decimals: true })}</td>
                <td style={{ textAlign: 'right' }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenId(openId === o.id ? null : o.id)}>{openId === o.id ? 'Hide' : 'View'}</button></td>
              </tr>,
              openId === o.id && (
                <tr key={`${o.id}-d`}><td colSpan={6} style={{ background: 'var(--bg)' }}>
                  <div className="row wrap" style={{ gap: 32, alignItems: 'flex-start', padding: 8 }}>
                    <div className="stack grow" style={{ gap: 6 }}>
                      {o.items.map((i) => <div key={i.productId} className="row" style={{ justifyContent: 'space-between', gap: 12 }}><span>{i.name} × {i.qty}</span><b>{inr(i.price * i.qty)}</b></div>)}
                      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Ship to {o.address?.city} {o.address?.pin}{o.gst?.gstin ? ` · GSTIN ${o.gst.gstin}` : ''}</div>
                    </div>
                    <Timeline status={o.status} tracking={o.tracking} />
                  </div>
                </td></tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function Profile({ user }) {
  const [p, setP] = useState({ name: '', email: '' });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    getDoc(doc(db, 'users', user.uid)).then((s) => s.exists() && setP((cur) => ({ ...cur, name: s.data().name || '', email: s.data().email || '' }))).catch(() => {});
  }, [user.uid]);
  async function save(e) {
    e.preventDefault();
    await setDoc(doc(db, 'users', user.uid), { name: p.name.trim(), email: p.email.trim(), phone: user.phoneNumber, updatedAt: serverTimestamp() }, { merge: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  return (
    <form className="stack" style={{ gap: 14, maxWidth: 520 }} onSubmit={save}>
      <label className="field">Full name<input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
      <label className="field">Email<input className="input" type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></label>
      <label className="field">Mobile<input className="input" value={user.phoneNumber || ''} disabled /></label>
      <button type="submit" className="btn btn-navy" style={{ alignSelf: 'flex-start' }}>{saved ? 'Saved' : 'Save details'}</button>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>Your delivery address and GSTIN are saved automatically from your last order.</p>
    </form>
  );
}

export default function Account() {
  const { user, ready, logout } = useAuth();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const placed = params.get('placed');
  const [tab, setTab] = useState('orders');
  useSeo(pathname.startsWith('/track') ? 'Track order' : 'My account');

  if (!ready) return <div className="container" style={{ paddingTop: 40 }}><div className="skeleton" style={{ height: 300 }} /></div>;

  return (
    <div className="container stack" style={{ gap: 28, paddingTop: 36 }}>
      {placed && (
        <div className="card row wrap" style={{ gap: 14, padding: '18px 22px', borderColor: '#BFE8CF', background: 'var(--green-50)' }}>
          <Icon name="check" size={24} style={{ color: 'var(--green-700)' }} strokeWidth={2.4} />
          <div className="grow"><b>Thank you! Order {placed} is confirmed.</b><div style={{ fontSize: 14, color: 'var(--ink-2)' }}>We'll send dispatch updates by SMS and email.</div></div>
        </div>
      )}

      {!user ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 24, alignItems: 'start' }}>
          <div className="card card-pad stack" style={{ gap: 16 }}>
            <div><h1 style={{ fontSize: 28 }}>Log in or create an account</h1><p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>Track orders, download GST invoices and check out faster. Your mobile number is your account.</p></div>
            <PhoneOtp cta="Verify & continue" />
          </div>
          <TrackOrder />
        </div>
      ) : (
        <div className="row wrap" style={{ gap: 24, alignItems: 'flex-start' }}>
          <nav aria-label="My account" className="card stack" style={{ flex: '1 1 220px', maxWidth: 260, padding: 12, gap: 2 }}>
            <div style={{ padding: '12px 14px 14px', borderBottom: '1px solid var(--line-soft)', marginBottom: 6 }}><b>My account</b><div className="muted" style={{ fontSize: 12 }}>{user.phoneNumber}</div></div>
            {[['orders', 'Orders'], ['profile', 'Account details'], ['track', 'Track an order']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className="btn" style={{ justifyContent: 'flex-start', background: tab === k ? 'var(--surface-2)' : 'transparent', color: tab === k ? 'var(--navy-900)' : 'var(--ink-2)' }}>{l}</button>
            ))}
            <button type="button" onClick={logout} className="btn" style={{ justifyContent: 'flex-start', color: 'var(--red-700)', background: 'transparent' }}><Icon name="logout" size={18} />Log out</button>
          </nav>
          <div className="card card-pad grow" style={{ flex: '999 1 560px' }}>
            {tab === 'orders' && <><h2 style={{ fontSize: 24, marginBottom: 16 }}>Your orders</h2><Orders user={user} /></>}
            {tab === 'profile' && <><h2 style={{ fontSize: 24, marginBottom: 16 }}>Account details</h2><Profile user={user} /></>}
            {tab === 'track' && <TrackOrder />}
          </div>
        </div>
      )}
    </div>
  );
}
