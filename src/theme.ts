// Parso design tokens (Clean). Every color, size and type style used in the app comes from here.
import type { TextStyle } from 'react-native';

export const colors = {
  background: '#F2F3F5',
  surface: '#FFFFFF',
  ink: '#000000',
  onInk: '#FFFFFF',
  secondary: '#5B5E66',
  divider: '#E1E3E7',
  controlBorder: '#CDD0D6',
  highlighter: '#FFCC2A',
} as const;

// Family names match each TTF's PostScript name, so the same name works on iOS and Android.
// Never combine these with fontWeight: Android ignores it for custom fonts.
export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extrabold: 'Inter-ExtraBold',
} as const;

export const type = {
  screenTitle: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -1.2 },
  sheetConfirm: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -1 },
  detailTitle: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -0.9 },
  introTitle: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -1 },
  sectionHeading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  secondary: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  meta: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.secondary },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  tabLabel: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
  tabLabelActive: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

// Apply to any text that shows numbers (counts, dates, times).
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  screen: 16, // side padding on most screens
  screenWide: 24, // side padding on intro and welcome
  sectionGap: 16,
  sectionGapLarge: 20,
  titleInset: 4, // titles and section headings sit 4 in from panel edges
  titleTop: 12, // space between safe area and screen title
} as const;

export const radius = {
  panel: 18,
  button: 14,
  pill: 18,
  thumb: 10,
} as const;

export const size = {
  buttonHeight: 52,
  pillHeight: 36,
  thumb: 56,
  bestMatchHeight: 176,
  minTouch: 44,
  hairline: 1,
  tabIcon: 24,
  tabIconStroke: 1.8,
  tabIconStrokeActive: 2.4,
  tabBarPaddingTop: 10,
  tabBarPaddingBottom: 6,
  tabLabelGap: 4,
} as const;

export const theme = { colors, fonts, type, tabularNums, spacing, radius, size } as const;
export default theme;
