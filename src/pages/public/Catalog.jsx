import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { labelOf, PRODUCT_CATEGORIES } from '../../constants.js';
import ProductCard from '../../components/ProductCard.jsx';

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [active, setActive] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/public/products${active ? `?category=${encodeURIComponent(active)}` : ''}`)
      .then((data) => {
        setProducts(data.items || []);
        setCategories(data.categories || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [active]);

  return (
    <>
      <div className="as-page-hero">
        <span className="as-kicker">La boutique</span>
        <h1>Mes créations</h1>
        <p>Bougies artisanales, fondants et diffuseurs : découvrez toutes les créations de l'atelier avec leurs prix.</p>
      </div>
      <section className="as-section">
        <div className="as-filters" aria-label="Filtrer par catégorie">
          <button type="button" className={`as-filter${!active ? ' active' : ''}`} onClick={() => setActive('')}>Tout voir</button>
          {categories.map((cat) => (
            <button key={cat} type="button" className={`as-filter${active === cat ? ' active' : ''}`} onClick={() => setActive(cat)}>
              {labelOf(PRODUCT_CATEGORIES, cat)}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="as-empty">Chargement des créations…</div>
        ) : products.length === 0 ? (
          <div className="as-empty">
            <p>Aucune création dans cette catégorie pour le moment.</p>
            <button type="button" className="as-btn-outline as-btn-outline--dark" onClick={() => setActive('')}>Voir toutes les créations</button>
          </div>
        ) : (
          <div className="as-product-grid">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </>
  );
}
