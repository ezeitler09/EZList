import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { parseText, parseUrl, parseImage } from '../lib/importApi.js';
import { categorize, normalizeKey } from '../lib/categorize.js';

// Recipe import flow: Paste / Link / Photo → review → add.
// Nothing hits the list until the user confirms on the review screen.
// When `initialRecipe` is passed (tapped from the Recipes tab), the sheet
// opens straight into the review screen for that saved recipe.
export default function RecipeImportSheet({
  householdId, profileId, overrides, activeNames, sections,
  initialRecipe = null, onAdd, onClose, onRecipeSaved
}) {
  const [tab, setTab] = useState('paste'); // paste | url | photo
  const [step, setStep] = useState('input'); // input | review
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState(null);
  const [rows, setRows] = useState([]);
  const [fromSaved, setFromSaved] = useState(false);
  const [saveRecipe, setSaveRecipe] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [sourceUrl, setSourceUrl] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (initialRecipe) {
      setSourceUrl(initialRecipe.source_url ?? null);
      toReview(initialRecipe.ingredients ?? [], initialRecipe.title, { fromSaved: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFilePicked(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) run(() => parseImage(f));
  }

  function toReview(ingredients, recipeTitle = null, opts = {}) {
    if (!ingredients.length) {
      setError("Couldn't find any ingredients there. Give it another try, or add items by hand.");
      return;
    }
    setTitle(recipeTitle);
    setFromSaved(Boolean(opts.fromSaved));
    setSaveRecipe(false);
    setRecipeName(recipeTitle ?? '');
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

  async function run(fn, srcUrl = null) {
    setBusy(true);
    setError('');
    setSourceUrl(srcUrl);
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

  async function confirmAdd() {
    if (saveRecipe && recipeName.trim()) {
      const { data } = await supabase.from('recipes').insert({
        household_id: householdId,
        title: recipeName.trim(),
        source_url: sourceUrl,
        ingredients: rows.map(r => ({ name: r.name.trim(), qty: r.qty?.trim() || null })),
        added_by: profileId
      }).select().single();
      if (data) onRecipeSaved?.(data);
    }
    onAdd(rows.filter(r => r.include && r.name.trim()));
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

          {!fromSaved && (
            <>
              <div className="save-toggle-row">
                <button className={`checkbox ${saveRecipe ? 'on' : ''}`}
                  onClick={() => setSaveRecipe(s => !s)}
                  aria-label="Save this recipe">
                  {saveRecipe ? '✓' : ''}
                </button>
                <span>💾 Save this recipe for later</span>
              </div>
              {saveRecipe && (
                <input className="field" placeholder="Recipe name (e.g. Taco Night)"
                  value={recipeName} onChange={e => setRecipeName(e.target.value)} />
              )}
            </>
          )}

          <div style={{ height: 12 }} />
          <button className="btn"
            disabled={(includedCount === 0 && !saveRecipe) || (saveRecipe && !recipeName.trim())}
            onClick={confirmAdd}>
            {includedCount === 0
              ? 'Save recipe'
              : `Add ${includedCount} item${includedCount === 1 ? '' : 's'}${saveRecipe ? ' & save recipe' : ''}`}
          </button>
          <div style={{ height: 8 }} />
          <button className="btn danger-text"
            onClick={() => (initialRecipe ? onClose() : setStep('input'))}>
            {initialRecipe ? 'Cancel' : 'Back'}
          </button>
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
              onClick={() => run(() => parseUrl(url.trim()), url.trim())}>
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
            <input ref={cameraRef} type="file" accept="image/*" capture="environment"
              style={{ display: 'none' }} onChange={onFilePicked} />
            <input ref={fileRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={onFilePicked} />
            <button className="btn" disabled={busy} onClick={() => cameraRef.current?.click()}>
              {busy ? 'Reading photo…' : '📷 Take a photo'}
            </button>
            <div style={{ height: 8 }} />
            <button className="btn secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
              🖼️ Choose from gallery
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
