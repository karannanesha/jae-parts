import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import MiniCart from './components/MiniCart.jsx';
import EnquiryModal from './components/EnquiryModal.jsx';
import QuickView from './components/QuickView.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import Home from './pages/Home.jsx';

// Route-level code splitting keeps the first load small.
const Shop = lazy(() => import('./pages/Shop.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const InfoPage = lazy(() => import('./pages/InfoPage.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <Header />
      <main id="main">
        <Suspense fallback={<div className="container" style={{ padding: '80px 32px' }}><div className="skeleton" style={{ height: 320 }} /></div>}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MiniCart />
      <EnquiryModal />
      <QuickView />
      <CookieBanner />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="search" element={<Shop />} />
        <Route path="product-category/:slug" element={<Shop />} />
        <Route path="product-category/:parent/:slug" element={<Shop />} />
        <Route path="product/:slug" element={<Product />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="my-account" element={<Account />} />
        <Route path="track-order" element={<Account />} />
        <Route path="contact-us" element={<Contact />} />
        <Route path=":pageSlug" element={<InfoPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
