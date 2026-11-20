import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Field, Alert } from '../../components/UI.jsx';

const KEYS = [
  ['shop_name', 'Nom de la boutique'], ['tagline', 'Accroche'], ['description', 'Description courte'],
  ['about', 'Texte À propos'], ['email', 'E-mail public'], ['phone', 'Téléphone / WhatsApp'],
  ['address', 'Adresse'], ['zip', 'Code postal'], ['city', 'Ville'],
  ['legal_name', 'Raison sociale'], ['siret', 'SIRET'], ['siren', 'SIREN'],
  ['vat_number', 'TVA intracommunautaire'], ['rcs', 'RCS'], ['ape', 'Code APE/NAF'],
  ['hours', 'Horaires'], ['instagram', 'Instagram'], ['website', 'Boutique en ligne'],
  ['whatsapp', 'Lien WhatsApp'], ['tiktok', 'TikTok'], ['logo', 'Logo (URL)'],
  ['hero_video', 'Vidéo d’accueil (URL)'], ['hero_image', 'Image d’accueil (URL)'],
  ['featured_video', 'Vidéo coup de cœur (URL)'],
  ['currency', 'Devise'], ['vat_rate', 'TVA (%)'], ['margin_coefficient', 'Coefficient prix conseillé'],
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then((d) => setSettings(d.settings || {})).catch((e) => setError(e.message));
  }, []);

  const saveSite = async () => {
    setSaving(true); setError(''); setNotice('');
    try { await api.put('/settings', { settings }); setNotice('Paramètres du site enregistrés.'); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    setError(''); setNotice('');
    if (password.next !== password.confirm) return setError('Les deux nouveaux mots de passe ne correspondent pas.');
    try {
      await api.put('/auth/password', { current: password.current, next: password.next });
      setPassword({ current: '', next: '', confirm: '' });
      setNotice('Mot de passe modifié.');
    } catch (e) { setError(e.message); }
  };

  return (
    <>
      <div className="page-head"><div><h1>Paramètres</h1><p>Contenu affiché sur le site public et accès à l'administration.</p></div></div>
      <Alert kind="error">{error}</Alert>
      <Alert kind="success">{notice}</Alert>

      <div className="card" style={{ marginBottom: '1.3rem' }}>
        <div className="card-head"><span className="card-title">Informations du site public</span><span className="card-sub">Modifications visibles immédiatement</span></div>
        <div className="card-body">
          <div className="form-grid">
            {KEYS.filter(([key]) => !['description', 'about'].includes(key)).map(([key, label]) => (
              <Field key={key} label={label}>
                <input value={settings[key] || ''} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
              </Field>
            ))}
          </div>
          <Field label="Description courte"><textarea value={settings.description || ''} onChange={(e) => setSettings({ ...settings, description: e.target.value })} /></Field>
          <Field label="Texte À propos"><textarea value={settings.about || ''} onChange={(e) => setSettings({ ...settings, about: e.target.value })} /></Field>
          <div className="form-actions"><button className="btn btn-primary" onClick={saveSite} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}</button></div>
        </div>
      </div>

      <div className="grid-2 equal">
        <div className="card">
          <div className="card-head"><span className="card-title">Identifiant administrateur</span></div>
          <div className="card-body">
            <Field label="Identifiant" hint="Le mot de passe se modifie dans le bloc ci-contre.">
              <input value={settings.admin_username || ''} onChange={(e) => setSettings({ ...settings, admin_username: e.target.value })} />
            </Field>
            <button className="btn btn-light btn-small" onClick={saveSite} disabled={saving}>Enregistrer l'identifiant</button>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><span className="card-title">Changer le mot de passe</span></div>
          <div className="card-body">
            <Field label="Mot de passe actuel"><input type="password" value={password.current} onChange={(e) => setPassword({ ...password, current: e.target.value })} /></Field>
            <div className="form-grid">
              <Field label="Nouveau mot de passe" hint="8 caractères minimum"><input type="password" value={password.next} onChange={(e) => setPassword({ ...password, next: e.target.value })} /></Field>
              <Field label="Confirmer"><input type="password" value={password.confirm} onChange={(e) => setPassword({ ...password, confirm: e.target.value })} /></Field>
            </div>
            <button className="btn btn-primary btn-small" onClick={savePassword}>Modifier le mot de passe</button>
          </div>
        </div>
      </div>
    </>
  );
}
