import React, { useEffect, useMemo, useState } from 'react';
import { api, dateTimeFr } from '../../api.js';
import { CONTACT_STATUSES, labelOf, toneOf } from '../../constants.js';
import { Modal, Badge, Empty, Alert, ConfirmDialog } from '../../components/UI.jsx';

export default function Contacts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/contacts').then((d) => setItems(d.items || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => filter ? items.filter((c) => c.status === filter) : items, [items, filter]);
  const counts = Object.fromEntries(CONTACT_STATUSES.map((s) => [s.value, items.filter((c) => c.status === s.value).length]));

  const setStatus = async (item, status) => {
    try {
      await api.put(`/contacts/${item.id}`, { status });
      setSelected({ ...item, status });
      load();
    } catch (e) { setError(e.message); }
  };

  const remove = async () => {
    try { await api.del(`/contacts/${deleting.id}`); setSelected(null); setDeleting(null); load(); }
    catch (e) { setError(e.message); setDeleting(null); }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>Messages</h1><p>Demandes envoyées via le formulaire de contact du site.</p></div>
        <div className="filters" style={{ margin: 0 }}>
          <button className={`filter-chip${!filter ? ' active' : ''}`} onClick={() => setFilter('')}>Tous ({items.length})</button>
          {CONTACT_STATUSES.map((s) => (
            <button key={s.value} className={`filter-chip${filter === s.value ? ' active' : ''}`} onClick={() => setFilter(s.value)}>
              {s.label} ({counts[s.value] || 0})
            </button>
          ))}
        </div>
      </div>
      <Alert kind="error">{error}</Alert>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Expéditeur</th><th>Sujet</th><th>Date</th><th>Statut</th><th /></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                  <td>
                    <div className="cell-main">{c.name} {c.status === 'nouveau' && <span className="badge tone-amber" style={{ marginLeft: '.35rem' }}>Nouveau</span>}</div>
                    <div className="cell-sub">{c.email}</div>
                  </td>
                  <td>{c.subject || <span className="muted">(sans objet)</span>}</td>
                  <td className="muted">{dateTimeFr(c.created_at)}</td>
                  <td><Badge tone={toneOf(CONTACT_STATUSES, c.status)}>{labelOf(CONTACT_STATUSES, c.status)}</Badge></td>
                  <td><button className="btn-icon" onClick={(e) => { e.stopPropagation(); setSelected(c); }}>👁</button></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="5"><Empty icon="✉️">{loading ? 'Chargement…' : 'Aucun message.'}</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal
          title={selected.subject || 'Message sans objet'}
          subtitle={`${selected.name} · ${dateTimeFr(selected.created_at)}`}
          onClose={() => setSelected(null)}
          footer={
            <>
              <button className="btn btn-danger" onClick={() => setDeleting(selected)}>Supprimer</button>
              <select className="qty-input" value={selected.status} onChange={(e) => setStatus(selected, e.target.value)}>
                {CONTACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <a className="btn btn-light" href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || 'Votre message')}`}>Répondre par e-mail</a>
            </>
          }
        >
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div><div className="section-label" style={{ marginTop: 0 }}>E-mail</div><strong>{selected.email}</strong></div>
            <div><div className="section-label" style={{ marginTop: 0 }}>Téléphone</div><strong>{selected.phone || '—'}</strong></div>
          </div>
          <div className="section-label" style={{ marginTop: 0 }}>Message</div>
          <div style={{ background: '#fbf8f3', border: '1px solid var(--line)', borderRadius: 10, padding: '1.1rem', whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
            {selected.message}
          </div>
        </Modal>
      )}
      {deleting && <ConfirmDialog message={`Supprimer le message de « ${deleting.name} » ?`} onCancel={() => setDeleting(null)} onConfirm={remove} />}
    </>
  );
}
