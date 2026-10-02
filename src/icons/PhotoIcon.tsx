import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { IconProps } from './types';

// A framed picture with a sun and a hill: a photo.
export function PhotoIcon({ color, size, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={16} rx={2.5} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={9} cy={9.5} r={1.8} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M21 16l-5-5-9 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
