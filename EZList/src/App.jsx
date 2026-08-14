import React, { useEffect, useState } from 'react';
import { supabase, isConfigured } from './lib/supabase.js';
import SetupScreen from './components/SetupScreen.jsx';
import JoinScreen from './components/JoinScreen.jsx';
import ListScreen from './components/ListScreen.jsx';

export default function App() {
  const [state, setState] = useState({ phase: 'loading' });
  // phases: loading → setup | join | list | error

  useEffect(() => {
    if (!isConfigured) {
      setState({ phase: 'setup' });
      return;
    }
    init();
  }, []);

  async function init() {
    try {
      // 1. Ensure we have a (passwordless, anonymous) session.
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw new Error(
          error.message.toLowerCase().includes('disabled')
            ? 'Anonymous sign-ins are disabled. In Supabase: Authentication → Sign In / Up → enable "Anonymous sign-ins".'
            : error.message
        );
        session = data.session;
      }

      // 2. Do we belong to a household yet?
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).maybeSingle();

      if (!profile) {
        setState({ phase: 'join' });
        return;
      }

      const { data: household } = await supabase
        .from('households').select('*').eq('id', profile.household_id).single();

      setState({ phase: 'list', profile, household });
    } catch (e) {
      setState({ phase: 'error', message: e.message });
    }
  }

  if (state.phase === 'loading') {
    return <div className="center-screen"><p className="subtitle" style={{ textAlign: 'center' }}>Loading…</p></div>;
  }
  if (state.phase === 'setup') return <SetupScreen />;
  if (state.phase === 'join') return <JoinScreen onJoined={init} />;
  if (state.phase === 'error') {
    return (
      <div className="center-screen">
        <div className="card">
          <p className="title" style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</p>
          <p className="subtitle">{state.message}</p>
          <div style={{ height: 14 }} />
          <button className="btn" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }
  return <ListScreen profile={state.profile} household={state.household} />;
}
