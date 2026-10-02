import { useState } from 'react';

import { usd, type Costs as CostData } from '../api';
import { DailyChart } from '../components/DailyChart';
import { Range } from '../components/Range';
import { Stat } from '../components/Stat';
import { useAdmin } from '../components/useAdmin';

// What the AI filing costs. Search embeddings cost a small fraction of this and aren't logged per call.
export function Costs() {
  const [days, setDays] = useState(30);
  const { data, error } = useAdmin<CostData>({ action: 'costs', days });
  const perUser = data && data.active_users_30d ? data.last_30d_usd / data.active_users_30d : null;

  return (
    <>
      <div className="header">
        <h1 className="title">Costs</h1>
        <Range days={days} onChange={setDays} />
      </div>
      {error ? <div className="error">{error}</div> : null}
      {data ? (
        <>
          <div className="grid" style={{ marginTop: 12 }}>
            <Stat label="AI cost, all time" value={usd(data.total_usd)} note={`${data.runs.toLocaleString('en-US')} saves filed`} />
            <Stat label="Last 30 days" value={usd(data.last_30d_usd)} />
            <Stat label="Per save" value={usd(data.per_save_usd, 5)} note={`50 free saves cost ${usd(data.per_save_usd * 50, 3)}`} />
            <Stat label="Per active user, 30 days" value={perUser === null ? 'No data yet' : usd(perUser, 4)} />
          </div>
          <div className="panel" style={{ marginTop: 12 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>AI cost per day</h2>
            <DailyChart days={data.daily.map((d) => ({ day: d.day, value: d.usd }))} format={(n) => usd(n, 4)} />
          </div>
        </>
      ) : null}
    </>
  );
}
