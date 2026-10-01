import { SegmentedControl } from './SegmentedControl';

export type KindOption = { kind: string | null; label: string; count: number }; // null kind means All

type Props = { options: KindOption[]; selected: string | null; onSelect: (kind: string | null) => void };

// The collection screen's filter: "All 6, Links 4, Photos 2".
export function KindFilter({ options, selected, onSelect }: Props) {
  return (
    <SegmentedControl
      segments={options.map((o) => ({
        value: o.kind,
        label: `${o.label} ${o.count}`,
        accessibilityLabel: `${o.label}, ${o.count}`,
      }))}
      selected={selected}
      onSelect={onSelect}
    />
  );
}
