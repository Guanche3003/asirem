export const PRODUCT_CATEGORIES = [
  { value: 'bougie', label: 'Bougies' },
  { value: 'fondant', label: 'Fondants' },
  { value: 'diffuseur', label: 'Diffuseurs' },
  { value: 'spray', label: 'Sprays' },
  { value: 'autre', label: 'Autres' },
];

export const MATERIAL_CATEGORIES = [
  { value: 'cire', label: 'Cires' },
  { value: 'meche', label: 'Mèches' },
  { value: 'parfum', label: 'Parfums' },
  { value: 'colorant', label: 'Colorants' },
  { value: 'contenant', label: 'Contenants' },
  { value: 'emballage', label: 'Emballages' },
  { value: 'accessoire', label: 'Accessoires' },
  { value: 'autre', label: 'Autres' },
];

export const UNITS = ['g', 'kg', 'ml', 'cl', 'L', 'pièce', 'mètre'];

export const ORDER_STATUSES = [
  { value: 'brouillon', label: 'Brouillon', tone: 'muted' },
  { value: 'confirmee', label: 'Confirmée', tone: 'blue' },
  { value: 'en_preparation', label: 'En préparation', tone: 'amber' },
  { value: 'expediee', label: 'Expédiée', tone: 'purple' },
  { value: 'livree', label: 'Livrée', tone: 'green' },
  { value: 'annulee', label: 'Annulée', tone: 'red' },
];

export const CONTACT_STATUSES = [
  { value: 'nouveau', label: 'Nouveau', tone: 'amber' },
  { value: 'lu', label: 'Lu', tone: 'blue' },
  { value: 'repondu', label: 'Répondu', tone: 'green' },
  { value: 'archive', label: 'Archivé', tone: 'muted' },
];

export const labelOf = (list, value) => list.find((x) => x.value === value)?.label || value || '—';
export const toneOf = (list, value) => list.find((x) => x.value === value)?.tone || 'muted';

export const CATEGORY_EMOJI = {
  bougie: '🕯️',
  fondant: '🌸',
  diffuseur: '🌿',
  spray: '💧',
  autre: '✨',
};
