import React, { useMemo, useState } from 'react';
import { SECTIONS } from '../lib/categorize.js';

// 🥫 Pantry tab (Milestone 4): what the household already has.
// Counts with +/- steppers; 0 = out (greyed, one tap back onto the list).
export default function PantryView({
  pantry, sectionOrder, activeKeys, normalizeKey,
  onChangeQty, onDelete, onAddToList, onAddAllOut, onBulkAdd
}) {
  const [search, setSearch] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = pantry ?? [];
    return q ? all.filter(p => p.name.toLowerCase().includes(q)) : all;
  }, [pantry, search]);

  const grouped = useMemo(() => {
    const order = [...sectionOrder, ...SECTIONS.filter(s => !sectionOrder.includes(s))];
    const g = new Map();
    for (const s of order) g.set(s, []);
    for (const p of filtered) {
      const sec = g.has(p.category) ? p.category : 'Other';
      g.get(sec).push(p);
    }
    for (const arr of g.values()) arr.sort((a, b) => (a.qty === 0) - (b.qty === 0) || a.name.localeCompare(b.name));
    return g;
  }, [filtered, sectionOrder]);

  const outCount = (pantry ?? []).filter(p => p.qty === 0).length;

  async function submitBulk() {
    setBulkBusy(true);
    await onBulkAdd(bulkText);
    setBulkBusy(false);
    setBulkText('');
    setShowBulk(false);
  }

  return (
    <main className="screen">
      <input className="field" type="search" placeholder="🔍 Search pantry…"
        value={search} onChange={e => setSearch(e.target.value)} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={() => setShowBulk(s => !s)}>
          {showBulk ? 'Close' : '+ Add items'}
        </button>
        {outCount > 0 && (
          <button className="btn secondary" style={{ flex: 1 }} onClick={onAddAllOut}>
            🛒 List all out ({outCount})
          </button>
        )}
      </div>

      {showBulk && (
        <div className="card" style={{ marginTop: 12 }}>
          <p className="subtitle" style={{ marginBottom: 8 }}>
            One item per line — quantities understood ("2 cans black beans" stocks 2).
            Great for the first big pantry inventory session.
          </p>
          <textarea className="field paste-box" rows={6}
            placeholder={'2 cans black beans\nOlive oil\n3 boxes pasta\nFrozen peas'}
            value={bulkText} onChange={e => setBulkText(e.target.value)} />
          <button className="btn" disabled={bulkBusy || !bulkText.trim()} onClick={submitBulk}>
            {bulkBusy ? 'Stocking…' : 'Stock pantry'}
          </button>
        </div>
      )}

      {pantry === null && <p className="empty">Loading your pantry…</p>}
      {pantry !== null && pantry.length === 0 && !showBulk && (
        <p className="empty">
          Your pantry is empty.<br />
          Tap <b>+ Add items</b> and paste what's in your kitchen — or just go shopping:
          checked-off items stock the pantry automatically.
        </p>
      )}
      {pantry !== null && pantry.length > 0 && filtered.length === 0 && (
        <p className="empty">Nothing in the pantry matches “{search}”.</p>
      )}

      {[...grouped.entries()].map(([section, rows]) =>
        rows.length === 0 ? null : (
          <div className="section-block" key={section}>
            <p className="section-title">{section}</p>
            {rows.map(p => {
              const onList = activeKeys.has(normalizeKey(p.name));
              return (
                <div className={`item-row ${p.qty === 0 ? 'pantry-out' : ''}`} key={p.id}>
                  <div className="stepper">
                    <button onClick={() => onChangeQty(p, -1)} disabled={p.qty === 0}
                      aria-label={`One less ${p.name}`}>−</button>
                    <span className="qty-num">{p.qty}</span>
                    <button onClick={() => onChangeQty(p, +1)} aria-label={`One more ${p.name}`}>+</button>
                  </div>
                  <div className="item-main">
                    <div className="item-name">
                      {p.name}
                      {p.qty === 0 && <span className="out-badge">out</span>}
                    </div>
                  </div>
                  {onList
                    ? <span className="on-list-note">on list</span>
                    : <button className="icon-btn" aria-label={`Add ${p.name} to list`}
                        title="Add to list" onClick={() => onAddToList(p)}>🛒</button>}
                  <button className="recipe-delete" aria-label={`Remove ${p.name} from pantry`}
                    onClick={() => onDelete(p)}>✕</button>
                </div>
              );
            })}
          </div>
        )
      )}
    </main>
  );
}
