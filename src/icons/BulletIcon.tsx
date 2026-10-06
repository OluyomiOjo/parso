import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

// Three dots beside three lines: the editor's bullet button.
export function BulletIcon({ color, size, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={4.5} cy={6} r={1.5} fill={color} />
      <Circle cx={4.5} cy={12} r={1.5} fill={color} />
      <Circle cx={4.5} cy={18} r={1.5} fill={color} />
      <Path d="M9 6h12M9 12h12M9 18h12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
