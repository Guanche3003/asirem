import React from 'react';
import { Link } from 'react-router-dom';
import { GALLERY, VALUES } from '../../data/asirem.js';
import { useSite } from './PublicLayout.jsx';

export default function About() {
  const { settings } = useSite();
  return (
    <>
      <div className="as-page-hero">
        <span className="as-kicker">Qui suis-je</span>
        <h1>Derrière Asirem, c'est moi, <em>Syphax</em></h1>
        <p>{settings.tagline}</p>
      </div>
      <section className="as-section">
        <div className="as-about-grid">
          <div className="as-about-photos">
            <div className="as-about-main"><img src="/Syphax.jpg" alt="Syphax, artisan cirier" loading="lazy" /></div>
            <div className="as-about-detail"><img src="/Syphax2.jpg" alt="Syphax dans son atelier" loading="lazy" /></div>
          </div>
          <div className="as-about-copy">
            <span className="as-kicker">Mon histoire</span>
            <h2 className="as-section-title">Une chimie du parfum, <em>faite main</em></h2>
            <div className="as-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <p>{settings.about}</p>
            <p>{settings.description}</p>
            <div className="as-about-stats">
              <div><strong>100 %</strong><span>Naturel</span></div>
              <div><strong>100 %</strong><span>Satisfaction</span></div>
              <div><strong>Artisan</strong><span>Passionné</span></div>
            </div>
            <Link to="/boutique" className="as-btn-gold">Découvrir la boutique →</Link>
          </div>
        </div>
      </section>
      <section className="as-band as-band--dark">
        <div className="as-section">
          <div className="as-section-head">
            <span className="as-kicker">Nos engagements</span>
            <h2 className="as-section-title">Des valeurs qui nous <em>animent</em></h2>
          </div>
          <div className="as-values">
            {VALUES.map((value) => (
              <div className="as-value" key={value.title}>
                <div className="as-value-icon" aria-hidden="true">{value.icon}</div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="as-section">
        <div className="as-section-head">
          <span className="as-kicker">En images</span>
          <h2 className="as-section-title">Un aperçu de mes <em>créations</em></h2>
        </div>
        <div className="as-product-grid">
          {GALLERY.slice(1, 4).map((item) => (
            <div className="as-product-card" key={item.id}>
              <div className="as-product-media"><img src={item.src} alt={item.title} loading="lazy" /></div>
              <div className="as-product-body"><h3>{item.title}</h3><p>{item.desc}</p></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
