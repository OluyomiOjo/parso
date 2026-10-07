import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

// Three short lines: press and drag to move a row.
export function DragHandleIcon({ color, size, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 8h14M5 12h14M5 16h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
