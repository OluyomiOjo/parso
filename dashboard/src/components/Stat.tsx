export function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="panel">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{typeof value === 'number' ? value.toLocaleString('en-US') : value}</div>
      {note ? <div className="meta" style={{ marginTop: 4 }}>{note}</div> : null}
    </div>
  );
}
