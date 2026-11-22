/**
 * API CRM bougier — Express + node:sqlite.
 * Dev  : http://127.0.0.1:3001  (Vite proxy sur 5173)
 * Prod : sert également le build React depuis dist/
 */
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  all, get, run, now, initDb, getSetting, setSetting, DB_PATH,
} from './db.js';
import {
  hashPassword, verifyPassword, createSession, destroySession, readToken,
  sessionCookie, clearCookie, authRequired, login,
} from './security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';

initDb();

const app = express();
app.disable('x-powered-by');

// Le front est servi depuis un autre domaine (Vercel) : on autorise les appels
// avec cookies depuis les origines déclarées dans CORS_ORIGIN.
const allowedOrigins = String(process.env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',').map((value) => value.trim()).filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
});

app.use(express.json({ limit: '8mb' }));

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const json = (res, payload, status = 200) => res.status(status).json(payload);
const txt = (v) => (v === undefined || v === null ? '' : String(v).trim());
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const int = (v, fallback = null) => {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) ? n : fallback;
};
const round = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const bool = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);

function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uniqueSlug(base, ignoreId = null) {
  let slug = slugify(base) || 'produit';
  let i = 2;
  while (true) {
    const row = get('SELECT id FROM products WHERE slug = ?', slug);
    if (!row || row.id === ignoreId) return slug;
    slug = `${slugify(base) || 'produit'}-${i++}`;
  }
}

function productCostRows(productId) {
  return all(
    `SELECT pm.quantity, pm.material_id, m.name AS material_name, m.unit, m.unit_cost, m.stock_qty
     FROM product_materials pm
     JOIN materials m ON m.id = pm.material_id
     WHERE pm.product_id = ?
     ORDER BY m.name`,
    productId,
  );
}

function productWithCost(row) {
  const details = productCostRows(row.id);
  const cost = round(details.reduce((sum, d) => sum + num(d.quantity) * num(d.unit_cost), 0));
  const price = num(row.price);
  const margin = price > 0 ? round(((price - cost) / price) * 100) : 0;
  return {
    ...row,
    active: Boolean(row.active),
    featured: Boolean(row.featured),
    cost,
    margin,
    material_count: details.length,
  };
}

function publicProduct(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    description: row.description,
    price: round(row.price),
    vat_rate: num(row.vat_rate),
    weight_g: num(row.weight_g),
    burn_hours: int(row.burn_hours, 0),
    image_url: txt(row.image_url),
    featured: Boolean(row.featured),
  };
}

function orderWithDetails(row) {
  const customer = row.customer_id
    ? get('SELECT id, first_name, last_name, company, email FROM customers WHERE id = ?', row.customer_id)
    : null;
  const items = all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', row.id);
  const itemsTotal = items.reduce((s, i) => s + num(i.quantity) * num(i.unit_price), 0);
  const total = round(itemsTotal + num(row.shipping_cost) - num(row.discount));
  return { ...row, customer, items, total, item_count: items.length };
}

function nextOrderNumber() {
  const row = get("SELECT number FROM orders WHERE number LIKE 'CMD-%' ORDER BY id DESC LIMIT 1");
  const last = row ? int(String(row.number).replace(/\D/g, ''), 0) : 0;
  return `CMD-${String(last + 1).padStart(4, '0')}`;
}

function saveOrderItems(orderId, items) {
  run('DELETE FROM order_items WHERE order_id = ?', orderId);
  for (const item of Array.isArray(items) ? items : []) {
    const productId = int(item.product_id, null);
    const product = productId ? get('SELECT name, price FROM products WHERE id = ?', productId) : null;
    run(
      'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
      orderId,
      productId,
      txt(item.product_name) || (product ? product.name : 'Produit'),
      Math.max(1, int(item.quantity, 1)),
      round(item.unit_price !== undefined && item.unit_price !== '' ? num(item.unit_price) : (product ? product.price : 0)),
    );
  }
}

function consumeStock(order) {
  if (order.shipped_at) return false;
  const items = all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', order.id);
  const needs = new Map();
  for (const item of items) {
    for (const r of productCostRows(item.product_id)) {
      needs.set(r.material_id, (needs.get(r.material_id) || 0) + num(r.quantity) * num(item.quantity));
    }
  }
  if (!needs.size) return false;
  const date = now();
  for (const [materialId, needed] of needs) {
    const material = get('SELECT stock_qty, name FROM materials WHERE id = ?', materialId);
    if (!material) continue;
    const deducted = Math.min(num(material.stock_qty), needed);
    run('UPDATE materials SET stock_qty = stock_qty - ?, updated_at = ? WHERE id = ?', deducted, date, materialId);
    run(
      'INSERT INTO stock_movements (material_id, type, quantity, reason, created_at) VALUES (?, ?, ?, ?, ?)',
      materialId, 'sortie', -deducted, `Expédition ${order.number} (${material.name})`, date,
    );
  }
  run('UPDATE orders SET shipped_at = ? WHERE id = ?', date, order.id);
  return true;
}

