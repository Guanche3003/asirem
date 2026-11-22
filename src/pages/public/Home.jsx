import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, euro } from '../../api.js';
import { GALLERY, TESTIMONIALS, VALUES } from '../../data/asirem.js';
import { useSite } from './PublicLayout.jsx';
import ProductCard from '../../components/ProductCard.jsx';

function formatEventDate(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 3 || !parts.every((part) => /^\d+$/.test(part))) return value || 'Date à confirmer';
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function eventDateParts(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 3 || !parts.every((part) => /^\d+$/.test(part))) return { day: '—', month: '' };
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return {
    day: date.toLocaleDateString('fr-FR', { day: '2-digit' }),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase(),
  };
}

export default function Home() {
  const { settings } = useSite();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    Promise.all([api.get('/public/products'), api.get('/public/events')])
      .then(([productData, eventData]) => {
        setProducts(productData.items || []);
        setEvents(eventData.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }, [location.hash]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);

  const featured = products.find((p) => p.slug === 'coffret-decouverte')
    || products.find((p) => p.featured)
    || products[0];
  const latest = products.filter((p) => p.id !== featured?.id).slice(0, 2);

  const today = new Date().toISOString().slice(0, 10);
  const nextEvent = events.find((event) => !event.event_date || event.event_date >= today) || events[0];
  const isUpcoming = nextEvent && (!nextEvent.event_date || nextEvent.event_date >= today);
  const eventParts = eventDateParts(nextEvent?.event_date);

  const subscribe = async (event) => {
    event.preventDefault();
    try {
      await api.post('/public/contact', {
        name: 'Inscrit newsletter',
        email: newsletterEmail,
        subject: 'Newsletter',
        message: 'Souhaite recevoir les nouveautés ASIREM COSMÉTIQUES.',
      });
      setNewsletterDone(true);
      setNewsletterEmail('');
    } catch {
      setNewsletterDone(false);
    }
  };

  return (
    <>
      <section className="as-hero" id="accueil">
        <video
          className="as-hero-video"
          autoPlay muted loop playsInline preload="auto"
          poster={settings.hero_image || '/galerie/Bougies%20stand.jpg'}
          aria-hidden="true"
        >
          <source src={settings.hero_video || '/videos/fond.webm'} type="video/webm" />
        </video>
        <div className="as-hero-overlay" aria-hidden="true" />
        <div className="as-hero-inner">
          <div className="as-hero-content">
            <span className="as-hero-badge">✦ Artisan créateur de bougies</span>
            <h1>
              Des <em>bougies uniques</em>,<br />
              façonnées à la main<br />
              pour sublimer vos instants.
            </h1>
            <p className="as-hero-lead">
              {settings.description || 'Bougies artisanales et parfums soignés conçus pour sublimer votre quotidien.'}
            </p>
            <div className="as-hero-actions">
              <Link to="/boutique" className="as-btn-gold">Accéder à la boutique →</Link>
              <Link to="/a-propos" className="as-btn-outline">Découvrir mon histoire</Link>
              <a href={settings.whatsapp || 'https://wa.me/33656695112'} target="_blank" rel="noopener noreferrer" className="as-btn-outline">
                💬 Me contacter
              </a>
            </div>
            <div className="as-hero-trust">
              <span>✦ Parfum de Grasse</span><i aria-hidden="true" />
              <span>✦ 100 % Naturel</span><i aria-hidden="true" />
              <span>🌿 Éco-responsable</span>
            </div>
            <div className="as-rating">
              <span aria-hidden="true">★ ★ ★ ★ ★</span> Trustpilot <small>5/5</small>
            </div>
          </div>

          {(featured || nextEvent) && (
            <div className="as-hero-highlights">
              {featured && (
                <Link to={`/produit/${featured.slug}`} className="as-hero-product" aria-label={`Découvrir ${featured.name}`}>
                  <span className="as-hero-product-media">
                    {featured.image_url
                      ? <img src={featured.image_url} alt="" />
                      : <span aria-hidden="true">🕯️</span>}
                  </span>
                  <span className="as-hero-product-copy">
                    <span className="as-hero-product-kicker">✦ Bougie du moment</span>
                    <strong className="as-hero-product-title">{featured.name}</strong>
                    <span className="as-hero-product-meta">{featured.description}</span>
                  </span>
                  <span className="as-hero-product-foot">
                    <strong>{euro(featured.price)}</strong>
                    <span>Voir la création →</span>
                  </span>
                </Link>
              )}

              {nextEvent && (
                <Link to="/#evenements" className="as-hero-event" aria-label="Voir tous les évènements">
                  <span className="as-hero-event-media">
                    {nextEvent.image_url
                      ? <img src={nextEvent.image_url} alt="" />
                      : <span aria-hidden="true">📅</span>}
                    <span className="as-hero-event-day" aria-hidden="true">
                      <strong>{eventParts.day}</strong>
                      <small>{eventParts.month}</small>
                    </span>
                  </span>
                  <span className="as-hero-event-copy">
                    <span className="as-hero-event-kicker">✦ {isUpcoming ? 'Prochain rendez-vous' : 'Évènement à découvrir'}</span>
                    <strong className="as-hero-event-title">{nextEvent.title}</strong>
                    <span className="as-hero-event-meta">
                      {nextEvent.event_date && `📅 ${formatEventDate(nextEvent.event_date)}`}
                      {nextEvent.location && ` · 📍 ${nextEvent.location}`}
                    </span>
                  </span>
                  <span className="as-hero-event-cta">Tous les évènements <span aria-hidden="true">↓</span></span>
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="as-bars as-hero-bars" aria-hidden="true">
          <span /><span /><span /><span /><span /><span /><span />
        </div>
      </section>

      <section className="as-band as-band--paper as-events-band" id="evenements">
        <div className="as-section">
          <div className="as-section-head">
            <span className="as-kicker">Évènements</span>
            <h2 className="as-section-title">Retrouvez-moi <em>en vrai</em></h2>
            <div className="as-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <p className="as-section-text">
              Marchés, salons et ateliers : voici les prochaines occasions de découvrir les bougies ASIREM et de repartir avec votre parfum préféré.
            </p>
          </div>
          {events.length > 0 ? (
            <div className="as-events-grid">
              {events.map((event) => (
                <article className="as-event-card" key={event.id}>
                  <div className="as-event-media">
                    {event.image_url
                      ? <img src={event.image_url} alt={event.title} loading="lazy" />
                      : <span aria-hidden="true">📅</span>}
                  </div>
                  <div className="as-event-body">
                    <time className="as-event-date" dateTime={event.event_date || undefined}>
                      {formatEventDate(event.event_date)}
                    </time>
                    <h3>{event.title}</h3>
                    {event.location && <p className="as-event-location">📍 {event.location}</p>}
                    {event.description && <p className="as-event-desc">{event.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="as-empty"><p>Aucun évènement annoncé pour le moment. Revenez bientôt !</p></div>
          )}
        </div>
      </section>

      <section className="as-band as-band--dark" id="valeurs">
        <div className="as-section">
          <div className="as-section-head">
            <span className="as-kicker">Nos engagements</span>
            <h2 className="as-section-title">Des valeurs qui nous <em>animent</em></h2>
            <div className="as-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div>
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

      <section className="as-band as-band--soft" id="produits">
        <div className="as-section">
          <div className="as-section-head">
            <span className="as-kicker">Mes créations</span>
            <h2 className="as-section-title">Des parfums pensés pour <em>éveiller vos sens</em></h2>
            <div className="as-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <p className="as-section-text">
              Chaque parfum est pensé pour éveiller vos sens et raconter une histoire unique,
              confectionné à la commande dans mon atelier.
            </p>
          </div>

          {loading ? (
            <div className="as-empty">Chargement des créations…</div>
          ) : (
            <>
              {featured && (
                <Link to={`/produit/${featured.slug}`} className="as-featured">
                  <div className="as-featured-media">
                    <video autoPlay muted loop playsInline aria-hidden="true">
                      <source src={settings.featured_video || '/videos/coffret.mp4'} type="video/mp4" />
                    </video>
                    <span className="as-featured-badge">Déjà plus de 10 ventes</span>
                  </div>
                  <div className="as-featured-copy">
                    <span className="as-kicker">Nos coups de cœur</span>
                    <h3>{featured.name}</h3>
                    <p>{featured.description}</p>
                    <span className="as-price">{euro(featured.price)}</span>
                    <span className="as-btn-gold">🕯️ Voir le coffret</span>
                  </div>
                </Link>
              )}

              {latest.length > 0 && (
                <>
                  <div className="as-subhead"><span>Ventes du moment</span><i aria-hidden="true" /></div>
                  <div className="as-product-row">
                    {latest.map((product) => <ProductCard key={product.id} product={product} compact badge="Nouveauté" />)}
                  </div>
                </>
              )}

              <div className="as-center">
                <Link to="/boutique" className="as-btn-gold">Découvrir tous les produits →</Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="as-band as-band--custom" id="bougie-custom">
        <div className="as-section as-custom-callout">
          <div className="as-custom-callout-copy">
            <span className="as-kicker">Bougie sur mesure</span>
            <h2 className="as-section-title">Votre bougie, <em>votre histoire</em></h2>
            <div className="as-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <p className="as-section-text">
              Parfum, couleur, décoration… et le petit mot qui apparaîtra sur l’étiquette : composez une bougie rien que pour vous ou pour offrir.
            </p>
            <Link to="/creer-ma-bougie" className="as-btn-gold">🎨 Créer ma bougie →</Link>
          </div>
          <div className="as-custom-callout-visual" aria-hidden="true">
            <div className="as-custom-candle">
              <div className="as-custom-candle-wax" />
              <div className="as-custom-candle-label">
                <span>💜</span>
                <strong>Un peu de lumière pour toi</strong>
                <small>ASIREM COSMÉTIQUES</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="as-band as-band--paper" id="a-propos">
        <div className="as-section">
          <div className="as-about-grid">
            <div className="as-about-photos">
              <div className="as-about-main"><img src="/Syphax.jpg" alt="Syphax, artisan cirier ASIREM" loading="lazy" /></div>
              <div className="as-about-detail"><img src="/Syphax2.jpg" alt="Syphax dans son atelier" loading="lazy" /></div>
            </div>
            <div className="as-about-copy">
              <span className="as-kicker">Qui suis-je</span>
              <h2 className="as-section-title">Derrière Asirem, c'est moi, <em>Syphax</em></h2>
              <div className="as-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div>
              <p>{settings.about}</p>
              <div className="as-about-stats">
                <div><strong>100 %</strong><span>Naturel</span></div>
                <div><strong>100 %</strong><span>Satisfaction</span></div>
                <div><strong>Artisan</strong><span>Passionné</span></div>
              </div>
              <Link to="/a-propos" className="as-btn-outline as-btn-outline--dark">En savoir plus</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="as-band as-band--soft" id="galerie">
        <div className="as-section">
          <div className="as-section-head">
            <span className="as-kicker">Galerie</span>
            <h2 className="as-section-title">Un aperçu de mes <em>créations</em></h2>
            <div className="as-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div>
          </div>
        </div>
        <div className="as-gallery-track" aria-label="Galerie des créations">
          {GALLERY.map((item) => (
            <button
              className="as-gallery-card"
              type="button"
              key={item.id}
              onClick={() => setSelected(item)}
              aria-label={`Voir ${item.title} en grand`}
            >
              <img src={item.src} alt={item.title} loading="lazy" />
              <span className="as-gallery-caption"><strong>{item.title}</strong><small>{item.desc}</small></span>
            </button>
          ))}
        </div>
      </section>

      <dialog
        ref={dialogRef}
        className="as-lightbox"
        onClose={() => setSelected(null)}
        onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}
        aria-label={selected ? `Création ${selected.title}` : 'Détail de la création'}
      >
        {selected && (
          <div className="as-lightbox-inner">
            <img src={selected.src} alt={selected.title} />
            <div className="as-lightbox-copy">
              <span className="as-kicker">Création</span>
              <h3>{selected.title}</h3>
              <p>{selected.desc}</p>
              <button type="button" className="as-lightbox-close" onClick={() => setSelected(null)}>Fermer ×</button>
            </div>
          </div>
        )}
      </dialog>

      <section className="as-band as-band--soft" id="temoignages">
        <div className="as-section">
          <div className="as-testimonials">
            <div>
              <span className="as-kicker">Témoignages</span>
              <h2 className="as-section-title">100 % de satisfaction <em>clients</em></h2>
              <div className="as-rating" style={{ marginTop: 0, color: '#00b67a' }}>
                <span aria-hidden="true">★ ★ ★ ★ ★</span> Trustpilot <small>5/5</small>
              </div>
              <p className="as-section-text" style={{ marginTop: '1rem' }}>
                Nos bougies sont testées et approuvées par notre communauté. Découvrez leur expérience avec ASIREM.
              </p>
            </div>
            <div className="as-testimonial-list">
              {TESTIMONIALS.map((testimonial) => (
                <blockquote className="as-testimonial" key={testimonial.id}>
                  <span className="as-stars" aria-label={`${testimonial.rating} sur 5`}>★★★★★</span>
                  <p>« {testimonial.text} »</p>
                  <footer><strong>{testimonial.name}</strong><span>{testimonial.location}</span></footer>
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="as-newsletter">
        <img className="as-newsletter-bg" src="/galerie/Stand%202.jpg" alt="" aria-hidden="true" loading="lazy" />
        <div className="as-section">
          <span className="as-kicker">Newsletter</span>
          <h2 className="as-section-title">Restez <em>inspiré(e)</em></h2>
          <p className="as-section-text">
            Inscrivez-vous pour découvrir nos nouvelles collections en avant-première,
            recevoir des conseils bien-être et profiter d'offres exclusives.
          </p>
          <form className="as-newsletter-form" onSubmit={subscribe}>
            <label className="as-visually-hidden" htmlFor="newsletter-email">Votre adresse e-mail</label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="Votre adresse email"
              value={newsletterEmail}
              onChange={(event) => setNewsletterEmail(event.target.value)}
            />
            <button className="as-btn-gold" type="submit" disabled={newsletterDone}>S'inscrire →</button>
          </form>
          {newsletterDone && <p className="as-newsletter-note" role="status">Merci ! Votre inscription est enregistrée.</p>}
        </div>
      </section>
    </>
  );
}
