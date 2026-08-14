import React, { useRef, useState } from 'react';
import { parseText, parseUrl, parseImage } from '../lib/importApi.js';
import { categorize, normalizeKey } from '../lib/categorize.js';

// "Add from recipe" flow (Milestone 2): Paste / Link / Photo → review → add.
// Nothing hits the list until the user confirms on the review screen.
export default function RecipeImportSheet({ overrides, activeNames, sections, onAdd, onClose }) {
  const [tab, setTab] = useState('paste'); // paste | url | photo
  const [step, setStep] = useState('input'); // input | review
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState(null);
  const [rows, setRows] = useState([]);
  const fileRef = useRef(null);

  function toReview(ingredients, recipeTitle = null) {
    if (!ingredients.length) {
      setError("Couldn't find any ingredients there. Give it another try, or add items by hand.");
      return;
    }
    setTitle(recipeTitle);
    setRows(ingredients.map(ing => {
      const dup = activeNames.has(normalizeKey(ing.name));
      return {
        include: !dup,
        dup,
        name: ing.name,
        qty: ing.qty ?? '',
        category: categorize(ing.name, overrides)
      };
    }));
    setStep('review');
  }

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      const result = await fn();
      toReview(result.ingredients, result.title ?? null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function updateRow(i, patch) {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const includedCount = rows.filter(r => r.include && r.name.trim()).length;

  // ---------- Review step ----------
  if (step === 'review') {
    return (
      <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="sheet">
          <h2>{title ? `“${title}”` : 'Review ingredients'}</h2>
          <p className="subtitle" style={{ marginBottom: 10 }}>
            Uncheck anything you already have. Tap a name or quantity to edit.
          </p>
          {rows.map((row, i) => (
            <div className="review-row" key={i}>
              <button className={`checkbox ${row.include ? 'on' : ''}`}
                onClick={() => updateRow(i, { include: !row.include })}
                aria-label={row.include ? 'Exclude' : 'Include'}>
                {row.include ? '✓' : ''}
              </button>
              <div className="review-fields">
                <input className="review-name" value={row.name}
                  onChange={e => updateRow(i, { name: e.target.value })} />
                <div className="review-sub">
                  <input className="review-qty" value={row.qty} placeholder="qty"
                    onChange={e => updateRow(i, { qty: e.target.value })} />
                  <select className="review-cat" value={row.category}
                    onChange={e => updateRow(i, { category: e.target.value })}>
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {row.dup && <span className="dup-badge">already on your list</span>}
              </div>
            </div>
          ))}
          <div style={{ height: 12 }} />
          <button className="btn" disabled={includedCount === 0}
            onClick={() => onAdd(rows.filter(r => r.include && r.name.trim()))}>
            Add {includedCount} item{includedCount === 1 ? '' : 's'} to list
          </button>
          <div style={{ height: 8 }} />
          <button className="btn danger-text" onClick={() => setStep('input')}>Back</button>
        </div>
      </div>
    );
  }

  // ---------- Input step ----------
  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <h2>Add from recipe</h2>
        <div className="tabs">
          {[['paste', '📋 Paste'], ['url', '🔗 Link'], ['photo', '📷 Photo']].map(([key, label]) => (
            <button key={key} className={`tab ${tab === key ? 'active' : ''}`}
              onClick={() => { setTab(key); setError(''); }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'paste' && (
          <>
            <textarea className="field paste-box" rows={8}
              placeholder={'Paste a recipe or ingredient list…\n\n2 lbs chicken thighs\n1 cup rice\n3 cloves garlic'}
              value={text} onChange={e => setText(e.target.value)} />
            <button className="btn" disabled={busy || !text.trim()}
              onClick={() => run(() => parseText(text))}>
              {busy ? 'Reading recipe…' : 'Extract ingredients'}
            </button>
          </>
        )}

        {tab === 'url' && (
          <>
            <input className="field" type="url" placeholder="https://www.allrecipes.com/…"
              value={url} onChange={e => setUrl(e.target.value)}
              autoCapitalize="none" autoCorrect="off" inputMode="url" />
            <button className="btn" disabled={busy || !url.trim()}
              onClick={() => run(() => parseUrl(url.trim()))}>
              {busy ? 'Fetching recipe…' : 'Get ingredients'}
            </button>
          </>
        )}

        {tab === 'photo' && (
          <>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Snap a cookbook page or upload a screenshot of a recipe. The photo is
              read once and never stored.
            </p>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) run(() => parseImage(f));
              }} />
            <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? 'Reading photo…' : '📷 Take or choose a photo'}
            </button>
          </>
        )}

        {error && <><div style={{ height: 10 }} /><p className="error">{error}</p></>}
        <div style={{ height: 8 }} />
        <button className="btn danger-text" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
