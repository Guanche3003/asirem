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

export const EVENT_IMAGE_CHOICES = [
  { label: 'Stand évènementiel', value: '/galerie/Stand.jpg' },
  { label: 'Stand (vue 2)', value: '/galerie/Stand 2.jpg' },
  { label: 'Bougies sur stand', value: '/galerie/Bougies stand.jpg' },
  { label: 'Bougies exposées', value: '/galerie/Articles/1.jpg' },
  { label: 'Créations diverses', value: '/galerie/Articles/2.jpg' },
  { label: 'Coffret', value: '/galerie/Gourmandise de noel.jpg' },
];

export const CUSTOM_CATEGORIES = [
  { value: 'parfum', label: 'Parfums', emoji: '🌸', multiple: false },
  { value: 'couleur', label: 'Couleurs', emoji: '🎨', multiple: false },
  { value: 'decoration', label: 'Décorations', emoji: '✨', multiple: true },
  { value: 'contenant', label: 'Contenants', emoji: '🕯️', multiple: false },
];

export const CUSTOM_REQUEST_STATUSES = [
  { value: 'nouvelle', label: 'Nouvelle', tone: 'amber' },
  { value: 'en_attente', label: 'En attente', tone: 'blue' },
  { value: 'confirmee', label: 'Confirmée', tone: 'green' },
  { value: 'realisee', label: 'Réalisée', tone: 'purple' },
  { value: 'annulee', label: 'Annulée', tone: 'muted' },
];

export const CUSTOM_IMAGE_CHOICES = [
  { label: 'Lavande', value: '/galerie/lavande.jpg' },
  { label: 'Clémentine Monoï', value: '/galerie/cl%C3%A9mentine%20monoi%20(2).jpg' },
  { label: 'Pamplemousse', value: '/galerie/pamplemousse%20(2).jpg' },
  { label: 'Gourmandise de Noël', value: '/galerie/Gourmandise%20de%20noel.jpg' },
  { label: 'Bougies exposées', value: '/galerie/Bougies%20stand.jpg' },
  { label: 'Stand évènementiel', value: '/galerie/Stand.jpg' },
  { label: 'Coffret', value: '/galerie/Gourmandise de noel.jpg' },
];

export const CATEGORY_EMOJI = {
  bougie: '🕯️',
  fondant: '🌸',
  diffuseur: '🌿',
  spray: '💧',
  autre: '✨',
};
