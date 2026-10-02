// Horizontal bars for a breakdown (sources, kinds, funnel steps), largest first unless told to keep order.
type Props = { rows: { label: string; value: number }[]; keepOrder?: boolean };

export function Bars({ rows, keepOrder = false }: Props) {
  const sorted = keepOrder ? rows : [...rows].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((r) => r.value));
  if (!sorted.length) return <div className="secondary">Nothing yet.</div>;
  return (
    <div>
      {sorted.map((r) => (
        <div className="bar-row" key={r.label}>
          <span>{r.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="num" style={{ textAlign: 'right' }}>{r.value.toLocaleString('en-US')}</span>
        </div>
      ))}
    </div>
  );
}
