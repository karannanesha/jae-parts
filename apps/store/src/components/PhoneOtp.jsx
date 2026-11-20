import { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase.js';
import { useAuth } from '../state/AuthContext.jsx';
import { isValidIndianMobile, toE164India } from '@jae/shared/format.js';

// Phone OTP with Firebase Auth. Used for login, checkout, contact and bulk enquiry.
// Add test numbers in Firebase console › Authentication › Sign-in method › Phone
// to test without sending real SMS.

let verifierSeq = 0;

export default function PhoneOtp({ onVerified, cta = 'Verify & continue', compact = false }) {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const confirmation = useRef(null);
  const verifier = useRef(null);
  const btnId = useRef(`otp-btn-${++verifierSeq}`);

  useEffect(() => () => { verifier.current?.clear?.(); }, []);
  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  if (user?.phoneNumber) {
    return (
      <div className="row wrap" style={{ gap: 10, fontSize: 14 }}>
        <span className="status tone-green">Verified</span>
        <span>{user.phoneNumber}</span>
        {onVerified && <button type="button" className="btn btn-navy btn-sm" onClick={() => onVerified(user)}>{cta}</button>}
      </div>
    );
  }

  async function send() {
    setError('');
    if (!isValidIndianMobile(phone)) { setError('Enter a valid 10-digit mobile number'); return; }
    setBusy(true);
    try {
      if (!verifier.current) {
        verifier.current = new RecaptchaVerifier(auth, btnId.current, { size: 'invisible' });
      }
      confirmation.current = await signInWithPhoneNumber(auth, toE164India(phone), verifier.current);
      setStep('code');
      setSeconds(30);
    } catch (e) {
      console.error(e);
      setError(e.code === 'auth/too-many-requests' ? 'Too many attempts. Please try again later.' : 'Could not send the code. Check the number and try again.');
      verifier.current?.clear?.();
      verifier.current = null;
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError('');
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code'); return; }
    setBusy(true);
    try {
      const cred = await confirmation.current.confirm(code);
      onVerified?.(cred.user);
    } catch {
      setError('That code is not correct.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      {step === 'phone' ? (
        <label className="field">Mobile number
          <div className="row" style={{ gap: 8 }}>
            <span className="input" style={{ width: 'auto', display: 'flex', alignItems: 'center', color: 'var(--muted)' }}>+91</span>
            <input className="input" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="98xxx xxxxx" />
            {compact && <button type="button" id={btnId.current} className="btn btn-navy" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send OTP'}</button>}
          </div>
        </label>
      ) : (
        <label className="field">Enter the 6-digit code sent to +91 {phone}
          <input className="input mono" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ letterSpacing: '0.3em', fontSize: 18 }} autoFocus />
          <span style={{ fontWeight: 500, color: 'var(--muted-2)' }}>
            {seconds > 0 ? `Resend in 0:${String(seconds).padStart(2, '0')}` : (
              <button type="button" onClick={() => { verifier.current?.clear?.(); verifier.current = null; setStep('phone'); setCode(''); }} style={{ border: 0, background: 'none', padding: 0, color: 'var(--navy-900)', fontWeight: 600, cursor: 'pointer' }}>Change number / resend</button>
            )}
          </span>
        </label>
      )}
      {error && <div className="field-error" role="alert">{error}</div>}
      {step === 'phone' && !compact && (
        <button type="button" id={btnId.current} className="btn btn-red btn-block" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send OTP'}</button>
      )}
      {step === 'code' && (
        <button type="button" className="btn btn-red btn-block" onClick={confirm} disabled={busy}>{busy ? 'Verifying…' : cta}</button>
      )}
    </div>
  );
}
