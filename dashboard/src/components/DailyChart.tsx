// A plain bar chart of one number per day, drawn as SVG (no chart library).
type Props = { days: { day: string; value: number }[]; format?: (n: number) => string };

const HEIGHT = 140;

export function DailyChart({ days, format = (n) => n.toLocaleString('en-US') }: Props) {
  const max = Math.max(1, ...days.map((d) => d.value));
  const total = days.reduce((sum, d) => sum + d.value, 0);
  const barWidth = 100 / Math.max(days.length, 1);
  const first = days[0]?.day;
  const last = days[days.length - 1]?.day;
  const label = (iso?: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');

  return (
    <div>
      <div className="meta num">Total {format(total)}</div>
      <svg viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" width="100%" height={HEIGHT} role="img" aria-label={`Daily values, total ${format(total)}`}>
        {days.map((d, i) => {
          const h = (d.value / max) * (HEIGHT - 4);
          return (
            <rect key={d.day} x={i * barWidth + barWidth * 0.15} y={HEIGHT - h} width={barWidth * 0.7} height={h} rx={0.6} fill="var(--ink)">
              <title>{`${label(d.day)}: ${format(d.value)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label(first)}</span>
        <span>{label(last)}</span>
      </div>
    </div>
  );
}
