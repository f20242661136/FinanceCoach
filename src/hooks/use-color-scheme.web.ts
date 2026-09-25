// Web intentionally uses a deterministic initial theme.
//
// React Native color-scheme hydration can differ between
// server rendering and the first client render.
//
// The production mobile application will use the native
// color-scheme implementation. Our full theme system will
// be introduced with the design-system phase.

export function useColorScheme() {
  return 'light' as const;
}