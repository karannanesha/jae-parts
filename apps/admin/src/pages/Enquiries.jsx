import { useEffect, useMemo, useState } from 'react';
import { doc, orderBy, limit, updateDoc, serverTimestamp } from 'firebase/firestore';
import { formatDateTime } from '@jae/shared/format.js';
import { ENQUIRY_STATUS } from '@jae/shared/constants.js';
import { db } from '../firebase.js';
import { useLiveCollection } from '../lib/data.js';
import { EnquiryStatus, Empty } from '../components/ui.jsx';

export default function Enquiries() {
  const { data, loading } = useLiveCollection('enquiries', [orderBy('createdAt', 'desc'), limit(300)]);
  const [tab, setTab] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState('');
  const rows = useMemo(() => data.filter((e) => tab === 'all' || e.status === tab), [data, tab]);
  const open = data.find((e) => e.id === openId);
  useEffect(() => { setNote(open?.note || ''); }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch) => updateDoc(doc(db, 'enquiries', open.id), { ...patch, updatedAt: serverTimestamp() });
  const waText = open ? encodeURIComponent(`Hi ${open.name.split(' ')[0]}, thanks for your enquiry with Jay Ambe Enterprises regarding: ${open.message.slice(0, 200)}`) : '';

  return (
    <div className="page">
      <div className="page-title">
        <div><h1>Enquiries</h1><div className="muted" style={{ fontSize: 13 }}>From the contact form and bulk-enquiry pop-up · phone verified by OTP</div></div>
        <div className="row wrap" style={{ gap: 6 }}>
          {['all', ...Object.keys(ENQUIRY_STATUS)].map((k) => (
            <button key={k} type="button" className={`chip${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{k === 'all' ? 'All' : ENQUIRY_STATUS[k].label} <span className="n">{k === 'all' ? data.length : data.filter((e) => e.status === k).length}</span></button>
          ))}
        </div>
      </div>
      <div className="row wrap" style={{ gap: 18, alignItems: 'flex-start' }}>
        <div className="panel" style={{ flex: '1 1 360px', maxWidth: 460, padding: 8, gap: 2 }}>
          {loading && <div className="skeleton" style={{ height: 300 }} />}
          {!loading && rows.length === 0 && <Empty>No enquiries.</Empty>}
          {rows.map((e) => (
            <button key={e.id} type="button" onClick={() => setOpenId(e.id)} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, padding: 14, borderRadius: 10, border: 0, cursor: 'pointer', background: e.id === openId ? '#F5F7FC' : 'transparent', boxShadow: e.id === openId ? 'inset 3px 0 0 var(--red-600)' : 'none' }}>
              <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 14 }}>{e.name}</b><span className="muted" style={{ fontSize: 12 }}>{formatDateTime(e.createdAt)}</span></span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{e.message}</span>
              <span className="row wrap" style={{ gap: 6 }}><EnquiryStatus status={e.status} /><span className="status tone-muted">{e.source === 'bulk' ? 'Bulk enquiry' : 'Contact form'}</span></span>
            </button>
          ))}
        </div>
        {open ? (
          <section className="panel" style={{ flex: '999 1 420px' }}>
            <div className="row wrap" style={{ justifyContent: 'space-between', gap: 12 }}>
              <div><div className="muted" style={{ fontSize: 12 }}>{open.subject} · {formatDateTime(open.createdAt)}</div><div style={{ font: '700 22px var(--font-display)', color: 'var(--navy-900)' }}>{open.name}</div></div>
              <EnquiryStatus status={open.status} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, fontSize: 13 }}>
              <div><div className="muted" style={{ fontSize: 12 }}>Phone</div><a href={`tel:${open.phone}`}>{open.phone}</a> <span style={{ color: 'var(--green-700)', fontWeight: 600 }}>· OTP verified</span></div>
              <div><div className="muted" style={{ fontSize: 12 }}>Email</div>{open.email ? <a href={`mailto:${open.email}`}>{open.email}</a> : '—'}</div>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', background: 'var(--bg)', borderRadius: 10, padding: 14, fontSize: 14, lineHeight: 1.6 }}>{open.message}</div>
            {open.photo?.url && <a href={open.photo.url} target="_blank" rel="noreferrer"><img src={open.photo.url} alt="Attached by customer" style={{ maxHeight: 240, borderRadius: 10, border: '1px solid var(--line)' }} /></a>}
            <label className="field">Internal note<textarea className="textarea" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (open.note || '') && update({ note })} placeholder="Visible to admins only" /></label>
            <div className="row wrap" style={{ gap: 8 }}>
              <a className="btn btn-sm" style={{ background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid #BFE8CF' }} href={`https://wa.me/${open.phone.replace(/\D/g, '')}?text=${waText}`} target="_blank" rel="noreferrer">Reply on WhatsApp</a>
              {open.email && <a className="btn btn-ghost btn-sm" href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject}`)}`}>Reply by email</a>}
              <span style={{ marginLeft: 'auto' }} />
              {Object.entries(ENQUIRY_STATUS).filter(([k]) => k !== open.status).map(([k, v]) => (
                <button key={k} type="button" className="btn btn-ghost btn-sm" onClick={() => update({ status: k })}>Mark {v.label.toLowerCase()}</button>
              ))}
            </div>
          </section>
        ) : <div className="panel muted" style={{ flex: '999 1 420px' }}>Select an enquiry.</div>}
      </div>
    </div>
  );
}
