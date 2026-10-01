import { Text } from 'react-native';

import { colors } from '@/theme';

// Hair spaces give the marker a little room on each side; nested Text can't take padding.
const EDGE = ' ';

// Brand-yellow marker behind matched words. Nest inside a <Text> so it wraps with the line.
export function Highlight({ children }: { children: string }) {
  return <Text style={{ backgroundColor: colors.highlighter, color: colors.ink }}>{`${EDGE}${children}${EDGE}`}</Text>;
}
