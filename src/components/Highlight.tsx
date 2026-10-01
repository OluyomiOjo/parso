import { Text } from 'react-native';

import { colors } from '@/theme';

// Brand-yellow marker behind matched words. Nest inside a <Text> so it wraps with the line.
export function Highlight({ children }: { children: string }) {
  return <Text style={{ backgroundColor: colors.highlighter, color: colors.ink }}>{children}</Text>;
}
