import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, euro, dateFr, dateTimeFr } from '../../api.js';
import { ORDER_STATUSES, labelOf, toneOf } from '../../constants.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="empty">Chargement…</div>;

  const { stats, monthly, recentOrders, recentContacts, lowStockItems } = data;
  const max = Math.max(1, ...monthly.map((m) => m.total));

  const cards = [
    { label: 'Chiffre d’affaires', value: euro(stats.revenue), hint: 'Commandes hors annulées', icon: '€' },
    { label: 'Commandes', value: stats.orders, hint: `${stats.pending} en attente`, icon: '📦' },
    { label: 'Clients', value: stats.customers, hint: `${stats.products} produits au catalogue`, icon: '👥' },
    { label: 'Messages', value: stats.newContacts, hint: stats.newContacts ? 'Nouveaux messages' : 'Tout est à jour', icon: '✉️', warn: stats.newContacts > 0 },
  ];

  return (
    <>
      <div className="stats-grid">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className="stat-top">
              <span className="stat-label">{card.label}</span>
              <span className="stat-icon">{card.icon}</span>
            </div>
            <div className="stat-value">{card.value}</div>
            <div className={`stat-hint${card.warn ? ' warn' : ''}`}>{card.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><span className="card-title">Évolution du chiffre d’affaires</span><span className="card-sub">6 derniers mois</span></div>
          <div className="card-body">
            {monthly.length ? (
              <div className="chart">
                {monthly.map((m) => (
                  <div className="chart-col" key={m.month}>
                    <div className="chart-bar" style={{ height: `${Math.max(4, (m.total / max) * 100)}%` }} data-value={euro(m.total)} />
                    <span className="chart-label">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
                  </div>
                ))}
              </div>
            ) : <div className="empty">Pas encore de données.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Alertes de stock</span><span className="card-sub">{stats.lowStock} matière(s) basse(s)</span></div>
          <div className="card-body">
            {lowStockItems.length === 0 ? (
              <div className="empty"><span>✅</span>Tous les stocks sont au-dessus du seuil.</div>
            ) : lowStockItems.map((item) => {
              const ratio = item.min_stock > 0 ? Math.min(100, (item.stock_qty / item.min_stock) * 100) : 100;
              return (
                <div key={item.id} style={{ marginBottom: '.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem' }}>
                    <strong>{item.name}</strong>
                    <span className="muted mono">{item.stock_qty} {item.unit}</span>
                  </div>
                  <div className="stock-bar"><i className="low" style={{ width: `${ratio}%` }} /></div>
                </div>
              );
            })}
            <Link to="/admin/matieres" className="btn btn-light btn-small" style={{ marginTop: '.5rem' }}>Gérer les stocks →</Link>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><span className="card-title">Dernières commandes</span><Link to="/admin/commandes" className="card-sub">Tout voir →</Link></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>N°</th><th>Client</th><th>Date</th><th>Statut</th><th className="cell-right">Total</th></tr></thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="cell-main">{o.number}</td>
                    <td>{o.customer ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(' ') || o.customer.company : '—'}</td>
                    <td className="muted">{dateFr(o.order_date)}</td>
                    <td><span className={`badge tone-${toneOf(ORDER_STATUSES, o.status)}`}>{labelOf(ORDER_STATUSES, o.status)}</span></td>
                    <td className="cell-right mono">{euro(o.total)}</td>
                  </tr>
                ))}
                {!recentOrders.length && <tr><td colSpan="5"><div className="empty">Aucune commande.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">Derniers messages</span><Link to="/admin/contacts" className="card-sub">Tout voir →</Link></div>
          <div className="card-body">
            {recentContacts.length === 0 && <div className="empty">Aucun message.</div>}
            {recentContacts.map((c) => (
              <div className="activity-item" key={c.id}>
                <span className="activity-dot" style={{ background: c.status === 'nouveau' ? 'var(--accent)' : '#d8cec2' }} />
                <div style={{ flex: 1 }}>
                  <strong>{c.name} {c.status === 'nouveau' && <span className="badge tone-amber" style={{ marginLeft: '.3rem' }}>Nouveau</span>}</strong>
                  <div className="muted" style={{ fontSize: '.8rem' }}>{c.subject || '(sans objet)'}</div>
                  <small>{dateTimeFr(c.created_at)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
