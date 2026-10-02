import Svg, { Rect } from 'react-native-svg';

import type { IconProps } from './types';

// Four squares: the grid view.
export function GridIcon({ color, size, strokeWidth }: IconProps) {
  const square = { width: 6.5, height: 6.5, rx: 1.5, stroke: color, strokeWidth };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} {...square} />
      <Rect x={13.5} y={4} {...square} />
      <Rect x={4} y={13.5} {...square} />
      <Rect x={13.5} y={13.5} {...square} />
    </Svg>
  );
}
