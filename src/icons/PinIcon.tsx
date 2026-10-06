import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

// A push pin; filled when the note is pinned.
export function PinIcon({ color, size, strokeWidth, filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 3h6l-1 6 3.5 3.5V15h-11v-2.5L10 9 9 3ZM12 15v6"
        stroke={color}
        fill={filled ? color : 'none'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
