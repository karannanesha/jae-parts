import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { orderBy, where, Timestamp } from 'firebase/firestore';
import { inr } from '@jae/shared/format.js';
import { useLiveCollection } from '../lib/data.js';
import { OrderStatus } from '../components/ui.jsx';
import { useAdmin } from '../lib/auth.jsx';

const DAY = 86400000;

export default function Dashboard() {
  const { user } = useAdmin();
  const since = useMemo(() => Timestamp.fromMillis(Date.now() - 30 * DAY), []);
  const orders = useLiveCollection('orders', [where('createdAt', '>=', since), orderBy('createdAt', 'desc')]);
  const products = useLiveCollection('products');
  const categories = useLiveCollection('categories');
  const leads = useLiveCollection('enquiries', [where('status', '==', 'new')]);

  const stats = useMemo(() => {
    const paid = orders.data.filter((o) => !['cancelled', 'pending_payment'].includes(o.status));
    const revenue = paid.reduce((s, o) => s + (o.totals?.total || 0), 0);
    const days = Array.from({ length: 14 }, (_, i) => {
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (13 - i));
      const end = start.getTime() + DAY;
      const total = paid.filter((o) => { const t = o.createdAt?.toMillis?.() || 0; return t >= start.getTime() && t < end; }).reduce((s, o) => s + (o.totals?.total || 0), 0);
      return { label: start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), total };
    });
    const max = Math.max(1, ...days.map((d) => d.total));
    const p = products.data;
    return {
      revenue,
      orderCount: paid.length,
      awaiting: orders.data.filter((o) => o.status === 'new').length,
      products: p.length,
      inStock: p.filter((x) => x.inStock !== false).length,
      days: days.map((d) => ({ ...d, h: `${Math.max(2, (d.total / max) * 100)}%` })),
      alerts: [
        ['Products priced at ₹0', p.filter((x) => !x.price).length, 'red'],
        ['Products out of stock', p.filter((x) => x.inStock === false).length, 'amber'],
        ['Products without a SKU', p.filter((x) => !x.sku).length, 'muted'],
        ['Products with one photo or none', p.filter((x) => (x.images?.length || 0) <= 1).length, 'muted'],
        ['Drafts / hidden', p.filter((x) => x.status !== 'published').length, 'muted'],
      ],
    };
  }, [orders.data, products.data]);

  const topCats = [...categories.data].filter((c) => !c.parentId).sort((a, b) => (b.productCount || 0) - (a.productCount || 0)).slice(0, 6);
  const maxCat = Math.max(1, ...topCats.map((c) => c.productCount || 0));
  const hour = new Date().getHours();

  return (
    <div className="page">
      <div className="page-title">
        <div><h1>Good {hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}</h1><div className="muted" style={{ fontSize: 14 }}>{user.email} · last 30 days</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {[
          ['Revenue (30 days)', inr(stats.revenue), 'Excludes cancelled & unpaid'],
          ['Orders (30 days)', stats.orderCount, `${stats.awaiting} awaiting dispatch`],
          ['Products', stats.products, `${categories.data.length} categories`],
          ['In stock', stats.inStock, `${stats.products - stats.inStock} out of stock`],
          ['Open enquiries', leads.data.length, 'Bulk & part requests'],
        ].map(([label, value, sub]) => (
          <div key={label} className="panel" style={{ gap: 6 }}><span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</span><span className="kpi">{value}</span><span className="muted" style={{ fontSize: 12 }}>{sub}</span></div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 14 }}>
        <div className="panel">
          <h2>Sales — last 14 days</h2>
          <div className="row" style={{ alignItems: 'flex-end', gap: 8, height: 200, borderBottom: '1px solid var(--line)' }}>
            {stats.days.map((d, i) => (
              <div key={d.label} title={`${d.label}: ${inr(d.total)}`} style={{ flex: 1, height: d.h, borderRadius: '5px 5px 0 0', background: i === 13 ? 'var(--red-600)' : 'var(--navy-900)' }} />
            ))}
          </div>
          <div className="row mono muted" style={{ justifyContent: 'space-between', fontSize: 11 }}><span>{stats.days[0].label}</span><span>Today</span></div>
        </div>
        <div className="panel">
          <h2>Needs attention</h2>
          {stats.alerts.map(([label, n, tone]) => (
            <Link key={label} to="/products" className={`row tone-${n ? tone : 'muted'}`} style={{ gap: 12, padding: '10px 12px', borderRadius: 10 }}>
              <b style={{ font: '700 18px var(--font-display)', minWidth: 44 }}>{n}</b><span className="grow" style={{ color: 'var(--ink)' }}>{label}</span><span style={{ fontSize: 13, fontWeight: 600 }}>Review →</span>
            </Link>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 14 }}>
        <div className="panel">
          <h2>Recent orders <Link to="/orders" style={{ font: '600 13px var(--font-body)' }}>View all</Link></h2>
          <div className="table-wrap"><table className="table" style={{ minWidth: 480 }}>
            <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Pay</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {orders.data.slice(0, 6).map((o) => (
                <tr key={o.id}><td className="mono">{o.number}</td><td>{o.customer?.name}</td><td><OrderStatus status={o.status} /></td><td className="muted">{o.payment?.method === 'cod' ? 'COD' : 'Online'}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(o.totals?.total)}</td></tr>
              ))}
              {!orders.loading && orders.data.length === 0 && <tr><td colSpan={5} className="muted">No orders in the last 30 days.</td></tr>}
            </tbody>
          </table></div>
        </div>
        <div className="panel">
          <h2>Catalogue by category <span className="mono muted" style={{ fontSize: 11 }}>{stats.products} PRODUCTS</span></h2>
          {topCats.map((c) => (
            <div key={c.id} className="stack" style={{ gap: 5 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>{c.name}</span><b>{c.productCount || 0}</b></div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--line-soft)' }}><div style={{ height: 8, borderRadius: 4, background: 'var(--navy-900)', width: `${((c.productCount || 0) / maxCat) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
