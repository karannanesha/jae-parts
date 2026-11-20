import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Icon from '@jae/shared/Icon.jsx';
import { db, storage } from '../firebase.js';
import { useAuth } from '../state/AuthContext.jsx';
import PhoneOtp from './PhoneOtp.jsx';

const SUBJECTS = ['Part enquiry', 'Bulk / wholesale order', 'Order support', 'Replacement claim'];

/** Contact / bulk-enquiry form. The visitor verifies their phone by OTP before submitting. */
export default function EnquiryForm({ source = 'contact', defaultSubject = 'Part enquiry', allowPhoto = true, onDone }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', subject: defaultSubject, message: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const verified = !!user?.phoneNumber;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.message.trim()) { setError('Please fill in your name and requirement.'); return; }
    setBusy(true);
    try {
      let photo = null;
      if (file) {
        const path = `enquiries/${user.uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const snap = await uploadBytes(ref(storage, path), file, { contentType: file.type });
        photo = { path, url: await getDownloadURL(snap.ref) };
      }
      await addDoc(collection(db, 'enquiries'), {
        uid: user.uid,
        phone: user.phoneNumber,
        name: form.name.trim().slice(0, 120),
        email: form.email.trim().slice(0, 160),
        subject: form.subject,
        message: form.message.trim().slice(0, 5000),
        photo,
        source,
        status: 'new',
        createdAt: serverTimestamp(),
      });
      setSent(true);
      onDone?.();
    } catch (err) {
      console.error(err);
      setError('Could not send your enquiry. Please try again or call us.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="stack" style={{ gap: 10, alignItems: 'flex-start' }}>
        <span className="status tone-green">Enquiry sent</span>
        <p style={{ margin: 0 }}>Thanks, {form.name.split(' ')[0]}. Our team will reply within one working day on {user.phoneNumber}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
      <PhoneOtp compact cta="Verify phone" />
      <fieldset disabled={!verified} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, opacity: verified ? 1 : 0.55 }}>
        <div className="grid-2">
          <label className="field">Full name<input className="input" value={form.name} onChange={set('name')} autoComplete="name" /></label>
          <label className="field">Email<input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
        </div>
        <label className="field">Subject
          <select className="select" value={form.subject} onChange={set('subject')}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label className="field">{source === 'bulk' ? 'Parts & quantities' : 'Your requirement'}
          <textarea className="textarea" value={form.message} onChange={set('message')} placeholder={source === 'bulk' ? 'CB397-60001 × 10\nRM1-4607 × 5' : 'Printer model, part number and quantity'} />
        </label>
        {allowPhoto && (
          <label className="field">Attach photo (optional)
            <span style={{ border: '1.5px dashed var(--line-2)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 500, color: 'var(--muted)', cursor: 'pointer' }}>
              <Icon name="upload" size={22} style={{ color: 'var(--navy-900)' }} />
              {file ? file.name : <>Photo of the part label — <span style={{ color: 'var(--navy-900)', fontWeight: 600 }}>browse</span></>}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </span>
          </label>
        )}
        {!verified && <div className="muted" style={{ fontSize: 13 }}>Verify your mobile number above to continue.</div>}
        {error && <div className="field-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-red btn-lg" disabled={busy || !verified}>{busy ? 'Sending…' : source === 'bulk' ? 'Send enquiry' : 'Submit requirement'}</button>
      </fieldset>
    </form>
  );
}
