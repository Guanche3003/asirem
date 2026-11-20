import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { EVENT_IMAGE_CHOICES } from '../../constants.js';
import { Modal, Field, Badge, Empty, Alert, ConfirmDialog } from '../../components/UI.jsx';

const emptyForm = { title: '', event_date: '', location: '', description: '', image_url: '', active: true };

export function formatEventDate(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 3 || !parts.every((p) => /^\d+$/.test(p))) return value || 'Date à confirmer';
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/events')
      .then((data) => setEvents(data.items || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing({ id: null }); setForm(emptyForm); setError(''); };
  const openEdit = (event) => {
    setEditing(event);
    setForm({
      title: event.title, event_date: event.event_date || '', location: event.location || '',
      description: event.description || '', image_url: event.image_url || '', active: !!event.active,
    });
    setError('');
  };

  const save = async () => {
    if (!form.title.trim()) { setError('Le titre est obligatoire.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, active: form.active ? 1 : 0 };
      if (editing.id) await api.put(`/events/${editing.id}`, payload);
      else await api.post('/events', payload);
      setEditing(null);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      await api.del(`/events/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (e) { setError(e.message); setDeleting(null); }
  };

  const uploadPhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('La photo doit faire moins de 5 Mo.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true); setError('');
      try {
        const data = await api.post('/events/image', { name: file.name, data: reader.result });
        setForm((current) => ({ ...current, image_url: data.url }));
      } catch (e) { setError(e.message); }
      finally { setUploading(false); }
    };
    reader.onerror = () => setError('Lecture du fichier impossible.');
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Évènements</h1><p>Dates, lieux et photos affichés sur la page d’accueil du site.</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Nouvel évènement</button>
      </div>
      <Alert kind="error">{error}</Alert>

      <div className="card">
        <div className="card-sub" style={{ padding: '1rem 1.25rem 0' }}>{events.length} évènement(s)</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Évènement</th><th>Date</th><th>Lieu</th><th>Photo</th><th>Statut</th><th /></tr></thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <div className="cell-main">{event.title}</div>
                    <div className="cell-sub">{event.description || '—'}</div>
                  </td>
                  <td className="mono">{formatEventDate(event.event_date)}</td>
                  <td>{event.location || '—'}</td>
                  <td>
                    {event.image_url
                      ? <img src={event.image_url} alt="" style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                      : <span className="muted">—</span>}
                  </td>
                  <td><Badge tone={event.active ? 'green' : 'muted'}>{event.active ? 'En ligne' : 'Masqué'}</Badge></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" title="Modifier" onClick={() => openEdit(event)}>✎</button>
                      <button className="btn-icon danger" title="Supprimer" onClick={() => setDeleting(event)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!events.length && (
                <tr><td colSpan="6"><Empty icon="📅">{loading ? 'Chargement…' : 'Aucun évènement. Ajoutez-en un pour remplir la section du site.'}</Empty></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing.id ? 'Modifier l’évènement' : 'Nouvel évènement'}
          subtitle="Ces informations sont visibles par tous les visiteurs du site."
          wide
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-light" onClick={() => setEditing(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || uploading}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          }
        >
          <Alert kind="error">{error}</Alert>
          <Field label="Titre de l’évènement" required>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Marché de Noël — Orléans" />
          </Field>
          <div className="form-grid">
            <Field label="Date">
              <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </Field>
            <Field label="Lieu">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Place du Martroi, Orléans" />
            </Field>
          </div>
          <Field label="Description publique">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Présentez l’évènement en quelques phrases…" />
          </Field>

          <div className="section-label">Photo</div>
          {form.image_url && (
            <div style={{ marginBottom: '1rem' }}>
              <img src={form.image_url} alt="Aperçu de l’évènement" style={{ maxWidth: 260, maxHeight: 160, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
            </div>
          )}
          <div className="form-grid">
            <Field label="Photo existante">
              <select value={EVENT_IMAGE_CHOICES.some((c) => c.value === form.image_url) ? form.image_url : ''}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}>
                <option value="">— Choisir une photo —</option>
                {EVENT_IMAGE_CHOICES.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
            </Field>
            <Field label="Ou importer une photo" hint="JPG, PNG ou WebP · 5 Mo maximum">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={uploading} />
            </Field>
          </div>
          <Field label="Ou coller une URL d’image">
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="/uploads/events/… ou https://…" />
          </Field>
          {uploading && <p className="muted">Envoi de la photo…</p>}

          <div className="toggle-row">
            <label className="checkbox-line">
              <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Afficher cet évènement sur le site
            </label>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Supprimer l’évènement « ${deleting.title} » ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}
