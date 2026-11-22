import React, { useEffect, useRef } from 'react';
import { Group, Layer, Rect, Stage, Text } from 'react-konva';
import { downloadDataUrl } from '../../customPreview.js';

const WIDTH = 360;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function LabelEditor({ categories = [], settings = {}, value = {}, onChange = () => {}, exportRef, shopName = 'ASIREM COSMÉTIQUES' }) {
  const stageRef = useRef(null);
  const maxChars = Number(settings.max_chars) || 60;
  const ratio = (Number(settings.height_mm) || 40) / (Number(settings.width_mm) || 60);
  const HEIGHT = Math.round(WIDTH * ratio);

  const emojis = categories.find((category) => category.value === 'emoji')?.items || [];
  const fonts = categories.find((category) => category.value === 'typographie')?.items || [];
  const textColors = categories.find((category) => category.value === 'couleur_texte')?.items || [];

  const phrase = value.phrase || '';
  const emoji = value.emoji || '';
  const fontSize = phrase.length <= 18 ? 27 : phrase.length <= 38 ? 20 : 15;

  useEffect(() => {
    if (!exportRef) return undefined;
    exportRef.current = () => {
      try {
        return stageRef.current?.toDataURL({ pixelRatio: 3, mimeType: 'image/png' }) || '';
      } catch {
        return '';
      }
    };
    return () => { exportRef.current = null; };
  }, [exportRef]);

  const patch = (changes) => onChange({ ...value, ...changes });

  return (
    <div className="as-label-editor">
      <div className="as-label-editor-canvas">
        <div className="as-label-editor-frame">
          <Stage ref={stageRef} width={WIDTH} height={HEIGHT}>
            <Layer>
              <Rect width={WIDTH} height={HEIGHT} fill={value.background || '#FFF9F0'} />
              {value.border && (
                <Rect
                  x={7}
                  y={7}
                  width={WIDTH - 14}
                  height={HEIGHT - 14}
                  stroke={value.border}
                  strokeWidth={3}
                  cornerRadius={4}
                />
              )}
              <Text
                text={shopName}
                x={0}
                y={HEIGHT - 26}
                width={WIDTH}
                align="center"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={10}
                letterSpacing={2}
                fill={value.color || '#382011'}
                opacity={0.75}
              />
              <Group
                x={WIDTH / 2 + (Number(value.text_x) || 0)}
                y={26 + (Number(value.text_y) || 0)}
                draggable
                dragBoundFunc={(pos) => ({
                  x: clamp(pos.x, WIDTH / 2 - 80, WIDTH / 2 + 80),
                  y: clamp(pos.y, 10, HEIGHT - 60),
                })}
                onDragEnd={(event) => patch({
                  text_x: clamp(Math.round(event.target.x() - WIDTH / 2), -80, 80),
                  text_y: clamp(Math.round(event.target.y() - 26), -80, 80),
                })}
              >
                {emoji && (
                  <Text
                    text={emoji}
                    x={-(WIDTH - 40) / 2}
                    y={0}
                    width={WIDTH - 40}
                    align="center"
                    fontSize={26}
                  />
                )}
                <Text
                  text={phrase || 'Votre message ici'}
                  x={-(WIDTH - 40) / 2}
                  y={emoji ? 36 : 6}
                  width={WIDTH - 40}
                  align="center"
                  fontFamily={value.font_stack || 'Georgia, serif'}
                  fontSize={fontSize}
                  fontStyle="bold"
                  lineHeight={1.2}
                  wrap="word"
                  fill={value.color || '#382011'}
                />
              </Group>
            </Layer>
          </Stage>
        </div>
        <p className="as-label-editor-note">
          Dimensions réelles : {settings.width_mm || 60} × {settings.height_mm || 40} mm ·
          {' '}export haute résolution 1080 px · faites glisser le texte pour le positionner.
        </p>
        <button
          type="button"
          className="as-btn-outline as-btn-outline--dark as-ui-btn as-ui-btn--outline"
          onClick={() => downloadDataUrl(exportRef?.current?.(), `etiquette-${(phrase || 'asirem').slice(0, 24)}.png`)}
        >
          ⬇ Télécharger l’étiquette (PNG HD)
        </button>
      </div>

      <div className="as-label-editor-fields">
        <div className="field">
          <label htmlFor="label-phrase">Votre message <span className="req">*</span></label>
          <textarea
            id="label-phrase"
            value={phrase}
            maxLength={maxChars}
            rows={3}
            onChange={(event) => patch({ phrase: event.target.value })}
            placeholder="Ex. : Un peu de lumière pour toi"
          />
          <small>{phrase.length}/{maxChars} caractères</small>
        </div>

        <div className="field">
          <label htmlFor="label-emoji-free">Emoji</label>
          <input
            id="label-emoji-free"
            value={emoji}
            maxLength={12}
            onChange={(event) => patch({ emoji: event.target.value })}
            placeholder="💜"
          />
          {emojis.length > 0 && (
            <div className="as-emoji-picker" aria-label="Emojis proposés par l’atelier">
              {emojis.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={emoji === item.name ? 'is-selected' : ''}
                  aria-label={`Choisir l’emoji ${item.name}`}
                  aria-pressed={emoji === item.name}
                  onClick={() => patch({ emoji: item.name })}
                >
                  {item.icon || item.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {fonts.length > 0 && (
          <div className="field">
            <label htmlFor="label-font">Typographie</label>
            <select
              id="label-font"
              value={fonts.some((item) => item.font_stack === value.font_stack) ? value.font_stack : ''}
              onChange={(event) => patch({ font_stack: event.target.value })}
            >
              <option value="">— Par défaut —</option>
              {fonts.map((item) => (
                <option key={item.id} value={item.font_stack || ''}>{item.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="label-color">Couleur du texte</label>
          <div className="as-color-row">
            <input
              id="label-color"
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(value.color || '') ? value.color : '#382011'}
              onChange={(event) => patch({ color: event.target.value })}
            />
            {textColors.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`as-color-swatch${value.color === item.hex ? ' is-selected' : ''}`}
                style={{ backgroundColor: item.hex }}
                title={item.name}
                aria-label={`Couleur ${item.name}`}
                aria-pressed={value.color === item.hex}
                onClick={() => patch({ color: item.hex })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
