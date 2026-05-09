
import React from 'react';

export function ConfirmDialog({ isOpen, onClose, onConfirm, message }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: 20, borderRadius: 8,
        maxWidth: 400, width: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <p style={{ marginBottom: 20 }}>{message}</p>
        <button onClick={onConfirm} style={{ marginRight: 10, padding: '8px 16px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: 4 }}>Oui</button>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 4 }}>Non</button>
      </div>
    </div>
  );
}
