import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

export function SearchIcon({ color, size, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={7} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M15.75 15.75 L21 21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
