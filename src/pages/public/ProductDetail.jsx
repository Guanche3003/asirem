import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, euro } from '../../api.js';
import { labelOf, PRODUCT_CATEGORIES } from '../../constants.js';
import { useSite } from './PublicLayout.jsx';

export default function ProductDetail() {
  const { slug } = useParams();
  const { settings } = useSite();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/public/products/${slug}`)
      .then((data) => setProduct(data.item))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="as-empty">Chargement…</div>;
  if (!product) {
    return (
      <div className="as-empty" style={{ padding: '9rem 1rem' }}>
        <p>Cette création n'est plus disponible.</p>
        <Link to="/boutique" className="as-btn-outline as-btn-outline--dark">Retour à la boutique</Link>
      </div>
    );
  }

  return (
    <section className="as-section as-section--top">
      <div className="as-breadcrumb"><Link to="/">Accueil</Link> / <Link to="/boutique">Boutique</Link> / {product.name}</div>
      <div className="as-detail">
        <div className="as-detail-media">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} />
            : <span aria-hidden="true">🕯️</span>}
        </div>
        <div className="as-detail-copy">
          <span className="as-kicker">{labelOf(PRODUCT_CATEGORIES, product.category)}</span>
          <h1>{product.name}</h1>
          <div className="as-price as-detail-price">{euro(product.price)} <small style={{ fontSize: '.8rem', color: 'var(--ink-faint)' }}>TTC</small></div>
          <p style={{ color: 'var(--ink-soft)', lineHeight: 1.9 }}>{product.description}</p>
          <div className="as-detail-meta">
            {product.weight_g > 0 && <div><small>Poids</small><strong>{product.weight_g} g</strong></div>}
            {product.burn_hours > 0 && <div><small>Diffusion</small><strong>~ {product.burn_hours} h</strong></div>}
            <div><small>Fabrication</small><strong>À la main</strong></div>
          </div>
          <a href={settings.whatsapp || 'https://wa.me/33656695112'} target="_blank" rel="noopener noreferrer" className="as-btn-gold">
            💬 Commander sur WhatsApp
          </a>
          <Link to="/contact" className="as-btn-outline as-btn-outline--dark" style={{ marginLeft: '.6rem' }}>Poser une question</Link>
        </div>
      </div>
    </section>
  );
}
