import React, { useEffect, useMemo, useState } from 'react';
import { api, euro } from '../../api.js';
import { useSite } from './PublicLayout.jsx';

const EMOJI_SUGGESTIONS = ['💜', '🌸', '✨', '🎁', '🕯️', '💫', '🥰', '🌿', '🎉', '🤍', '🍊', '⭐'];
const EMPTY_FORM = { customer_name: '', email: '', phone: '', message: '' };

export default function Customizer() {
  const { settings } = useSite();
  const [data, setData] = useState({ categories: [], base_price: 0, intro: '' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selection, setSelection] = useState({});
  const [phrase, setPhrase] = useState('');
  const [emoji, setEmoji] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true); setLoadError('');
    api.get('/public/custom-options')
      .then((result) => setData({
        categories: result.categories || [],
        base_price: Number(result.base_price) || 0,
        intro: result.intro || '',
      }))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const selectedOptions = useMemo(() => data.categories.flatMap((category) =>
    (selection[category.value] || [])
      .map((id) => category.items.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => ({ ...item, category: category.value, categoryLabel: category.label })),
  ), [data.categories, selection]);

  const extra = selectedOptions.reduce((sum, item) => sum + (Number(item.extra_price) || 0), 0);
  const price = data.base_price + extra;
  const whatsapp = settings.whatsapp || 'https://wa.me/33656695112';

  const toggle = (category, option) => {
    setSelection((current) => {
      const ids = current[category.value] || [];
      if (category.multiple) {
        return {
          ...current,
          [category.value]: ids.includes(option.id) ? ids.filter((id) => id !== option.id) : [...ids, option.id],
        };
      }
      return { ...current, [category.value]: ids.includes(option.id) ? [] : [option.id] };
    });
  };

  const updateForm = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError(''); setSuccess(null); setSubmitting(true);
    try {
      const result = await api.post('/public/custom-requests', {
        ...form,
        selections: selectedOptions.map((item) => ({ id: item.id })),
        label_phrase: phrase.trim(),
        label_emoji: emoji.trim(),
      });
      setSuccess(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSelection({}); setPhrase(''); setEmoji(''); setForm(EMPTY_FORM); setSuccess(null); setError('');
  };

  const whatsappHref = () => {
    const lines = [
      'Bonjour, je souhaite créer une bougie personnalisée :',
      ...selectedOptions.map((item) => `• ${item.categoryLabel} : ${item.name}`),
      phrase.trim() && `• Étiquette : « ${phrase.trim()} » ${emoji.trim()}`.trim(),
      `Prix estimé : ${euro(price)}`,
    ].filter(Boolean);
    return `${whatsapp}${whatsapp.includes('?') ? '&' : '?'}text=${encodeURIComponent(lines.join('\n'))}`;
  };

  const steps = data.categories.filter((category) => category.items.length > 0);

  return (
    <>
      <div className="as-page-hero as-custom-hero">
        <span className="as-kicker">Atelier sur mesure</span>
        <h1>Créez votre bougie <em>à votre image</em></h1>
        <p>
          {data.intro || 'Choisissez votre parfum, votre couleur et votre décoration, puis écrivez le petit mot qui rendra votre bougie unique.'}
        </p>
      </div>

      <section className="as-section as-custom-section">
        {loading ? (
          <div className="as-empty" role="status">Chargement des options…</div>
        ) : loadError ? (
          <div className="as-empty">
            <p>Impossible de charger les options : {loadError}</p>
            <button type="button" className="as-btn-gold" onClick={load}>Réessayer</button>
          </div>
        ) : (
          <div className="as-custom-layout">
            <div className="as-custom-steps">
              {steps.map((category, index) => (
                <div className="as-custom-step" key={category.value}>
                  <div className="as-custom-step-head">
                    <span className="as-custom-step-num">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h2><span aria-hidden="true">{category.emoji}</span> {category.label}</h2>
                      <p>{category.multiple ? 'Choisissez celles qui vous plaisent (plusieurs possibles).' : 'Choisissez une option.'}</p>
                    </div>
                  </div>
                  <div className="as-option-grid">
                    {category.items.map((option) => {
                      const active = (selection[category.value] || []).includes(option.id);
                      return (
                        <button
                          type="button"
                          key={option.id}
                          className={`as-option-card${active ? ' is-selected' : ''}`}
                          aria-pressed={active}
                          onClick={() => toggle(category, option)}
                        >
                          <span className="as-option-media" aria-hidden="true">
                            {option.image_url
                              ? <img src={option.image_url} alt="" loading="lazy" />
                              : <span>{option.icon || '✦'}</span>}
                            {active && <span className="as-option-check">✓</span>}
                          </span>
                          <strong>{option.name}</strong>
                          {option.description && <small>{option.description}</small>}
                          {option.extra_price > 0 && <span className="as-option-price">+ {euro(option.extra_price)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="as-custom-step">
                <div className="as-custom-step-head">
                  <span className="as-custom-step-num">{String(steps.length + 1).padStart(2, '0')}</span>
                  <div>
                    <h2><span aria-hidden="true">✍️</span> Votre étiquette</h2>
                    <p>Une phrase courte et un emoji, imprimés sur l’étiquette de votre bougie.</p>
                  </div>
                </div>
                <div className="as-label-form">
                  <div className="field">
                    <label htmlFor="custom-phrase">Votre phrase <span className="req">*</span></label>
                    <input
                      id="custom-phrase"
                      value={phrase}
                      maxLength={60}
                      onChange={(event) => setPhrase(event.target.value)}
                      placeholder="Ex. : Un peu de lumière pour toi"
                    />
                    <small>{phrase.length}/60 caractères</small>
                  </div>
                  <div className="field">
                    <label htmlFor="custom-emoji">Votre emoji</label>
                    <input
                      id="custom-emoji"
                      value={emoji}
                      maxLength={8}
                      onChange={(event) => setEmoji(event.target.value)}
                      placeholder="💜"
                    />
                    <div className="as-emoji-picker" aria-label="Emojis suggérés">
                      {EMOJI_SUGGESTIONS.map((item) => (
                        <button
                          type="button"
                          key={item}
                          onClick={() => setEmoji(item)}
                          aria-label={`Choisir l’emoji ${item}`}
                          className={emoji === item ? 'is-selected' : ''}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="as-custom-summary" aria-label="Récapitulatif de votre bougie">
              <div className="as-custom-preview">
                <div className="as-custom-candle" aria-hidden="true">
                  <div className="as-custom-candle-wax" />
                  <div className="as-custom-candle-label">
                    <span>{emoji || '🕯️'}</span>
                    <strong>{phrase || 'Votre message ici'}</strong>
                    <small>ASIREM COSMÉTIQUES</small>
                  </div>
                </div>
              </div>

              <h2>Votre création</h2>
              {selectedOptions.length ? (
                <ul className="as-custom-recap">
                  {selectedOptions.map((item) => (
                    <li key={`${item.category}-${item.id}`}>
                      <span><small>{item.categoryLabel}</small>{item.name}</span>
                      <span>{item.extra_price > 0 ? `+ ${euro(item.extra_price)}` : 'Inclus'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Choisissez vos options pour commencer.</p>
              )}

              <div className="as-custom-total">
                <span>Prix estimé</span>
                <strong>{euro(price)}</strong>
              </div>
              <p className="as-custom-note">Prix indicatif, confirmé par l’atelier selon les options choisies. Frais de port non inclus.</p>

              {success ? (
                <div className="alert alert-success" role="status">
                  Merci ! Votre projet <strong>{success.number}</strong> a été envoyé à l’atelier.
                  <button type="button" className="as-custom-reset" onClick={reset}>Créer une autre bougie</button>
                </div>
              ) : (
                <form className="as-custom-form" onSubmit={submit}>
                  {error && <p className="alert alert-error" role="alert">{error}</p>}
                  <div className="field">
                    <label htmlFor="custom-name">Votre nom <span className="req">*</span></label>
                    <input id="custom-name" required value={form.customer_name} onChange={updateForm('customer_name')} placeholder="Camille Durand" />
                  </div>
                  <div className="field">
                    <label htmlFor="custom-email">Votre e-mail <span className="req">*</span></label>
                    <input id="custom-email" type="email" required value={form.email} onChange={updateForm('email')} placeholder="camille@email.fr" />
                  </div>
                  <div className="field">
                    <label htmlFor="custom-phone">Téléphone</label>
                    <input id="custom-phone" value={form.phone} onChange={updateForm('phone')} placeholder="06 12 34 56 78" />
                  </div>
                  <div className="field">
                    <label htmlFor="custom-message">Une précision ?</label>
                    <textarea id="custom-message" value={form.message} onChange={updateForm('message')} placeholder="Quantité, occasion, date souhaitée…" rows="3" />
                  </div>
                  <button type="submit" className="as-btn-gold" disabled={submitting} aria-busy={submitting}>
                    {submitting ? 'Envoi en cours…' : 'Envoyer mon projet →'}
                  </button>
                </form>
              )}

              <a className="as-custom-whatsapp" href={whatsappHref()} target="_blank" rel="noopener noreferrer">
                💬 Ou en parler directement sur WhatsApp
              </a>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
