import React, { useState } from 'react';

export default function SettingsSheet({ household, profile, profiles, sectionOrder, onSaveOrder, onClose }) {
  const [order, setOrder] = useState(sectionOrder);
  const joinUrl = `${window.location.origin}${window.location.pathname}?join=${household.code}`;

  function move(index, delta) {
    const next = [...order];
    const [sec] = next.splice(index, 1);
    next.splice(index + delta, 0, sec);
    setOrder(next);
    onSaveOrder(next);
  }

  async function share() {
    const text = `Join our grocery list! Open ${joinUrl} and enter code ${household.code}.`;
    if (navigator.share) {
      try { await navigator.share({ title: 'CartShare', text, url: joinUrl }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Invite copied to clipboard!');
    }
  }

  const members = Object.values(profiles);

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <h2>Settings</h2>

        <label>Invite your partner</label>
        <div className="big-code">{household.code}</div>
        <button className="btn" onClick={share}>Share join link</button>

        <label>Household members</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
          {members.map(m => (
            <span key={m.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid var(--border)', borderRadius: 999, padding: '5px 12px', fontSize: 14
            }}>
              <span className="avatar" style={{ background: m.color }}>{m.display_name[0]?.toUpperCase()}</span>
              {m.display_name}{m.id === profile.id ? ' (you)' : ''}
            </span>
          ))}
        </div>

        <label>Store section order (match your store's layout)</label>
        {order.map((sec, i) => (
          <div className="section-order-row" key={sec}>
            <span>{sec}</span>
            <span className="arrows">
              <button disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${sec} up`}>↑</button>
              <button disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${sec} down`}>↓</button>
            </span>
          </div>
        ))}

        <div style={{ height: 16 }} />
        <button className="btn secondary" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
