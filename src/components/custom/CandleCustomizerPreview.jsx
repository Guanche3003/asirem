import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Positions de calage pour les décorations : ce sont des emplacements, pas des options.
const DECORATION_SLOTS = [
  { left: '26%', top: '42%' },
  { left: '72%', top: '47%' },
  { left: '36%', top: '66%' },
  { left: '66%', top: '69%' },
  { left: '50%', top: '31%' },
];

export default function CandleCustomizerPreview({ config = {}, compact = false }) {
  const reduceMotion = useReducedMotion();
  const { container, wax, finish, decorations = [], label = {} } = config;
  const photo = container?.photo || container?.image_url || '';
  const waxHex = wax?.hex || '#EFE2C9';
  const finishKey = finish?.finish || '';
  const mask = photo
    ? {
        WebkitMaskImage: `url("${photo}")`,
        maskImage: `url("${photo}")`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
      }
    : {};

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' };

  return (
    <div className={`as-preview${compact ? ' as-preview--compact' : ''}`}>
      <div className="as-preview-head">
        <span className="as-live-dot" aria-hidden="true" />
        <span>Aperçu en direct</span>
      </div>
      <div className="as-preview-stage">
        <div className="as-preview-halo" aria-hidden="true" />
        <div className="as-preview-candle">
          {photo ? (
            <img className="as-preview-photo" src={photo} alt="Visuel de la bougie personnalisée" />
          ) : (
            <div className="as-preview-silhouette" style={{ backgroundColor: waxHex }} aria-hidden="true" />
          )}

          <motion.div
            className="as-preview-wax"
            style={mask}
            animate={{ backgroundColor: waxHex }}
            transition={transition}
            aria-hidden="true"
          />
          {photo && (
            <div
              className={`as-preview-finish${finishKey ? ` as-preview-finish--${finishKey}` : ''}`}
              style={mask}
              aria-hidden="true"
            />
          )}

          <div className="as-preview-label-wrap">
            <div
              className="as-preview-label"
              style={{
                aspectRatio: `${label.width_mm || 60} / ${label.height_mm || 40}`,
                backgroundColor: label.background || '#FFF9F0',
                borderColor: label.border || 'transparent',
                color: label.color || '#382011',
                fontFamily: label.font_stack || 'Georgia, serif',
              }}
            >
              {(label.emoji || config.emoji) && (
                <span className="as-preview-label-emoji">{label.emoji || config.emoji?.name}</span>
              )}
              <strong
                className="as-preview-label-phrase"
                style={{ transform: `translate(${label.text_x || 0}px, ${label.text_y || 0}px)` }}
              >
                {label.phrase || 'Votre message ici'}
              </strong>
              <small>ASIREM COSMÉTIQUES</small>
            </div>
          </div>

          {decorations.map((decoration, index) => {
            const slot = DECORATION_SLOTS[index % DECORATION_SLOTS.length];
            return (
              <motion.div
                key={decoration.id}
                className="as-preview-decoration"
                style={slot}
                title={decoration.name}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.3, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 18 }}
              >
                {decoration.image_url
                  ? <img src={decoration.image_url} alt="" />
                  : <span aria-hidden="true">{decoration.icon || '✦'}</span>}
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="as-preview-caption">
        {container?.name || 'Votre contenant'}
        {wax?.name ? ` · ${wax.name}` : ''}
        {finish?.name ? ` · ${finish.name}` : ''}
      </div>
      {config.accessories?.length > 0 && (
        <motion.div
          className="as-preview-accessories"
          initial={reduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          + {config.accessories.map((item) => item.name).join(', ')}
        </motion.div>
      )}
    </div>
  );
}
