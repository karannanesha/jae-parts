import Icon from '@jae/shared/Icon.jsx';
import { useUi } from '../state/UiContext.jsx';
import { useSeo } from '../lib/useAsync.js';
import EnquiryForm from '../components/EnquiryForm.jsx';

export default function Contact() {
  const { settings } = useUi();
  const c = settings.contact;
  useSeo('Contact Us', `Call ${c.phones.join(' / ')} or send your requirement. Jay Ambe Enterprises, Fort, Mumbai.`);
  const mapQuery = encodeURIComponent(c.storeAddress);

  return (
    <>
      <section style={{ background: 'var(--navy-900)', color: '#fff' }}>
        <div className="container" style={{ paddingTop: 56, paddingBottom: 96 }}>
          <div className="eyebrow" style={{ color: '#FF8A8F', marginBottom: 12 }}>Contact us</div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(34px, 4.5vw, 48px)', letterSpacing: '-0.02em', maxWidth: 720 }}>Talk to a parts specialist</h1>
          <p style={{ margin: '14px 0 0', fontSize: 17, color: '#C9D2E3', maxWidth: 620, lineHeight: 1.55 }}>Share your printer model or part number and we'll confirm compatibility, stock and price — single parts or bulk.</p>
        </div>
      </section>
      <div className="container stack" style={{ marginTop: -56, gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <a href={`tel:${c.phones[0].replace(/\s/g, '')}`} className="card card-pad stack" style={{ gap: 10 }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="phone" size={22} /></span>
            <b style={{ font: '700 18px var(--font-display)' }}>Call us</b>
            <span style={{ color: 'var(--ink-2)' }}>{c.phones.map((p) => <span key={p} style={{ display: 'block' }}>{p}</span>)}</span>
          </a>
          <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noreferrer" className="card card-pad stack" style={{ gap: 10 }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--green-50)', color: 'var(--green-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="whatsapp" size={22} /></span>
            <b style={{ font: '700 18px var(--font-display)' }}>WhatsApp</b>
            <span style={{ color: 'var(--ink-2)' }}>Send a photo of the part or its label — fastest way to get a quote.</span>
          </a>
          <a href={`mailto:${c.emails[0]}`} className="card card-pad stack" style={{ gap: 10 }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--red-50)', color: 'var(--red-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="mail" size={22} /></span>
            <b style={{ font: '700 18px var(--font-display)' }}>Email</b>
            <span style={{ color: 'var(--ink-2)' }}>{c.emails.map((e) => <span key={e} style={{ display: 'block' }}>{e}</span>)}</span>
          </a>
        </div>
        <div className="two-col">
          <section className="main card card-pad stack" style={{ gap: 16 }}>
            <h2 style={{ fontSize: 24 }}>Enter your requirement</h2>
            <EnquiryForm source="contact" />
          </section>
          <aside className="side card" style={{ overflow: 'hidden' }}>
            <iframe title="Map to our store" src={`https://www.google.com/maps?q=${mapQuery}&output=embed`} style={{ width: '100%', height: 220, border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            <div className="stack" style={{ padding: 20, gap: 14 }}>
              <div><div className="eyebrow" style={{ color: 'var(--muted-2)' }}>Store &amp; dispatch</div><div style={{ marginTop: 4, lineHeight: 1.5 }}>{c.storeAddress}</div></div>
              {c.registeredAddress && <div><div className="eyebrow" style={{ color: 'var(--muted-2)' }}>Registered office</div><div style={{ marginTop: 4, lineHeight: 1.5 }}>{c.registeredAddress}</div></div>}
              {c.hours && <div><div className="eyebrow" style={{ color: 'var(--muted-2)' }}>Hours</div><div style={{ marginTop: 4 }}>{c.hours}</div></div>}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>Get directions →</a>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
