import { useMemo, useState } from 'react';
import { orderBy, limit } from 'firebase/firestore';
import { inr, formatDate } from '@jae/shared/format.js';
import { useLiveCollection } from '../lib/data.js';
import { Empty } from '../components/ui.jsx';

export default function Customers() {
  const { data, loading } = useLiveCollection('users', [orderBy('lastOrderAt', 'desc'), limit(500)]);
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const w = q.toLowerCase();
    return data.filter((u) => !w || `${u.name} ${u.phone} ${u.email} ${u.gst?.gstin || ''} ${u.address?.company || ''}`.toLowerCase().includes(w));
  }, [data, q]);

  function exportCsv() {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['name,phone,email,company,gstin,city,orders,totalSpent', ...rows.map((u) => [u.name, u.phone, u.email, u.address?.company, u.gst?.gstin, u.address?.city, u.orderCount, u.totalSpent].map(esc).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'jae-customers.csv';
    a.click();
  }

  return (
    <div className="page">
      <div className="page-title">
        <div><h1>Customers</h1><div className="muted" style={{ fontSize: 13 }}>Everyone who has placed an order (by last order date)</div></div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>Export CSV</button>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-soft)' }}><input className="input" style={{ height: 40, maxWidth: 420 }} aria-label="Search customers" placeholder="Name, phone, email, GSTIN" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="table-wrap"><table className="table" style={{ minWidth: 760 }}>
          <thead><tr><th>Customer</th><th>Phone</th><th>GSTIN</th><th style={{ textAlign: 'right' }}>Orders</th><th style={{ textAlign: 'right' }}>Total spent</th><th>Last order</th><th>Type</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td><b style={{ fontWeight: 600 }}>{u.address?.company || u.name || '—'}</b><div className="muted" style={{ fontSize: 12 }}>{u.address?.company ? u.name : ''} {u.address?.city}</div></td>
                <td>{u.phone}</td>
                <td className="mono muted">{u.gst?.gstin || '—'}</td>
                <td style={{ textAlign: 'right' }}>{u.orderCount || 0}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(u.totalSpent || 0)}</td>
                <td className="muted">{formatDate(u.lastOrderAt)}</td>
                <td><span className={`status ${u.gst?.gstin ? 'tone-blue' : 'tone-muted'}`}>{u.gst?.gstin ? 'Business' : 'Individual'}</span></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {!loading && rows.length === 0 && <Empty>No customers yet.</Empty>}
      </div>
    </div>
  );
}
