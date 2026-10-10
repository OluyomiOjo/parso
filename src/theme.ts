// Parso design tokens (Clean). Every color, size and type style used in the app comes from here.
import type { TextStyle } from 'react-native';

export const colors = {
  background: '#FFFFFF', // screens: white, so pictures carry the page (owner decision, step 11)
  panel: '#F4F5F7', // lists, cards and settings on a white screen: a faint grey, no borders or shadows
  surface: '#FFFFFF', // sheets, chips and fields
  ink: '#000000',
  onInk: '#FFFFFF',
  secondary: '#5B5E66',
  divider: '#E1E3E7',
  controlBorder: '#CDD0D6',
  highlighter: '#FFCC2A',
  dashedBorder: '#B9BDC5', // "Or paste a link" outline, from design/3b
  scrim: 'rgba(0, 0, 0, 0.35)', // behind the Android menu sheet
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
  vimeo: '#1AB7EA',
  bluesky: '#0285FF',
  tumblr: '#36465D',
  soundcloud: '#FF5500',
  twitch: '#9146FF',
  snapchat: '#000000', // its yellow is unreadable on white
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
  introBody: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25 },
  skip: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  firstRunTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  firstRunStep: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  demoQuery: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  demoTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  demoMeta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  legal: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 16 },
  rowMeta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  detailLabel: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 20 },
  detailValue: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 20 },
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
  thumb: 72, // list rows (owner asked for bigger pictures in step 10; the design had 56)
  bestMatchHeight: 176,
  minTouch: 44,
  hairline: 1,
  tabIcon: 24,
  tabIconStroke: 1.8,
  tabIconStrokeActive: 2.4,
  tabBarPaddingX: 8, // inside the floating bar
  tabLabelGap: 2,
  buttonIcon: 18,
  iconButton: 40, // round header button, e.g. paste a link
  iconButtonIcon: 20,
  // The floating black + (Add to Parso), above the tab bar on every tab (owner asked in step 10).
  addButton: 56,
  addButtonIcon: 26,
  addButtonStroke: 2.4,
  addButtonGap: 16, // above the tab bar, and from the right edge
  addButtonClearance: 120, // extra space at the end of tab screens so the floating bar and + never cover the last row
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
  // Large preview card (owner-approved over the design's 48pt row): picture area, then title and source.
  previewHeight: 176, // same as search's best match
  previewBrandIcon: 40, // the source's icon, centred, while the picture is on its way
  previewCaptionTop: 10,
  previewTitleToSource: 4,
  previewPulseMin: 0.45, // the icon's gentle pulse while saving
  previewPulseMs: 900,
  previewFadeMs: 250, // the picture fading in
  // Compact row when no picture will come (notes, links without one): list-row size.
  previewThumb: 72,
  previewGap: 12,
  previewToSavedTo: 16,
  savedToIcon: 26,
  savedToGap: 12, // icon to "Saved to"
  savedToToPills: 12,
  leftTop: 6, // "5 free saves left" under Saved to
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

// Collections tab cards, board style (owner decision, step 11): one large picture with two small ones stacked
// beside it, the name and count underneath, no box around the card.
export const card = {
  boardRatio: 0.68, // the picture block's height, as a share of the card's width
  boardGap: 2, // between the three pictures
  boardRadius: 16,
  placeholderIcon: 22,
  boardToName: 8,
  gap: 12, // between cards, both ways
} as const;

// Collection screen, measured from design/5. Collection@2x.png.
export const collectionScreen = {
  headerButtonGap: 10, // grid/list and rename
  headerToTitle: 16,
  titleToCount: 4, // "13 saves", its own small grey line
  countToFilter: 20,
  filterToList: 20,
} as const;

// Search screen, measured from design/4. Search@2x.png.
export const search = {
  fieldHeight: 48,
  fieldRadius: 16,
  fieldBorder: 2, // focused field on the Search tab
  fieldPaddingX: 14,
  iconGap: 10,
  icon: 20,
  clearIcon: 16,
  fieldToPills: 16,
  pillsToCount: 16,
  countToResults: 12,
  bestMatchPadding: 16,
  bestMatchTextGap: 2,
  bestMatchToList: 16,
  debounceMs: 300,
} as const;

// Save detail screen, measured from design/6. Saved item@2x.png.
export const detail = {
  imageHeight: 340,
  headerTop: 8, // below the safe area, for the round back button
  imageToMeta: 20,
  metaToTitle: 6,
  titleToSummary: 10,
  summaryToPanel: 16,
  rowHeight: 51,
  rowGap: 16, // label to value
  buttonAreaTop: 12, // above the fixed buttons (Open, Share, Download)
  actionGap: 10, // between those buttons
  shareWidth: 116, // Share beside Open in …
  bottom: 8, // below it, above the home indicator
  tagGap: 8,
  tagRemoveIcon: 14,
  noteHeight: 140,
} as const;

