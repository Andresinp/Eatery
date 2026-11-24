// Eatery design tokens, carried over from the web app (tailwind.config.js): warm cream paper, ink
// type, amber for the primary action and prices, leaf green for "available" and dietary tags.
// Bricolage Grotesque for display, Plus Jakarta Sans for everything else.

export const colors = {
  bg: '#FFFDF7',
  surface: '#FBF6E9',
  surfaceRaised: '#F3EAD0',
  card: '#FFFFFF',
  line: 'rgba(22, 20, 19, 0.10)',
  lineStrong: 'rgba(22, 20, 19, 0.22)',
  text: '#161413',
  textMuted: '#6B635A',
  textFaint: '#A39B90',
  amber: '#F5A524',
  amberDeep: '#E8930A',
  amberInk: '#3A2A05',
  amberSoft: '#FDEFD3',
  leaf: '#6FB95B',
  leafDeep: '#4E9A3A',
  leafInk: '#1F3A12',
  leafSoft: '#E5F3DF',
  // Market pins on the map (the web app's bordeaux dot with a kraft bag on a beige placemat).
  bordeaux: '#7D1D2E',
  placemat: '#EDD9B5',
  danger: '#C2410C',
  dangerSoft: '#FDE7DC',
  onPhoto: '#FFFFFF',
  photoShade: 'rgba(22, 20, 19, 0.55)',
  scrim: 'rgba(22, 20, 19, 0.4)',
} as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 8, md: 14, lg: 22, xl: 28, pill: 999 } as const;

export const shadow = {
  card: {
    shadowColor: '#140F08',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  float: {
    shadowColor: '#140F08',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export const type = {
  hero: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 38, color: colors.text, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.text, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  bodyMuted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: colors.textMuted },
  price: { fontFamily: fonts.displayHeavy, fontSize: 18, lineHeight: 22, color: colors.text },
} as const;
