import React, { useEffect, useMemo, useState } from 'react';
import { api, euro, number } from '../../api.js';
import { Alert } from '../../components/UI.jsx';

export default function Calculator() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(10);

  useEffect(() => {
    api.get('/calculator')
      .then((d) => { setData(d); setProductId(String(d.products[0]?.id || '')); })
      .catch((e) => setError(e.message));
  }, []);

  const selected = useMemo(() => data?.products.find((p) => String(p.id) === String(productId)), [data, productId]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <div className="empty">Chargement…</div>;

  const needs = (selected?.details || []).map((d) => ({
    ...d,
    needed: number(d.quantity * qty, 3),
    remaining: number(d.stock_qty - d.quantity * qty, 3),
  }));
  const insufficient = needs.filter((n) => n.remaining < 0);

  return (
    <>
      <div className="page-head">
        <div><h1>Calcul & marges</h1><p>Coût réel des recettes, prix conseillé et projection de consommation des stocks.</p></div>
        <span className="card-sub">Coefficient prix conseillé : × {data.coefficient} (modifiable dans Paramètres)</span>
      </div>

      <div className="card" style={{ marginBottom: '1.3rem' }}>
        <div className="card-head"><span className="card-title">Simulateur de production</span><span className="card-sub">Combien de matières pour fabriquer N pièces ?</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '.8rem', alignItems: 'end', flexWrap: 'wrap' }}>
            <div className="field" style={{ minWidth: 260, marginBottom: 0 }}>
              <label>Produit</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                {data.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Quantité à fabriquer</label>
              <input className="qty-input" style={{ width: 120 }} type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
            </div>
          </div>

          {selected && (
            <>
              <div className="section-label">Matières nécessaires pour {qty} × {selected.name}</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Matière</th><th className="cell-right">Par pièce</th><th className="cell-right">Nécessaire</th><th className="cell-right">Stock disponible</th><th className="cell-right">Reste après production</th></tr></thead>
                  <tbody>
                    {needs.map((n) => (
                      <tr key={n.material_id}>
                        <td className="cell-main">{n.material_name}</td>
                        <td className="cell-right mono">{number(n.quantity, 3)} {n.unit}</td>
                        <td className="cell-right mono"><strong>{n.needed} {n.unit}</strong></td>
                        <td className="cell-right mono">{number(n.stock_qty, 3)} {n.unit}</td>
                        <td className="cell-right mono" style={{ color: n.remaining < 0 ? 'var(--red)' : 'var(--green)' }}>
                          {n.remaining} {n.unit}
                        </td>
                      </tr>
                    ))}
                    {!needs.length && <tr><td colSpan="5"><div className="empty">Aucune recette renseignée pour ce produit.</div></td></tr>}
                  </tbody>
                </table>
              </div>
              {insufficient.length > 0 && (
                <Alert kind="error">Stock insuffisant pour : {insufficient.map((n) => n.material_name).join(', ')}. Pensez à réapprovisionner.</Alert>
              )}
              <div className="cost-summary">
                <div className="cost-line"><span>Coût matière pour {qty} pièce(s)</span><strong className="mono">{euro(selected.cost * qty)}</strong></div>
                <div className="cost-line total"><span>Chiffre d’affaires prévisionnel</span><strong>{euro(selected.price * qty)}</strong></div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><span className="card-title">Rentabilité par produit</span><span className="card-sub">Basé sur le coût actuel des matières</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Produit</th><th className="cell-right">Coût matière</th><th className="cell-right">Prix public</th><th className="cell-right">Prix conseillé</th><th className="cell-right">Marge</th><th>Écart</th></tr></thead>
            <tbody>
              {data.products.map((p) => {
                const gap = p.price - p.suggested;
                return (
                  <tr key={p.id}>
                    <td className="cell-main">{p.name}</td>
                    <td className="cell-right mono">{euro(p.cost)}</td>
                    <td className="cell-right mono">{euro(p.price)}</td>
                    <td className="cell-right mono">{euro(p.suggested)}</td>
                    <td className="cell-right mono" style={{ color: p.margin >= 50 ? 'var(--green)' : p.margin < 30 ? 'var(--red)' : 'inherit' }}>{number(p.margin, 1)} %</td>
                    <td style={{ color: gap >= 0 ? 'var(--green)' : 'var(--red)' }}>{gap >= 0 ? '+' : ''}{euro(gap)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
