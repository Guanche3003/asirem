import React from 'react';

export function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
  React.useEffect(() => {
    const handler = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <div className="card-sub">{subtitle}</div>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, required, hint, error, children }) {
  return (
    <div className="field">
      {label && <label>{label}{required && <span className="req"> *</span>}</label>}
      {children}
      {hint && !error && <small>{hint}</small>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function Badge({ tone = 'muted', children }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

export function Empty({ icon = '📭', children }) {
  return <div className="empty"><span>{icon}</span>{children}</div>;
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`alert alert-${kind}`}>{children}</div>;
}

export function ConfirmDialog({ message, onConfirm, onCancel, busy }) {
  return (
    <Modal
      title="Confirmer la suppression"
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-light" onClick={onCancel}>Annuler</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Suppression…' : 'Supprimer'}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--ink-soft)' }}>{message}</p>
    </Modal>
  );
}
