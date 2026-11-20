import { ORDER_STATUS, ENQUIRY_STATUS } from '@jae/shared/constants.js';

export function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={!!checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function ToggleRow({ label, sub, checked, onChange }) {
  return (
    <div className="toggle-row">
      <span><span style={{ display: 'block' }}>{label}</span>{sub && <span className="muted" style={{ fontSize: 12 }}>{sub}</span>}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export function OrderStatus({ status }) {
  const s = ORDER_STATUS[status] || { label: status, tone: 'muted' };
  return <span className={`status tone-${s.tone}`}>{s.label}</span>;
}

export function EnquiryStatus({ status }) {
  const s = ENQUIRY_STATUS[status] || { label: status, tone: 'muted' };
  return <span className={`status tone-${s.tone}`}>{s.label}</span>;
}

export function Thumb({ url }) {
  return <span className="thumb">{url ? <img src={url} alt="" className="img-cover" /> : <span className="ph" style={{ width: '100%', height: '100%', display: 'block' }} />}</span>;
}

export function TagInput({ values, onChange, placeholder }) {
  return (
    <div className="row wrap" style={{ gap: 6, border: '1px solid var(--line-2)', borderRadius: 9, padding: 8 }}>
      {values.map((v) => (
        <span key={v} className="tag">{v}<button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>✕</button></span>
      ))}
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        style={{ border: 0, outline: 'none', font: '500 13px var(--font-body)', flex: 1, minWidth: 180, height: 30 }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const v = e.currentTarget.value.trim();
            if (v && !values.includes(v)) onChange([...values, v]);
            e.currentTarget.value = '';
          }
        }}
      />
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty" style={{ padding: 40 }}>{children}</div>;
}
