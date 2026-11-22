import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const NAV = [
  { section: 'Pilotage' },
  { to: '/admin', label: 'Tableau de bord', icon: '◫', end: true },
  { to: '/admin/calcul', label: 'Calcul & marges', icon: '∑' },
  { section: 'Catalogue' },
  { to: '/admin/produits', label: 'Produits', icon: '🕯️' },
  { to: '/admin/matieres', label: 'Matières premières', icon: '⚗️' },
  { to: '/admin/evenements', label: 'Évènements', icon: '📅' },
  { to: '/admin/custom', label: 'Bougie customisée', icon: '🎨', badge: 'custom' },
  { section: 'Relations' },
  { to: '/admin/clients', label: 'Clients', icon: '👥' },
  { to: '/admin/fournisseurs', label: 'Fournisseurs', icon: '🚚' },
  { to: '/admin/commandes', label: 'Commandes', icon: '📦' },
  { to: '/admin/contacts', label: 'Messages', icon: '✉️', badge: true },
  { section: 'Configuration' },
  { to: '/admin/parametres', label: 'Paramètres', icon: '⚙️' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [newContacts, setNewContacts] = useState(0);
  const [newCustom, setNewCustom] = useState(0);

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        return Promise.allSettled([api.get('/contacts'), api.get('/custom-requests')])
          .then(([contacts, custom]) => {
            if (!active) return;
            if (contacts.status === 'fulfilled') {
              setNewContacts((contacts.value.items || []).filter((c) => c.status === 'nouveau').length);
            }
            if (custom.status === 'fulfilled') {
              setNewCustom((custom.value.items || []).filter((c) => c.status === 'nouvelle').length);
            }
          });
      })
      .catch(() => { if (active) navigate('/admin/login', { replace: true }); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [navigate, location.pathname]);

  const logout = async () => {
    try { await api.post('/auth/logout', {}); } catch { /* ignore */ }
    navigate('/admin/login', { replace: true });
  };

  if (!ready) return <div className="login-wrap"><div className="spinner" style={{ borderColor: '#a9652d', borderTopColor: 'transparent' }} /></div>;

  const titles = {
    '/admin': ['Tableau de bord', 'Vue d’ensemble de l’atelier'],
    '/admin/calcul': ['Calcul & marges', 'Coût des matières premières et rentabilité'],
    '/admin/produits': ['Produits', 'Catalogue, prix et recettes de fabrication'],
    '/admin/matieres': ['Matières premières', 'Stocks, coûts et fournisseurs'],
    '/admin/evenements': ['Évènements', 'Dates, lieux et photos du site public'],
    '/admin/custom': ['Bougie customisée', 'Options du configurateur et demandes reçues'],
    '/admin/clients': ['Clients', 'Fiches et coordonnées'],
    '/admin/fournisseurs': ['Fournisseurs', 'Partenaires et coordonnées'],
    '/admin/commandes': ['Commandes', 'Suivi et préparation'],
    '/admin/contacts': ['Messages', 'Demandes reçues depuis le site'],
    '/admin/parametres': ['Paramètres', 'Site public et compte administrateur'],
  };
  const [title, subtitle] = titles[location.pathname] || ['Atelier', ''];

  return (
    <div className="admin-app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/icon-logo.png" alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
          <div><strong>ASIREM CRM</strong><small>Atelier bougier</small></div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item, index) => item.section ? (
            <div className="sidebar-section" key={`s-${index}`}>{item.section}</div>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ico">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (item.badge === 'custom' ? newCustom : newContacts) > 0 && (
                <span className="pill">{item.badge === 'custom' ? newCustom : newContacts}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer"><Link to="/" target="_blank">Voir le site ↗</Link></div>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-sub">{subtitle}</div>
          </div>
          <div className="topbar-actions">
            <span className="muted" style={{ fontSize: '.8rem' }}>{user?.username || 'admin'}</span>
            <span className="avatar">{(user?.username || 'A')[0].toUpperCase()}</span>
            <button className="btn btn-light btn-small" onClick={logout}>Déconnexion</button>
          </div>
        </header>
        <div className="admin-content"><Outlet /></div>
      </div>
    </div>
  );
}