const STATUSES = ['brouillon', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee'];
const CONTACT_STATUSES = ['nouveau', 'lu', 'repondu', 'archive'];
const CUSTOM_REQUEST_STATUSES = ['nouvelle', 'en_attente', 'confirmee', 'realisee', 'annulee'];
// ordre = ordre des étapes du configurateur ; toutes ces catégories sont administrables.
const CUSTOM_CATEGORIES = [
  { value: 'contenant', label: 'Contenant', emoji: '🕯️', multiple: false, step: 'Choisissez votre contenant', hint: 'Le format de votre bougie.' },
  { value: 'couleur', label: 'Couleur de la cire', emoji: '🎨', multiple: false, step: 'Choisissez la couleur de la cire', hint: 'La teinte qui habillera votre bougie.' },
  { value: 'parfum', label: 'Parfum', emoji: '🌸', multiple: false, step: 'Choisissez votre parfum', hint: 'Le sillage que vous aimez.' },
  { value: 'decoration', label: 'Décorations', emoji: '✨', multiple: true, step: 'Ajoutez des décorations', hint: 'Plusieurs choix possibles — ajoutez ou retirez à envie.' },
  { value: 'accessoire', label: 'Accessoires', emoji: '🎀', multiple: true, step: 'Ajoutez un accessoire', hint: 'La petite attention qui fait la différence.' },
  { value: 'finition', label: 'Finition', emoji: '💫', multiple: false, step: 'Choisissez la finition', hint: 'Le dernier détail de la cire.' },
  { value: 'modele_etiquette', label: 'Modèle d’étiquette', emoji: '🏷️', multiple: false, step: 'Choisissez votre étiquette', hint: 'Le fond sur lequel sera imprimé votre message.' },
  { value: 'typographie', label: 'Typographie', emoji: 'Aa', multiple: false, step: 'Choisissez la typographie', hint: 'Le style de votre écriture.' },
  { value: 'couleur_texte', label: 'Couleur du texte', emoji: '🖌️', multiple: false, step: 'Choisissez la couleur du texte', hint: 'Pour un contraste parfait avec l’étiquette.' },
  { value: 'emoji', label: 'Emoji', emoji: '😊', multiple: false, step: 'Choisissez un emoji', hint: 'Facultatif — il apparaîtra sur l’étiquette.' },
];
const CUSTOM_AVAILABILITIES = ['disponible', 'sur_commande', 'indisponible'];

function parseMeta(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '{}') : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function customOptionPublic(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: txt(row.description),
    image_url: txt(row.image_url),
    icon: txt(row.icon),
    extra_price: round(row.extra_price),
    availability: CUSTOM_AVAILABILITIES.includes(row.availability) ? row.availability : 'disponible',
    meta: parseMeta(row.meta),
  };
}

function customRequestPublic(row) {
  let selections = [];
  try {
    const parsed = JSON.parse(row.selections || '[]');
    if (Array.isArray(parsed)) selections = parsed;
  } catch { /* données historiques */ }
  const base = round(getSetting('custom_base_price', 25));
  const extra = selections.reduce((sum, item) => sum + num(item.extra_price), 0);
  return {
    ...row,
    selections,
    configuration: parseMeta(row.configuration),
    preview_image: txt(row.preview_image),
    label_image: txt(row.label_image),
    order_id: int((get('SELECT id FROM orders WHERE custom_request_id = ?', row.id) || {}).id, null),
    estimated_price: round(base + extra),
  };
}

// Configuration complète et structurée, reconstruite côté serveur à partir des
// options valides de la base : le visiteur ne peut pas inventer une option.
function buildCustomConfiguration(selections, label = {}) {
  const byCategory = {};
  for (const item of selections) {
    const data = { id: item.id, name: item.name, extra_price: round(item.extra_price), ...parseMeta(item.meta) };
    if (CUSTOM_CATEGORIES.find((c) => c.value === item.category)?.multiple) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(data);
    } else {
      byCategory[item.category] = data;
    }
  }
  const hex = (value, fallback) => (/^#[0-9a-f]{6}$/i.test(txt(value)) ? txt(value) : fallback);
  const maxChars = Math.min(200, Math.max(20, int(getSetting('custom_label_max_chars', 60), 60)));
  return {
    container: byCategory.contenant || null,
    wax: byCategory.couleur || null,
    perfume: byCategory.parfum || null,
    decorations: byCategory.decoration || [],
    accessories: byCategory.accessoire || [],
    finish: byCategory.finition || null,
    label_model: byCategory.modele_etiquette || null,
    typography: byCategory.typographie || null,
    text_color: byCategory.couleur_texte || null,
    emoji: byCategory.emoji || null,
    label: {
      phrase: txt(label.phrase).slice(0, maxChars),
      emoji: txt(label.emoji).slice(0, 12),
      font_stack: txt(label.font_stack).slice(0, 180),
      color: hex(label.color, '#382011'),
      background: hex(label.background, '#FFF9F0'),
      border: hex(label.border, ''),
      width_mm: Math.min(200, Math.max(20, num(label.width_mm, 60))),
      height_mm: Math.min(200, Math.max(20, num(label.height_mm, 40))),
      text_x: Math.min(80, Math.max(-80, num(label.text_x))),
      text_y: Math.min(80, Math.max(-80, num(label.text_y))),
    },
  };
}

function sanitizeDataImage(value, maxBytes = 2.5 * 1024 * 1024) {
  const raw = txt(value);
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(raw)) return '';
  return raw.length <= maxBytes * 1.4 ? raw : '';
}

