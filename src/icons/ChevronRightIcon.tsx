import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

// The arrow at the end of a settings row that opens another page.
export function ChevronRightIcon({ color, size, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
