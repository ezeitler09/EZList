import React, { useState } from 'react';
import { saveLocalConfig } from '../lib/supabase.js';

// Shown only when the app was deployed without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
// Lets you paste them once; they're kept in this browser.
export default function SetupScreen() {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');

  return (
    <div className="center-screen">
      <div>
        <p className="title">🛒 CartShare</p>
        <p className="subtitle">One-time setup: connect your Supabase project.</p>
      </div>
      <div className="card">
        <p className="subtitle" style={{ marginBottom: 12 }}>
          Find both values in your Supabase dashboard under <b>Settings → API</b>.
        </p>
        <input className="field" placeholder="Project URL (https://xxxx.supabase.co)"
          value={url} onChange={e => setUrl(e.target.value)} autoCapitalize="none" />
        <input className="field" placeholder="anon public key (eyJ…)"
          value={key} onChange={e => setKey(e.target.value)} autoCapitalize="none" />
        <button className="btn" disabled={!url.trim() || !key.trim()}
          onClick={() => saveLocalConfig(url, key)}>
          Connect
        </button>
      </div>
      <p className="subtitle" style={{ textAlign: 'center', fontSize: 13 }}>
        Tip: set these as environment variables at deploy time and this screen never appears.
      </p>
    </div>
  );
}
