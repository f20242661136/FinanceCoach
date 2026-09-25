export const colors = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF3EF',
  primary: '#123D30',
  primaryPressed: '#0D3026',
  accent: '#D9EFE4',
  accentStrong: '#A9D7C0',
  text: '#102019',
  textSecondary: '#617068',
  textTertiary: '#829087',
  border: '#DCE5E0',
  borderStrong: '#C5D2CB',
  focus: '#2A775B',
  danger: '#B42318',
  dangerSurface: '#FDECEA',
  success: '#237A57',
  successSurface: '#E7F5ED',
  info: '#285F91',
  infoSurface: '#EAF2FB',
  white: '#FFFFFF',
  overlay: 'rgba(16, 32, 25, 0.08)',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  title: 34,
  heading: 24,
  subheading: 18,
  body: 16,
  small: 14,
  caption: 12,
} as const;

export const layout = {
  contentMaxWidth: 520,
  touchTarget: 48,
} as const;