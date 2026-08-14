import React, { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0d9488'];

export default function JoinScreen({ onJoined }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [name, setName] = useState('');
  const [code, setCode] = useState(getCodeFromUrl());
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function getCodeFromUrl() {
    return new URLSearchParams(window.location.search).get('join')?.toUpperCase() || '';
  }

  async function submit() {
    setBusy(true);
    setError('');
    const fn = mode === 'create' ? 'create_household' : 'join_household';
    const args = mode === 'create'
      ? { hname: 'Our Groceries', dname: name.trim(), dcolor: color }
      : { jcode: code.trim(), dname: name.trim(), dcolor: color };
    const { error } = await supabase.rpc(fn, args);
    if (error) {
      setError(error.message === 'invalid code' ? "That code didn't match a household — double-check it." : error.message);
      setBusy(false);
      return;
    }
    window.history.replaceState({}, '', window.location.pathname);
    onJoined();
  }

  if (!mode) {
    return (
      <div className="center-screen">
        <div>
          <p className="title">🛒 CartShare</p>
          <p className="subtitle">A shared grocery list for your household.</p>
        </div>
        <button className="btn" onClick={() => setMode(code ? 'join' : 'create')}>
          {code ? `Join household (code ${code})` : 'Start a new household'}
        </button>
        <button className="btn secondary" onClick={() => setMode(code ? 'create' : 'join')}>
          {code ? 'Start a new household instead' : 'I have a join code'}
        </button>
      </div>
    );
  }

  return (
    <div className="center-screen">
      <p className="title">{mode === 'create' ? 'Start your household' : 'Join a household'}</p>
      <div className="card">
        {mode === 'join' && (
          <input className="field" placeholder="6-letter join code" value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            autoCapitalize="characters" maxLength={6} />
        )}
        <input className="field" placeholder="Your name (e.g. Evan)" value={name}
          onChange={e => setName(e.target.value)} />
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', margin: '6px 0 8px' }}>
          Your color (shows next to items you add)
        </label>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} aria-label={`color ${c}`}
              style={{
                width: 34, height: 34, borderRadius: '50%', background: c,
                outline: color === c ? '3px solid var(--text)' : 'none', outlineOffset: 2
              }} />
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy || !name.trim() || (mode === 'join' && code.trim().length < 6)}
          onClick={submit}>
          {busy ? 'One sec…' : mode === 'create' ? 'Create household' : 'Join'}
        </button>
        <div style={{ height: 8 }} />
        <button className="btn danger-text" onClick={() => { setMode(null); setError(''); }}>Back</button>
      </div>
    </div>
  );
}
