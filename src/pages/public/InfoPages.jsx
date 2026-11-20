import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { LEGAL_PAGES } from '../../data/asirem.js';
import ProductCard from '../../components/ProductCard.jsx';

export function LegalPage({ page }) {
  const content = LEGAL_PAGES[page];
  if (!content) return null;
  return (
    <>
      <div className="as-page-hero">
        <span className="as-kicker">Informations</span>
        <h1>{content.title}</h1>
        {content.intro && <p>{content.intro}</p>}
      </div>
      <section className="as-section">
        <article className="as-legal">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
          <p style={{ marginTop: '2.5rem' }}>
            <Link to="/" className="as-btn-outline as-btn-outline--dark">Retour à l'accueil</Link>
          </p>
        </article>
      </section>
    </>
  );
}

export function EditionsThematiques() {
  const [products, setProducts] = useState([]);
  const page = LEGAL_PAGES['editions-thematiques'];

  useEffect(() => {
    api.get('/public/products')
      .then((data) => setProducts((data.items || []).filter((p) => p.slug.includes('noel') || p.slug.includes('citrouille'))))
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="as-page-hero">
        <span className="as-kicker">Collections</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
      </div>
      <section className="as-section">
        <div className="as-product-grid">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </>
  );
}
