import { useState } from 'react';

import { type Revenue as RevenueData, usd } from '../api';
import { Bars } from '../components/Bars';
import { DailyChart } from '../components/DailyChart';
import { Range } from '../components/Range';
import { Stat } from '../components/Stat';
import { useAdmin } from '../components/useAdmin';

const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : 'No data yet');

// Parso Pro: who sees the Pro page, taps Subscribe and subscribes, who is paying now, and the money. Apple's test
// purchases are left out. RevenueCat's own dashboard has the full detail.
export function Revenue() {
  const [days, setDays] = useState(30);
  const { data, error } = useAdmin<RevenueData>({ action: 'revenue', days });

  return (
    <>
      <div className="header">
        <h1 className="title">Revenue</h1>
        <Range days={days} onChange={setDays} />
      </div>
      {error ? <div className="error">{error}</div> : null}
      {data ? (
        <>
          <div className="grid" style={{ marginTop: 12 }}>
            <Stat
              label="Paying now"
              value={data.subscribers.paying}
              note={`${data.subscribers.yearly} yearly, ${data.subscribers.monthly} monthly`}
            />
            <Stat label="Pro given by you" value={data.subscribers.given} />
            <Stat
              label={`Revenue, last ${days} days`}
              value={usd(data.revenue_usd)}
              note="Before Apple's and Google's fees"
            />
            <Stat
              label="Pro page to subscribed"
              value={percent(data.funnel.subscribed, data.funnel.shown)}
              note={`${data.funnel.subscribed} of ${data.funnel.shown} people`}
            />
          </div>
          <div className="panel" style={{ marginTop: 12 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>
              Sign-up funnel
            </h2>
            <Bars
              keepOrder
              rows={[
                { label: 'Saw the Pro page', value: data.funnel.shown },
                { label: 'Tapped Subscribe', value: data.funnel.tapped },
                { label: 'Subscribed', value: data.funnel.subscribed },
              ]}
            />
            <p className="meta">
              Counts people in the chosen period. Subscribe taps are counted from the build after 18.
            </p>
          </div>
          <div className="panel" style={{ marginTop: 12 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>
              New subscribers per day
            </h2>
            <DailyChart days={data.daily.map((d) => ({ day: d.day, value: d.new_subscribers }))} />
          </div>
          <div className="panel" style={{ marginTop: 12 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>
              Revenue per day
            </h2>
            <DailyChart days={data.daily.map((d) => ({ day: d.day, value: d.usd }))} format={(n) => usd(n)} />
          </div>
        </>
      ) : null}
    </>
  );
}
