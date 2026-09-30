import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { AppScreen } from '@/components/ui/app-screen';
import { GettingStartedCard } from './getting-started-card';
import { setupStyles as styles } from './setup-ui';
import { setupStep } from './setup-progress';
import { useSetupProgress } from './use-setup-progress';

export function GettingStartedScreen() {
  const router = useRouter();
  const progress = useSetupProgress();
  return <AppScreen>
    <View style={styles.stack}><Text accessibilityRole="header" style={styles.title}>A little setup, a clearer picture</Text>
      <Text style={styles.body}>Build your starting point one step at a time. You can return to Home whenever you’re ready.</Text></View>
    <GettingStartedCard showComplete />
    {(!progress.data || progress.isError || setupStep(progress.data) !== 'complete') &&
      <AppButton label="Go to Home" variant="ghost" onPress={() => router.dismissTo('/home' as never)} />}
  </AppScreen>;
}
