// Helpers partagés entre le configurateur public et l'administration.
// Aucune option n'est codée en dur : tout provient de l'API.

export const parseMeta = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const withMeta = (option) => (option ? { ...option, ...parseMeta(option.meta) } : null);

export function selectedOptionsFrom(categories, selection) {
  return categories.flatMap((category) =>
    (selection[category.value] || [])
      .map((id) => category.items.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => ({ ...withMeta(item), category: category.value, categoryLabel: category.label })),
  );
}

const first = (items, category) => items.find((item) => item.category === category) || null;
const many = (items, category) => items.filter((item) => item.category === category);

// Même structure que celle reconstruite par le serveur (server/index.js).
export function buildClientConfiguration(options, label = {}) {
  const container = first(options, 'contenant');
  const wax = first(options, 'couleur');
  const labelModel = first(options, 'modele_etiquette');
  const typography = first(options, 'typographie');
  const textColor = first(options, 'couleur_texte');
  return {
    container,
    wax,
    perfume: first(options, 'parfum'),
    decorations: many(options, 'decoration'),
    accessories: many(options, 'accessoire'),
    finish: first(options, 'finition'),
    label_model: labelModel,
    typography,
    text_color: textColor,
    emoji: first(options, 'emoji'),
    label: {
      phrase: label.phrase || '',
      emoji: label.emoji || '',
      font_stack: label.font_stack || typography?.font_stack || "Georgia, 'Times New Roman', serif",
      color: label.color || textColor?.hex || '#382011',
      background: label.background || labelModel?.background || '#FFF9F0',
      border: label.border ?? labelModel?.border ?? '',
      width_mm: Number(label.width_mm) || 60,
      height_mm: Number(label.height_mm) || 40,
      text_x: Number(label.text_x) || 0,
      text_y: Number(label.text_y) || 0,
    },
  };
}

export const optionPrice = (option) => Number(option?.extra_price) || 0;
