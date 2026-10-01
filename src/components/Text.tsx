import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, type, type TypeVariant } from '@/theme';

type TextProps = RNTextProps & {
  variant?: TypeVariant;
  color?: string;
};

export function Text({ variant = 'body', color = colors.ink, style, ...rest }: TextProps) {
  return <RNText {...rest} style={[{ color }, type[variant], style]} />;
}
