import React, { useEffect, useMemo, useState } from 'react';
import { api, dateFr } from '../../api.js';
import { Modal, Field, Badge, Empty, Alert, ConfirmDialog } from '../../components/UI.jsx';

const emptyForm = {
  kind: 'particulier', first_name: '', last_name: '', company: '', email: '', phone: '',
  address: '', zip: '', city: '', tags: '', notes: '',
};

export default function Customers() {
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
    api.get('/customers').then((d) => setItems(d.items || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((c) =>
    [c.first_name, c.last_name, c.company, c.email, c.tags, c.city].join(' ').toLowerCase().includes(search.toLowerCase())), [items, search]);

  const openNew = () => { setEditing({ id: null }); setForm(emptyForm); setError(''); };
  const openEdit = (item) => {
    setEditing(item); setError('');
    setForm(Object.fromEntries(Object.keys(emptyForm).map((k) => [k, item[k] ?? ''])));
  };
  const save = async () => {
    setSaving(true); setError('');
    try {
      if (editing.id) await api.put(`/customers/${editing.id}`, form);
      else await api.post('/customers', form);
      setEditing(null); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    try { await api.del(`/customers/${deleting.id}`); setDeleting(null); load(); }
    catch (e) { setError(e.message); setDeleting(null); }
  };

  const fullName = (c) => [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company || '—';

  return (
    <>
      <div className="page-head">
        <div><h1>Clients</h1><p>Coordonnées, tags et historique de relation.</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nouveau client</button>
      </div>
      <Alert kind="error">{error}</Alert>
      <div className="card">
        <div className="table-tools">
          <div className="search-input"><input placeholder="Rechercher un client…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <span className="card-sub">{filtered.length} client(s)</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Client</th><th>Type</th><th>Contact</th><th>Ville</th><th>Tags</th><th>Créé le</th><th /></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-main">{fullName(c)}</div>
                    {c.company && <div className="cell-sub">{c.first_name} {c.last_name}</div>}
                  </td>
                  <td><Badge tone={c.kind === 'professionnel' ? 'blue' : 'muted'}>{c.kind === 'professionnel' ? 'Pro' : 'Particulier'}</Badge></td>
                  <td><div>{c.email || '—'}</div><div className="cell-sub">{c.phone}</div></td>
                  <td className="muted">{c.city || '—'}</td>
                  <td>{c.tags ? c.tags.split(',').map((t) => <Badge key={t} tone="amber">{t.trim()}</Badge>) : '—'}</td>
                  <td className="muted">{dateFr(c.created_at)}</td>
                  <td><div className="row-actions"><button className="btn-icon" onClick={() => openEdit(c)} title="Modifier">✎</button><button className="btn-icon danger" onClick={() => setDeleting(c)} title="Supprimer">🗑</button></div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="7"><Empty icon="👥">{loading ? 'Chargement…' : 'Aucun client.'}</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing.id ? 'Modifier le client' : 'Nouveau client'}
          onClose={() => setEditing(null)}
          footer={<><button className="btn btn-light" onClick={() => setEditing(null)}>Annuler</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}
        >
          <Alert kind="error">{error}</Alert>
          <Field label="Type">
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="particulier">Particulier</option>
              <option value="professionnel">Professionnel</option>
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Prénom"><input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
            <Field label="Nom"><input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
          </div>
          <Field label="Société"><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="E-mail"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Téléphone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="Adresse"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="Code postal"><input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></Field>
            <Field label="Ville"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          </div>
          <Field label="Tags" hint="Séparés par une virgule (ex. : revendeur, cadeau)"><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </Modal>
      )}
      {deleting && <ConfirmDialog message={`Supprimer le client « ${fullName(deleting)} » ?`} onCancel={() => setDeleting(null)} onConfirm={remove} />}
    </>
  );
}
