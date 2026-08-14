import React, { useState } from 'react';

export default function ItemEditSheet({ item, sections, onSave, onDelete, onClose }) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.qty ?? '');
  const [category, setCategory] = useState(item.category);

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <h2>Edit item</h2>
        <label>Item</label>
        <input className="field" value={name} onChange={e => setName(e.target.value)} />
        <label>Quantity (optional)</label>
        <input className="field" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 2 lbs, 1 dozen" />
        <label>Store section</label>
        <select className="field" value={category} onChange={e => setCategory(e.target.value)}>
          {sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn" disabled={!name.trim()}
          onClick={() => onSave({ name: name.trim(), qty: qty.trim() || null, category })}>
          Save
        </button>
        <div style={{ height: 8 }} />
        <button className="btn danger-text" onClick={onDelete}>Delete item</button>
      </div>
    </div>
  );
}
