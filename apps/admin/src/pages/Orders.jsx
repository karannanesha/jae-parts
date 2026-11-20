import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, orderBy, limit, updateDoc, serverTimestamp } from 'firebase/firestore';
import { inr, formatDateTime } from '@jae/shared/format.js';
import { ORDER_STATUS } from '@jae/shared/constants.js';
import { db } from '../firebase.js';
import { useLiveCollection } from '../lib/data.js';
import { printOrderDoc } from '../lib/invoice.js';
import { OrderStatus, Thumb, Empty } from '../components/ui.jsx';

const TABS = ['all', 'new', 'processing', 'shipped', 'delivered', 'claim', 'pending_payment', 'cancelled'];

function OrderPanel({ order, settings }) {
  const [status, setStatus] = useState(order.status);
  const [courier, setCourier] = useState(order.tracking?.courier || '');
  const [number, setNumber] = useState(order.tracking?.number || '');
  const [note, setNote] = useState(order.adminNote || '');
  const [saved, setSaved] = useState('');
  useEffect(() => { setStatus(order.status); setCourier(order.tracking?.courier || ''); setNumber(order.tracking?.number || ''); setNote(order.adminNote || ''); setSaved(''); }, [order.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    await updateDoc(doc(db, 'orders', order.id), {
      status,
      tracking: { courier: courier.trim(), number: number.trim() },
      adminNote: note,
      [`timeline.${status}`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setSaved('Saved');
  }

  const t = order.totals || {};
  return (
    <aside className="panel" style={{ flex: '1 1 340px', maxWidth: 420, position: 'sticky', top: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><div className="mono muted" style={{ fontSize: 12 }}>{order.number}</div><div style={{ font: '700 20px var(--font-display)', color: 'var(--navy-900)' }}>{order.address?.company || order.customer?.name}</div></div>
        <OrderStatus status={order.status} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
        <div><div className="muted" style={{ fontSize: 12 }}>Phone</div><a href={`tel:${order.customer?.phone}`}>{order.customer?.phone}</a></div>
        <div><div className="muted" style={{ fontSize: 12 }}>Payment</div>{order.payment?.method === 'cod' ? 'COD' : 'Razorpay'} · {order.payment?.status}</div>
        <div><div className="muted" style={{ fontSize: 12 }}>GSTIN</div><span className="mono">{order.gst?.gstin || '—'}</span></div>
        <div><div className="muted" style={{ fontSize: 12 }}>Ship to</div>{order.address?.city} {order.address?.pin}</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{order.address?.line1}{order.address?.line2 ? `, ${order.address.line2}` : ''}, {order.address?.state}</div>
      {order.notes && <div style={{ fontSize: 13, background: 'var(--amber-50)', borderRadius: 8, padding: 10 }}><b>Customer note:</b> {order.notes}</div>}
      <div className="stack" style={{ gap: 10, borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
        {order.items.map((i) => (
          <div key={i.productId} className="row" style={{ gap: 10, fontSize: 13 }}><Thumb url={i.image} /><div className="grow">{i.name}<div className="muted" style={{ fontSize: 12 }}>{i.partNo} × {i.qty}</div></div><b>{inr(i.price * i.qty)}</b></div>
        ))}
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}><span>GST</span><span>{inr(t.gst, { decimals: true })}</span></div>
        {t.discount > 0 && <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}><span>Coupon {order.coupon}</span><span>−{inr(t.discount, { decimals: true })}</span></div>}
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}><span>Shipping</span><span>{inr(t.shipping || 0)}</span></div>
        <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}><span>Total</span><span>{inr(t.total, { decimals: true })}</span></div>
      </div>
      <label className="field">Update status
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
      </label>
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="field">Courier<input className="input" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="DTDC" /></label>
        <label className="field">Tracking no.<input className="input mono" value={number} onChange={(e) => setNumber(e.target.value)} /></label>
      </div>
      <label className="field">Internal note<textarea className="textarea" style={{ minHeight: 64 }} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => printOrderDoc(order, settings, 'invoice')}>GST invoice</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => printOrderDoc(order, settings, 'slip')}>Packing slip</button>
      </div>
      <button type="button" className="btn btn-navy" onClick={save}>{saved || 'Save changes'}</button>
    </aside>
  );
}

export default function Orders() {
  const { data, loading } = useLiveCollection('orders', [orderBy('createdAt', 'desc'), limit(500)]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [pay, setPay] = useState('');
  const [openId, setOpenId] = useState(null);
  const [settings, setSettings] = useState(null);
  useEffect(() => { getDoc(doc(db, 'settings', 'store')).then((s) => setSettings(s.data() || {})); }, []);

  const rows = useMemo(() => {
    const w = q.toLowerCase();
    return data
      .filter((o) => tab === 'all' ? o.status !== 'pending_payment' : o.status === tab)
      .filter((o) => !pay || o.payment?.method === pay)
      .filter((o) => !w || `${o.number} ${o.customer?.name} ${o.customer?.phone} ${o.gst?.gstin || ''} ${o.address?.company || ''}`.toLowerCase().includes(w));
  }, [data, tab, q, pay]);
  const open = data.find((o) => o.id === openId);

  return (
    <div className="page">
      <div className="page-title"><div><h1>Orders</h1><div className="muted" style={{ fontSize: 13 }}>Live from Firestore · latest 500</div></div></div>
      <div className="row wrap" style={{ gap: 18, alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: '999 1 520px', minWidth: 0, overflow: 'hidden' }}>
          <div className="tabs-admin" role="tablist">
            {TABS.map((k) => {
              const n = k === 'all' ? data.filter((o) => o.status !== 'pending_payment').length : data.filter((o) => o.status === k).length;
              return <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{k === 'all' ? 'All' : ORDER_STATUS[k].label} {n > 0 && <span className="n">{n}</span>}</button>;
            })}
          </div>
          <div className="row wrap" style={{ gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--line-soft)' }}>
            <input className="input" style={{ flex: '1 1 220px', height: 40 }} aria-label="Search orders" placeholder="Order ID, name, phone, GSTIN" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="select" style={{ width: 'auto', height: 40 }} aria-label="Payment method" value={pay} onChange={(e) => setPay(e.target.value)}><option value="">All payments</option><option value="razorpay">Razorpay</option><option value="cod">COD</option></select>
          </div>
          <div className="table-wrap"><table className="table" style={{ minWidth: 720 }}>
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className={`clickable${o.id === openId ? ' selected' : ''}`} onClick={() => setOpenId(o.id)}>
                  <td className="mono">{o.number}</td>
                  <td className="muted">{formatDateTime(o.createdAt)}</td>
                  <td><b style={{ fontWeight: 600 }}>{o.address?.company || o.customer?.name}</b><div className="muted" style={{ fontSize: 12 }}>{o.address?.city}</div></td>
                  <td><span className={`status ${o.payment?.method === 'cod' ? 'tone-amber' : 'tone-blue'}`}>{o.payment?.method === 'cod' ? 'COD' : 'Online'}</span></td>
                  <td><OrderStatus status={o.status} /></td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(o.totals?.total)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {!loading && rows.length === 0 && <Empty>No orders here yet.</Empty>}
        </div>
        {open ? <OrderPanel order={open} settings={settings} /> : <aside className="panel muted" style={{ flex: '1 1 340px', maxWidth: 420 }}>Select an order to see details, update status and print the invoice.</aside>}
      </div>
    </div>
  );
}
