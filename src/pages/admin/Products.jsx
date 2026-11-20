import React, { useEffect, useMemo, useState } from 'react';
import { api, euro, number } from '../../api.js';
import { PRODUCT_CATEGORIES, labelOf } from '../../constants.js';
import { Modal, Field, Badge, Empty, Alert, ConfirmDialog } from '../../components/UI.jsx';

const emptyForm = {
  name: '', category: 'bougie', description: '', price: '', vat_rate: '20',
  weight_g: '', burn_hours: '', image_url: '', active: true, featured: false, notes: '',
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [recipe, setRecipe] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/products'), api.get('/materials'), api.get('/settings')])
      .then(([p, m, s]) => {
        setProducts(p.items || []);
        setMaterials(m.items || []);
        setCoefficient(Number(s.settings?.margin_coefficient) || 2.5);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  const [coefficient, setCoefficient] = useState(2.5);

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())), [products, search]);

  const openNew = () => {
    setEditing({ id: null });
    setForm(emptyForm);
    setRecipe([]);
    setError('');
  };

  const openEdit = async (product) => {
    setError('');
    try {
      const data = await api.get(`/products/${product.id}`);
      const p = data.item;
      setEditing(p);
      setForm({
        name: p.name, category: p.category, description: p.description || '', price: p.price,
        vat_rate: p.vat_rate, weight_g: p.weight_g, burn_hours: p.burn_hours,
        image_url: p.image_url || '', active: p.active, featured: p.featured, notes: p.notes || '',
      });
      setRecipe((p.recipe || []).map((r) => ({ material_id: r.material_id, quantity: r.quantity })));
    } catch (e) { setError(e.message); }
  };

  const recipeCost = recipe.reduce((sum, r) => {
    const material = materials.find((m) => m.id === Number(r.material_id));
    return sum + (material ? Number(material.unit_cost) * Number(r.quantity || 0) : 0);
  }, 0);
  const price = Number(form.price) || 0;
  const margin = price > 0 ? ((price - recipeCost) / price) * 100 : 0;

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = { ...form, price: Number(form.price) || 0 };
      let id = editing.id;
      if (id) await api.put(`/products/${id}`, payload);
      else {
        const created = await api.post('/products', payload);
        id = created.id;
      }
      await api.put(`/products/${id}/recipe`, { items: recipe });
      setEditing(null);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      await api.del(`/products/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (e) { setError(e.message); setDeleting(null); }
  };

  const updateRecipe = (index, key, value) => {
    setRecipe(recipe.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Produits</h1><p>Catalogue, prix publics et recettes de fabrication.</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nouveau produit</button>
      </div>
      <Alert kind="error">{error}</Alert>

      <div className="card">
        <div className="table-tools">
          <div className="search-input"><input placeholder="Rechercher un produit…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <span className="card-sub">{filtered.length} produit(s)</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Produit</th><th>Catégorie</th><th className="cell-right">Prix</th><th className="cell-right">Coût matière</th><th className="cell-right">Marge</th><th>Statut</th><th /></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-main">{p.featured && '⭐ '}{p.name}</div>
                    <div className="cell-sub">{p.material_count} matière(s) · {p.weight_g || '—'} g</div>
                  </td>
                  <td><Badge tone="muted">{labelOf(PRODUCT_CATEGORIES, p.category)}</Badge></td>
                  <td className="cell-right mono">{euro(p.price)}</td>
                  <td className="cell-right mono">{euro(p.cost)}</td>
                  <td className="cell-right mono" style={{ color: p.margin >= 50 ? 'var(--green)' : p.margin < 30 ? 'var(--red)' : 'inherit' }}>{number(p.margin, 1)} %</td>
                  <td><Badge tone={p.active ? 'green' : 'muted'}>{p.active ? 'En ligne' : 'Masqué'}</Badge></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" title="Modifier" onClick={() => openEdit(p)}>✎</button>
                      <button className="btn-icon danger" title="Supprimer" onClick={() => setDeleting(p)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="7"><Empty icon="🕯️">{loading ? 'Chargement…' : 'Aucun produit. Créez-en un pour commencer.'}</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing.id ? 'Modifier le produit' : 'Nouveau produit'}
          subtitle="Renseignez les informations et la recette de fabrication."
          wide
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-light" onClick={() => setEditing(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </>
          }
        >
          <Alert kind="error">{error}</Alert>
          <div className="form-grid">
            <Field label="Nom du produit" required><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bougie Lavande — 180 g" /></Field>
            <Field label="Catégorie">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {PRODUCT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description publique"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Texte affiché sur le site…" /></Field>
          <div className="form-grid-3">
            <Field label="Prix TTC (€)"><input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="TVA (%)"><input type="number" step="0.1" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} /></Field>
            <Field label="Poids (g)"><input type="number" step="1" value={form.weight_g} onChange={(e) => setForm({ ...form, weight_g: e.target.value })} /></Field>
          </div>
          <div className="form-grid-3">
            <Field label="Diffusion (heures)"><input type="number" value={form.burn_hours} onChange={(e) => setForm({ ...form, burn_hours: e.target.value })} /></Field>
            <Field label="Image (URL)"><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Notes internes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <div className="toggle-row">
            <label className="checkbox-line"><input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Afficher sur le site</label>
            <label className="checkbox-line"><input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Produit coup de cœur</label>
          </div>

          <div className="section-label">Recette · matières premières</div>
          {recipe.map((r, index) => {
            const material = materials.find((m) => m.id === Number(r.material_id));
            return (
              <div className="recipe-row" key={index}>
                <Field label="Matière">
                  <select value={r.material_id} onChange={(e) => updateRecipe(index, 'material_id', e.target.value)}>
                    <option value="">— Choisir —</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({euro(m.unit_cost)}/{m.unit})</option>)}
                  </select>
                </Field>
                <Field label="Quantité"><input type="number" step="0.01" value={r.quantity} onChange={(e) => updateRecipe(index, 'quantity', e.target.value)} /></Field>
                <Field label="Coût"><div className="mono" style={{ padding: '.72rem 0' }}>{material ? euro(material.unit_cost * Number(r.quantity || 0)) : '—'}</div></Field>
                <button className="btn-icon danger" style={{ marginBottom: '.25rem' }} onClick={() => setRecipe(recipe.filter((_, i) => i !== index))} aria-label="Retirer">×</button>
              </div>
            );
          })}
          <button className="btn btn-light btn-small" style={{ marginTop: '.8rem' }} onClick={() => setRecipe([...recipe, { material_id: '', quantity: 1 }])}>+ Ajouter une matière</button>

          <div className="cost-summary">
            <div className="cost-line"><span>Coût des matières premières</span><strong className="mono">{euro(recipeCost)}</strong></div>
            <div className="cost-line"><span>Prix conseillé (coût × {coefficient})</span><strong className="mono">{euro(recipeCost * coefficient)}</strong></div>
            <div className={`cost-line total ${margin >= 50 ? 'good' : margin < 30 ? 'bad' : ''}`}>
              <span>Prix public · marge</span><strong>{euro(price)} · {number(margin, 1)} %</strong>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Supprimer « ${deleting.name} » ? Le produit retirera également des commandes liées (les lignes existantes conservent leur nom).`}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}
