import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { Modal, Field, Empty, Alert, ConfirmDialog } from '../../components/UI.jsx';

const emptyForm = { name: '', contact: '', email: '', phone: '', address: '', zip: '', city: '', website: '', notes: '' };

export default function Suppliers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/suppliers').then((d) => setItems(d.items || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((s) =>
    [s.name, s.contact, s.email, s.city].join(' ').toLowerCase().includes(search.toLowerCase())), [items, search]);

  const openNew = () => { setEditing({ id: null }); setForm(emptyForm); setError(''); };
  const openEdit = (item) => {
    setEditing(item); setError('');
    setForm(Object.fromEntries(Object.keys(emptyForm).map((k) => [k, item[k] ?? ''])));
  };
  const save = async () => {
    setSaving(true); setError('');
    try {
      if (editing.id) await api.put(`/suppliers/${editing.id}`, form);
      else await api.post('/suppliers', form);
      setEditing(null); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    try { await api.del(`/suppliers/${deleting.id}`); setDeleting(null); load(); }
    catch (e) { setError(e.message); setDeleting(null); }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Fournisseurs</h1><p>Partenaires pour les cires, parfums et emballages.</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nouveau fournisseur</button>
      </div>
      <Alert kind="error">{error}</Alert>
      <div className="card">
        <div className="table-tools">
          <div className="search-input"><input placeholder="Rechercher un fournisseur…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <span className="card-sub">{filtered.length} fournisseur(s)</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Société</th><th>Contact</th><th>E-mail</th><th>Téléphone</th><th>Ville</th><th>Site</th><th /></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td><div className="cell-main">{s.name}</div><div className="cell-sub">{s.notes || '—'}</div></td>
                  <td>{s.contact || '—'}</td>
                  <td className="muted">{s.email || '—'}</td>
                  <td className="muted">{s.phone || '—'}</td>
                  <td className="muted">{s.city || '—'}</td>
                  <td className="muted">{s.website || '—'}</td>
                  <td><div className="row-actions"><button className="btn-icon" onClick={() => openEdit(s)} title="Modifier">✎</button><button className="btn-icon danger" onClick={() => setDeleting(s)} title="Supprimer">🗑</button></div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="7"><Empty icon="🚚">{loading ? 'Chargement…' : 'Aucun fournisseur.'}</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing.id ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          onClose={() => setEditing(null)}
          footer={<><button className="btn btn-light" onClick={() => setEditing(null)}>Annuler</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}
        >
          <Alert kind="error">{error}</Alert>
          <Field label="Nom de la société" required><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="Contact"><input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
            <Field label="Téléphone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="E-mail"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Site web"><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="exemple.fr" /></Field>
          <Field label="Adresse"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="Code postal"><input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></Field>
            <Field label="Ville"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
      {deleting && <ConfirmDialog message={`Supprimer le fournisseur « ${deleting.name} » ?`} onCancel={() => setDeleting(null)} onConfirm={remove} />}
    </>
  );
}
