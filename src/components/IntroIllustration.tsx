import type { ReactElement } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors, illustration as c, intro } from '@/theme';

export type IntroScene = 'save' | 'sort' | 'find';

// The intro drawings, redrawn from design/0.1 to 0.3 Intro@2x.png. Coordinates are the design's 2x pixels,
// measured from the top-left of the grey circle (508 x 508).
const VIEW = 508;
const line = { stroke: c.line, strokeWidth: c.stroke, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const bar = (x: number, y: number, w: number, h = 12, fill: string = c.bar) => (
  <Rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} />
);

function SaveScene() {
  return (
    <G>
      {/* Phone with a post, three buttons and Parso's highlighted */}
      <Rect x={114} y={70} width={220} height={385} rx={36} fill={colors.surface} />
      <Path d="M114 333 H334 V419 a36 36 0 0 1 -36 36 H150 a36 36 0 0 1 -36 -36 Z" fill={colors.background} />
      <Path d="M114 333 H334" {...line} />
      <Rect x={114} y={70} width={220} height={385} rx={36} fill="none" {...line} />
      <Rect x={141} y={110} width={166} height={137} rx={8} fill={c.photo} {...line} />
      <Circle cx={224} cy={178} r={42} fill={colors.surface} {...line} />
      <Circle cx={224} cy={178} r={18} fill={c.photoDot} />
      {bar(142, 268, 129)}
      {bar(142, 293, 91)}
      <Circle cx={167} cy={391} r={20} fill={colors.surface} {...line} />
      <Circle cx={223} cy={391} r={20} fill={colors.surface} {...line} />
      <Circle cx={280} cy={391} r={20} fill={colors.highlighter} {...line} />
      <Path d="M272 380 H288 V401 L280 396 L272 401 Z" fill={c.line} />
      {/* Dashed arrow up to the yellow bookmark */}
      <Path d="M339 250 C 375 240, 400 215, 409 172" fill="none" {...line} strokeDasharray="10 12" />
      <Path d="M397 182 L409 164 L421 182" fill="none" {...line} />
      <Path
        d="M374 44 Q374 35 383 35 H445 Q454 35 454 44 V132 L414 114 L374 146 Z"
        fill={colors.highlighter}
        {...line}
      />
      <Path d="M464 25 L476 10 M472 50 L490 42 M478 80 L498 80" fill="none" {...line} />
    </G>
  );
}

function SortScene() {
  const folder = (x: number) =>
    `M${x} 330 V433 Q${x} 445 ${x + 12} 445 H${x + 164} Q${x + 176} 445 ${x + 176} 433 V345 Q${x + 176} 333 ${x + 164} 333 H${x + 78} L${x + 60} 309 Q${x + 57} 305 ${x + 52} 305 H${x + 12} Q${x} 305 ${x} 317 Z`;
  return (
    <G>
      <Path
        d="M254 30 L264 58 L292 68 L264 78 L254 106 L244 78 L216 68 L244 58 Z"
        fill={colors.highlighter}
        {...line}
      />
      <G rotation={-8} origin="160, 165">
        <Rect x={101} y={119} width={118} height={92} rx={8} fill={c.photo} {...line} />
        <Circle cx={160} cy={165} r={20} fill={colors.surface} {...line} />
      </G>
      <G rotation={8} origin="357, 148">
        <Rect x={298} y={102} width={118} height={92} rx={8} fill={colors.surface} {...line} />
        {bar(318, 124, 66, 12, c.line)}
        {bar(318, 146, 78)}
        {bar(318, 166, 58)}
      </G>
      <Path d="M164 228 V268" fill="none" {...line} strokeDasharray="8 10" />
      <Path d="M152 262 L164 276 L176 262" fill="none" {...line} />
      <Path d="M357 218 V268" fill="none" {...line} strokeDasharray="8 10" />
      <Path d="M345 262 L357 276 L369 262" fill="none" {...line} />
      <Path d={folder(76)} fill={colors.surface} {...line} />
      <Path d={folder(270)} fill={colors.surface} {...line} />
      <Rect x={104} y={365} width={94} height={24} rx={5} fill={colors.highlighter} />
      {bar(104, 403, 64, 10)}
      <Rect x={298} y={365} width={78} height={24} rx={5} fill={c.label} />
      {bar(298, 403, 64, 10)}
    </G>
  );
}

function FindScene() {
  return (
    <G>
      <Rect x={37} y={115} width={434} height={95} rx={47} fill={colors.surface} {...line} />
      <Circle cx={96} cy={158} r={18} fill="none" {...line} />
      <Path d="M109 171 L122 184" fill="none" {...line} />
      {bar(143, 156, 222, 14)}
      <Path d="M383 140 V176" fill="none" {...line} />
      <Rect x={81} y={258} width={346} height={177} rx={18} fill={colors.surface} {...line} />
      <Rect x={108} y={283} width={95} height={95} rx={8} fill={c.photo} {...line} />
      <Circle cx={155} cy={330} r={22} fill={colors.surface} {...line} />
      <Rect x={225} y={295} width={127} height={26} rx={5} fill={colors.highlighter} />
      {bar(225, 337, 167, 10)}
      {bar(225, 362, 111, 10)}
      {bar(108, 402, 77, 10)}
      <Circle cx={426} cy={258} r={30} fill={c.line} />
      <Path
        d="M412 258 L422 268 L441 248"
        fill="none"
        stroke={colors.surface}
        strokeWidth={c.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

const SCENES: Record<IntroScene, () => ReactElement> = { save: SaveScene, sort: SortScene, find: FindScene };

// Decorative: the screen's title and sentence say the same thing.
export function IntroIllustration({ scene }: { scene: IntroScene }) {
  const Scene = SCENES[scene];
  return (
    <Svg
      width={intro.circle}
      height={intro.circle}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx={VIEW / 2} cy={VIEW / 2} r={VIEW / 2} fill={c.circle} />
      <Scene />
    </Svg>
  );
}
