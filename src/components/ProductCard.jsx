import React from 'react';
import { Link } from 'react-router-dom';
import { euro } from '../api.js';
import { CATEGORY_EMOJI } from '../constants.js';

export default function ProductCard({ product, badge, compact = false }) {
  return (
    <Link to={`/produit/${product.slug}`} className={compact ? 'as-mini-card' : 'as-product-card'}>
      <div className="as-product-media">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <span aria-hidden="true">{CATEGORY_EMOJI[product.category] || '🕯️'}</span>
        )}
        {badge && <span className="as-featured-badge">{badge}</span>}
      </div>
      <div className="as-product-body">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="as-product-foot">
          <strong>{euro(product.price)}</strong>
          <span>Voir la création →</span>
        </div>
      </div>
    </Link>
  );
}
