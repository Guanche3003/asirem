import React, { useEffect, useMemo, useState } from 'react';
import { api, euro, number } from '../../api.js';
import { MATERIAL_CATEGORIES, UNITS, labelOf } from '../../constants.js';
import { Modal, Field, Badge, Empty, Alert, ConfirmDialog } from '../../components/UI.jsx';

const emptyForm = { name: '', category: 'cire', unit: 'g', unit_cost: '', stock_qty: '', min_stock: '', supplier_id: '', notes: '' };

export default function Materials() {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [stockItem, setStockItem] = useState(null);
  const [stockForm, setStockForm] = useState({ quantity: '', reason: '' });
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/materials'), api.get('/suppliers')])
      .then(([m, s]) => { setItems(m.items || []); setSuppliers(s.items || []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    labelOf(MATERIAL_CATEGORIES, i.category).toLowerCase().includes(search.toLowerCase())), [items, search]);

  const openNew = () => { setEditing({ id: null }); setForm(emptyForm); setError(''); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name, category: item.category, unit: item.unit, unit_cost: item.unit_cost,
      stock_qty: item.stock_qty, min_stock: item.min_stock, supplier_id: item.supplier_id || '', notes: item.notes || '',
    });
    setError('');
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        unit_cost: Number(form.unit_cost) || 0,
        stock_qty: Number(form.stock_qty) || 0,
        min_stock: Number(form.min_stock) || 0,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      };
      if (editing.id) await api.put(`/materials/${editing.id}`, payload);
      else await api.post('/materials', payload);
      setEditing(null); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const applyStock = async () => {
    try {
      await api.post(`/materials/${stockItem.id}/stock`, {
        quantity: Number(stockForm.quantity) || 0,
        reason: stockForm.reason || 'Ajustement manuel',
      });
      setStockItem(null); load();
    } catch (e) { setError(e.message); }
  };

  const remove = async () => {
    try { await api.del(`/materials/${deleting.id}`); setDeleting(null); load(); }
    catch (e) { setError(e.message); setDeleting(null); }
  };

  const totalValue = items.reduce((s, i) => s + Number(i.stock_qty) * Number(i.unit_cost), 0);
  const lowCount = items.filter((i) => i.low_stock).length;

  return (
    <>
      <div className="page-head">
        <div><h1>Matières premières</h1><p>Stocks, coûts unitaires et fournisseurs associés.</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nouvelle matière</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card"><div className="stat-label">Références</div><div className="stat-value">{items.length}</div></div>
        <div className="stat-card"><div className="stat-label">Valeur du stock</div><div className="stat-value">{euro(totalValue)}</div></div>
        <div className="stat-card"><div className="stat-label">Stocks bas</div><div className="stat-value" style={{ color: lowCount ? 'var(--red)' : 'inherit' }}>{lowCount}</div></div>
      </div>

      <Alert kind="error">{error}</Alert>

      <div className="card">
        <div className="table-tools">
          <div className="search-input"><input placeholder="Rechercher une matière…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <span className="card-sub">{filtered.length} référence(s)</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Matière</th><th>Catégorie</th><th className="cell-right">Coût unitaire</th><th className="cell-right">Stock</th><th>Fournisseur</th><th>État</th><th /></tr></thead>
            <tbody>
              {filtered.map((item) => {
                const ratio = item.min_stock > 0 ? Math.min(100, (item.stock_qty / item.min_stock) * 100) : 100;
                return (
                  <tr key={item.id}>
                    <td><div className="cell-main">{item.name}</div><div className="cell-sub">{item.notes || '—'}</div></td>
                    <td><Badge tone="muted">{labelOf(MATERIAL_CATEGORIES, item.category)}</Badge></td>
                    <td className="cell-right mono">{euro(item.unit_cost)} <span className="muted">/ {item.unit}</span></td>
                    <td className="cell-right mono">
                      {number(item.stock_qty)} {item.unit}
                      <div className="stock-bar" style={{ marginLeft: 'auto' }}><i className={item.low_stock ? 'low' : ''} style={{ width: `${ratio}%` }} /></div>
                    </td>
                    <td className="muted">{item.supplier_name || '—'}</td>
                    <td><Badge tone={item.low_stock ? 'red' : 'green'}>{item.low_stock ? 'Stock bas' : 'OK'}</Badge></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon" title="Ajuster le stock" onClick={() => { setStockItem(item); setStockForm({ quantity: '', reason: '' }); }}>＋−</button>
                        <button className="btn-icon" title="Modifier" onClick={() => openEdit(item)}>✎</button>
                        <button className="btn-icon danger" title="Supprimer" onClick={() => setDeleting(item)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan="7"><Empty icon="⚗️">{loading ? 'Chargement…' : 'Aucune matière premières.'}</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing.id ? 'Modifier la matière' : 'Nouvelle matière première'}
          onClose={() => setEditing(null)}
          footer={<><button className="btn btn-light" onClick={() => setEditing(null)}>Annuler</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}
        >
          <Alert kind="error">{error}</Alert>
          <Field label="Nom" required><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cire de soja" /></Field>
          <div className="form-grid-3">
            <Field label="Catégorie">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {MATERIAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Unité">
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Fournisseur">
              <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                <option value="">— Aucun —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-grid-3">
            <Field label="Coût unitaire (€)"><input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></Field>
            <Field label="Stock actuel"><input type="number" step="0.01" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} /></Field>
            <Field label="Seuil d'alerte"><input type="number" step="0.01" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}

      {stockItem && (
        <Modal
          title={`Ajuster le stock · ${stockItem.name}`}
          subtitle={`Stock actuel : ${number(stockItem.stock_qty)} ${stockItem.unit}`}
          onClose={() => setStockItem(null)}
          footer={<><button className="btn btn-light" onClick={() => setStockItem(null)}>Annuler</button><button className="btn btn-primary" onClick={applyStock}>Appliquer</button></>}
        >
          <div className="form-grid">
            <Field label="Quantité (négatif pour une sortie)" hint="Ex. : +5 ou -2.5">
              <input type="number" step="0.01" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} autoFocus />
            </Field>
            <Field label="Motif"><input value={stockForm.reason} onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })} placeholder="Réception, inventaire…" /></Field>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Supprimer « ${deleting.name} » ? Cette matière sera retirée des recettes associées.`}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}
