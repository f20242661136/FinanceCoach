import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { setupStep } from './setup-progress';
import { SetupSteps, setupStyles as styles } from './setup-ui';
import { useSetupProgress } from './use-setup-progress';

export function GettingStartedCard({ showComplete = false }: { showComplete?: boolean }) {
  const router = useRouter();
  const progress = useSetupProgress();
  if (progress.isPending) return showComplete ? <Text style={styles.body}>Loading your setup progress…</Text> : null;
  if (progress.isError || !progress.data) return <View style={styles.card}>
    <Text style={styles.heading}>Setup progress unavailable</Text>
    <Text style={styles.body}>Try again to check your saved accounts and transactions.</Text>
    <AppButton label="Retry setup check" variant="secondary" onPress={() => { void progress.refetch(); }} />
  </View>;
  const facts = progress.data;
  const step = setupStep(facts);
  if (step === 'complete' && !showComplete) return null;
  return <View style={styles.card}>
    <Text style={styles.eyebrow}>{step === 'complete' ? 'READY TO GO' : step === 'account' ? 'STEP 2 OF 3' : 'STEP 3 OF 3'}</Text>
    <SetupSteps facts={facts} />
    <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.heading}>
      {step === 'account' ? facts.hasTransaction ? 'Add an active account' : 'Start with one account'
        : step === 'transaction' ? 'Add your first transaction' : 'Your money journey has started'}
    </Text>
    <Text style={styles.body}>{step === 'account'
      ? 'Choose a wallet, bank account, or card you use. Enter its current balance, or start from zero.'
      : step === 'transaction' ? 'Record a real expense or income. Choose an amount, account, and category; today’s date is already filled in.'
        : 'Your account and first transaction are saved. Home brings your balances and recent activity together.'}</Text>
    {step !== 'complete' && <AppButton label={step === 'account' ? 'Add account' : 'Add first transaction'} icon="add"
      onPress={() => router.push({ pathname: step === 'account' ? '/add-account' : '/quick-add', params: { setup: '1' } } as never)} />}
    {step === 'complete' && <AppButton label="View my Home" onPress={() => router.dismissTo('/home' as never)} />}
    <Text style={styles.caption}>Saved on this device first. Changes sync when connected.</Text>
  </View>;
}
