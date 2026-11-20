// Jay Ambe Enterprises — Cloud Functions (2nd gen, Mumbai region)
//
//   createOrder     callable  Re-prices the cart from Firestore, applies coupon/shipping, creates the order
//                             and (for online payment) a Razorpay order.
//   verifyPayment   callable  Verifies the Razorpay signature and marks the order paid.
//   razorpayWebhook https     Backup for verifyPayment if the shopper closes the tab before it runs.
//   trackOrder      callable  Public order tracking by order number + mobile number.
//   syncCounts      trigger   Keeps categories/{id}.productCount and brands/{id}.productCount accurate.

import crypto from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

const RAZORPAY_KEY_ID = defineSecret('RAZORPAY_KEY_ID');
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET');
const RAZORPAY_WEBHOOK_SECRET = defineSecret('RAZORPAY_WEBHOOK_SECRET');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);

// ---------------------------------------------------------------------------
// createOrder
// ---------------------------------------------------------------------------
export const createOrder = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] }, async (req) => {
  const uid = req.auth?.uid;
  const phone = req.auth?.token?.phone_number;
  if (!uid || !phone) throw new HttpsError('unauthenticated', 'Please verify your mobile number to place an order.');

  const { items, contact = {}, address = {}, gst = null, paymentMethod, coupon, notes } = req.data || {};
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) throw new HttpsError('invalid-argument', 'Your cart is empty.');
  if (!['razorpay', 'cod'].includes(paymentMethod)) throw new HttpsError('invalid-argument', 'Choose a payment method.');
  if (!/^[1-9]\d{5}$/.test(str(address.pin))) throw new HttpsError('invalid-argument', 'Enter a valid PIN code.');
  if (!str(address.name) || !str(address.line1) || !str(address.city)) throw new HttpsError('invalid-argument', 'Complete the delivery address.');
  if (gst && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(str(gst.gstin).toUpperCase())) throw new HttpsError('invalid-argument', 'Enter a valid GSTIN.');

  const settingsSnap = await db.doc('settings/store').get();
  const settings = settingsSnap.data() || {};
  const payments = { razorpay: true, cod: true, codMaxOrder: 0, ...settings.payments };
  const shipping = { flatRate: 0, freeAbove: 0, ...settings.shipping };
  if (paymentMethod === 'cod' && !payments.cod) throw new HttpsError('failed-precondition', 'Cash on delivery is not available right now.');
  if (paymentMethod === 'razorpay' && !payments.razorpay) throw new HttpsError('failed-precondition', 'Online payment is not available right now.');

  // Merge duplicate lines and re-read every product.
  const qtyById = new Map();
  for (const it of items) {
    const qty = Math.floor(Number(it?.qty));
    if (!it?.id || !Number.isFinite(qty) || qty < 1 || qty > 999) throw new HttpsError('invalid-argument', 'Invalid quantity in cart.');
    qtyById.set(String(it.id), (qtyById.get(String(it.id)) || 0) + qty);
  }
  const refs = [...qtyById.keys()].map((id) => db.collection('products').doc(id));
  const snaps = await db.getAll(...refs);

  const lines = [];
  let subtotal = 0;
  let gstRaw = 0;
  for (const snap of snaps) {
    const p = snap.data();
    if (!snap.exists || p.status !== 'published' || !(p.price > 0)) throw new HttpsError('failed-precondition', `“${p?.name || 'An item'}” is no longer available. Please remove it from your cart.`);
    const qty = qtyById.get(snap.id);
    if (p.inStock === false || (typeof p.stock === 'number' && p.stock < qty)) {
      throw new HttpsError('failed-precondition', typeof p.stock === 'number' && p.stock > 0 ? `Only ${p.stock} of “${p.name}” left in stock.` : `“${p.name}” is out of stock.`);
    }
    if (paymentMethod === 'cod' && p.codAllowed === false) throw new HttpsError('failed-precondition', `“${p.name}” can't be ordered with cash on delivery.`);
    const gstRate = typeof p.gstRate === 'number' ? p.gstRate : 18;
    const lineTotal = p.price * qty;
    subtotal += lineTotal;
    gstRaw += lineTotal * gstRate / 100;
    lines.push({ productId: snap.id, name: p.name, slug: p.slug, partNo: p.partNo || '', sku: p.sku || '', hsn: p.hsn || '', price: p.price, mrp: p.mrp || p.price, gstRate, qty, image: p.images?.[0]?.url || '' });
  }
  subtotal = round2(subtotal);

  // Coupon (validated server-side only).
  let discount = 0;
  let couponCode = null;
  if (coupon) {
    couponCode = str(coupon, 40).toUpperCase();
    const c = (await db.doc(`coupons/${couponCode}`).get()).data();
    const today = new Date().toISOString().slice(0, 10);
    if (!c || !c.active) throw new HttpsError('failed-precondition', `Coupon ${couponCode} is not valid.`);
    if (c.expiresAt && c.expiresAt < today) throw new HttpsError('failed-precondition', `Coupon ${couponCode} has expired.`);
    if (c.minCart && subtotal < c.minCart) throw new HttpsError('failed-precondition', `Coupon ${couponCode} needs a cart of ₹${c.minCart} or more.`);
    if (c.maxUses && (c.used || 0) >= c.maxUses) throw new HttpsError('failed-precondition', `Coupon ${couponCode} has been fully used.`);
    if (c.firstOrderOnly) {
      const user = (await db.doc(`users/${uid}`).get()).data();
      if ((user?.orderCount || 0) > 0) throw new HttpsError('failed-precondition', `Coupon ${couponCode} is for first orders only.`);
    }
    discount = round2(c.type === 'percent' ? subtotal * Math.min(100, c.value) / 100 : Math.min(c.value, subtotal));
  }

  const discountFactor = subtotal > 0 ? (subtotal - discount) / subtotal : 1;
  const gstAmount = round2(gstRaw * discountFactor);
  const shippingAmount = shipping.freeAbove && subtotal >= shipping.freeAbove ? 0 : round2(Number(shipping.flatRate) || 0);
  const total = round2(subtotal - discount + gstAmount + shippingAmount);
  if (paymentMethod === 'cod' && payments.codMaxOrder && total > payments.codMaxOrder) {
    throw new HttpsError('failed-precondition', `Cash on delivery is available for orders up to ₹${payments.codMaxOrder}.`);
  }

  // Sequential, human-friendly order number: JAE-10001, JAE-10002, …
  const prefix = settings.business?.invoicePrefix || 'JAE-';
  const seq = await db.runTransaction(async (tx) => {
    const ref = db.doc('settings/counters');
    const cur = (await tx.get(ref)).data()?.orderSeq || 10000;
    tx.set(ref, { orderSeq: cur + 1 }, { merge: true });
    return cur + 1;
  });
  const number = `${prefix}${seq}`;
  const orderRef = db.collection('orders').doc();

  const order = {
    number,
    userId: uid,
    customer: { name: str(contact.name || address.name, 120), email: str(contact.email, 160), phone },
    address: {
      name: str(address.name, 120), company: str(address.company, 120), line1: str(address.line1, 200), line2: str(address.line2, 200),
      city: str(address.city, 80), state: str(address.state, 80), pin: str(address.pin, 6),
    },
    gst: gst ? { gstin: str(gst.gstin, 15).toUpperCase(), businessName: str(gst.businessName, 160) } : null,
    items: lines,
    coupon: couponCode,
    totals: { subtotal, discount, gst: gstAmount, shipping: shippingAmount, total },
    payment: { method: paymentMethod, status: paymentMethod === 'cod' ? 'cod_pending' : 'created' },
    status: paymentMethod === 'cod' ? 'new' : 'pending_payment',
    notes: str(notes, 1000),
    timeline: { placed: FieldValue.serverTimestamp() },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (paymentMethod === 'cod') {
    await orderRef.set(order);
    await fulfil(orderRef.id);
    return { orderId: orderRef.id, number, total };
  }

  // Razorpay order (amount in paise).
  const amount = Math.round(total * 100);
  const keyId = RAZORPAY_KEY_ID.value();
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId}:${RAZORPAY_KEY_SECRET.value()}`).toString('base64')}`,
    },
    body: JSON.stringify({ amount, currency: 'INR', receipt: number, notes: { orderId: orderRef.id, number } }),
  });
  if (!res.ok) {
    logger.error('Razorpay order failed', res.status, await res.text());
    throw new HttpsError('unavailable', 'Online payment is temporarily unavailable. Please try again or choose cash on delivery.');
  }
  const rzp = await res.json();
  order.payment.razorpayOrderId = rzp.id;
  await orderRef.set(order);
  return { orderId: orderRef.id, number, total, razorpay: { orderId: rzp.id, keyId, amount } };
});

