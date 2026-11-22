import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import PublicLayout from './pages/public/PublicLayout.jsx';
import Home from './pages/public/Home.jsx';
import Catalog from './pages/public/Catalog.jsx';
import ProductDetail from './pages/public/ProductDetail.jsx';
import About from './pages/public/About.jsx';
import Contact from './pages/public/Contact.jsx';
import { EditionsThematiques, LegalPage } from './pages/public/InfoPages.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import Login from './pages/admin/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Calculator from './pages/admin/Calculator.jsx';
import Products from './pages/admin/Products.jsx';
import Materials from './pages/admin/Materials.jsx';
import Customers from './pages/admin/Customers.jsx';
import Suppliers from './pages/admin/Suppliers.jsx';
import Orders from './pages/admin/Orders.jsx';
import Contacts from './pages/admin/Contacts.jsx';
import Settings from './pages/admin/Settings.jsx';
import Events from './pages/admin/Events.jsx';
// Konva + Motion ne sont chargés que sur les pages du configurateur.
const AdminCustomizer = lazy(() => import('./pages/admin/Customizer.jsx'));
const PublicCustomizer = lazy(() => import('./pages/public/Customizer.jsx'));

function NotFound() {
  return (
    <div className="as-empty" style={{ padding: '9rem 1rem' }}>
      <h1 style={{ fontSize: '2.4rem', marginBottom: '.6rem' }}>Page introuvable</h1>
      <p>La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <Link to="/" className="as-btn-gold">Retour à l'accueil</Link>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="as-empty" role="status">Chargement…</div>}>
    <Routes>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="calcul" element={<Calculator />} />
        <Route path="produits" element={<Products />} />
        <Route path="matieres" element={<Materials />} />
        <Route path="clients" element={<Customers />} />
        <Route path="fournisseurs" element={<Suppliers />} />
        <Route path="commandes" element={<Orders />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="evenements" element={<Events />} />
        <Route path="custom" element={<AdminCustomizer />} />
        <Route path="parametres" element={<Settings />} />
      </Route>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/boutique" element={<Catalog />} />
        <Route path="/creer-ma-bougie" element={<PublicCustomizer />} />
        <Route path="/produit/:slug" element={<ProductDetail />} />
        <Route path="/a-propos" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/mentions-legales" element={<LegalPage page="mentions-legales" />} />
        <Route path="/cgv" element={<LegalPage page="cgv" />} />
        <Route path="/politique-de-cookies" element={<LegalPage page="politique-de-cookies" />} />
        <Route path="/editions-thematiques" element={<EditionsThematiques />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
