import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

// A keyboard with a down chevron: put the keyboard away.
export function HideKeyboardIcon({ color, size, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 3h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM7 7h.01M11 7h.01M15 7h.01M7 10.5h10M9 18l3 3 3-3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
