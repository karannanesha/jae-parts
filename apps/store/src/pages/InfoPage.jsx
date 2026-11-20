import { Link, useParams } from 'react-router-dom';
import { useAsync, useSeo } from '../lib/useAsync.js';
import { getPage } from '../lib/catalog.js';
import NotFound from './NotFound.jsx';

// CMS pages from Firestore `pages/{slug}` (About, policies, guides), edited in Admin › Pages.
const NAV = [
  ['about-us', 'About us'],
  ['return-policy', 'Return & replacement'],
  ['privacy-policy', 'Privacy policy'],
  ['cookie-policy', 'Cookie policy'],
  ['shipping', 'Shipping & delivery'],
  ['10-most-used-logic-cards', '10 most-used logic cards'],
];

export default function InfoPage() {
  const { pageSlug } = useParams();
  const { data: page, loading } = useAsync(() => getPage(pageSlug), [pageSlug]);
  useSeo(page?.seo?.title || page?.title, page?.seo?.description || page?.summary);

  if (loading) return <div className="container" style={{ paddingTop: 40 }}><div className="skeleton" style={{ height: 400 }} /></div>;
  if (!page) return <NotFound />;

  return (
    <>
      <section className="page-head">
        <div className="container">
          <nav aria-label="Breadcrumb" className="breadcrumb" style={{ marginBottom: 12 }}><Link to="/">Home</Link><span>/</span><span style={{ color: 'var(--ink)' }}>{page.title}</span></nav>
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 44px)', letterSpacing: '-0.02em' }}>{page.title}</h1>
          {page.summary && <p style={{ margin: '10px 0 0', fontSize: 17, color: 'var(--muted)', maxWidth: 680, lineHeight: 1.55 }}>{page.summary}</p>}
        </div>
      </section>
      <div className="container row wrap" style={{ gap: 32, alignItems: 'flex-start', paddingTop: 32 }}>
        <nav aria-label="Store information" className="card stack" style={{ flex: '1 1 220px', maxWidth: 260, padding: 10, gap: 2 }}>
          {NAV.map(([slug, label]) => (
            <Link key={slug} to={`/${slug}/`} className="btn" style={{ justifyContent: 'flex-start', fontWeight: 600, background: slug === pageSlug ? 'var(--navy-900)' : 'transparent', color: slug === pageSlug ? '#fff' : 'var(--ink-2)' }}>{label}</Link>
          ))}
        </nav>
        <article className="prose" style={{ flex: '999 1 560px', minWidth: 0, maxWidth: 780 }} dangerouslySetInnerHTML={{ __html: page.html || '' }} />
      </div>
    </>
  );
}
