import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { categorize, normalizeKey, SECTIONS } from '../lib/categorize.js';
import ItemEditSheet from './ItemEditSheet.jsx';
import SettingsSheet from './SettingsSheet.jsx';

export default function ListScreen({ profile, household: initialHousehold }) {
  const [household, setHousehold] = useState(initialHousehold);
  const [items, setItems] = useState(null); // null = loading
  const [profiles, setProfiles] = useState({});
  const [overrides, setOverrides] = useState({});
  const [newItem, setNewItem] = useState('');
  const [editing, setEditing] = useState(null); // item being edited
  const [showSettings, setShowSettings] = useState(false);
  const [connected, setConnected] = useState(true);
  const inputRef = useRef(null);

  const hid = household.id;

  // ---------- Initial load + realtime subscription (1.2) ----------
  useEffect(() => {
    let channel;

    async function load() {
      const [itemsRes, profilesRes, overridesRes] = await Promise.all([
        supabase.from('items').select('*').eq('household_id', hid).order('created_at'),
        supabase.from('profiles').select('*').eq('household_id', hid),
        supabase.from('category_overrides').select('*').eq('household_id', hid)
      ]);
      setItems(itemsRes.data ?? []);
      setProfiles(Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p])));
      setOverrides(Object.fromEntries((overridesRes.data ?? []).map(o => [o.item_key, o.category])));

      // Auto-clear items checked more than 24h ago (1.3)
      const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const stale = (itemsRes.data ?? []).filter(i => i.checked && i.checked_at && i.checked_at < cutoff);
      if (stale.length) {
        await supabase.from('items').delete().in('id', stale.map(i => i.id));
        setItems(prev => prev.filter(i => !stale.some(s => s.id === i.id)));
      }
    }

    load();

    channel = supabase
      .channel(`household-${hid}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `household_id=eq.${hid}` },
        payload => {
          setItems(prev => {
            if (prev === null) return prev;
            if (payload.eventType === 'INSERT') {
              if (prev.some(i => i.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(i => (i.id === payload.new.id ? payload.new : i));
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(i => i.id !== payload.old.id);
            }
            return prev;
          });
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${hid}` },
        payload => setHousehold(payload.new))
      .subscribe(status => setConnected(status === 'SUBSCRIBED'));

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [hid]);

  // ---------- Actions ----------
  async function addItem(e) {
    e?.preventDefault();
    const name = newItem.trim();
    if (!name) return;
    setNewItem('');
    inputRef.current?.focus();
    const item = {
      household_id: hid,
      name,
      category: categorize(name, overrides),
      added_by: profile.id,
      source: 'manual'
    };
    // Optimistic insert
    const tempId = crypto.randomUUID();
    setItems(prev => [...prev, { ...item, id: tempId, checked: false, created_at: new Date().toISOString() }]);
    const { data, error } = await supabase.from('items').insert(item).select().single();
    if (error) {
      setItems(prev => prev.filter(i => i.id !== tempId));
      alert(`Couldn't add "${name}" — check your connection and try again.`);
    } else {
      setItems(prev => prev.map(i => (i.id === tempId ? data : i)));
    }
  }

  async function toggleChecked(item) {
    const checked = !item.checked;
    const checked_at = checked ? new Date().toISOString() : null;
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, checked, checked_at } : i)));
    await supabase.from('items').update({ checked, checked_at }).eq('id', item.id);
  }

  async function saveItemEdit(item, updates) {
    // If the category was changed by hand, remember it for this household (1.4)
    if (updates.category && updates.category !== categorize(updates.name ?? item.name, {})) {
      const item_key = normalizeKey(updates.name ?? item.name);
      setOverrides(prev => ({ ...prev, [item_key]: updates.category }));
      await supabase.from('category_overrides').upsert({ household_id: hid, item_key, category: updates.category });
    }
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, ...updates } : i)));
    setEditing(null);
    await supabase.from('items').update(updates).eq('id', item.id);
  }

  async function deleteItem(item) {
    setEditing(null);
    setItems(prev => prev.filter(i => i.id !== item.id));
    await supabase.from('items').delete().eq('id', item.id);
  }

  async function clearChecked() {
    const ids = items.filter(i => i.checked).map(i => i.id);
    if (!ids.length) return;
    setItems(prev => prev.filter(i => !i.checked));
    await supabase.from('items').delete().in('id', ids);
  }

  async function saveSectionOrder(order) {
    setHousehold(prev => ({ ...prev, section_order: order }));
    await supabase.from('households').update({ section_order: order }).eq('id', hid);
  }

  // ---------- Grouping (1.4) ----------
  const sectionOrder = useMemo(() => {
    const saved = Array.isArray(household.section_order) ? household.section_order : SECTIONS;
    const missing = SECTIONS.filter(s => !saved.includes(s));
    return [...saved, ...missing];
  }, [household.section_order]);

  const { grouped, checkedItems } = useMemo(() => {
    const active = (items ?? []).filter(i => !i.checked);
    const done = (items ?? []).filter(i => i.checked)
      .sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? ''));
    const g = new Map();
    for (const section of sectionOrder) g.set(section, []);
    for (const item of active) {
      const sec = g.has(item.category) ? item.category : 'Other';
      g.get(sec).push(item);
    }
    return { grouped: g, checkedItems: done };
  }, [items, sectionOrder]);

  const activeCount = (items ?? []).filter(i => !i.checked).length;

  // ---------- Render ----------
  return (
    <>
      <header className="header">
        <h1>🛒 {household.name}</h1>
        <div className="toolbar">
          <span className={`sync-dot ${connected ? '' : 'off'}`} title={connected ? 'Live' : 'Reconnecting…'} />
          <button className="icon-btn" aria-label="Settings" onClick={() => setShowSettings(true)}>⚙️</button>
        </div>
      </header>

      <main className="screen">
        {items === null && <p className="empty">Loading your list…</p>}

        {items !== null && activeCount === 0 && checkedItems.length === 0 && (
          <p className="empty">
            Your list is empty.<br />Add your first item below 👇
          </p>
        )}

        {[...grouped.entries()].map(([section, sectionItems]) =>
          sectionItems.length === 0 ? null : (
            <div className="section-block" key={section}>
              <p className="section-title">{section}</p>
              {sectionItems.map(item => (
                <ItemRow key={item.id} item={item} profiles={profiles}
                  onToggle={() => toggleChecked(item)} onEdit={() => setEditing(item)} />
              ))}
            </div>
          )
        )}

        {checkedItems.length > 0 && (
          <>
            <div className="checked-header">
              <p className="section-title">Checked ({checkedItems.length})</p>
              <button className="clear-btn" onClick={clearChecked}>Clear all</button>
            </div>
            {checkedItems.map(item => (
              <ItemRow key={item.id} item={item} profiles={profiles}
                onToggle={() => toggleChecked(item)} onEdit={() => setEditing(item)} />
            ))}
          </>
        )}
      </main>

      <form className="add-bar" onSubmit={addItem}>
        <div className="add-bar-inner">
          <input ref={inputRef} value={newItem} onChange={e => setNewItem(e.target.value)}
            placeholder="Add an item (e.g. milk)" aria-label="Add an item" enterKeyHint="done" />
          <button type="submit" className="add-btn" aria-label="Add">+</button>
        </div>
      </form>

      {editing && (
        <ItemEditSheet item={editing} sections={sectionOrder}
          onSave={updates => saveItemEdit(editing, updates)}
          onDelete={() => deleteItem(editing)}
          onClose={() => setEditing(null)} />
      )}

      {showSettings && (
        <SettingsSheet household={household} profile={profile} profiles={profiles}
          sectionOrder={sectionOrder} onSaveOrder={saveSectionOrder}
          onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}

function ItemRow({ item, profiles, onToggle, onEdit }) {
  const adder = item.added_by ? profiles[item.added_by] : null;
  return (
    <div className={`item-row ${item.checked ? 'checked' : ''}`}>
      <button className={`checkbox ${item.checked ? 'on' : ''}`} onClick={onToggle}
        aria-label={item.checked ? 'Uncheck' : 'Check off'}>
        {item.checked ? '✓' : ''}
      </button>
      <button className="item-main" onClick={onEdit} style={{ textAlign: 'left' }}>
        <div className="item-name">{item.name}</div>
        {item.qty && <div className="item-qty">{item.qty}</div>}
      </button>
      {adder && (
        <span className="avatar" style={{ background: adder.color }} title={`Added by ${adder.display_name}`}>
          {adder.display_name[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}
