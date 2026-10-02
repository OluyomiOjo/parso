export const RANGES = [7, 30, 90] as const;

export function Range({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  return (
    <div className="pills">
      {RANGES.map((d) => (
        <button key={d} className={`pill${d === days ? ' selected' : ''}`} onClick={() => onChange(d)}>
          {d} days
        </button>
      ))}
    </div>
  );
}
