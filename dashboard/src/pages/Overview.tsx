import { useState } from 'react';

import { KIND_NAMES, SOURCE_NAMES, type Overview } from '../api';
import { Bars } from '../components/Bars';
import { DailyChart } from '../components/DailyChart';
import { Range } from '../components/Range';
import { Stat } from '../components/Stat';
import { useAdmin } from '../components/useAdmin';

const FUNNEL: { key: keyof Overview['funnel']; label: string }[] = [
  { key: 'intro_finished', label: 'Finished intro' },
  { key: 'signed_in', label: 'Signed in' },
  { key: 'first_save', label: 'First save' },
  { key: 'ten_saves', label: '10 saves' },
  { key: 'fifty_saves', label: '50 saves' },
  { key: 'pro', label: 'Pro' },
];

export function OverviewPage() {
  const [days, setDays] = useState(30);
  const { data, error } = useAdmin<Overview>({ action: 'overview', days });

  return (
    <>
      <div className="header">
        <h1 className="title">Overview</h1>
        <Range days={days} onChange={setDays} />
      </div>
      {error ? <div className="error">{error}</div> : null}
      {data ? (
        <>
          <div className="grid" style={{ marginTop: 12 }}>
            <Stat label="Users" value={data.users.total} note={`${data.users.new_7d} new this week`} />
            <Stat label="Active today" value={data.users.active_1d} note={`${data.users.active_7d} this week`} />
            <Stat label="Pro" value={data.users.pro} />
            <Stat label="Saves" value={data.saves.total} note={`${data.saves.today} today`} />
            <Stat label="Searches this week" value={data.saves.searches_7d} />
            <Stat label="Reminders waiting" value={data.saves.reminders} />
          </div>

          <div className="two-col" style={{ marginTop: 12 }}>
            <div className="panel">
              <h2 className="section-heading" style={{ marginTop: 0 }}>Saves per day</h2>
              <DailyChart days={data.daily.map((d) => ({ day: d.day, value: d.saves }))} />
            </div>
            <div className="panel">
              <h2 className="section-heading" style={{ marginTop: 0 }}>Active users per day</h2>
              <DailyChart days={data.daily.map((d) => ({ day: d.day, value: d.active_users }))} />
            </div>
            <div className="panel">
              <h2 className="section-heading" style={{ marginTop: 0 }}>New users per day</h2>
              <DailyChart days={data.daily.map((d) => ({ day: d.day, value: d.new_users }))} />
            </div>
            <div className="panel">
              <h2 className="section-heading" style={{ marginTop: 0 }}>Searches per day</h2>
              <DailyChart days={data.daily.map((d) => ({ day: d.day, value: d.searches }))} />
            </div>
          </div>

          <div className="two-col" style={{ marginTop: 12 }}>
            <div className="panel">
              <h2 className="section-heading" style={{ marginTop: 0 }}>Where links come from</h2>
              <Bars rows={Object.entries(data.sources).map(([k, v]) => ({ label: SOURCE_NAMES[k] ?? k, value: v }))} />
            </div>
            <div className="panel">
              <h2 className="section-heading" style={{ marginTop: 0 }}>What people save</h2>
              <Bars rows={Object.entries(data.kinds).map(([k, v]) => ({ label: KIND_NAMES[k] ?? k, value: v }))} />
            </div>
            <div className="panel">
              <h2 className="section-heading" style={{ marginTop: 0 }}>Funnel</h2>
              <Bars keepOrder rows={FUNNEL.map((f) => ({ label: f.label, value: data.funnel[f.key] }))} />
              <p className="meta">Counts people, all time. Intro and activity are counted from the first build that sends them.</p>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
