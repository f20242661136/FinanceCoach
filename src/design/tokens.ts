import { Platform } from 'react-native';

export const colors = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#EDF3EF',
  surfaceStrong: '#E4ECE7',

  primary: '#123D30',
  primaryPressed: '#0D3026',
  primarySoft: '#E3F1EA',

  accent: '#D9EFE4',
  accentStrong: '#A9D7C0',

  text: '#102019',
  textSecondary: '#617068',
  textTertiary: '#829087',
  textOnPrimary: '#FFFFFF',

  border: '#DCE5E0',
  borderStrong: '#C5D2CB',
  focus: '#2A775B',

  danger: '#B42318',
  dangerSurface: '#FDECEA',

  success: '#237A57',
  successSurface: '#E7F5ED',

  warning: '#8A5A00',
  warningSurface: '#FFF4D6',

  info: '#285F91',
  infoSurface: '#EAF2FB',

  neutral: '#526159',
  neutralSurface: '#EEF2F0',

  white: '#FFFFFF',
  overlay: 'rgba(16, 32, 25, 0.08)',
  overlayStrong: 'rgba(16, 32, 25, 0.18)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  xs: 8,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  display: 40,
  title: 34,
  heading: 24,
  subheading: 18,
  body: 16,
  small: 14,
  caption: 12,

  lineHeightDisplay: 46,
  lineHeightTitle: 40,
  lineHeightHeading: 32,
  lineHeightSubheading: 24,
  lineHeightBody: 24,
  lineHeightSmall: 20,
  lineHeightCaption: 18,

  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
  weightExtraBold: '800',
} as const;

export const layout = {
  contentMaxWidth: 520,
  touchTarget: 48,
  screenHorizontalPadding: spacing.md,
  screenVerticalPadding: spacing.lg,
  cardPadding: spacing.md,
  tabBarHeight: 68,
} as const;

export const elevation = {
  card: Platform.select({
    android: {
      elevation: 1,
    },
    default: {
      shadowColor: '#102019',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
  }) ?? {},

  floating: Platform.select({
    android: {
      elevation: 4,
    },
    default: {
      shadowColor: '#102019',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 14,
    },
  }) ?? {},
} as const;
