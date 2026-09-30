import { type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/design/tokens';
import { useSecurity } from './security-provider';
export function PrivacyBoundary({ children }: PropsWithChildren) {
  const { config } = useSecurity(), path = usePathname(), router = useRouter();
  const hidden = Boolean(config?.privacy && path !== '/security');
  return <View style={styles.fill}>
    <View style={[styles.fill, hidden && styles.hidden]} pointerEvents={hidden ? 'none' : 'auto'} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}>{children}</View>
    {hidden && <View style={styles.cover}>
      <Text accessibilityRole="header" style={styles.heading}>Privacy mode is on</Text>
      <Text>Balances and financial information are hidden. Your saved records and pending changes are kept.</Text>
      <AppButton label="Open privacy settings" onPress={() => router.replace('/security' as never)}/>
    </View>}
  </View>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, hidden: { opacity: 0 }, cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 24, gap: 16, justifyContent: 'center', backgroundColor: colors.background }, heading: { fontSize: 24, fontWeight: '700', color: colors.text } });