// ---------------------------------------------------------------------------
// Fulfil: reduce stock, count coupon use, update customer — exactly once per order.
// ---------------------------------------------------------------------------
async function fulfil(orderId, paymentPatch = null) {
  const orderRef = db.doc(`orders/${orderId}`);
  await db.runTransaction(async (tx) => {
    const order = (await tx.get(orderRef)).data();
    if (!order || order.fulfilled) return;
    const productRefs = order.items.map((i) => db.doc(`products/${i.productId}`));
    const productSnaps = await Promise.all(productRefs.map((r) => tx.get(r)));
    const couponRef = order.coupon ? db.doc(`coupons/${order.coupon}`) : null;
    const userRef = db.doc(`users/${order.userId}`);

    productSnaps.forEach((snap, idx) => {
      const p = snap.data();
      if (p && typeof p.stock === 'number') {
        const left = Math.max(0, p.stock - order.items[idx].qty);
        tx.update(productRefs[idx], { stock: left, inStock: left > 0, updatedAt: FieldValue.serverTimestamp() });
      }
    });
    if (couponRef) tx.set(couponRef, { used: FieldValue.increment(1) }, { merge: true });
    tx.set(userRef, {
      phone: order.customer.phone,
      name: order.customer.name,
      ...(order.customer.email ? { email: order.customer.email } : {}),
      address: order.address,
      ...(order.gst ? { gst: order.gst } : {}),
      orderCount: FieldValue.increment(1),
      totalSpent: FieldValue.increment(order.totals.total),
      lastOrderAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.update(orderRef, {
      fulfilled: true,
      ...(paymentPatch ? { payment: { ...order.payment, ...paymentPatch }, status: 'new', 'timeline.paid': FieldValue.serverTimestamp() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

// ---------------------------------------------------------------------------
// verifyPayment — called by the browser after Razorpay Checkout succeeds
// ---------------------------------------------------------------------------
export const verifyPayment = onCall({ secrets: [RAZORPAY_KEY_SECRET] }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in again to finish payment.');
  const { orderId, razorpay_order_id: rOrder, razorpay_payment_id: rPay, razorpay_signature: sig } = req.data || {};
  if (!orderId || !rOrder || !rPay || !sig) throw new HttpsError('invalid-argument', 'Missing payment details.');

  const snap = await db.doc(`orders/${orderId}`).get();
  const order = snap.data();
  if (!order || order.userId !== uid) throw new HttpsError('not-found', 'Order not found.');
  if (order.payment?.razorpayOrderId !== rOrder) throw new HttpsError('permission-denied', 'Payment does not match this order.');

  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET.value()).update(`${rOrder}|${rPay}`).digest('hex');
  const ok = expected.length === sig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  if (!ok) {
    logger.warn('Bad Razorpay signature', { orderId });
    throw new HttpsError('permission-denied', 'Payment could not be verified. If money was deducted, it will be refunded automatically.');
  }
  await fulfil(orderId, { status: 'paid', razorpayPaymentId: rPay, paidAt: Timestamp.now() });
  return { ok: true, number: order.number };
});

// ---------------------------------------------------------------------------
// razorpayWebhook — set URL in Razorpay Dashboard › Webhooks, event: payment.captured
// ---------------------------------------------------------------------------
export const razorpayWebhook = onRequest({ secrets: [RAZORPAY_WEBHOOK_SECRET] }, async (req, res) => {
  const sig = req.get('x-razorpay-signature') || '';
  const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET.value()).update(req.rawBody).digest('hex');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    res.status(400).send('bad signature');
    return;
  }
  const event = req.body;
  if (event?.event === 'payment.captured') {
    const pay = event.payload?.payment?.entity;
    const q = await db.collection('orders').where('payment.razorpayOrderId', '==', pay?.order_id).limit(1).get();
    if (!q.empty) await fulfil(q.docs[0].id, { status: 'paid', razorpayPaymentId: pay.id, paidAt: Timestamp.now(), via: 'webhook' });
  }
  res.status(200).send('ok');
});

// ---------------------------------------------------------------------------
// trackOrder — order number + mobile, no login needed
// ---------------------------------------------------------------------------
export const trackOrder = onCall(async (req) => {
  const number = str(req.data?.number, 30).toUpperCase();
  const phone = last10(req.data?.phone);
  if (!number || phone.length !== 10) throw new HttpsError('invalid-argument', 'Enter your order ID and mobile number.');
  const q = await db.collection('orders').where('number', '==', number).limit(1).get();
  const o = q.docs[0]?.data();
  if (!o || last10(o.customer?.phone) !== phone) throw new HttpsError('not-found', 'No matching order.');
  return { number: o.number, status: o.status, tracking: o.tracking || null, placedAt: o.createdAt?.toMillis?.() || null };
});

// ---------------------------------------------------------------------------
// syncCounts — category & brand product counts (published products only)
// ---------------------------------------------------------------------------
export const syncCounts = onDocumentWritten('products/{id}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  // Bulk imports (scripts/import-woocommerce.mjs) stamp `importedAt` and recount everything at the end,
  // so skip writes that come from an import run to avoid double counting.
  if (after?.importedAt && after.importedAt !== before?.importedAt) return;
  const live = (p) => p && p.status === 'published';
  const cats = (p) => new Set(live(p) ? p.categoryIds || [] : []);
  const brand = (p) => (live(p) && p.brand ? p.brand : null);

  const b = cats(before);
  const a = cats(after);
  const batch = db.batch();
  let writes = 0;
  for (const id of a) if (!b.has(id)) { batch.set(db.doc(`categories/${id}`), { productCount: FieldValue.increment(1) }, { merge: true }); writes++; }
  for (const id of b) if (!a.has(id)) { batch.set(db.doc(`categories/${id}`), { productCount: FieldValue.increment(-1) }, { merge: true }); writes++; }
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (brand(before) !== brand(after)) {
    if (brand(before)) { batch.set(db.doc(`brands/${slug(brand(before))}`), { productCount: FieldValue.increment(-1) }, { merge: true }); writes++; }
    if (brand(after)) { batch.set(db.doc(`brands/${slug(brand(after))}`), { name: brand(after), slug: slug(brand(after)), productCount: FieldValue.increment(1) }, { merge: true }); writes++; }
  }
  if (writes) await batch.commit();
});
