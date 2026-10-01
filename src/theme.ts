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
  dashedBorder: '#B9BDC5', // "Or paste a link" outline, from design/3b
} as const;

// Source icons only, in each platform's own solid colour (owner-approved exception to the one-accent rule).
export const brandColors = {
  instagram: '#E4405F',
  tiktok: '#000000',
  x: '#000000',
  threads: '#000000',
  youtube: '#FF0000',
  facebook: '#0866FF',
  pinterest: '#BD081C',
  linkedin: '#0A66C2',
  reddit: '#FF4500',
  spotify: '#1DB954',
  whatsapp: '#25D366',
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
  rowMeta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  sheetTitle: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.9 },
  sheetLabel: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 }, // "Note", "Remind me"
  pill: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
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
  headingToPanel: 10, // section heading to the panel below it
  rowPaddingX: 14,
  rowPaddingY: 12.5,
  rowGap: 12, // thumbnail to text
  sheetTop: 24,
  fieldPaddingX: 16,
  errorTop: 8,
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
  iconButton: 40, // round header button, e.g. paste a link
  iconButtonIcon: 20,
  thumbIcon: 22, // placeholder icon inside an empty thumbnail
  iconStroke: 1.8,
  fieldHeight: 52,
  sourceIcon: 14, // brand mark before the source in meta lines
  sourceIconGap: 5,
} as const;

// Save sheet layout, measured from design/2. Save from any app@2x.png.
export const sheet = {
  paddingX: 20,
  paddingTop: 20,
  previewThumb: 48,
  previewGap: 12,
  previewToSavedTo: 16,
  savedToIcon: 26,
  savedToGap: 12, // icon to "Saved to"
  savedToToPills: 12,
  pillsToTags: 12,
  tagsToNote: 20,
  labelToField: 8,
  noteHeight: 48,
  pillGap: 8,
  pillPaddingX: 12,
  bottom: 8, // below Done, above the home indicator
  highlightPadX: 4,
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

// Collection cards (home row and Collections tab), measured from design/3. Home@2x.png.
export const card = {
  width: 150, // home row; the Collections tab fits two per line
  padding: 12,
  tile: 38,
  tileGap: 4,
  tileRadius: 8,
  tileIcon: 18,
  tilesToName: 12,
  gap: 10, // between cards
} as const;

// Collection screen, measured from design/5. Collection@2x.png.
export const collectionScreen = {
  headerToTitle: 16,
  titleToDescription: 6,
  descriptionToFilter: 20,
  filterHeight: 38,
  filterRadius: 10,
  filterToList: 20,
} as const;

export const theme = {
  colors,
  brandColors,
  fonts,
  type,
  tabularNums,
  spacing,
  radius,
  size,
  welcome,
  sheet,
  card,
  collectionScreen,
} as const;
export default theme;
