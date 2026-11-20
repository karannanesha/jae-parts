import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { inr, isValidPin, isValidGstin } from '@jae/shared/format.js';
import { INDIAN_STATES } from '@jae/shared/constants.js';
import { db, functions } from '../firebase.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useCart } from '../state/CartContext.jsx';
import { useUi } from '../state/UiContext.jsx';
import { useSeo } from '../lib/useAsync.js';
import { payWithRazorpay } from '../lib/razorpay.js';
import PhoneOtp from '../components/PhoneOtp.jsx';
import { shippingFor, Steps } from './Cart.jsx';

const createOrder = httpsCallable(functions, 'createOrder');
const verifyPayment = httpsCallable(functions, 'verifyPayment');

const EMPTY = { name: '', email: '', company: '', line1: '', line2: '', pin: '', city: '', state: 'Maharashtra' };

export default function Checkout() {
  const { user, ready } = useAuth();
  const { items, totals, clear, coupon, setCoupon } = useCart();
  const { settings } = useUi();
  const navigate = useNavigate();
  const [f, setF] = useState(EMPTY);
  const [gstOn, setGstOn] = useState(false);
  const [gst, setGst] = useState({ gstin: '', businessName: '' });
  const [pay, setPay] = useState(settings.payments.razorpay ? 'razorpay' : 'cod');
  const [notes, setNotes] = useState('');
  const [agree, setAgree] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useSeo('Checkout');

  // Prefill from the saved profile.
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.address) setF((cur) => ({ ...cur, ...d.address, name: d.name || cur.name, email: d.email || cur.email }));
      if (d.gst?.gstin) { setGstOn(true); setGst(d.gst); }
    }).catch(() => {});
  }, [user]);

  const set = (k) => (e) => setF((cur) => ({ ...cur, [k]: e.target.value }));
  const ship = shippingFor(totals.subtotal, settings.shipping);
  const codAllowed = settings.payments.cod && (!settings.payments.codMaxOrder || totals.total <= settings.payments.codMaxOrder);

  if (!items.length) {
    return <div className="container empty"><h1 style={{ marginBottom: 12 }}>Your cart is empty</h1><Link to="/shop/" className="btn btn-red">Browse parts</Link></div>;
  }

  function validate() {
    if (!f.name.trim()) return 'Enter your full name';
    if (!f.line1.trim()) return 'Enter your delivery address';
    if (!isValidPin(f.pin)) return 'Enter a valid 6-digit PIN code';
    if (!f.city.trim()) return 'Enter your city';
    if (gstOn && !isValidGstin(gst.gstin)) return 'Enter a valid 15-character GSTIN';
    if (!agree) return 'Please accept the return & privacy policy';
    if (pay === 'cod' && !codAllowed) return 'Cash on delivery is not available for this order';
    return '';
  }

  async function placeOrder() {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setBusy(true);
    try {
      const { data } = await createOrder({
        items: items.map((i) => ({ id: i.id, qty: i.qty })),
        contact: { name: f.name.trim(), email: f.email.trim() },
        address: { name: f.name.trim(), company: f.company.trim(), line1: f.line1.trim(), line2: f.line2.trim(), pin: f.pin.trim(), city: f.city.trim(), state: f.state },
        gst: gstOn ? { gstin: gst.gstin.trim().toUpperCase(), businessName: gst.businessName.trim() } : null,
        paymentMethod: pay,
        coupon: coupon.trim() || null,
        notes: notes.trim().slice(0, 1000),
      });

      if (pay === 'razorpay') {
        const resp = await payWithRazorpay({
          keyId: data.razorpay.keyId,
          razorpayOrderId: data.razorpay.orderId,
          amount: data.razorpay.amount,
          orderNumber: data.number,
          customer: { name: f.name, email: f.email, phone: user.phoneNumber },
        });
        await verifyPayment({ orderId: data.orderId, ...resp });
      }
      clear();
      setCoupon('');
      navigate(`/my-account/?placed=${encodeURIComponent(data.number)}`);
    } catch (e) {
      console.error(e);
      if (e.message === 'dismissed') setError('Payment was cancelled. Nothing was charged — you can try again.');
      else setError(e.details?.message || e.message?.replace(/^.*?: /, '') || 'Could not place the order. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container stack" style={{ gap: 24, paddingTop: 32 }}>
      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 16, alignItems: 'flex-end' }}>
        <div>
          <nav aria-label="Breadcrumb" className="breadcrumb" style={{ marginBottom: 8 }}><Link to="/cart/">Cart</Link><span>/</span><span style={{ color: 'var(--ink)', fontWeight: 600 }}>Checkout</span></nav>
          <h1 style={{ fontSize: 36 }}>Checkout</h1>
        </div>
        <Steps current={user ? 1 : 0} />
      </div>
      <div className="two-col">
        <div className="main">
          <section className="card card-pad stack" style={{ gap: 16 }}>
            <h2 className="row" style={{ gap: 10, fontSize: 20 }}><span className="step-n">1</span>Verify your mobile</h2>
            {ready && <PhoneOtp cta="Continue" />}
          </section>

          <fieldset disabled={!user} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16, opacity: user ? 1 : 0.5 }}>
            <section className="card card-pad stack" style={{ gap: 16 }}>
              <h2 className="row" style={{ gap: 10, fontSize: 20 }}><span className="step-n">2</span>Delivery address</h2>
              <div className="grid-2">
                <label className="field">Full name<input className="input" value={f.name} onChange={set('name')} autoComplete="name" /></label>
                <label className="field">Email (for invoice)<input className="input" type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
              </div>
              <label className="field">Company / shop name (optional)<input className="input" value={f.company} onChange={set('company')} autoComplete="organization" /></label>
              <label className="field">Address<input className="input" value={f.line1} onChange={set('line1')} placeholder="Flat, building, street" autoComplete="address-line1" /></label>
              <label className="field">Landmark / area (optional)<input className="input" value={f.line2} onChange={set('line2')} autoComplete="address-line2" /></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <label className="field">PIN code<input className="input mono" inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF((c) => ({ ...c, pin: e.target.value.replace(/\D/g, '') }))} autoComplete="postal-code" /></label>
                <label className="field">City<input className="input" value={f.city} onChange={set('city')} autoComplete="address-level2" /></label>
                <label className="field">State<select className="select" value={f.state} onChange={set('state')}>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
              </div>
            </section>

            <section className="card card-pad stack" style={{ gap: 16 }}>
              <div className="row wrap" style={{ justifyContent: 'space-between', gap: 12 }}>
                <h2 className="row" style={{ gap: 10, fontSize: 20 }}><span className="step-n">3</span>GST invoice</h2>
                <label className="checkbox"><input type="checkbox" checked={gstOn} onChange={(e) => setGstOn(e.target.checked)} />I need a GST invoice</label>
              </div>
              {gstOn && (
                <div className="grid-2">
                  <label className="field">GSTIN<input className="input mono" maxLength={15} value={gst.gstin} onChange={(e) => setGst((g) => ({ ...g, gstin: e.target.value.toUpperCase() }))} placeholder="27ABCDE1234F1Z5" /></label>
                  <label className="field">Registered business name<input className="input" value={gst.businessName} onChange={(e) => setGst((g) => ({ ...g, businessName: e.target.value }))} /></label>
                </div>
              )}
            </section>

            <section className="card card-pad stack" style={{ gap: 12 }}>
              <h2 className="row" style={{ gap: 10, fontSize: 20 }}><span className="step-n">4</span>Payment</h2>
              <div role="radiogroup" aria-label="Payment method" className="stack" style={{ gap: 10 }}>
                {settings.payments.razorpay && (
                  <button type="button" role="radio" aria-checked={pay === 'razorpay'} className="pay-option" onClick={() => setPay('razorpay')}>
                    <span className="radio" />
                    <span className="grow"><b style={{ display: 'block' }}>Pay online</b><span className="muted" style={{ fontSize: 13 }}>UPI, credit/debit cards, net banking and wallets via Razorpay</span></span>
                    <span className="mono muted" style={{ fontSize: 11 }}>RAZORPAY</span>
                  </button>
                )}
                {settings.payments.cod && (
                  <button type="button" role="radio" aria-checked={pay === 'cod'} className="pay-option" onClick={() => setPay('cod')} disabled={!codAllowed}>
                    <span className="radio" />
                    <span className="grow"><b style={{ display: 'block' }}>Cash on delivery</b><span className="muted" style={{ fontSize: 13 }}>{codAllowed ? 'Pay in cash or UPI when your parcel arrives' : `Available for orders up to ${inr(settings.payments.codMaxOrder)}`}</span></span>
                    <span className="mono muted" style={{ fontSize: 11 }}>COD</span>
                  </button>
                )}
              </div>
              <label className="field">Order notes (optional)<textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Printer model, delivery instructions…" style={{ minHeight: 72 }} /></label>
              <label className="checkbox" style={{ alignItems: 'flex-start', fontSize: 13 }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2 }} />
                <span>I have read the <Link to="/return-policy/">return &amp; replacement policy</Link> and <Link to="/privacy-policy/">privacy policy</Link>.</span>
              </label>
            </section>
          </fieldset>
        </div>

        <aside className="side card stack" style={{ padding: 22, gap: 14 }}>
          <h2 style={{ fontSize: 20 }}>Order summary</h2>
          {items.map((i) => (
            <div key={i.id} className="row" style={{ gap: 12 }}>
              <span style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flex: 'none', border: '1px solid var(--line-soft)' }}>{i.image ? <img src={i.image} alt="" className="img-cover" /> : <div className="ph" style={{ width: '100%', height: '100%' }}>IMG</div>}</span>
              <div className="grow" style={{ fontSize: 13, lineHeight: 1.35 }}><b style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{i.name}</b><span className="muted">Qty {i.qty}</span></div>
              <b style={{ fontSize: 14 }}>{inr(i.price * i.qty)}</b>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--line-soft)' }} />
          <label className="field">Coupon<input className="input mono" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Optional" /></label>
          <div className="sum-row"><span>Subtotal</span><span>{inr(totals.subtotal, { decimals: true })}</span></div>
          <div className="sum-row"><span>GST</span><span>{inr(totals.gst, { decimals: true })}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{ship ? inr(ship) : 'Free'}</span></div>
          {coupon && <div className="sum-row"><span>Coupon {coupon}</span><span className="muted">Checked when you pay</span></div>}
          <div style={{ height: 1, background: 'var(--line-soft)' }} />
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontWeight: 600 }}>To pay</span><span className="price" style={{ fontSize: 28 }}>{inr(totals.total + ship, { decimals: true })}</span></div>
          {error && <div className="field-error" role="alert" style={{ fontSize: 13 }}>{error}</div>}
          <button type="button" className="btn btn-red btn-lg btn-block" disabled={!user || busy} onClick={placeOrder}>
            {busy ? 'Please wait…' : pay === 'razorpay' ? `Pay ${inr(totals.total + ship, { decimals: true })} securely` : 'Place COD order'}
          </button>
          <div className="muted" style={{ fontSize: 12, textAlign: 'center' }}>Final prices are confirmed by our server. Payments are processed by Razorpay — we never store card details.</div>
        </aside>
      </div>
    </div>
  );
}
