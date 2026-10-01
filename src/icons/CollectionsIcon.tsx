import Svg, { Rect } from 'react-native-svg';

import type { IconProps } from './types';

export function CollectionsIcon({ color, size, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3.5} width={18} height={7.5} rx={2.5} stroke={color} strokeWidth={strokeWidth} />
      <Rect x={3} y={13} width={18} height={7.5} rx={2.5} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}
