import React, { useState } from 'react';
import { api } from '../../api.js';
import { useSite } from './PublicLayout.jsx';

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' };

export default function Contact() {
  const { settings } = useSite();
  const fullAddress = [settings.address, [settings.zip, settings.city].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError(''); setSuccess(''); setBusy(true);
    try {
      const data = await api.post('/public/contact', form);
      setSuccess(data.message || 'Votre message a bien été envoyé.');
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="as-page-hero">
        <span className="as-kicker">Contact</span>
        <h1>Parlons de votre <em>prochaine bougie</em></h1>
        <p>Une question sur une création, un projet de cadeau ou une commande spéciale ? Syphax vous répond avec plaisir.</p>
      </div>
      <section className="as-section">
        <div className="as-contact-grid">
          <div className="as-contact-aside">
            <h2>L'atelier</h2>
            {fullAddress && <div className="as-info-row"><i aria-hidden="true">📍</i><div>{fullAddress}</div></div>}
            <div className="as-info-row"><i aria-hidden="true">✉️</i><div><a href={`mailto:${settings.email}`}>{settings.email}</a></div></div>
            <div className="as-info-row"><i aria-hidden="true">📞</i><div><a href={settings.whatsapp} target="_blank" rel="noopener noreferrer">{settings.phone}</a></div></div>
            <div className="as-info-row"><i aria-hidden="true">🕐</i><div>{settings.hours}</div></div>
            {settings.instagram && <div className="as-info-row"><i aria-hidden="true">📷</i><div>{settings.instagram}</div></div>}
            <p style={{ fontSize: '.8rem', color: 'var(--ink-faint)', marginTop: '1.2rem' }}>
              Nous répondons généralement sous 48 h ouvrées.
            </p>
          </div>

          <div className="as-contact-aside as-form">
            <h2>Envoyer un message</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: '.88rem', marginBottom: '1.5rem' }}>
              Tous les champs marqués d'un astérisque sont obligatoires.
            </p>
            {error && <p className="alert alert-error" role="alert">{error}</p>}
            {success && <p className="alert alert-success" role="status">{success}</p>}
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="contact-name">Votre nom <span className="req">*</span></label>
                  <input id="contact-name" value={form.name} onChange={update('name')} required placeholder="Camille Durand" />
                </div>
                <div className="field">
                  <label htmlFor="contact-email">Votre e-mail <span className="req">*</span></label>
                  <input id="contact-email" type="email" value={form.email} onChange={update('email')} required placeholder="camille@email.fr" />
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="contact-phone">Téléphone</label>
                  <input id="contact-phone" value={form.phone} onChange={update('phone')} placeholder="06 12 34 56 78" />
                </div>
                <div className="field">
                  <label htmlFor="contact-subject">Sujet</label>
                  <input id="contact-subject" value={form.subject} onChange={update('subject')} placeholder="Commande, question…" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="contact-message">Votre message <span className="req">*</span></label>
                <textarea id="contact-message" value={form.message} onChange={update('message')} required placeholder="Bonjour, je souhaiterais…" />
              </div>
              <button className="as-btn-gold" type="submit" disabled={busy} aria-busy={busy}>
                {busy ? 'Envoi en cours…' : 'Envoyer mon message →'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
