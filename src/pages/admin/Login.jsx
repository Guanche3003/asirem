import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Alert, Field } from '../../components/UI.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/auth/login', form);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand"><img src="/icon-logo.png" alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} /><strong>ASIREM CRM</strong></div>
        <h1>Bon retour à l'atelier</h1>
        <p>Connectez-vous pour gérer vos produits, stocks et clients.</p>
        <Alert kind="error">{error}</Alert>
        <form onSubmit={submit}>
          <Field label="Identifiant" required>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" required autoFocus />
          </Field>
          <Field label="Mot de passe" required>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
          </Field>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '.6rem' }} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Se connecter →'}
          </button>
        </form>
        <div className="login-hint">
          Identifiants de démonstration : <strong>admin</strong> / <strong>Atelier2026!</strong><br />
          Vous pourrez les modifier dans Paramètres.
        </div>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}><a className="muted" style={{ fontSize: '.8rem' }} href="/">← Retour au site</a></div>
      </div>
    </div>
  );
}