// Full-screen photo (Open on a photo's detail page).
export const photoViewer = {
  maxZoom: 4,
} as const;

// Grid view on Parsos and Collections (owner asked in step 10, after Pinterest): two columns, each
// picture at its own shape within these limits.
export const grid = {
  columnGap: 10,
  rowGap: 16,
  captionTop: 8, // picture to title
  sourceTop: 4, // title to source line
  maxRatio: 1.25, // tallest picture: 4:5
  minRatio: 0.6, // widest picture
  fallbackRatio: 1, // square until the picture's size is known
  textTilePadding: 12,
  textTileGap: 6,
  textTitleLines: 4,
  textSnippetLines: 3,
  textTileEstimate: 120, // for balancing the columns only
  captionEstimate: 64,
} as const;

// List/grid switch beside "Recent": the segmented control's look, smaller, with icons.
export const viewSwitch = {
  height: 32,
  inset: 3,
  radius: 9,
  chipRadius: 7,
  segmentWidth: 36,
  icon: 18,
  hitSlop: 6, // to the 44pt touch target
} as const;

// Segmented control: equal segments, the chosen one on a white chip (design 2 "Remind me", design 5 filter).
export const segmented = {
  height: 44,
  radius: 12,
  inset: 4, // track padding around the chips
  chipRadius: 9,
  icon: 18,
  iconGap: 6,
} as const;

// Reminder card on Parsos, measured from design/3. Home@2x.png.
// Cards on Parsos (Your week in Parso).
export const homeCard = {
  padding: 12,
  gap: 12,
  buttonHeight: 36,
  buttonPaddingX: 16,
} as const;

// The bell at the top right of Parsos (owner request after build 16): opens Reminders; a yellow badge counts
// reminders that went off since that page was last opened.
export const bell = {
  icon: 24,
  badge: 18,
  badgePaddingX: 5,
  badgeTop: 4,
  badgeRight: 2,
  count: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 },
} as const;

// Intro screens, measured from design/0.1 to 0.3 Intro@2x.png. The illustration colours are the designs' own
// and are used only inside the drawings.
export const intro = {
  circle: 254,
  skipTop: 20, // below the safe area
  circleToTitle: 56,
  titleToBody: 10,
  bodyMaxWidth: 290,
  dotsToButton: 28,
  dot: 6,
  dotActiveWidth: 22,
  dotGap: 6,
  bottom: 8,
} as const;

export const illustration = {
  circle: '#E3E5E9',
  line: '#1C1C1E',
  photo: '#F1D6C0',
  photoDot: '#E3A878',
  bar: '#C5C9D1',
  label: '#CFDDF3',
  stroke: 6, // in the drawings' own units (2x points)
} as const;

// First-run card on Parsos, measured from design/3b. Home, first run@2x.png.
export const firstRun = {
  padding: 20,
  titleToBody: 12,
  bodyToSteps: 16,
  stepGap: 12,
  stepIcon: 22,
  stepIconGap: 14,
  stepsToButton: 20,
  cardToPaste: 20,
} as const;

// Add to Parso sheet.
export const addScreen = {
  pasteGap: 8, // the link field to Apple's Paste button beside it
} as const;

// Reminder time sheet (Remind me, then Pick): shortcuts, Apple's calendar and time wheel, Set reminder.
export const reminderPicker = {
  paddingX: 20,
  paddingTop: 24,
  gap: 16,
  pillGap: 8,
  buttonTop: 4,
} as const;

// The copied-link mini sheet (/copied-link): a native iOS sheet sized to its content.
export const copiedLinkSheet = {
  paddingX: 24,
  paddingTop: 28,
  iconTile: 44, // the link icon on a grey tile, like the reminder card's bell
  icon: 22,
  iconGap: 14, // icon tile to the title
  titleToButton: 20,
  buttonToNotNow: 6,
} as const;

// New-screenshots card on Parsos.
export const screenshotsCard = {
  padding: 16,
  thumb: 44,
  thumbGap: 6,
  textToActions: 12,
  actionGap: 10,
  // The slim "new screenshots" row (owner request after build 16).
  rowPaddingY: 10,
  rowPaddingRight: 4, // the close button's own touch area makes up the rest
  rowGap: 12,
  closeIcon: 18,
  saveMinWidth: 72,
  savePaddingX: 16,
  moreInset: 3,
  morePaddingX: 4,
  moreRadius: 6,
} as const;

