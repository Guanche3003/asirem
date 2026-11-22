/**
 * Couche SQLite (module natif node:sqlite — aucune dépendance à compiler).
 * Crée le schéma, les données de démonstration et expose quelques helpers.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// En production, DB_PATH peut pointer vers un disque persistant monté (/data/crm.db).
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
export const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(DATA_DIR, 'crm.db');

let db = null;

export function now() {
  return new Date().toISOString();
}

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA journal_mode = WAL;');
  }
  return db;
}

export function all(sql, ...params) {
  return getDb().prepare(sql).all(...params);
}

export function get(sql, ...params) {
  return getDb().prepare(sql).get(...params);
}

export function run(sql, ...params) {
  return getDb().prepare(sql).run(...params);
}

export function getSetting(key, fallback = '') {
  const row = get('SELECT value FROM settings WHERE key = ?', key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    String(value ?? ''),
  );
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  contact     TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  address     TEXT DEFAULT '',
  zip         TEXT DEFAULT '',
  city        TEXT DEFAULT '',
  website     TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'autre',
  unit        TEXT NOT NULL DEFAULT 'g',
  unit_cost   REAL NOT NULL DEFAULT 0,
  stock_qty   REAL NOT NULL DEFAULT 0,
  min_stock   REAL NOT NULL DEFAULT 0,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  notes       TEXT DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL DEFAULT 'bougie',
  description TEXT DEFAULT '',
  price       REAL NOT NULL DEFAULT 0,
  vat_rate    REAL NOT NULL DEFAULT 20,
  weight_g    REAL NOT NULL DEFAULT 0,
  burn_hours  INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT DEFAULT '',
  active      INTEGER NOT NULL DEFAULT 1,
  featured    INTEGER NOT NULL DEFAULT 0,
  notes       TEXT DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_materials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity    REAL NOT NULL DEFAULT 0,
  UNIQUE(product_id, material_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL DEFAULT 'particulier',
  first_name  TEXT DEFAULT '',
  last_name   TEXT DEFAULT '',
  company     TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  address     TEXT DEFAULT '',
  zip         TEXT DEFAULT '',
  city        TEXT DEFAULT '',
  tags        TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  number        TEXT NOT NULL UNIQUE,
  customer_id   INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'brouillon',
  order_date    TEXT NOT NULL,
  shipping_cost REAL NOT NULL DEFAULT 0,
  discount      REAL NOT NULL DEFAULT 0,
  notes         TEXT DEFAULT '',
  shipped_at    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  subject     TEXT DEFAULT '',
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'nouveau',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  quantity    REAL NOT NULL,
  reason      TEXT DEFAULT '',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  event_date  TEXT NOT NULL DEFAULT '',
  location    TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image_url   TEXT DEFAULT '',
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_options (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT NOT NULL DEFAULT 'parfum',
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url   TEXT DEFAULT '',
  icon        TEXT DEFAULT '',
  extra_price REAL NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_requests (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  number       TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT DEFAULT '',
  selections   TEXT NOT NULL DEFAULT '[]',
  label_phrase TEXT DEFAULT '',
  label_emoji  TEXT DEFAULT '',
  message      TEXT DEFAULT '',
  price        REAL NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'nouvelle',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_options_category ON custom_options(category, position, id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_status ON custom_requests(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_product_materials_product ON product_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
`;

const DEFAULT_SETTINGS = {
  shop_name: 'ASIREM COSMÉTIQUES',
  tagline: 'Bougies artisanales faites main',
  description:
    'Des bougies uniques, façonnées à la main pour sublimer chacun de vos instants. Bougies artisanales et parfums soignés conçus pour embellir votre quotidien.',
  about:
    "Diplômé en chimie et fort d'une expérience en laboratoire, je suis Syphax, artisan cirier passionné installé près d'Orléans. Je crée des bougies artisanales naturelles, où chaque parfum est pensé pour éveiller vos sens et raconter une histoire unique. Dans mon atelier, je prends soin de chaque étape, de la formulation à l'emballage, avec rigueur et créativité. Chaque bougie est façonnée à la main, avec des cires végétales de soja et de colza, des huiles essentielles pures et des mèches en coton naturel. Mon engagement : des produits respectueux de l'environnement, conçus avec passion et expertise, loin des logiques commerciales.",
  email: 'contact@asirem-cosmetiques.fr',
  phone: '+33 6 56 69 51 12',
  address: '',
  zip: '',
  city: '',
  siret: '992 752 899 00011',
  hours: 'Atelier près d’Orléans · Commandes et expéditions sur rendez-vous',
  instagram: '@asiremcos',
  currency: '€',
  vat_rate: '20',
  margin_coefficient: '2.5',
  admin_username: 'admin',
  // Identité et coordonnées ASIREM (site source)
  legal_name: 'BENARAB SYPHAX — ASIREM COSMÉTIQUES',
  siren: '992 752 899',
  vat_number: 'FR03 992 752 899',
  rcs: '992 752 899 R.C.S. Paris — greffe de Paris, le 27/10/2025',
  ape: '32.99Z',
  website: 'https://asirem-cosmetiques.fr/boutique/',
  whatsapp: 'https://wa.me/33656695112',
  tiktok: 'https://www.tiktok.com/@asiremcosmetiques',
  logo: '/logo.png',
  hero_video: '/videos/fond.webm',
  hero_image: '/galerie/Bougies%20stand.jpg',
  featured_video: '/videos/coffret.mp4',
  // Configurateur « Créer ma bougie »
  custom_base_price: '25',
  custom_intro: 'Choisissez votre parfum, votre couleur et votre décoration, puis écrivez le petit mot qui rendra votre bougie unique.',
};

const DEFAULT_EVENTS = [
  {
    title: 'Marché de Noël — Orléans',
    event_date: '2026-12-06',
    location: 'Place du Martroi, 45000 Orléans',
    description: 'Retrouvez les bougies ASIREM sur le stand, avec des créations de Noël et la possibilité de personnaliser vos coffrets.',
    image_url: '/galerie/Stand.jpg',
  },
  {
    title: 'Atelier découverte : créer sa bougie',
    event_date: '2026-12-13',
    location: 'Atelier ASIREM, près d’Orléans',
    description: 'Une initiation de deux heures pour choisir son parfum, couler sa bougie et repartir avec sa création. Sur réservation.',
    image_url: '/galerie/Stand 2.jpg',
  },
  {
    title: 'Salon des créateurs',
    event_date: '2027-03-20',
    location: 'Paris',
    description: 'Une journée de rencontres autour du fait main et des parfums d’exception, avec une sélection de créations ASIREM.',
    image_url: '/galerie/Bougies stand.jpg',
  },
];

function seedEvents() {
  if (get('SELECT COUNT(*) AS n FROM events').n > 0) return;
  const timestamp = now();
  for (const event of DEFAULT_EVENTS) {
    run(
      `INSERT INTO events (title, event_date, location, description, image_url, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      event.title, event.event_date, event.location, event.description, event.image_url,
      timestamp, timestamp,
    );
  }
}

// Options proposées dans le configurateur « Créer ma bougie ».
// [catégorie, nom, description, image, icône, supplément, ordre]
const DEFAULT_CUSTOM_OPTIONS = [
  ['parfum', 'Lavande', 'L’intemporelle sérénité des champs de Provence.', '/galerie/lavande.jpg', '💜', 0, 1],
  ['parfum', 'Clémentine Monoï', 'L’agrume pétillant et la douceur solaire des îles.', '/galerie/cl%C3%A9mentine%20monoi%20(2).jpg', '🍊', 0, 2],
  ['parfum', 'Fleur d’oranger', 'Une fragrance florale douce et enveloppante.', '/Lueur.png', '🤍', 0, 3],
  ['parfum', 'Fruits rouges', 'Des notes gourmandes et réconfortantes.', '/Cl%C3%A9mentine.png', '🍓', 1.5, 4],
  ['parfum', 'Pamplemousse', 'Une explosion de fraîcheur vive et acidulée.', '/galerie/pamplemousse%20(2).jpg', '🍋', 0, 5],
  ['parfum', 'Gourmandise de Noël', 'Notes chaleureuses et épicées pour un hiver douillet.', '/galerie/Gourmandise%20de%20noel.jpg', '🎄', 2, 6],
  ['couleur', 'Naturel / écru', 'La couleur authentique de la cire végétale.', '', '◯', 0, 1],
  ['couleur', 'Ocre doré', 'Une teinte chaude et lumineuse.', '', '🟡', 0, 2],
  ['couleur', 'Terracotta', 'Un ton terreux et chaleureux.', '', '🟠', 0, 3],
  ['couleur', 'Vert sauge', 'Une nuance végétale apaisante.', '', '🟢', 0, 4],
  ['couleur', 'Rose poudré', 'Une touche douce et délicate.', '', '🌸', 0, 5],
  ['decoration', 'Fleurs séchées', 'Un bouquet délicat inclus dans la cire.', '', '🌾', 2.5, 1],
  ['decoration', 'Paillettes dorées', 'Une finition scintillante et festive.', '', '✨', 1.5, 2],
  ['decoration', 'Zestes d’agrume', 'Des éclats naturels qui parfument la flamme.', '', '🍊', 1.5, 3],
  ['decoration', 'Cannelle & étoile', 'Une décoration gourmande et épicée.', '', '⭐', 2, 4],
  ['decoration', 'Botaniques', 'Un assemblage de feuilles et graines naturelles.', '', '🌿', 2.5, 5],
  ['contenant', 'Pot verre 180 ml', 'Le format classique, à réutiliser sans fin.', '/galerie/lavande.jpg', '🕯️', 0, 1],
  ['contenant', 'Pot verre 300 ml', 'Une plus grande contenance pour durer plus longtemps.', '/galerie/Bougies%20stand.jpg', '🕯️', 6, 2],
  ['contenant', 'Coffret cadeau', 'Trois bougies présentées dans une boîte kraft.', '/galerie/Bougies%20stand.jpg', '🎁', 24, 3],
];

function seedCustomOptions() {
  if (get('SELECT COUNT(*) AS n FROM custom_options').n > 0) return;
  const timestamp = now();
  for (const [category, name, description, image_url, icon, extra_price, position] of DEFAULT_CUSTOM_OPTIONS) {
    run(
      `INSERT INTO custom_options
        (category, name, description, image_url, icon, extra_price, position, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      category, name, description, image_url, icon, extra_price, position, timestamp, timestamp,
    );
  }
}

function seed() {
  const timestamp = now();
  const seedFlag = get('SELECT value FROM settings WHERE key = ?', '__seeded');
  if (seedFlag && seedFlag.value !== '0') return;

  getDb().exec('BEGIN TRANSACTION;');
  try {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
    }
    const password = process.env.CRM_ADMIN_PASSWORD || 'Atelier2026!';
    run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      'admin_password_hash',
      hashPassword(password),
    );

    // Fournisseurs
    const supplierRows = [
      ['Cires végétales France', 'Service commandes', 'contact@cires-vegetales.fr', '02 38 00 00 00', 'Zone artisanale', '45000', 'Orléans', 'cires-vegetales.fr', 'Cire de soja et de colza 100 % végétale, approvisionnement local.'],
      ['Parfums de Grasse', 'Service parfumerie', 'bonjour@parfums-de-grasse.fr', '04 93 00 00 00', '4 route des Parfumeurs', '06130', 'Grasse', 'parfums-de-grasse.fr', 'Fragrances et huiles essentielles pures pour bougies et diffuseurs.'],
      ['Éco-emballages', 'Service client', 'contact@eco-emballages.fr', '09 80 00 00 00', '12 rue du Carton', '69003', 'Lyon', 'eco-emballages.fr', 'Pots verre réutilisables, couvercles bois et étiquettes kraft recyclables.'],
    ];
    supplierRows.forEach((s) =>
      run(
        `INSERT INTO suppliers (name, contact, email, phone, address, zip, city, website, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ...s, timestamp, timestamp,
      ),
    );

    // Matières premières
    const materialRows = [
      ['Cire de soja', 'cire', 'kg', 6.5, 24, 5, 1, 'Cire végétale 100 % soja, sans paraffine ni additif chimique.'],
      ['Cire de colza', 'cire', 'kg', 5.8, 18, 5, 1, 'Cire végétale de colza, pour les fondants et certaines éditions.'],
      ['Mèche coton', 'meche', 'pièce', 0.35, 240, 50, 1, 'Mèche en coton naturel, sans plomb.'],
      ['Parfum Lavande', 'parfum', 'ml', 0.12, 600, 100, 2, 'L’intemporelle sérénité des champs de Provence.'],
      ['Parfum Clémentine Monoï', 'parfum', 'ml', 0.15, 350, 100, 2, 'Le mariage pétillant de l’agrume et de la douceur solaire des îles.'],
      ['Parfum Fleur d’oranger', 'parfum', 'ml', 0.14, 300, 80, 2, 'Fragrance florale douce et enveloppante.'],
      ['Colorant ocre', 'colorant', 'g', 0.2, 90, 20, 2, 'Pigment naturel pour les éditions thématiques.'],
      ['Pot verre 180 ml', 'contenant', 'pièce', 1.8, 180, 30, 3, 'Pot verre réutilisable, contenance 180 ml.'],
      ['Couvercle bois', 'contenant', 'pièce', 0.65, 170, 30, 3, 'Couvercle en hêtre.'],
      ['Étiquette kraft', 'emballage', 'pièce', 0.25, 360, 50, 3, 'Étiquette adhésive kraft recyclable 60×40 mm.'],
      ['Flacon diffuseur 100 ml', 'contenant', 'pièce', 2.4, 40, 15, 3, 'Flacon verre avec bouchon.'],
      ['Tiges de rotin', 'accessoire', 'pièce', 0.4, 120, 30, 3, 'Tiges de rotin pour diffusion continue.'],
      ['Parfum Fruits rouges', 'parfum', 'ml', 0.14, 280, 60, 2, 'Notes gourmandes et réconfortantes.'],
      ['Parfum Pamplemousse', 'parfum', 'ml', 0.13, 260, 60, 2, 'Une explosion de fraîcheur vive et acidulée.'],
      ['Parfum Fruits de la passion', 'parfum', 'ml', 0.15, 220, 50, 2, 'Fragrance exotique, charnelle et intensément fruitée.'],
      ['Parfum Gourmandise de Noël', 'parfum', 'ml', 0.16, 200, 50, 2, 'Notes chaleureuses et épicées pour un hiver douillet.'],
      ['Parfum Citrouille givrée', 'parfum', 'ml', 0.15, 180, 40, 2, 'Fragrance automnale aux notes de courge et d’épices douces.'],
      ['Boîte coffret kraft', 'emballage', 'pièce', 2.2, 60, 15, 3, 'Boîte cadeau kraft pour le coffret découverte.'],
    ];
    materialRows.forEach((m) =>
      run(
        `INSERT INTO materials (name, category, unit, unit_cost, stock_qty, min_stock, supplier_id, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ...m, timestamp, timestamp,
      ),
    );

    // Produits
    const productRows = [
      ['Coffret Découverte — 3 bougies', 'coffret-decouverte', 'bougie', 'Nos coups de cœur réunis dans un coffret kraft : trois petites bougies pour découvrir les parfums de l’atelier. Déjà plus de 10 ventes.', 49, 20, 540, 105, '/galerie/Bougies%20stand.jpg', 1, 1, 'Produit coup de cœur — vidéo de présentation dans le dossier public/videos.'],
      ['Bougie Clémentine Monoï — 180 g', 'bougie-clementine-monoi', 'bougie', 'Le mariage pétillant de l’agrume et de la douceur solaire des îles. Cire végétale, mèche coton, environ 35 h de diffusion.', 22, 20, 180, 35, '/galerie/cl%C3%A9mentine%20monoi%20(2).jpg', 1, 1, ''],
      ['Bougie Lavande — 180 g', 'bougie-lavande', 'bougie', 'L’intemporelle sérénité des champs de Provence. Coulée à la main dans notre cire végétale de soja.', 19, 20, 180, 35, '/galerie/lavande.jpg', 1, 1, ''],
      ['Bougie Fleur d’oranger — 180 g', 'bougie-fleur-d-oranger', 'bougie', 'Un parfum floral délicat, doux et enveloppant, pour une atmosphère lumineuse.', 21, 20, 180, 35, '/Lueur.png', 1, 0, ''],
      ['Bougie Fruits rouges — 180 g', 'bougie-fruits-rouges', 'bougie', 'Une fragrance gourmande et réconfortante, offerte en anniversaire par nos clientes.', 20, 20, 180, 35, '/Cl%C3%A9mentine.png', 1, 0, ''],
      ['Bougie Pamplemousse — 180 g', 'bougie-pamplemousse', 'bougie', 'Une explosion de fraîcheur vive et acidulée pour réveiller votre intérieur.', 19, 20, 180, 35, '/galerie/pamplemousse%20(2).jpg', 1, 0, ''],
      ['Bougie Gourmandise de Noël — 180 g', 'bougie-gourmandise-de-noel', 'bougie', 'Des notes chaleureuses et épicées pour un hiver douillet.', 23, 20, 180, 35, '/galerie/Gourmandise%20de%20noel.jpg', 1, 0, 'Édition thématique'],
      ['Bougie Citrouille givrée — 180 g', 'bougie-citrouille-givree', 'bougie', 'Une fragrance automnale gourmande aux notes de courge et d’épices douces.', 22, 20, 180, 35, '/galerie/citrouille%20givr%C3%A9e.jpg', 1, 0, 'Édition thématique'],
      ['Fondant Fruits de la passion — 100 g', 'fondant-fruits-de-la-passion', 'fondant', 'Une fragrance exotique, charnelle et intensément fruitée. Sans flamme, à poser sur un brûle-encens.', 10, 20, 100, 0, '/galerie/fruits%20de%20la%20passion.jpg', 1, 0, ''],
      ['Diffuseur Clémentine Monoï — 100 ml', 'diffuseur-clementine-monoi', 'diffuseur', 'Diffusion continue grâce aux tiges de rotin, avec notre parfum Clémentine Monoï.', 29, 20, 100, 0, '/galerie/Stand%202.jpg', 1, 0, ''],
    ];
    productRows.forEach((p) =>
      run(
        `INSERT INTO products (name, slug, category, description, price, vat_rate, weight_g, burn_hours, image_url, active, featured, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ...p, timestamp, timestamp,
      ),
    );

    // Recettes (product_id, material_id, quantity)
    const recipeRows = [
      // Coffret découverte : 3 bougies (lavande, monoï, fleur d'oranger)
      [1, 1, 0.54], [1, 3, 3], [1, 4, 12], [1, 5, 12], [1, 6, 12],
      [1, 8, 3], [1, 9, 3], [1, 10, 3], [1, 18, 1],
      // Bougies 180 g
      [2, 1, 0.18], [2, 3, 1], [2, 5, 12], [2, 8, 1], [2, 9, 1], [2, 10, 1],
      [3, 1, 0.18], [3, 3, 1], [3, 4, 12], [3, 8, 1], [3, 9, 1], [3, 10, 1],
      [4, 1, 0.18], [4, 3, 1], [4, 6, 12], [4, 8, 1], [4, 9, 1], [4, 10, 1],
      [5, 1, 0.18], [5, 3, 1], [5, 13, 12], [5, 8, 1], [5, 9, 1], [5, 10, 1],
      [6, 1, 0.18], [6, 3, 1], [6, 14, 12], [6, 8, 1], [6, 9, 1], [6, 10, 1],
      [7, 1, 0.18], [7, 3, 1], [7, 16, 12], [7, 7, 2], [7, 8, 1], [7, 9, 1], [7, 10, 1],
      [8, 1, 0.18], [8, 3, 1], [8, 17, 12], [8, 7, 2], [8, 8, 1], [8, 9, 1], [8, 10, 1],
      // Fondant et diffuseur
      [9, 2, 0.1], [9, 15, 8], [9, 10, 1],
      [10, 5, 100], [10, 11, 1], [10, 12, 5], [10, 10, 1],
    ];
    recipeRows.forEach((r) =>
      run('INSERT INTO product_materials (product_id, material_id, quantity) VALUES (?, ?, ?)', ...r),
    );

    // Clients
    const customerRows = [
      ['particulier', 'Samira', 'B.', '', 'samira.b@email.fr', '06 11 22 33 44', '', '75001', 'Paris', 'bougie, avis', 'Adore la bougie fleur d’oranger.'],
      ['particulier', 'Clémence', 'H.', '', 'clemence.h@email.fr', '06 22 33 44 55', '', '75011', 'Paris', 'bougie, monoï', 'Coup de cœur monoï et fleur de cerisier.'],
      ['particulier', 'Julien', 'M.', '', 'julien.m@email.fr', '06 33 44 55 66', '', '69003', 'Lyon', 'coffret, cadeau', 'A offert le coffret découverte à Noël.'],
      ['professionnel', 'Thiziri', 'K.', 'Atelier Thiziri', 'thiziri@email.fr', '06 44 55 66 77', '', '75010', 'Paris', 'revendeuse, collaboration', 'Revendeuse et créatrice — collaboration photo.'],
    ];
    customerRows.forEach((c) =>
      run(
        `INSERT INTO customers (kind, first_name, last_name, company, email, phone, address, zip, city, tags, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ...c, timestamp, timestamp,
      ),
    );

    // Commandes
    run(
      `INSERT INTO orders (number, customer_id, status, order_date, shipping_cost, discount, notes, shipped_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'CMD-0001', 3, 'livree', '2026-10-14', 4.9, 0, 'Coffret offert pour Noël — remise en main propre.', '2026-10-16T09:00:00.000Z', timestamp, timestamp,
    );
    run('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)', 1, 1, 'Coffret Découverte — 3 bougies', 1, 49);
    run('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)', 1, 9, 'Fondant Fruits de la passion — 100 g', 2, 10);

    run(
      `INSERT INTO orders (number, customer_id, status, order_date, shipping_cost, discount, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'CMD-0002', 4, 'en_preparation', '2026-11-18', 0, 5, 'Commande revendeuse — 10 bougies Clémentine Monoï.', timestamp, timestamp,
    );
    run('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)', 2, 2, 'Bougie Clémentine Monoï — 180 g', 10, 22);

    run(
      `INSERT INTO orders (number, customer_id, status, order_date, shipping_cost, discount, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'CMD-0003', 1, 'confirmee', '2026-11-20', 3.5, 0, 'Deux bougies fleur d’oranger.', timestamp, timestamp,
    );
    run('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)', 3, 4, 'Bougie Fleur d’oranger — 180 g', 2, 21);

    // Messages de contact
    run(
      'INSERT INTO contacts (name, email, phone, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      'Maria S.', 'maria.s@email.fr', '06 55 44 33 22', 'Bougie personnalisée',
      'Bonjour, serait-il possible de faire une bougie avec une étiquette personnalisée pour un mariage ? Environ 30 pièces. Merci !',
      'nouveau', '2026-11-19T14:32:00.000Z',
    );
    run(
      'INSERT INTO contacts (name, email, phone, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      'Yanis B.', 'yanis.b@email.fr', '', 'Question parfum',
      'Votre bougie Clémentine Monoï est-elle disponible en format plus grand ? J’aimerais en offrir une.',
      'repondu', '2026-11-12T09:15:00.000Z',
    );

    run('INSERT INTO settings (key, value) VALUES (?, ?)', '__seeded', '1');
    getDb().exec('COMMIT;');
  } catch (error) {
    getDb().exec('ROLLBACK;');
    throw error;
  }
}

// Complète les réglages ajoutés par les versions successives sans écraser
// les valeurs déjà personnalisées par l'administrateur.
function seedMissingSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', key, value);
  }
}

export function initDb({ force = false } = {}) {
  if (force) {
    if (db) {
      db.close();
      db = null;
    }
    for (const suffix of ['', '-wal', '-shm']) {
      const file = DB_PATH + suffix;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
  getDb().exec(SCHEMA);
  seed();
  seedMissingSettings();
  seedEvents();
  seedCustomOptions();
  return DB_PATH;
}

export function resetDb() {
  return initDb({ force: true });
}
