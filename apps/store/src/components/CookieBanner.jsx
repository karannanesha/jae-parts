import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUi } from '../state/UiContext.jsx';

const KEY = 'jae.cookieConsent';

/** Loads Google Tag Manager only after the visitor accepts analytics cookies. */
function loadGtm(id) {
  if (!id || window.__gtmLoaded) return;
  window.__gtmLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export default function CookieBanner() {
  const { settings } = useUi();
  const [choice, setChoice] = useState(() => { try { return localStorage.getItem(KEY); } catch { return 'essential'; } });

  useEffect(() => {
    if (choice === 'all') loadGtm(settings.analytics?.gtmId);
  }, [choice, settings.analytics?.gtmId]);

  if (choice || settings.features?.cookieBanner === false) return null;

  const decide = (value) => {
    try { localStorage.setItem(KEY, value); } catch { /* ignore */ }
    setChoice(value);
  };

  return (
    <div role="region" aria-label="Cookie consent" className="card" style={{ position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 40, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow-pop)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ flex: '1 1 420px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        <b style={{ color: 'var(--navy-900)' }}>Your cookie choices.</b> We use essential cookies to run the store, and optional analytics cookies to improve it. <Link to="/cookie-policy/" style={{ fontWeight: 600 }}>Cookie policy</Link>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={() => decide('essential')}>Essential only</button>
        <button type="button" className="btn btn-navy" onClick={() => decide('all')}>Accept all</button>
      </div>
    </div>
  );
}
