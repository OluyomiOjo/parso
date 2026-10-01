import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

export function YouIcon({ color, size, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4.25} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M4 21 C4 16.5 7.6 14 12 14 C16.4 14 20 16.5 20 21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
