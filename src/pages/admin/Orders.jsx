import React, { useEffect, useMemo, useState } from 'react';
import { api, euro, dateFr } from '../../api.js';
import { ORDER_STATUSES, labelOf, toneOf } from '../../constants.js';
import { Modal, Field, Badge, Empty, Alert, ConfirmDialog } from '../../components/UI.jsx';

const emptyForm = {
  number: '', customer_id: '', status: 'brouillon', order_date: new Date().toISOString().slice(0, 10),
  shipping_cost: '', discount: '', notes: '', items: [],
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/orders'), api.get('/customers'), api.get('/products')])
      .then(([o, c, p]) => { setOrders(o.items || []); setCustomers(c.items || []); setProducts(p.items || []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => orders.filter((o) =>
    [o.number, o.customer?.company, o.customer?.first_name, o.customer?.last_name]
      .join(' ').toLowerCase().includes(search.toLowerCase())), [orders, search]);

  const customerName = (c) => c ? ([c.first_name, c.last_name].filter(Boolean).join(' ') || c.company || '—') : '—';

  const openNew = () => {
    setEditing({ id: null });
    setForm({ ...emptyForm, order_date: new Date().toISOString().slice(0, 10) });
    setError(''); setNotice('');
  };

  const openEdit = async (order) => {
    setError(''); setNotice('');
    try {
      const data = await api.get(`/orders/${order.id}`);
      const o = data.item;
      setEditing(o);
      setForm({
        number: o.number, customer_id: o.customer_id || '', status: o.status,
        order_date: o.order_date || '', shipping_cost: o.shipping_cost, discount: o.discount,
        notes: o.notes || '',
        items: (o.items || []).map((i) => ({ product_id: i.product_id || '', product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price })),
      });
    } catch (e) { setError(e.message); }
  };

  const updateItem = (index, key, value) => {
    const items = [...form.items];
    const item = { ...items[index], [key]: value };
    if (key === 'product_id') {
      const product = products.find((p) => p.id === Number(value));
      if (product) { item.product_name = product.name; item.unit_price = product.price; }
    }
    items[index] = item;
    setForm({ ...form, items });
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        shipping_cost: Number(form.shipping_cost) || 0,
        discount: Number(form.discount) || 0,
        items: form.items.filter((i) => i.product_name),
      };
      if (editing.id) await api.put(`/orders/${editing.id}`, payload);
      else await api.post('/orders', payload);
      setEditing(null); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const changeStatus = async (order, status) => {
    setError(''); setNotice('');
    try {
      const res = await api.put(`/orders/${order.id}/status`, { status });
      setNotice(res.stock_consumed ? 'Statut mis à jour — les matières premières ont été déduites du stock.' : 'Statut mis à jour.');
      load();
    } catch (e) { setError(e.message); }
  };

  const remove = async () => {
    try { await api.del(`/orders/${deleting.id}`); setDeleting(null); load(); }
    catch (e) { setError(e.message); setDeleting(null); }
  };

  const itemsTotal = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const total = itemsTotal + Number(form.shipping_cost || 0) - Number(form.discount || 0);
  const ca = orders.filter((o) => o.status !== 'annulee').reduce((s, o) => s + o.total, 0);

  return (
    <>
      <div className="page-head">
        <div><h1>Commandes</h1><p>Suivi des commandes, préparation et déduction automatique des stocks à l'expédition.</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nouvelle commande</button>
      </div>
      <Alert kind="error">{error}</Alert>
      <Alert kind="success">{notice}</Alert>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card"><div className="stat-label">Commandes</div><div className="stat-value">{orders.length}</div></div>
        <div className="stat-card"><div className="stat-label">Chiffre d’affaires</div><div className="stat-value">{euro(ca)}</div></div>
        <div className="stat-card"><div className="stat-label">À préparer</div><div className="stat-value">{orders.filter((o) => ['confirmee', 'en_preparation'].includes(o.status)).length}</div></div>
      </div>

      <div className="card">
        <div className="table-tools">
          <div className="search-input"><input placeholder="Rechercher une commande…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <span className="card-sub">{filtered.length} commande(s)</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Articles</th><th>Statut</th><th className="cell-right">Total</th><th /></tr></thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="cell-main">{o.number}</td>
                  <td className="muted">{dateFr(o.order_date)}</td>
                  <td>{customerName(o.customer)}</td>
                  <td className="muted">{o.item_count} article(s)</td>
                  <td>
                    <select
                      className="qty-input"
                      style={{ width: 'auto', fontSize: '.78rem', padding: '.3rem .5rem' }}
                      value={o.status}
                      onChange={(e) => changeStatus(o, e.target.value)}
                    >
                      {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="cell-right mono">{euro(o.total)}</td>
                  <td><div className="row-actions"><button className="btn-icon" onClick={() => openEdit(o)} title="Modifier">✎</button><button className="btn-icon danger" onClick={() => setDeleting(o)} title="Supprimer">🗑</button></div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="7"><Empty icon="📦">{loading ? 'Chargement…' : 'Aucune commande.'}</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing.id ? `Commande ${editing.number}` : 'Nouvelle commande'}
          wide
          onClose={() => setEditing(null)}
          footer={<><button className="btn btn-light" onClick={() => setEditing(null)}>Annuler</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}
        >
          <Alert kind="error">{error}</Alert>
          {editing.id && <Alert kind="info">Modifier le statut en « Expédiée » ou « Livrée » depuis le tableau pour déduire automatiquement les matières du stock.</Alert>}
          <div className="form-grid-3">
            <Field label="Numéro"><input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="Généré automatiquement" disabled={!!editing.id} /></Field>
            <Field label="Date"><input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} /></Field>
            <Field label="Statut">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Client">
            <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">— Client libre —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{customerName(c)}</option>)}
            </select>
          </Field>

          <div className="section-label">Articles</div>
          {form.items.map((item, index) => (
            <div className="recipe-row" key={index} style={{ gridTemplateColumns: '1.6fr 80px 110px 100px 36px' }}>
              <Field label="Produit">
                <select value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)}>
                  <option value="">— Choisir —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Qté"><input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} /></Field>
              <Field label="Prix unit. (€)"><input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} /></Field>
              <Field label="Sous-total"><div className="mono" style={{ padding: '.72rem 0' }}>{euro((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</div></Field>
              <button className="btn-icon danger" style={{ marginBottom: '.25rem' }} onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>×</button>
            </div>
          ))}
          <button className="btn btn-light btn-small" style={{ marginTop: '.8rem' }} onClick={() => setForm({ ...form, items: [...form.items, { product_id: '', product_name: '', quantity: 1, unit_price: '' }] })}>+ Ajouter un article</button>

          <div className="form-grid" style={{ marginTop: '1rem' }}>
            <Field label="Frais de port (€)"><input type="number" step="0.01" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} /></Field>
            <Field label="Remise (€)"><input type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>

          <div className="cost-summary">
            <div className="cost-line"><span>Sous-total articles</span><strong className="mono">{euro(itemsTotal)}</strong></div>
            <div className="cost-line"><span>Port · Remise</span><strong className="mono">{euro(form.shipping_cost)} · −{euro(form.discount)}</strong></div>
            <div className="cost-line total"><span>Total de la commande</span><strong>{euro(total)}</strong></div>
          </div>
        </Modal>
      )}

      {deleting && <ConfirmDialog message={`Supprimer la commande « ${deleting.number} » ?`} onCancel={() => setDeleting(null)} onConfirm={remove} />}
    </>
  );
}
