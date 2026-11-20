import { Link } from 'react-router-dom';
import { useSeo } from '../lib/useAsync.js';

export default function NotFound() {
  useSeo('Page not found');
  return (
    <div className="container empty">
      <div className="mono muted" style={{ fontSize: 13, marginBottom: 8 }}>404</div>
      <h1 style={{ marginBottom: 12 }}>We couldn't find that page</h1>
      <p style={{ marginBottom: 20 }}>Search for the part number above, or browse the catalogue.</p>
      <Link to="/shop/" className="btn btn-red">Browse all parts</Link>
    </div>
  );
}
