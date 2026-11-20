import { inr, formatDate } from '@jae/shared/format.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Opens a print-ready GST invoice (or packing slip) for an order. Save as PDF from the print dialog. */
export function printOrderDoc(order, settings, kind = 'invoice') {
  const store = settings?.contact || {};
  const isInvoice = kind === 'invoice';
  const sameState = (order.address?.state || '').toLowerCase() === (settings?.business?.state || 'maharashtra').toLowerCase();
  const rows = order.items.map((i, n) => {
    const taxable = i.price * i.qty;
    const tax = taxable * (i.gstRate ?? 18) / 100;
    return `<tr><td>${n + 1}</td><td>${esc(i.name)}${i.partNo ? `<br><small>${esc(i.partNo)}</small>` : ''}</td><td>${esc(i.hsn || '')}</td><td class="r">${i.qty}</td>${isInvoice ? `<td class="r">${inr(i.price, { decimals: true })}</td><td class="r">${i.gstRate ?? 18}%</td><td class="r">${inr(tax, { decimals: true })}</td><td class="r">${inr(taxable + tax, { decimals: true })}</td>` : ''}</tr>`;
  }).join('');
  const t = order.totals || {};
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${isInvoice ? 'Invoice' : 'Packing slip'} ${esc(order.number)}</title>
<style>body{font:13px/1.5 Inter,Arial,sans-serif;color:#0F172A;margin:32px}h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border-bottom:1px solid #E2E5EA;padding:8px;text-align:left;vertical-align:top}th{background:#F5F6F8;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.r{text-align:right}.grid{display:flex;gap:40px;margin-top:18px}.muted{color:#5B6474}small{color:#5B6474}.tot td{border:0;padding:4px 8px}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h1>Jay Ambe Enterprises</h1><div class="muted">${esc(store.storeAddress)}</div>${settings?.business?.gstin ? `<div>GSTIN: <b>${esc(settings.business.gstin)}</b></div>` : ''}</div>
<div style="text-align:right"><h1>${isInvoice ? 'Tax invoice' : 'Packing slip'}</h1><div>${esc(order.number)}</div><div class="muted">${formatDate(order.createdAt)}</div></div></div>
<div class="grid"><div><b>Bill / ship to</b><br>${esc(order.address?.name)}${order.address?.company ? `<br>${esc(order.address.company)}` : ''}<br>${esc(order.address?.line1)}${order.address?.line2 ? `, ${esc(order.address.line2)}` : ''}<br>${esc(order.address?.city)} ${esc(order.address?.pin)}, ${esc(order.address?.state)}<br>${esc(order.customer?.phone)}</div>
${order.gst?.gstin ? `<div><b>Buyer GSTIN</b><br>${esc(order.gst.gstin)}<br>${esc(order.gst.businessName)}</div>` : ''}
<div><b>Payment</b><br>${order.payment?.method === 'cod' ? 'Cash on delivery' : 'Online (Razorpay)'}<br><span class="muted">${esc(order.payment?.status || '')}</span></div></div>
<table><thead><tr><th>#</th><th>Item</th><th>HSN</th><th class="r">Qty</th>${isInvoice ? '<th class="r">Rate</th><th class="r">GST</th><th class="r">Tax</th><th class="r">Amount</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>
${isInvoice ? `<table class="tot" style="width:auto;margin-left:auto"><tr><td>Taxable value</td><td class="r">${inr(t.subtotal, { decimals: true })}</td></tr>
${sameState ? `<tr><td>CGST</td><td class="r">${inr((t.gst || 0) / 2, { decimals: true })}</td></tr><tr><td>SGST</td><td class="r">${inr((t.gst || 0) / 2, { decimals: true })}</td></tr>` : `<tr><td>IGST</td><td class="r">${inr(t.gst, { decimals: true })}</td></tr>`}
${t.discount ? `<tr><td>Discount</td><td class="r">−${inr(t.discount, { decimals: true })}</td></tr>` : ''}<tr><td>Shipping</td><td class="r">${inr(t.shipping || 0, { decimals: true })}</td></tr>
<tr><td><b>Total</b></td><td class="r"><b>${inr(t.total, { decimals: true })}</b></td></tr></table>` : ''}
<p class="muted" style="margin-top:32px">Thank you for your business. Replacement for manufacturing defects within 7 days of delivery — see jaepart.com/return-policy.</p>
<script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { alert('Allow pop-ups to print the invoice.'); return; }
  w.document.write(html);
  w.document.close();
}
