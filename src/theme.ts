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
  // Welcome screen, measured from design/1. Welcome and sign in@2x.png.
  welcomeTitle: { fontFamily: fonts.extrabold, fontSize: 42, lineHeight: 43, letterSpacing: -1.2 },
  welcomeBody: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24.5 },
  demoQuery: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  demoTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  demoMeta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  legal: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 16 },
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
  buttonGap: 10, // between stacked full-width buttons
  iconLabelGap: 8, // icon before a button label
} as const;

export const radius = {
  panel: 18,
  button: 14,
  pill: 18,
  thumb: 10,
  field: 12,
  highlight: 3,
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
  tabBarPaddingTop: 12,
  tabBarPaddingBottom: 0, // the home-indicator inset already gives the space the design shows
  tabBarPaddingX: 16,
  tabLabelGap: 2,
  buttonIcon: 18,
} as const;

// Welcome screen layout, measured from the design.
export const welcome = {
  logoTop: 16, // below the safe area
  logoHeight: 28,
  logoAspect: 1274 / 351, // parso_logo_new.png
  titleTop: 59, // iOS draws the tight-leaded headline high in its line box; measured on device
  bodyTop: 13,
  cardTop: 34,
  cardPadding: 12,
  fieldHeight: 44,
  fieldPaddingX: 14,
  fieldIcon: 18,
  fieldIconGap: 9,
  resultTop: 14,
  resultPadding: 14, // around the result row inside the card
  resultThumb: 52,
  resultGap: 12,
  legalTop: 20,
  bottom: 8, // below the legal line, above the home indicator
  highlightPadX: 2,
} as const;

export const theme = { colors, fonts, type, tabularNums, spacing, radius, size, welcome } as const;
export default theme;
