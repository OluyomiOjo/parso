import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

// A ticked circle beside a line: the editor's checklist button.
export function ChecklistIcon({ color, size, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M5 7.6l1.2 1.2L8.2 6.6M3 16.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M13 7.5h8M13 16.5h8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