// The note editor (/note/[id]), like Apple Notes: a white page, the first line as the title, tick boxes and
// bullets beside the text, and a toolbar above the keyboard.
export const note = {
  paddingX: 20,
  headerTop: 8, // below the safe area
  headerGap: 8, // between the header's round buttons
  metaTop: 12, // header to "Edited …"
  titleTop: 8, // "Edited …" to the first line
  lineGap: 2, // between lines
  check: 22, // tick box
  checkBorder: 1.5,
  checkTick: 14,
  checkTickStroke: 3,
  checkGap: 10, // tick box or bullet to the text
  bullet: 6,
  markerSlot: 22, // width the tick box or bullet sits in, so text lines up
  toolbarHeight: 44,
  toolbarIcon: 22,
  toolbarGap: 28,
  reminderGap: 6, // bell to the reminder time
  bottomSpace: 120, // empty page under the last line; tapping it puts the cursor at the end
} as const;

// Collections as circles on Parsos (owner request, step 10): one picture in a thin grey ring, the name under it.
export const circle = {
  size: 68,
  ring: 2, // grey ring, then a white gap, then the picture
  ringGap: 3,
  icon: 24, // shown when the collection has no picture
  nameTop: 6,
  gap: 14, // between circles
  nameWidth: 76, // names wider than this end in "…"
} as const;

// Rearranging collections: press and hold, then drag (src/components/ReorderList.tsx).
export const reorder = {
  holdMs: 300,
  slideMs: 180,
  liftScale: 1.06,
  liftOpacity: 0.92,
  spring: { damping: 20, stiffness: 220 },
  rowHeight: 64, // the Collections tab's Reorder list
  rowThumb: 44,
  handle: 20,
} as const;

// Parso Pro sheet (/upgrade): benefits, the two plans, Subscribe, Restore purchases and Apple's required wording.
export const upgrade = {
  paddingX: 20,
  paddingTop: 24,
  gap: 16,
  benefitGap: 10,
  checkIcon: 20,
  checkGap: 10,
  optionGap: 10,
  optionHeight: 64,
  optionPaddingX: 16,
  selectedBorder: 2,
  linkGap: 20,
  bottom: 8,
} as const;

// Your week in Parso: the weekly screen, its card on Parsos, and Done on the save page.
export const week = {
  actionsTop: 12, // the question to Done, Remind me and Open
  actionGap: 8,
  doneGap: 12, // "Done on Oct 12" to Undo
  doneTop: 12, // the summary to the question and Mark as done on the save page
  doneIcon: 13, // the tick in meta lines
} as const;

// The floating tab bar (owner decision, step 11): frosted glass, rounded, hovering above the bottom edge, with the
// black + beside it. Its soft shadow is the one shadow exception in the design system.
export const dock = {
  height: 64,
  radius: 32,
  sideGap: 16, // from the screen edges
  addGap: 10, // the bar to the +
  bottomMin: 12, // above the bottom edge on phones without a home indicator
  homeIndicatorOverlap: 4, // sits slightly into the home-indicator area, like the system's own bars
  blur: 60,
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowY: 6,
  elevation: 8, // Android's shadow
} as const;

// Press feedback: things shrink a touch under the finger and spring back.
export const press = {
  scale: 0.97,
  damping: 18,
  stiffness: 320,
} as const;

// The You tab: a profile card, then one settings panel (owner decision, step 11).
export const settings = {
  rowHeight: 60,
  chevron: 18,
  avatar: 52,
  profilePadding: 16,
  profileGap: 14,
} as const;

// The Parso logo at the top of Parsos (home), in solid black like Pinterest's header (owner request after build 14).
export const homeLogo = {
  height: 28,
  top: 10, // below the safe area, where the screen title sat
  bottom: 4,
} as const;

// The Add sheet, opened by the + (owner request after build 14, after Pinterest's): three large tiles in a row.
export const addMenu = {
  cornerRadius: 28,
  paddingX: 20,
  headerTop: 16,
  headerHeight: 44,
  close: 26,
  closeStroke: 2,
  titleToTiles: 28,
  tile: 84,
  tileRadius: 24,
  icon: 28,
  tileGap: 20, // between tiles
  labelTop: 10,
  bottom: 28,
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
  search,
  detail,
  segmented,
  homeCard,
  bell,
  intro,
  illustration,
  firstRun,
  addScreen,
  copiedLinkSheet,
  screenshotsCard,
  note,
  circle,
  reorder,
  upgrade,
  week,
  dock,
  press,
  settings,
  homeLogo,
  addMenu,
} as const;
export default theme;