function nextCustomRequestNumber() {
  const row = get("SELECT number FROM custom_requests WHERE number LIKE 'PERSO-%' ORDER BY id DESC LIMIT 1");
  const last = row ? int(String(row.number).replace(/\D/g, ''), 0) : 0;
  return `PERSO-${String(last + 1).padStart(4, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Authentification                                                    */
/* ------------------------------------------------------------------ */

app.post('/api/auth/login', (req, res) => {
  const user = login(req.body?.username, req.body?.password);
  if (!user) return json(res, { error: 'Identifiant ou mot de passe incorrect.' }, 401);
  const session = createSession();
  res.setHeader('Set-Cookie', sessionCookie(session.token, session.expires));
  return json(res, { ok: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  destroySession(readToken(req));
  res.setHeader('Set-Cookie', clearCookie());
  return json(res, { ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = readToken(req);
  const row = token
    ? get('SELECT expires_at FROM sessions WHERE token_hash = ?', createHash('sha256').update(token).digest('hex'))
    : null;
  if (!row || row.expires_at < now()) return json(res, { authenticated: false }, 401);
  return json(res, { authenticated: true, user: { username: getSetting('admin_username', 'admin') } });
});

app.put('/api/auth/password', authRequired, (req, res) => {
  const current = txt(req.body?.current);
  const next = txt(req.body?.next);
  if (next.length < 8) return json(res, { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }, 400);
  if (!verifyPassword(current, getSetting('admin_password_hash', ''))) {
    return json(res, { error: 'Mot de passe actuel incorrect.' }, 400);
  }
  setSetting('admin_password_hash', hashPassword(next));
  return json(res, { ok: true });
});

/* ------------------------------------------------------------------ */
/* Tableau de bord                                                     */
/* ------------------------------------------------------------------ */

app.get('/api/dashboard', authRequired, (_req, res) => {
  const orders = all('SELECT * FROM orders WHERE status != ?', 'annulee').map(orderWithDetails);
  const revenue = round(orders.reduce((s, o) => s + o.total, 0));
  const pending = all("SELECT COUNT(*) AS n FROM orders WHERE status IN ('confirmee', 'en_preparation')")[0].n;
  const newContacts = all("SELECT COUNT(*) AS n FROM contacts WHERE status = 'nouveau'")[0].n;
  const customers = all('SELECT COUNT(*) AS n FROM customers')[0].n;
  const products = all('SELECT COUNT(*) AS n FROM products')[0].n;
  const lowStock = all('SELECT COUNT(*) AS n FROM materials WHERE stock_qty <= min_stock')[0].n;

  const byMonth = {};
  for (const o of orders) {
    const key = String(o.order_date).slice(0, 7);
    if (!key) continue;
    byMonth[key] = (byMonth[key] || 0) + o.total;
  }
  const monthly = Object.keys(byMonth).sort().slice(-6).map((month) => ({ month, total: round(byMonth[month]) }));

  return json(res, {
    stats: { revenue, orders: orders.length, pending, newContacts, customers, products, lowStock },
    monthly,
    recentOrders: all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').map(orderWithDetails),
    recentContacts: all('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5'),
    lowStockItems: all('SELECT id, name, unit, stock_qty, min_stock FROM materials WHERE stock_qty <= min_stock ORDER BY stock_qty ASC LIMIT 8'),
    topProducts: all('SELECT name, price FROM products ORDER BY featured DESC, id ASC LIMIT 5'),
  });
});

/* ------------------------------------------------------------------ */
/* Calcul des matières premières                                       */
/* ------------------------------------------------------------------ */

app.get('/api/calculator', authRequired, (_req, res) => {
  const coefficient = num(getSetting('margin_coefficient', '2.5'), 2.5);
  const products = all('SELECT * FROM products ORDER BY name').map((p) => {
    const details = productCostRows(p.id);
    const cost = round(details.reduce((s, d) => s + num(d.quantity) * num(d.unit_cost), 0));
    const price = num(p.price);
    return {
      id: p.id,
      name: p.name,
      price,
      cost,
      suggested: round(cost * coefficient),
      margin: price > 0 ? round(((price - cost) / price) * 100) : 0,
      details,
    };
  });
  const materials = all('SELECT id, name, unit, unit_cost, stock_qty, min_stock FROM materials ORDER BY name');
  return json(res, { coefficient, products, materials });
});

/* ------------------------------------------------------------------ */
/* Matières premières                                                  */
/* ------------------------------------------------------------------ */

app.get('/api/materials', authRequired, (_req, res) => {
  const rows = all(
    `SELECT m.*, s.name AS supplier_name
     FROM materials m LEFT JOIN suppliers s ON s.id = m.supplier_id
     ORDER BY m.name`,
  ).map((r) => ({ ...r, low_stock: num(r.stock_qty) <= num(r.min_stock) }));
  return json(res, { items: rows });
});

app.get('/api/materials/:id', authRequired, (req, res) => {
  const row = get('SELECT * FROM materials WHERE id = ?', int(req.params.id, 0));
  if (!row) return json(res, { error: 'Matière introuvable.' }, 404);
  return json(res, { item: row });
});

app.post('/api/materials', authRequired, (req, res) => {
  const b = req.body || {};
  if (!txt(b.name)) return json(res, { error: 'Le nom est obligatoire.' }, 400);
  const date = now();
  const result = run(
    `INSERT INTO materials (name, category, unit, unit_cost, stock_qty, min_stock, supplier_id, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    txt(b.name), txt(b.category) || 'autre', txt(b.unit) || 'g',
    round(num(b.unit_cost)), round(num(b.stock_qty)), round(num(b.min_stock)),
    int(b.supplier_id, null), txt(b.notes), date, date,
  );
  return json(res, { ok: true, id: Number(result.lastInsertRowid) }, 201);
});

