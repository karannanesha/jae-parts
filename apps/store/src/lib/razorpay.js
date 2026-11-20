// Loads Razorpay Checkout and resolves with the payment response, or rejects if dismissed/failed.
let loader;
function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = resolve;
      s.onerror = () => { loader = null; reject(new Error('Could not load Razorpay')); };
      document.body.appendChild(s);
    });
  }
  return loader;
}

export async function payWithRazorpay({ keyId, razorpayOrderId, amount, orderNumber, customer }) {
  await loadScript();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      order_id: razorpayOrderId,
      amount,
      currency: 'INR',
      name: 'Jay Ambe Enterprises',
      description: `Order ${orderNumber}`,
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
      theme: { color: '#0B1F4B' },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error('dismissed')) },
    });
    rzp.on('payment.failed', (r) => reject(new Error(r?.error?.description || 'Payment failed')));
    rzp.open();
  });
}
