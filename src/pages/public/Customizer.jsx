import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { api, euro } from '../../api.js';
import { useSite } from './PublicLayout.jsx';
import { buildClientConfiguration, selectedOptionsFrom } from '../../custom.js';
import { buildPreviewImage, downloadDataUrl } from '../../customPreview.js';
import CandleCustomizerPreview from '../../components/custom/CandleCustomizerPreview.jsx';
import LabelEditor from '../../components/custom/LabelEditor.jsx';

const EMPTY_FORM = { customer_name: '', email: '', phone: '', message: '' };
const EMPTY_LABEL = {
  phrase: '', emoji: '', font_stack: '', color: '', background: '', border: '',
  width_mm: 60, height_mm: 40, text_x: 0, text_y: 0,
};
const REQUIRED = ['contenant', 'couleur', 'parfum'];
const AUTO_ADVANCE_MS = 420;

function StepHeader({ index, total, emoji, title, hint, headingRef, onBack }) {
  return (
    <div className="as-custom-step-head">
      <div className="as-custom-step-copy">
        <span className="as-custom-step-count">Étape {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        <h2 ref={headingRef} tabIndex={-1}>
          {emoji && <span aria-hidden="true">{emoji}</span>} {title}
        </h2>
        {hint && <p>{hint}</p>}
      </div>
      {onBack && (
        <button
          type="button"
          className="as-custom-back"
          onClick={onBack}
          aria-label="Étape précédente"
          title="Étape précédente"
        >
          <span aria-hidden="true">←</span>
        </button>
      )}
    </div>
  );
}

export default function Customizer() {
  const { settings } = useSite();
  const reduceMotion = useReducedMotion();
  const headingRef = useRef(null);
  const labelExportRef = useRef(null);
  const advanceRef = useRef(null);

  const [data, setData] = useState({ categories: [], base_price: 0, intro: '', label: {} });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState({});
  const [label, setLabel] = useState(EMPTY_LABEL);
  const [form, setForm] = useState(EMPTY_FORM);
  const [labelImage, setLabelImage] = useState('');
  const [toast, setToast] = useState(null);
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
        label: result.label || {},
      }))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const steps = useMemo(() => [
    ...data.categories
      .filter((category) => category.items?.length)
      .map((category) => ({ type: 'option', key: category.value, category })),
    { type: 'label', key: 'label' },
    { type: 'contact', key: 'contact' },
  ], [data.categories]);

  const selectedOptions = useMemo(
    () => selectedOptionsFrom(data.categories, selection),
    [data.categories, selection],
  );

  const effectiveLabel = useMemo(() => {
    const find = (category) => selectedOptions.find((option) => option.category === category);
    const typography = find('typographie');
    const textColor = find('couleur_texte');
    const model = find('modele_etiquette');
    const emojiOption = find('emoji');
    return {
      ...EMPTY_LABEL,
      ...data.label,
      ...label,
      font_stack: label.font_stack || typography?.font_stack || EMPTY_LABEL.font_stack,
      color: label.color || textColor?.hex || '#382011',
      background: label.background || model?.background || '#FFF9F0',
      border: label.border || model?.border || '',
      emoji: label.emoji || emojiOption?.name || '',
    };
  }, [data.label, label, selectedOptions]);

  const config = useMemo(
    () => buildClientConfiguration(selectedOptions, effectiveLabel),
    [selectedOptions, effectiveLabel],
  );

  const extra = selectedOptions.reduce((sum, item) => sum + (Number(item.extra_price) || 0), 0);
  const price = data.base_price + extra;
  const whatsapp = settings.whatsapp || 'https://wa.me/33656695112';

  useEffect(() => { headingRef.current?.focus(); }, [step]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => clearTimeout(advanceRef.current), []);

  const goToStep = (index) => {
    clearTimeout(advanceRef.current);
    advanceRef.current = null;
    setStep(index);
    setError('');
  };

  const scheduleAdvance = () => {
    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => {
      advanceRef.current = null;
      setStep((value) => Math.min(steps.length - 1, value + 1));
    }, reduceMotion ? 120 : AUTO_ADVANCE_MS);
  };

  const toggle = (category, option) => {
    const wasSelected = (selection[category.value] || []).includes(option.id);
    setSelection((current) => {
      const ids = current[category.value] || [];
      if (category.multiple) {
        return {
          ...current,
          [category.value]: wasSelected ? ids.filter((id) => id !== option.id) : [...ids, option.id],
        };
      }
      return { ...current, [category.value]: wasSelected ? [] : [option.id] };
    });
    setToast({ id: Date.now(), text: wasSelected ? `« ${option.name} » retiré` : `« ${option.name} » ajouté` });
    // Un nouveau choix mène directement à l'étape suivante ; un retrait reste sur place.
    if (!wasSelected) scheduleAdvance();
  };

  const removeOption = (item) => setSelection((current) => ({
    ...current,
    [item.category]: (current[item.category] || []).filter((id) => id !== item.id),
  }));

  const updateForm = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const current = steps[step];
  const canContinue = current?.type === 'option'
    ? !(REQUIRED.includes(current.category.value) && !(selection[current.category.value] || []).length)
    : current?.type === 'label' ? Boolean(effectiveLabel.phrase.trim()) : true;

  const goNext = () => {
    if (!canContinue) return;
    // On capture l'étiquette avant de démonter l'éditeur Konva.
    if (current?.type === 'label') setLabelImage(labelExportRef.current?.() || '');
    goToStep(Math.min(steps.length - 1, step + 1));
  };

  const whatsappHref = () => {
    const lines = [
      'Bonjour, je souhaite créer une bougie personnalisée :',
      ...selectedOptions.map((item) => `• ${item.categoryLabel} : ${item.name}`),
      effectiveLabel.phrase.trim() && `• Étiquette : « ${effectiveLabel.phrase.trim()} » ${effectiveLabel.emoji}`.trim(),
      `Prix estimé : ${euro(price)}`,
    ].filter(Boolean);
    return `${whatsapp}${whatsapp.includes('?') ? '&' : '?'}text=${encodeURIComponent(lines.join('\n'))}`;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const exportedLabel = labelImage || labelExportRef.current?.() || '';
      const previewImage = await buildPreviewImage({
        photo: config.container?.photo || config.container?.image_url,
        waxHex: config.wax?.hex,
        labelImage: exportedLabel,
        finish: config.finish?.finish,
      });
      const result = await api.post('/public/custom-requests', {
        ...form,
        selections: selectedOptions.map((item) => ({ id: item.id })),
        label: effectiveLabel,
        preview_image: previewImage,
        label_image: exportedLabel,
      });
      setSuccess({ ...result, previewImage, labelImage: exportedLabel, snapshot: config, total: price });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSelection({}); setLabel(EMPTY_LABEL); setForm(EMPTY_FORM); setLabelImage('');
    setSuccess(null); setToast(null); goToStep(0);
  };

  const renderStep = () => {
    if (current?.type === 'option') {
      const category = current.category;
      return (
        <>
          <StepHeader
            index={step}
            total={steps.length}
            emoji={category.emoji}
            title={category.step || category.label}
            hint={category.hint || 'Un clic sur une option vous mène à la suite.'}
            headingRef={headingRef}
            onBack={step > 0 ? () => goToStep(step - 1) : undefined}
          />
          <div className="as-option-grid">
            {category.items.map((option) => {
              const active = (selection[category.value] || []).includes(option.id);
              return (
                <motion.button
                  type="button"
                  key={option.id}
                  className={`as-option-card${active ? ' is-selected' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggle(category, option)}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  layout={!reduceMotion}
                >
                  <span className="as-option-media" aria-hidden="true">
                    {option.image_url
                      ? <img src={option.image_url} alt="" loading="lazy" />
                      : <span>{option.icon || '✦'}</span>}
                    <span className="as-option-next">→</span>
                    {active && (
                      <motion.span
                        className="as-option-check"
                        initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >✓</motion.span>
                    )}
                  </span>
                  <span className="as-option-body">
                    <strong>{option.name}</strong>
                    {option.description && <small>{option.description}</small>}
                  </span>
                  {(option.extra_price > 0 || option.availability === 'sur_commande') && (
                    <span className="as-option-meta">
                      {option.extra_price > 0 && <span className="as-option-price">+ {euro(option.extra_price)}</span>}
                      {option.availability === 'sur_commande' && <span className="as-option-availability">Sur commande</span>}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
          <p className="as-custom-hint as-custom-hint--inline">
            {category.multiple
              ? 'Pour en ajouter un autre, revenez avec la flèche ←.'
              : 'Vous pourrez toujours revenir avec la flèche ← pour changer votre choix.'}
          </p>
        </>
      );
    }

    if (current?.type === 'label') {
      return (
        <>
          <StepHeader
            index={step}
            total={steps.length}
            emoji="✍️"
            title="Votre étiquette"
            hint="Écrivez le petit mot qui rendra votre bougie unique, et réglez son apparence."
            headingRef={headingRef}
            onBack={step > 0 ? () => goToStep(step - 1) : undefined}
          />
          <LabelEditor
            categories={data.categories}
            settings={data.label}
            value={effectiveLabel}
            onChange={setLabel}
            exportRef={labelExportRef}
            shopName={settings.shop_name}
          />
          <div className="as-custom-step-actions">
            <button
              type="button"
              className="as-btn-outline as-btn-outline--dark"
              onClick={goNext}
              disabled={!canContinue}
            >
              Continuer <span aria-hidden="true">→</span>
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <StepHeader
          index={step}
          total={steps.length}
          emoji="💌"
          title="Envoyer votre projet"
          hint="Votre configuration est prête. L’atelier vous recontactera pour la finaliser."
          headingRef={headingRef}
          onBack={step > 0 ? () => goToStep(step - 1) : undefined}
        />
        <form className="as-custom-form as-contact-form" onSubmit={submit}>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="custom-name">Votre nom <span className="req">*</span></label>
              <input id="custom-name" required value={form.customer_name} onChange={updateForm('customer_name')} placeholder="Camille Durand" />
            </div>
            <div className="field">
              <label htmlFor="custom-email">Votre e-mail <span className="req">*</span></label>
              <input id="custom-email" type="email" required value={form.email} onChange={updateForm('email')} placeholder="camille@email.fr" />
            </div>
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
        <a className="as-custom-whatsapp" href={whatsappHref()} target="_blank" rel="noopener noreferrer">
          💬 Ou en parler directement sur WhatsApp
        </a>
      </>
    );
  };

  return (
    <>
      <div className="as-page-hero as-custom-hero">
        <span className="as-kicker">Atelier sur mesure</span>
        <h1>Créez votre bougie <em>à votre image</em></h1>
        <p>{data.intro || 'Composez votre bougie étape par étape.'}</p>
      </div>

      <section className="as-section as-custom-section">
        {loading ? (
          <div className="as-empty" role="status">Chargement des options…</div>
        ) : loadError ? (
          <div className="as-empty">
            <p>Impossible de charger les options : {loadError}</p>
            <button type="button" className="as-btn-gold" onClick={load}>Réessayer</button>
          </div>
        ) : success ? (
          <motion.div
            className="as-custom-success"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
          >
            <motion.div
              className="as-success-check"
              initial={reduceMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 14 }}
            >✓</motion.div>
            <h2>Votre projet est parti à l’atelier</h2>
            <p>
              Merci ! Votre bougie personnalisée <strong>{success.number}</strong> a bien été enregistrée.
              Nous vous contacterons à l’adresse indiquée pour confirmer les détails.
            </p>
            {success.previewImage && (
              <img className="as-success-image" src={success.previewImage} alt="Aperçu de votre bougie personnalisée" />
            )}
            <p className="as-success-price">Prix estimé : <strong>{euro(success.price)}</strong></p>
            <div className="as-success-actions">
              {success.labelImage && (
                <button type="button" className="as-btn-outline as-btn-outline--dark" onClick={() => downloadDataUrl(success.labelImage, `etiquette-${success.number}.png`)}>
                  ⬇ Télécharger l’étiquette
                </button>
              )}
              <button type="button" className="as-btn-gold" onClick={reset}>Créer une autre bougie</button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="as-custom-layout">
              <div className="as-custom-main">
                <motion.div
                  key={current?.key || 'empty'}
                  className="as-custom-panel"
                  initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.26, ease: 'easeOut' }}
                >
                  {renderStep()}
                </motion.div>

              </div>

              <aside className="as-custom-summary" aria-label="Récapitulatif de votre bougie">
                <CandleCustomizerPreview config={config} />
                <h2>Votre création</h2>
                {selectedOptions.length ? (
                  <ul className="as-custom-recap">
                    {selectedOptions.map((item) => (
                      <li key={`${item.category}-${item.id}`}>
                        <span>
                          <small>{item.categoryLabel}</small>
                          {item.name}
                          <button
                            type="button"
                            className="as-custom-remove"
                            onClick={() => removeOption(item)}
                            aria-label={`Retirer ${item.name}`}
                            title="Retirer"
                          >×</button>
                        </span>
                        <span>{item.extra_price > 0 ? `+ ${euro(item.extra_price)}` : 'Inclus'}</span>
                      </li>
                    ))}
                    {effectiveLabel.phrase && (
                      <li>
                        <span><small>Étiquette</small>{effectiveLabel.emoji} {effectiveLabel.phrase}</span>
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="muted">Choisissez vos options pour commencer.</p>
                )}
                <div className="as-custom-total">
                  <span>Prix estimé</span>
                  <strong>{euro(price)}</strong>
                </div>
                <p className="as-custom-note">
                  Prix indicatif calculé par l’atelier selon les options choisies. Frais de port non inclus.
                </p>
              </aside>
            </div>
          </>
        )}
      </section>

      {toast && (
        <motion.div
          key={toast.id}
          className="as-custom-toast"
          role="status"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {toast.text}
        </motion.div>
      )}
    </>
  );
}
