import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, euro } from '../../api.js';
import {
  CUSTOM_CATEGORIES, CUSTOM_IMAGE_CHOICES, CUSTOM_REQUEST_STATUSES, labelOf, toneOf,
} from '../../constants.js';
import { Modal, Field, Badge, Empty, Alert, ConfirmDialog } from '../../components/UI.jsx';

const emptyForm = {
  category: 'parfum', name: '', description: '', image_url: '', icon: '',
  extra_price: 0, position: 0, active: true,
};

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function Customizer() {
  const [tab, setTab] = useState('options');
  const [options, setOptions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/custom-options'), api.get('/custom-requests')])
      .then(([optionData, requestData]) => {
        setOptions(optionData.items || []);
        setRequests(requestData.items || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing({ id: null }); setForm(emptyForm); setError(''); };
  const openEdit = (option) => {
    setEditing(option);
    setForm({
      category: option.category, name: option.name, description: option.description || '',
      image_url: option.image_url || '', icon: option.icon || '',
      extra_price: option.extra_price, position: option.position, active: !!option.active,
    });
    setError('');
  };

  const save = async () => {
    if (!form.name.trim()) { setError('Le nom de l’option est obligatoire.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        extra_price: Number(form.extra_price) || 0,
        position: Number(form.position) || 0,
        active: form.active ? 1 : 0,
      };
      if (editing.id) await api.put(`/custom-options/${editing.id}`, payload);
      else await api.post('/custom-options', payload);
      setEditing(null);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      if (deleting.type === 'option') await api.del(`/custom-options/${deleting.item.id}`);
      else await api.del(`/custom-requests/${deleting.item.id}`);
      setDeleting(null);
      setDetail(null);
      load();
    } catch (e) { setError(e.message); setDeleting(null); }
  };

  const changeStatus = async (request, status) => {
    try {
      await api.put(`/custom-requests/${request.id}`, { status });
      setRequests((current) => current.map((item) => (
        item.id === request.id ? { ...item, status } : item
      )));
      setDetail((current) => (current && current.id === request.id ? { ...current, status } : current));
    } catch (e) { setError(e.message); }
  };

  const newRequests = requests.filter((item) => item.status === 'nouvelle').length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Créer ma bougie customisée</h1>
          <p>Choix proposés aux visiteurs et demandes personnalisées reçues depuis le site.</p>
        </div>
        <Link to="/creer-ma-bougie" target="_blank" className="btn btn-light">Voir le configurateur ↗</Link>
      </div>
      <Alert kind="error">{error}</Alert>

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button className={`btn ${tab === 'options' ? 'btn-primary' : 'btn-light'}`} onClick={() => setTab('options')}>
          🎨 Options ({options.length})
        </button>
        <button className={`btn ${tab === 'requests' ? 'btn-primary' : 'btn-light'}`} onClick={() => setTab('requests')}>
          📩 Demandes ({requests.length}){newRequests > 0 && <span className="pill">{newRequests}</span>}
        </button>
      </div>

      {tab === 'options' ? (
        <>
          <div className="page-head" style={{ marginBottom: '1rem' }}>
            <p className="muted" style={{ margin: 0 }}>
              Ajoutez, modifiez ou retirez les parfums, couleurs, décorations et contenants. Les changements sont visibles immédiatement sur le site.
            </p>
            <button className="btn btn-primary" onClick={openNew}>+ Nouvelle option</button>
          </div>
          {CUSTOM_CATEGORIES.map((category) => {
            const items = options.filter((option) => option.category === category.value);
            return (
              <div className="card" key={category.value} style={{ marginBottom: '1rem' }}>
                <div className="card-sub" style={{ padding: '1rem 1.25rem 0' }}>
                  {category.emoji} {category.label} · {items.length} option(s)
                  {category.multiple && ' · choix multiples'}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Option</th><th>Description</th><th>Supplément</th><th>Ordre</th><th>Statut</th><th /></tr></thead>
                    <tbody>
                      {items.map((option) => (
                        <tr key={option.id}>
                          <td>
                            <div className="cell-main">
                              {option.image_url
                                ? <img src={option.image_url} alt="" style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 6, verticalAlign: 'middle', marginRight: '.5rem' }} />
                                : <span style={{ fontSize: '1.1rem', marginRight: '.5rem' }} aria-hidden="true">{option.icon || '✦'}</span>}
                              {option.name}
                            </div>
                          </td>
                          <td><div className="cell-sub">{option.description || '—'}</div></td>
                          <td className="mono">{option.extra_price > 0 ? `+ ${euro(option.extra_price)}` : 'Inclus'}</td>
                          <td className="mono">{option.position}</td>
                          <td><Badge tone={option.active ? 'green' : 'muted'}>{option.active ? 'Visible' : 'Masquée'}</Badge></td>
                          <td>
                            <div className="row-actions">
                              <button className="btn-icon" title="Modifier" aria-label={`Modifier l’option ${option.name}`} onClick={() => openEdit(option)}>✎</button>
                              <button className="btn-icon danger" title="Supprimer" aria-label={`Supprimer l’option ${option.name}`} onClick={() => setDeleting({ type: 'option', item: option })}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!items.length && (
                        <tr><td colSpan="6"><Empty icon="🎨">{loading ? 'Chargement…' : `Aucune option dans « ${category.label} ».`}</Empty></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="card">
          <div className="card-sub" style={{ padding: '1rem 1.25rem 0' }}>{requests.length} demande(s), {newRequests} nouvelle(s)</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Numéro</th><th>Client</th><th>Reçue le</th><th>Étiquette</th><th>Choix</th><th>Prix estimé</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="mono">{request.number}</td>
                    <td>
                      <div className="cell-main">{request.customer_name}</div>
                      <div className="cell-sub">{request.email}</div>
                    </td>
                    <td className="mono">{formatDate(request.created_at)}</td>
                    <td>{(request.label_emoji || '') + ' ' + (request.label_phrase || '—')}</td>
                    <td className="mono">{(request.selections || []).length}</td>
                    <td className="mono"><strong>{euro(request.price)}</strong></td>
                    <td>
                      <select
                        value={request.status}
                        onChange={(event) => changeStatus(request, event.target.value)}
                        aria-label={`Statut de la demande ${request.number}`}
                      >
                        {CUSTOM_REQUEST_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon" title="Voir le détail" aria-label={`Voir la demande ${request.number}`} onClick={() => setDetail(request)}>👁</button>
                        <button className="btn-icon danger" title="Supprimer" aria-label={`Supprimer la demande ${request.number}`} onClick={() => setDeleting({ type: 'request', item: request })}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!requests.length && (
                  <tr><td colSpan="8"><Empty icon="📩">{loading ? 'Chargement…' : 'Aucune demande pour le moment. Elles apparaîtront ici dès qu’un visiteur utilisera le configurateur.'}</Empty></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Modifier l’option' : 'Nouvelle option'}
          subtitle="Cette option sera proposée aux visiteurs du configurateur."
          wide
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-light" onClick={() => setEditing(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          }
        >
          <Alert kind="error">{error}</Alert>
          <div className="form-grid">
            <Field label="Catégorie" required>
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {CUSTOM_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.emoji} {category.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Nom de l’option" required>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Lavande" />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Quelques mots pour présenter l’option…" />
          </Field>
          <div className="form-grid">
            <Field label="Icône (emoji)" hint="Affichée si aucune image n’est choisie">
              <input value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} placeholder="🌿" maxLength="8" />
            </Field>
            <Field label="Image existante">
              <select
                value={CUSTOM_IMAGE_CHOICES.some((choice) => choice.value === form.image_url) ? form.image_url : ''}
                onChange={(event) => setForm({ ...form, image_url: event.target.value })}
              >
                <option value="">— Aucune image —</option>
                {CUSTOM_IMAGE_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>{choice.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Ou URL de l’image">
            <input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} placeholder="/galerie/… ou https://…" />
          </Field>
          <div className="form-grid">
            <Field label="Supplément (€)" hint="0 pour une option incluse dans le prix de base">
              <input type="number" min="0" step="0.5" value={form.extra_price} onChange={(event) => setForm({ ...form, extra_price: event.target.value })} />
            </Field>
            <Field label="Ordre d’affichage">
              <input type="number" step="1" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
            </Field>
          </div>
          <div className="toggle-row">
            <label className="checkbox-line">
              <input type="checkbox" checked={!!form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              Proposer cette option sur le site
            </label>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal
          title={`Demande ${detail.number}`}
          subtitle={`Reçue le ${formatDate(detail.created_at)}`}
          wide
          onClose={() => setDetail(null)}
          footer={
            <>
              <button className="btn btn-light" onClick={() => setDetail(null)}>Fermer</button>
              <button className="btn btn-danger" onClick={() => setDeleting({ type: 'request', item: detail })}>Supprimer</button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Client">
              <input value={detail.customer_name} readOnly />
            </Field>
            <Field label="E-mail">
              <input value={detail.email} readOnly />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Téléphone">
              <input value={detail.phone || '—'} readOnly />
            </Field>
            <Field label="Statut">
              <select value={detail.status} onChange={(event) => changeStatus(detail, event.target.value)}>
                {CUSTOM_REQUEST_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="section-label">Configuration choisie</div>
          <ul>
            {(detail.selections || []).map((item) => (
              <li key={item.id}>
                <strong>{labelOf(CUSTOM_CATEGORIES, item.category)} :</strong> {item.name}
                {item.extra_price > 0 && ` (+ ${euro(item.extra_price)})`}
              </li>
            ))}
          </ul>
          <div className="section-label">Étiquette personnalisée</div>
          <div className="as-admin-label-preview" aria-label="Aperçu de l’étiquette">
            <span>{detail.label_emoji}</span>
            <strong>{detail.label_phrase || '—'}</strong>
            <small>ASIREM COSMÉTIQUES</small>
          </div>
          {detail.message && (
            <>
              <div className="section-label">Message du client</div>
              <p className="muted">{detail.message}</p>
            </>
          )}
          <div className="section-label">Prix estimé</div>
          <p><strong style={{ fontSize: '1.3rem' }}>{euro(detail.price)}</strong> <span className="muted">(hors frais de port)</span></p>
          <Badge tone={toneOf(CUSTOM_REQUEST_STATUSES, detail.status)}>{labelOf(CUSTOM_REQUEST_STATUSES, detail.status)}</Badge>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          message={deleting.type === 'option'
            ? `Supprimer l’option « ${deleting.item.name} » des propositions ?`
            : `Supprimer la demande ${deleting.item.number} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}
