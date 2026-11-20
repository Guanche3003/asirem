import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../../api.js';

const SiteContext = React.createContext({ settings: {}, loading: true });
export const useSite = () => React.useContext(SiteContext);

const NAV = [
  { to: '/boutique', label: 'Créations' },
  { to: '/#galerie', label: 'Photos', external: true },
  { to: '/a-propos', label: 'Qui suis-je' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicLayout() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    api.get('/public/site')
      .then((data) => setSettings(data.settings || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const name = settings.shop_name || 'ASIREM COSMÉTIQUES';
  const whatsapp = settings.whatsapp || 'https://wa.me/33656695112';
  const compact = !isHome || scrolled;
  const navItems = NAV.map((item) =>
    item.external
      ? <a key={item.label} href={item.to} className="as-nav-link">{item.label}</a>
      : <NavLink key={item.label} to={item.to} className="as-nav-link">{item.label}</NavLink>,
  );

  return (
    <SiteContext.Provider value={{ settings, loading }}>
      <div className="as-site">
        <header className={`as-header ${compact ? 'as-header--compact' : 'as-header--hero'}`}>
          <div className="as-header-inner">
            <Link to="/" className={`as-brand ${compact ? 'as-brand--compact' : 'as-brand--hero'}`} aria-label={`${name} — accueil`}>
              {compact ? (
                <>
                  <img src="/icon-logo.png" alt="" />
                  <span>ASIREM</span>
                </>
              ) : (
                <img src="/logo.png" alt={name} />
              )}
            </Link>

            <nav className="as-nav" aria-label="Navigation principale">
              {navItems}
              <a className="as-nav-wa" href={whatsapp} target="_blank" rel="noopener noreferrer">
                💬 {settings.phone || '+33 6 56 69 51 12'}
              </a>
              <Link to="/boutique" className="as-nav-cta">🕯️ Boutique</Link>
            </nav>

            <button
              className="as-burger"
              type="button"
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileOpen}
              aria-controls="as-mobile-nav"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? '×' : '☰'}
            </button>
          </div>
          {mobileOpen && (
            <nav id="as-mobile-nav" className="as-mobile-nav" aria-label="Navigation mobile">
              <Link to="/">Accueil</Link>
              {navItems}
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">💬 Me contacter</a>
              <Link to="/boutique" className="as-nav-cta">Boutique</Link>
            </nav>
          )}
        </header>

        <main><Outlet /></main>

        <footer className="as-footer" id="contact">
          <div className="as-footer-inner">
            <div className="as-footer-brand">
              <Link to="/" className="as-brand" aria-label={`${name} — accueil`}>
                <img src="/logo.png" alt={name} />
              </Link>
              <p>Des bougies uniques, façonnées à la main pour sublimer chacun de vos instants.</p>
              <div className="as-socials">
                {settings.instagram && (
                  <a href="https://www.instagram.com/asiremcos/" target="_blank" rel="noopener noreferrer" aria-label="Instagram ASIREM">◎</a>
                )}
                <a href="https://www.tiktok.com/@asiremcosmetiques" target="_blank" rel="noopener noreferrer" aria-label="TikTok ASIREM">♪</a>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp ASIREM">✆</a>
              </div>
            </div>

            <div>
              <h4>Liens rapides</h4>
              <ul>
                <li><Link to="/">Accueil</Link></li>
                <li><Link to="/a-propos">Qui suis-je</Link></li>
                <li><Link to="/boutique">Mes créations</Link></li>
                <li><Link to="/#galerie">Photos</Link></li>
                <li><Link to="/editions-thematiques">Éditions thématiques</Link></li>
                {settings.website && <li><a href={settings.website} target="_blank" rel="noopener noreferrer">Boutique WooCommerce</a></li>}
              </ul>
            </div>

            <div>
              <h4>Légal</h4>
              <ul>
                <li><Link to="/cgv">Conditions Générales de Vente</Link></li>
                <li><Link to="/mentions-legales">Mentions légales</Link></li>
                <li><Link to="/politique-de-cookies">Politique de cookies</Link></li>
                <li><Link to="/admin">Espace atelier</Link></li>
              </ul>
            </div>

            <div>
              <h4>Contact</h4>
              <ul>
                <li><a href={whatsapp} target="_blank" rel="noopener noreferrer">{settings.phone || '+33 6 56 69 51 12'}</a></li>
                <li><a href={`mailto:${settings.email || 'contact@asirem-cosmetiques.fr'}`}>{settings.email || 'contact@asirem-cosmetiques.fr'}</a></li>
                <li>{settings.address}<br />{settings.zip} {settings.city}</li>
              </ul>
            </div>
          </div>
          <div className="as-footer-bottom">
            <span>© {new Date().getFullYear()} Asirem Cosmétiques — Tous droits réservés.</span>
            <span>SIRET {settings.siret || '—'}</span>
          </div>
        </footer>
      </div>
    </SiteContext.Provider>
  );
}
