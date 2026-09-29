import { Platform } from 'react-native';

export const colors = {
  background: '#F6F8F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#EEF3F0',
  surfaceStrong: '#E7EEEA',

  primary: '#123D30',
  primaryPressed: '#0D3026',
  primarySoft: '#DDEDE5',

  accent: '#DDEDE5',
  accentStrong: '#A9D7C0',

  text: '#102019',
  textSecondary: '#647069',
  textTertiary: '#89928D',
  textOnPrimary: '#FFFFFF',

  border: '#E2E8E4',
  borderStrong: '#CBD6D0',
  focus: '#2A775B',

  danger: '#B23D35',
  dangerSurface: '#FBEDEC',

  success: '#237A57',
  successSurface: '#E7F5ED',

  warning: '#936515',
  warningSurface: '#FFF5DD',

  info: '#315F86',
  infoSurface: '#ECF3F9',

  neutral: '#56635D',
  neutralSurface: '#F0F3F1',

  white: '#FFFFFF',
  overlay: 'rgba(16, 32, 25, 0.08)',
  overlayStrong: 'rgba(16, 32, 25, 0.18)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: 36,
  title: 28,
  heading: 24,
  subheading: 18,
  body: 16,
  small: 14,
  caption: 12,

  lineHeightDisplay: 42,
  lineHeightTitle: 34,
  lineHeightHeading: 32,
  lineHeightSubheading: 24,
  lineHeightBody: 24,
  lineHeightSmall: 20,
  lineHeightCaption: 16,

  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
  weightExtraBold: '800',
} as const;

export const layout = {
  contentMaxWidth: 680,
  contentWideMaxWidth: 1180,
  touchTarget: 48,
  screenHorizontalPadding: 20,
  screenVerticalPadding: spacing.lg,
  cardPadding: 20,
  tabBarHeight: 72,
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
        height: 4,
      },
      shadowOpacity: 0.06,
      shadowRadius: 16,
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
        height: 8,
      },
      shadowOpacity: 0.1,
      shadowRadius: 24,
    },
  }) ?? {},
} as const;
