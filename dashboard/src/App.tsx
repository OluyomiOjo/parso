import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { Costs } from './pages/Costs';
import { OverviewPage } from './pages/Overview';
import { Revenue } from './pages/Revenue';
import { SignIn } from './pages/SignIn';
import { Users } from './pages/Users';
import { supabase } from './supabase';

const TABS = ['Overview', 'Users', 'Costs', 'Revenue'] as const;
type Tab = (typeof TABS)[number];

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <SignIn />;

  return (
    <div className="page">
      <div className="header">
        <div className="brand">
          <img src="/icon.png" alt="" />
          Parso dashboard
        </div>
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={t === tab}
              className={`pill${t === tab ? ' selected' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button className="link-button quiet" onClick={() => supabase.auth.signOut()}>
          Sign out {session.user.email}
        </button>
      </div>
      {tab === 'Overview' ? <OverviewPage /> : null}
      {tab === 'Users' ? <Users myId={session.user.id} /> : null}
      {tab === 'Costs' ? <Costs /> : null}
      {tab === 'Revenue' ? <Revenue /> : null}
    </div>
  );
}