app.put('/api/materials/:id', authRequired, (req, res) => {
  const id = int(req.params.id, 0);
  if (!get('SELECT id FROM materials WHERE id = ?', id)) return json(res, { error: 'Matière introuvable.' }, 404);
  const b = req.body || {};
  run(
    `UPDATE materials SET name=?, category=?, unit=?, unit_cost=?, stock_qty=?, min_stock=?, supplier_id=?, notes=?, updated_at=? WHERE id=?`,
    txt(b.name) || 'Sans nom', txt(b.category) || 'autre', txt(b.unit) || 'g',
    round(num(b.unit_cost)), round(num(b.stock_qty)), round(num(b.min_stock)),
    int(b.supplier_id, null), txt(b.notes), now(), id,
  );
  return json(res, { ok: true });
});

app.delete('/api/materials/:id', authRequired, (req, res) => {
  run('DELETE FROM materials WHERE id = ?', int(req.params.id, 0));
  return json(res, { ok: true });
});

app.post('/api/materials/:id/stock', authRequired, (req, res) => {
  const id = int(req.params.id, 0);
  const quantity = num(req.body?.quantity);
  if (!quantity) return json(res, { error: 'Quantité invalide.' }, 400);
  const date = now();
  run('UPDATE materials SET stock_qty = stock_qty + ?, updated_at = ? WHERE id = ?', round(quantity), date, id);
  run(
    'INSERT INTO stock_movements (material_id, type, quantity, reason, created_at) VALUES (?, ?, ?, ?, ?)',
    id, quantity > 0 ? 'entree' : 'sortie', round(quantity), txt(req.body?.reason) || 'Ajustement manuel', date,
  );
  return json(res, { ok: true });
});

/* ------------------------------------------------------------------ */
/* Produits & recettes                                                 */
/* ------------------------------------------------------------------ */

app.get('/api/products', authRequired, (_req, res) =>
  json(res, { items: all('SELECT * FROM products ORDER BY name').map(productWithCost) }));

app.get('/api/products/:id', authRequired, (req, res) => {
  const row = get('SELECT * FROM products WHERE id = ?', int(req.params.id, 0));
  if (!row) return json(res, { error: 'Produit introuvable.' }, 404);
  return json(res, { item: { ...productWithCost(row), recipe: productCostRows(row.id) } });
});

