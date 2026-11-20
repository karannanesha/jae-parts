import { Link } from 'react-router-dom';
import Icon from '@jae/shared/Icon.jsx';
import { useUi } from '../state/UiContext.jsx';

export default function Footer() {
  const { settings, setOverlay } = useUi();
  const { contact, social } = settings;
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="footer-cta">
          <div>
            <div style={{ font: '700 24px var(--font-display)', color: '#fff' }}>Buying in bulk for your service centre?</div>
            <div style={{ fontSize: 15, marginTop: 6 }}>Send your list of part numbers — we'll reply with wholesale pricing and stock.</div>
          </div>
          <button type="button" className="btn btn-red btn-lg" onClick={() => setOverlay('enquiry')}>Send bulk enquiry</button>
        </div>
      </div>
      <div className="container footer-cols">
        <div className="stack" style={{ gap: 16 }}>
          <div style={{ font: '700 20px var(--font-display)', color: '#fff' }}>Jay Ambe Enterprises</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>Importer and wholesaler of printer spare parts and cartridges. Supplying technicians, service centres and offices across India since 2019.</p>
          <div className="row" style={{ gap: 8 }}>
            {social.facebook && <a className="social" href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Icon name="facebook" size={18} /></a>}
            {social.instagram && <a className="social" href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="instagram" size={18} /></a>}
            {social.youtube && <a className="social" href={social.youtube} target="_blank" rel="noreferrer" aria-label="YouTube"><Icon name="youtube" size={18} /></a>}
            {social.linkedin && <a className="social" href={social.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Icon name="linkedin" size={18} /></a>}
          </div>
        </div>
        <nav aria-label="Shop">
          <h3>Shop</h3>
          <div className="footer-links">
            <Link to="/product-category/laserjet-printer-parts/">Laser printer parts</Link>
            <Link to="/product-category/inkjet-printer-parts/">Inkjet printer parts</Link>
            <Link to="/product-category/dot-matrix-printer-parts/">Dot matrix parts</Link>
            <Link to="/product-category/toner-spare-parts/">Toner spare parts</Link>
            <Link to="/product-category/refurbished-printer/">Refurbished printers</Link>
            <Link to="/shop/">All products</Link>
          </div>
        </nav>
        <nav aria-label="Help">
          <h3>Help</h3>
          <div className="footer-links">
            <Link to="/track-order/">Track your order</Link>
            <Link to="/my-account/">My account</Link>
            <Link to="/return-policy/">Return &amp; replacement policy</Link>
            <Link to="/privacy-policy/">Privacy policy</Link>
            <Link to="/cookie-policy/">Cookie policy</Link>
            <Link to="/about-us/">About us</Link>
          </div>
        </nav>
        <div>
          <h3>Contact</h3>
          <div className="footer-links">
            {contact.phones.map((p) => <a key={p} href={`tel:${p.replace(/\s/g, '')}`}>{p}</a>)}
            {contact.emails.map((e) => <a key={e} href={`mailto:${e}`}>{e}</a>)}
            <span style={{ lineHeight: 1.55 }}>{contact.storeAddress}</span>
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--navy-700)' }}>
        <div className="container row wrap" style={{ justifyContent: 'space-between', gap: 12, paddingTop: 18, paddingBottom: 18, fontSize: 13 }}>
          <span>© {year} Jay Ambe Enterprises. All rights reserved.</span>
          <div className="row wrap" style={{ gap: 6 }}>
            <span style={{ marginRight: 6 }}>We accept</span>
            {['UPI', 'Cards', 'Net banking', 'Razorpay', 'Cash on delivery'].map((p) => <span key={p} className="paychip">{p}</span>)}
          </div>
        </div>
      </div>
      <a className="wa-fab mobile-only" href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"><Icon name="whatsapp" size={26} /></a>
    </footer>
  );
}
