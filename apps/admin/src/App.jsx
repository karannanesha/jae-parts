import { lazy, Suspense, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { where } from 'firebase/firestore';
import Icon, { StarLogo } from '@jae/shared/Icon.jsx';
import { useAdmin } from './lib/auth.jsx';
import { useLiveCollection } from './lib/data.js';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Products = lazy(() => import('./pages/Products.jsx'));
const ProductEdit = lazy(() => import('./pages/ProductEdit.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const Enquiries = lazy(() => import('./pages/Enquiries.jsx'));
const Customers = lazy(() => import('./pages/Customers.jsx'));
const Coupons = lazy(() => import('./pages/Coupons.jsx'));
const Pages = lazy(() => import('./pages/Pages.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

function Login() {
  const { login, resetPassword } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(email, password); } catch { setError('Wrong email or password.'); } finally { setBusy(false); }
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--navy-950)' }}>
      <form onSubmit={submit} className="panel" style={{ width: '100%', maxWidth: 400, padding: 28, gap: 16 }}>
        <div className="row" style={{ gap: 12 }}><StarLogo size={42} /><div><h1 style={{ fontSize: 20 }}>JAE Admin</h1><div className="muted" style={{ fontSize: 13 }}>Sign in to manage the store</div></div></div>
        <label className="field">Email<input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field">Password<input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <div className="field-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-navy" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => email && resetPassword(email).then(() => setError('Password reset email sent.'))}>Forgot password?</button>
      </form>
    </div>
  );
}

function NotAdmin() {
  const { user, logout, refreshClaims } = useAdmin();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="panel" style={{ maxWidth: 440 }}>
        <h1 style={{ fontSize: 22 }}>No admin access</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>{user.email || user.phoneNumber} is signed in but isn't an admin. Ask the store owner to run <code className="code">node scripts/set-admin.mjs {user.email || '<email>'}</code>, then reload.</p>
        <div className="row" style={{ gap: 8 }}><button type="button" className="btn btn-navy" onClick={() => refreshClaims().then(() => window.location.reload())}>I've been granted access</button><button type="button" className="btn btn-ghost" onClick={logout}>Sign out</button></div>
      </div>
    </div>
  );
}

function Sidebar() {
  const { user, logout } = useAdmin();
  const newOrders = useLiveCollection('orders', [where('status', '==', 'new')]);
  const newLeads = useLiveCollection('enquiries', [where('status', '==', 'new')]);
  const groups = [
    ['Overview', [['/', 'Dashboard', 'dashboard']]],
    ['Sales', [['/orders', 'Orders', 'receipt', newOrders.data.length], ['/customers', 'Customers', 'users'], ['/enquiries', 'Enquiries', 'mail', newLeads.data.length], ['/coupons', 'Coupons', 'tag']]],
    ['Catalogue', [['/products', 'Products', 'box'], ['/categories', 'Categories & brands', 'tree']]],
    ['Store', [['/pages', 'Pages', 'page'], ['/settings', 'Settings', 'gear']]],
  ];
  return (
    <aside className="sidebar">
      <div className="row" style={{ gap: 10, padding: '4px 8px 18px', borderBottom: '1px solid var(--navy-700)', marginBottom: 6, width: '100%' }}>
        <StarLogo size={38} />
        <div><div style={{ font: '700 16px var(--font-display)', color: '#fff' }}>JAE Admin</div><div className="mono" style={{ fontSize: 10, color: '#7F8BA6' }}>jaepart.com</div></div>
      </div>
      {groups.map(([g, items]) => (
        <div key={g} style={{ display: 'contents' }}>
          <div className="grp">{g}</div>
          {items.map(([to, label, icon, badge]) => (
            <NavLink key={to} to={to} end={to === '/'}><Icon name={icon} size={18} />{label}{badge > 0 && <span className="bd">{badge}</span>}</NavLink>
          ))}
        </div>
      ))}
      <div className="foot" style={{ marginTop: 'auto', paddingTop: 18 }}>
        <div style={{ border: '1px solid var(--navy-700)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row" style={{ gap: 8, fontSize: 12 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />Firebase · {import.meta.env.VITE_USE_EMULATORS === 'true' ? 'emulators' : 'jae-parts-dev'}</div>
          <div style={{ fontSize: 13, color: '#fff', wordBreak: 'break-all' }}>{user.email}</div>
          <button type="button" onClick={logout} className="btn btn-sm" style={{ background: 'transparent', color: '#C9D2E3', border: '1px solid var(--navy-700)' }}><Icon name="logout" size={16} />Sign out</button>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const { user, isAdmin, ready } = useAdmin();
  if (!ready) return <div style={{ padding: 40 }}><div className="spinner" /></div>;
  if (!user) return <Login />;
  if (!isAdmin) return <NotAdmin />;

  return (
    <div className="shell">
      <Sidebar />
      <div className="content">
        <div className="topbar-admin">
          <span className="muted" style={{ fontSize: 13 }}>Signed in as {user.email}</span>
          <a href={import.meta.env.VITE_STORE_URL || 'https://jae-parts-dev.web.app'} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 600 }}>View store ↗</a>
          <NavLink to="/products/new" className="btn btn-red btn-sm"><Icon name="plus" size={16} strokeWidth={2.2} />Add product</NavLink>
        </div>
        <Suspense fallback={<div className="page"><div className="skeleton" style={{ height: 300 }} /></div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductEdit />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/enquiries" element={<Enquiries />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/pages" element={<Pages />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