app.post('/api/products', authRequired, (req, res) => {
  const b = req.body || {};
  if (!txt(b.name)) return json(res, { error: 'Le nom est obligatoire.' }, 400);
  const date = now();
  const result = run(
    `INSERT INTO products (name, slug, category, description, price, vat_rate, weight_g, burn_hours, image_url, active, featured, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    txt(b.name), uniqueSlug(txt(b.name)), txt(b.category) || 'bougie', txt(b.description),
    round(num(b.price)), round(num(b.vat_rate, 20)), round(num(b.weight_g)), int(b.burn_hours, 0),
    txt(b.image_url), bool(b.active), bool(b.featured), txt(b.notes), date, date,
  );
  return json(res, { ok: true, id: Number(result.lastInsertRowid) }, 201);
});

app.put('/api/products/:id', authRequired, (req, res) => {
  const id = int(req.params.id, 0);
  const existing = get('SELECT * FROM products WHERE id = ?', id);
  if (!existing) return json(res, { error: 'Produit introuvable.' }, 404);
  const b = req.body || {};
  run(
    `UPDATE products SET name=?, slug=?, category=?, description=?, price=?, vat_rate=?, weight_g=?, burn_hours=?, image_url=?, active=?, featured=?, notes=?, updated_at=? WHERE id=?`,
    txt(b.name) || existing.name,
    uniqueSlug(txt(b.name) || existing.name, id),
    txt(b.category) || 'bougie', txt(b.description), round(num(b.price, existing.price)),
    round(num(b.vat_rate, 20)), round(num(b.weight_g)), int(b.burn_hours, 0),
    txt(b.image_url), bool(b.active), bool(b.featured), txt(b.notes), now(), id,
  );
  return json(res, { ok: true });
});

app.delete('/api/products/:id', authRequired, (req, res) => {
  run('DELETE FROM products WHERE id = ?', int(req.params.id, 0));
  return json(res, { ok: true });
});

app.put('/api/products/:id/recipe', authRequired, (req, res) => {
  const id = int(req.params.id, 0);
  if (!get('SELECT id FROM products WHERE id = ?', id)) return json(res, { error: 'Produit introuvable.' }, 404);
  run('DELETE FROM product_materials WHERE product_id = ?', id);
  for (const item of Array.isArray(req.body?.items) ? req.body.items : []) {
    const materialId = int(item.material_id, null);
    const quantity = num(item.quantity);
    if (!materialId || quantity <= 0) continue;
    run(
      'INSERT OR REPLACE INTO product_materials (product_id, material_id, quantity) VALUES (?, ?, ?)',
      id, materialId, round(quantity),
    );
  }
  return json(res, { ok: true });
});

/* ------------------------------------------------------------------ */
/* Clients & fournisseurs                                              */
/* ------------------------------------------------------------------ */

function makeCrud(table, fields, label) {
  const list = authRequired;
  app.get(`/api/${table}`, list, (_req, res) =>
    json(res, { items: all(`SELECT * FROM ${table} ORDER BY id DESC`) }));

  app.get(`/api/${table}/:id`, list, (req, res) => {
    const row = get(`SELECT * FROM ${table} WHERE id = ?`, int(req.params.id, 0));
    if (!row) return json(res, { error: `${label} introuvable.` }, 404);
    return json(res, { item: row });
  });

  app.post(`/api/${table}`, list, (req, res) => {
    const b = req.body || {};
    const values = fields.map((f) => (f === 'created_at' || f === 'updated_at' ? now() : txt(b[f])));
    const placeholders = fields.map(() => '?').join(', ');
    const result = run(`INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`, ...values);
    return json(res, { ok: true, id: Number(result.lastInsertRowid) }, 201);
  });

  app.put(`/api/${table}/:id`, list, (req, res) => {
    const id = int(req.params.id, 0);
    if (!get(`SELECT id FROM ${table} WHERE id = ?`, id)) return json(res, { error: `${label} introuvable.` }, 404);
    const b = req.body || {};
    const assignments = fields
      .filter((f) => f !== 'created_at')
      .map((f) => `${f} = ?`);
    const values = fields
      .filter((f) => f !== 'created_at')
      .map((f) => (f === 'updated_at' ? now() : txt(b[f])));
    run(`UPDATE ${table} SET ${assignments.join(', ')} WHERE id = ?`, ...values, id);
    return json(res, { ok: true });
  });

  app.delete(`/api/${table}/:id`, list, (req, res) => {
    run(`DELETE FROM ${table} WHERE id = ?`, int(req.params.id, 0));
    return json(res, { ok: true });
  });
}

makeCrud('customers',
  ['kind', 'first_name', 'last_name', 'company', 'email', 'phone', 'address', 'zip', 'city', 'tags', 'notes', 'created_at', 'updated_at'],
  'Client');
makeCrud('suppliers',
  ['name', 'contact', 'email', 'phone', 'address', 'zip', 'city', 'website', 'notes', 'created_at', 'updated_at'],
  'Fournisseur');

/* ------------------------------------------------------------------ */
/* Commandes                                                           */
/* ------------------------------------------------------------------ */

app.get('/api/orders', authRequired, (_req, res) =>
  json(res, { items: all('SELECT * FROM orders ORDER BY order_date DESC, id DESC').map(orderWithDetails) }));

app.get('/api/orders/:id', authRequired, (req, res) => {
  const row = get('SELECT * FROM orders WHERE id = ?', int(req.params.id, 0));
  if (!row) return json(res, { error: 'Commande introuvable.' }, 404);
  return json(res, { item: orderWithDetails(row) });
});

app.post('/api/orders', authRequired, (req, res) => {
  const b = req.body || {};
  const date = now();
  const number = txt(b.number) || nextOrderNumber();
  const result = run(
    `INSERT INTO orders (number, customer_id, status, order_date, shipping_cost, discount, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    number, int(b.customer_id, null), STATUSES.includes(b.status) ? b.status : 'brouillon',
    txt(b.order_date) || date.slice(0, 10), round(num(b.shipping_cost)), round(num(b.discount)),
    txt(b.notes), date, date,
  );
  const id = Number(result.lastInsertRowid);
  saveOrderItems(id, b.items);
  if (['expediee', 'livree'].includes(b.status)) consumeStock(get('SELECT * FROM orders WHERE id = ?', id));
  return json(res, { ok: true, id }, 201);
});

app.put('/api/orders/:id', authRequired, (req, res) => {
  const id = int(req.params.id, 0);
  if (!get('SELECT id FROM orders WHERE id = ?', id)) return json(res, { error: 'Commande introuvable.' }, 404);
  const b = req.body || {};
  run(
    `UPDATE orders SET customer_id=?, status=?, order_date=?, shipping_cost=?, discount=?, notes=?, updated_at=? WHERE id=?`,
    int(b.customer_id, null), STATUSES.includes(b.status) ? b.status : 'brouillon',
    txt(b.order_date) || now().slice(0, 10), round(num(b.shipping_cost)), round(num(b.discount)),
    txt(b.notes), now(), id,
  );
  if (Array.isArray(b.items)) saveOrderItems(id, b.items);
  return json(res, { ok: true });
});

app.put('/api/orders/:id/status', authRequired, (req, res) => {
  const id = int(req.params.id, 0);
  const order = get('SELECT * FROM orders WHERE id = ?', id);
  if (!order) return json(res, { error: 'Commande introuvable.' }, 404);
  const status = txt(req.body?.status);
  if (!STATUSES.includes(status)) return json(res, { error: 'Statut invalide.' }, 400);
  run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', status, now(), id);
  const consumed = ['expediee', 'livree'].includes(status) ? consumeStock(get('SELECT * FROM orders WHERE id = ?', id)) : false;
  return json(res, { ok: true, stock_consumed: consumed });
});

app.delete('/api/orders/:id', authRequired, (req, res) => {
  run('DELETE FROM orders WHERE id = ?', int(req.params.id, 0));
  return json(res, { ok: true });
});

/* ------------------------------------------------------------------ */
/* Contacts                                                            */
/* ------------------------------------------------------------------ */

app.get('/api/contacts', authRequired, (_req, res) =>
  json(res, { items: all('SELECT * FROM contacts ORDER BY created_at DESC') }));

app.put('/api/contacts/:id', authRequired, (req, res) => {
  const status = txt(req.body?.status);
  if (!CONTACT_STATUSES.includes(status)) return json(res, { error: 'Statut invalide.' }, 400);
  run('UPDATE contacts SET status = ? WHERE id = ?', status, int(req.params.id, 0));
  return json(res, { ok: true });
});

app.delete('/api/contacts/:id', authRequired, (req, res) => {
  run('DELETE FROM contacts WHERE id = ?', int(req.params.id, 0));
  return json(res, { ok: true });
});

/* ------------------------------------------------------------------ */
/* Évènements                                                          */
/* ------------------------------------------------------------------ */

app.get('/api/events', authRequired, (_req, res) =>
  json(res, { items: all('SELECT * FROM events ORDER BY event_date ASC, id DESC') }));

app.get('/api/events/:id', authRequired, (req, res) => {
  const row = get('SELECT * FROM events WHERE id = ?', int(req.params.id, 0));
  if (!row) return json(res, { error: 'Évènement introuvable.' }, 404);
  return json(res, { item: row });
});

const eventPayload = (b, existing = {}) => ({
  title: txt(b.title) || existing.title || '',
  event_date: txt(b.event_date),
  location: txt(b.location),
  description: txt(b.description),
  image_url: txt(b.image_url),
  active: bool(b.active ?? 1),
});

app.post('/api/events', authRequired, (req, res) => {
  const values = eventPayload(req.body || {});
  if (!values.title) return json(res, { error: 'Le titre est obligatoire.' }, 400);
  const date = now();
  const result = run(
    `INSERT INTO events (title, event_date, location, description, image_url, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    values.title, values.event_date, values.location, values.description,
    values.image_url, values.active, date, date,
  );
  return json(res, { ok: true, id: Number(result.lastInsertRowid) }, 201);
});

app.put('/api/events/:id', authRequired, (req, res) => {
  const id = int(req.params.id, 0);
  const existing = get('SELECT * FROM events WHERE id = ?', id);
  if (!existing) return json(res, { error: 'Évènement introuvable.' }, 404);
  const values = eventPayload(req.body || {}, existing);
  if (!values.title) return json(res, { error: 'Le titre est obligatoire.' }, 400);
  run(
    `UPDATE events SET title=?, event_date=?, location=?, description=?, image_url=?, active=?, updated_at=? WHERE id=?`,
    values.title, values.event_date, values.location, values.description,
    values.image_url, values.active, now(), id,
  );
  return json(res, { ok: true });
});

app.delete('/api/events/:id', authRequired, (req, res) => {
  run('DELETE FROM events WHERE id = ?', int(req.params.id, 0));
  return json(res, { ok: true });
});

// Upload d'une photo d'évènement (base64 envoyé par l'administration).
app.post('/api/events/image', authRequired, (req, res) => {
  const data = String(req.body?.data || '');
  const match = data.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return json(res, { error: 'Format d’image invalide (JPG, PNG ou WebP attendu).' }, 400);
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) return json(res, { error: 'Image trop volumineuse (5 Mo maximum).' }, 413);
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const uploadDir = path.join(ROOT, 'public', 'uploads', 'events');
  fs.mkdirSync(uploadDir, { recursive: true });
  const name = `${Date.now()}-${slugify(txt(req.body?.name).replace(/\.[^.]+$/, '')) || 'photo'}.${extension}`;
  fs.writeFileSync(path.join(uploadDir, name), buffer);
  return json(res, { url: `/uploads/events/${name}` }, 201);
});

/* ------------------------------------------------------------------ */
/* Configurateur « Créer ma bougie » — options (admin)                  */
/* ------------------------------------------------------------------ */

app.get('/api/custom-options', authRequired, (_req, res) => json(res, {
  items: all('SELECT * FROM custom_options ORDER BY position ASC, id ASC'),
  categories: CUSTOM_CATEGORIES,
}));

const customOptionPayload = (b, existing = {}) => {
  const meta = parseMeta(existing.meta);
  const incoming = typeof b.meta === 'string' ? parseMeta(b.meta) : b.meta;
  if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
    for (const [key, value] of Object.entries(incoming)) {
      if (/^[a-z_]{1,24}$/.test(key)) meta[key] = typeof value === 'string' ? txt(value).slice(0, 240) : value;
    }
  }
  return {
    category: CUSTOM_CATEGORIES.some((c) => c.value === txt(b.category))
      ? txt(b.category) : (existing.category || 'contenant'),
    name: txt(b.name) || existing.name || '',
    description: txt(b.description),
    image_url: txt(b.image_url),
    icon: txt(b.icon),
    extra_price: round(num(b.extra_price ?? existing.extra_price ?? 0)),
    position: int(b.position ?? existing.position ?? 0, 0),
    active: bool(b.active ?? 1),
    availability: CUSTOM_AVAILABILITIES.includes(txt(b.availability))
      ? txt(b.availability) : (existing.availability || 'disponible'),
    meta: JSON.stringify(meta),
  };
};

app.post('/api/custom-options', authRequired, (req, res) => {
  const values = customOptionPayload(req.body || {});
  if (!values.name) return json(res, { error: 'Le nom de l’option est obligatoire.' }, 400);
  const date = now();
  const result = run(
    `INSERT INTO custom_options
      (category, name, description, image_url, icon, extra_price, position, active, availability, meta, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values.category, values.name, values.description, values.image_url, values.icon,
    values.extra_price, values.position, values.active, values.availability, values.meta, date, date,
  );
  return json(res, { ok: true, id: Number(result.lastInsertRowid) }, 201);
});

app.put('/api/custom-options/:id', authRequired, (req, res) => {
  const id = int(req.params.id, 0);
  const existing = get('SELECT * FROM custom_options WHERE id = ?', id);
  if (!existing) return json(res, { error: 'Option introuvable.' }, 404);
  const values = customOptionPayload(req.body || {}, existing);
  if (!values.name) return json(res, { error: 'Le nom de l’option est obligatoire.' }, 400);
  run(
    `UPDATE custom_options SET category=?, name=?, description=?, image_url=?, icon=?,
      extra_price=?, position=?, active=?, availability=?, meta=?, updated_at=? WHERE id=?`,
    values.category, values.name, values.description, values.image_url, values.icon,
    values.extra_price, values.position, values.active, values.availability, values.meta, now(), id,
  );
  return json(res, { ok: true });
});

app.delete('/api/custom-options/:id', authRequired, (req, res) => {
  run('DELETE FROM custom_options WHERE id = ?', int(req.params.id, 0));
  return json(res, { ok: true });
});

/* ------------------------------------------------------------------ */
/* Configurateur — demandes envoyées par les visiteurs (admin)         */
/* ------------------------------------------------------------------ */

app.get('/api/custom-requests', authRequired, (_req, res) => json(res, {
  items: all('SELECT * FROM custom_requests ORDER BY id DESC').map(customRequestPublic),
  statuses: CUSTOM_REQUEST_STATUSES,
}));

app.put('/api/custom-requests/:id', authRequired, (req, res) => {
  const id = int(req.params.id, 0);
  if (!get('SELECT id FROM custom_requests WHERE id = ?', id)) {
    return json(res, { error: 'Demande introuvable.' }, 404);
  }
  const status = txt(req.body?.status);
  if (!CUSTOM_REQUEST_STATUSES.includes(status)) {
    return json(res, { error: 'Statut invalide.' }, 400);
  }
  run('UPDATE custom_requests SET status = ?, updated_at = ? WHERE id = ?', status, now(), id);
  return json(res, { ok: true });
});

app.delete('/api/custom-requests/:id', authRequired, (req, res) => {
  run('DELETE FROM custom_requests WHERE id = ?', int(req.params.id, 0));
  return json(res, { ok: true });
});

// Transforme une demande validée en commande du CRM existant (aucun second système).
app.post('/api/custom-requests/:id/order', authRequired, (req, res) => {
  const id = int(req.params.id, 0);
  const request = get('SELECT * FROM custom_requests WHERE id = ?', id);
  if (!request) return json(res, { error: 'Demande introuvable.' }, 404);
  const existingOrder = get('SELECT id, number FROM orders WHERE custom_request_id = ?', id);
  if (existingOrder) return json(res, { error: `Cette demande est déjà la commande ${existingOrder.number}.` }, 409);

  const date = now();
  const number = nextOrderNumber();
  const customer = get('SELECT id FROM customers WHERE email = ?', request.email);
  const notes = `Bougie personnalisée ${request.number} — ${request.customer_name}${request.message ? ` — ${request.message}` : ''}`;
  const result = run(
    `INSERT INTO orders
      (number, customer_id, status, order_date, notes, custom_request_id, custom_config, custom_preview, created_at, updated_at)
     VALUES (?, ?, 'brouillon', ?, ?, ?, ?, ?, ?, ?)`,
    number, int(customer?.id, null), date.slice(0, 10), notes, id,
    txt(request.configuration), txt(request.preview_image), date, date,
  );
  const orderId = Number(result.lastInsertRowid);
  run(
    'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, NULL, ?, 1, ?)',
    orderId, `Bougie personnalisée — ${request.number}`, request.price,
  );
  run("UPDATE custom_requests SET status = 'confirmee', updated_at = ? WHERE id = ?", date, id);
  return json(res, { ok: true, id: orderId, number, customer_id: int(customer?.id, null) }, 201);
});

/* ------------------------------------------------------------------ */
/* Paramètres                                                          */
/* ------------------------------------------------------------------ */

const PUBLIC_SETTING_KEYS = [
  'shop_name', 'tagline', 'description', 'about', 'email', 'phone', 'address',
  'zip', 'city', 'siret', 'hours', 'instagram', 'currency', 'vat_rate',
  'legal_name', 'siren', 'vat_number', 'rcs', 'ape', 'website', 'whatsapp',
  'tiktok', 'logo', 'hero_video', 'hero_image', 'featured_video',
  'custom_base_price', 'custom_intro', 'custom_label_width_mm', 'custom_label_height_mm', 'custom_label_max_chars',
];

app.get('/api/settings', authRequired, (_req, res) => {
  const settings = {};
  for (const row of all('SELECT key, value FROM settings')) {
    if (!row.key.startsWith('__') && row.key !== 'admin_password_hash') settings[row.key] = row.value;
  }
  return json(res, { settings });
});

app.put('/api/settings', authRequired, (req, res) => {
  const values = req.body?.settings || req.body || {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith('__') || key === 'admin_password_hash') continue;
    setSetting(key, txt(value));
  }
  return json(res, { ok: true });
});

/* ------------------------------------------------------------------ */
/* API publique (site dynamique)                                       */
/* ------------------------------------------------------------------ */

app.get('/api/public/site', (_req, res) => {
  const settings = {};
  for (const key of PUBLIC_SETTING_KEYS) settings[key] = getSetting(key, '');
  return json(res, { settings });
});

app.get('/api/public/events', (_req, res) => json(res, {
  items: all(
    `SELECT id, title, event_date, location, description, image_url
     FROM events WHERE active = 1 ORDER BY event_date ASC, id DESC`,
  ),
}));

app.get('/api/public/custom-options', (_req, res) => {
  const rows = all(
    `SELECT * FROM custom_options WHERE active = 1
      AND COALESCE(availability, 'disponible') <> 'indisponible'
     ORDER BY position ASC, id ASC`,
  );
  return json(res, {
    categories: CUSTOM_CATEGORIES.map((category) => ({
      ...category,
      items: rows
        .filter((row) => row.category === category.value)
        .map(customOptionPublic),
    })),
    base_price: round(getSetting('custom_base_price', 25)),
    intro: getSetting('custom_intro', ''),
    label: {
      width_mm: Math.min(200, Math.max(20, num(getSetting('custom_label_width_mm', 60), 60))),
      height_mm: Math.min(200, Math.max(20, num(getSetting('custom_label_height_mm', 40), 40))),
      max_chars: Math.min(200, Math.max(20, int(getSetting('custom_label_max_chars', 60), 60))),
    },
  });
});

app.post('/api/public/custom-requests', (req, res) => {
  const b = req.body || {};
  const customerName = txt(b.customer_name);
  const email = txt(b.email);
  if (!customerName || !email) {
    return json(res, { error: 'Merci de renseigner votre nom et votre e-mail.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, { error: 'Adresse e-mail invalide.' }, 400);
  }

  // Les prix et la configuration sont reconstruits côté serveur à partir de la base :
  // le visiteur ne peut ni modifier un tarif ni inventer une option.
  const selections = [];
  const configRows = [];
  const seenSingle = new Set();
  for (const choice of Array.isArray(b.selections) ? b.selections : []) {
    const option = get(
      `SELECT * FROM custom_options WHERE id = ? AND active = 1
       AND COALESCE(availability, 'disponible') <> 'indisponible'`,
      int(choice?.id ?? choice?.option_id, 0),
    );
    if (!option) continue;
    const category = CUSTOM_CATEGORIES.find((c) => c.value === option.category);
    if (!category) continue;
    if (!category.multiple) {
      if (seenSingle.has(option.category)) continue;
      seenSingle.add(option.category);
    }
    selections.push({
      id: option.id,
      category: option.category,
      name: option.name,
      extra_price: round(option.extra_price),
    });
    configRows.push({ ...selections[selections.length - 1], meta: txt(option.meta) });
  }
  const required = ['contenant', 'couleur', 'parfum'].filter((value) => !seenSingle.has(value));
  if (required.length) {
    return json(res, { error: 'Choisissez le contenant, la couleur de la cire et le parfum.' }, 400);
  }

  const rawLabel = b.label && typeof b.label === 'object' ? b.label : {};
  const configuration = buildCustomConfiguration(configRows, {
    ...rawLabel,
    phrase: rawLabel.phrase ?? b.label_phrase,
    emoji: rawLabel.emoji ?? b.label_emoji,
  });
  if (!configuration.label.phrase) {
    return json(res, { error: 'Écrivez la phrase qui figurera sur l’étiquette.' }, 400);
  }

  const base = round(getSetting('custom_base_price', 25));
  const extra = selections.reduce((sum, item) => sum + num(item.extra_price), 0);
  const price = round(base + extra);
  const number = nextCustomRequestNumber();
  const date = now();
  run(
    `INSERT INTO custom_requests
      (number, customer_name, email, phone, selections, label_phrase, label_emoji, message,
       price, status, configuration, preview_image, label_image, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nouvelle', ?, ?, ?, ?, ?)`,
    number, customerName, email, txt(b.phone), JSON.stringify(selections),
    configuration.label.phrase, configuration.label.emoji,
    txt(b.message).slice(0, 2000), price, JSON.stringify(configuration),
    sanitizeDataImage(b.preview_image), sanitizeDataImage(b.label_image, 1.5 * 1024 * 1024),
    date, date,
  );
  return json(res, {
    ok: true,
    number,
    price,
    configuration,
    message: 'Votre projet de bougie a bien été envoyé à l’atelier. Merci !',
  }, 201);
});

app.get('/api/public/products', (req, res) => {
  const category = txt(req.query.category);
  const rows = all(
    `SELECT * FROM products WHERE active = 1 ${category ? 'AND category = ?' : ''} ORDER BY featured DESC, name ASC`,
    ...(category ? [category] : []),
  );
  const categories = all('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category').map((r) => r.category);
  return json(res, { items: rows.map(publicProduct), categories });
});

app.get('/api/public/products/:slug', (req, res) => {
  const row = get('SELECT * FROM products WHERE slug = ? AND active = 1', txt(req.params.slug));
  if (!row) return json(res, { error: 'Produit introuvable.' }, 404);
  return json(res, { item: publicProduct(row) });
});

app.post('/api/public/contact', (req, res) => {
  const b = req.body || {};
  const name = txt(b.name);
  const email = txt(b.email);
  const message = txt(b.message);
  if (!name || !email || !message) {
    return json(res, { error: 'Merci de renseigner votre nom, votre e-mail et votre message.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, { error: 'Adresse e-mail invalide.' }, 400);
  }
  run(
    'INSERT INTO contacts (name, email, phone, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    name, email, txt(b.phone), txt(b.subject), message, 'nouveau', now(),
  );
  return json(res, { ok: true, message: 'Votre message a bien été envoyé. Merci !' }, 201);
});

/* ------------------------------------------------------------------ */
/* Statiques + fallback SPA                                            */
/* ------------------------------------------------------------------ */

const publicDir = path.join(ROOT, 'public');
if (fs.existsSync(publicDir)) app.use(express.static(publicDir));

const distDir = path.join(ROOT, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return json(res, { error: 'Route inconnue.' }, 404);
    return res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  console.error('[api]', error);
  if (!res.headersSent) json(res, { error: 'Erreur interne du serveur.' }, 500);
});

app.listen(PORT, HOST, () => {
  console.log(`CRM bougier — API prête sur http://${HOST}:${PORT}`);
  console.log(`Base de données : ${DB_PATH}`);
  console.log(`Origines autorisées : ${allowedOrigins.join(', ')}`);
});
