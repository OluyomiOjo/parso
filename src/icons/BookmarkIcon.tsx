import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

// Traced from assets/brand/icon.png: flat top, rounded corners, notched bottom that rises to the right.
const VIEW_W = 284;
const VIEW_H = 351;
const PATH =
  'M16 322 L16 44 Q16 16 44 16 L240 16 Q268 16 268 44 L268 256 Q268 276 248 271 L150 247 Q140 245 132 251 Z';

export function BookmarkIcon({ color, size, strokeWidth, filled = false }: IconProps) {
  // Path coordinates are in the brand file's pixel space; convert the stroke to match.
  const scale = size / VIEW_H;
  return (
    <Svg width={VIEW_W * scale} height={size} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <Path
        d={PATH}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth / scale}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
