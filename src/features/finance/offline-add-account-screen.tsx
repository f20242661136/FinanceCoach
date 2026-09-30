import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppButton } from '@/components/ui/app-button';
import { AppScreen } from '@/components/ui/app-screen';
import { ChoiceChip } from '@/components/ui/choice-chip';
import { InlineNotice } from '@/components/ui/inline-notice';
import { colors } from '@/design/tokens';
import { useAuth } from '@/features/auth/auth-context';
import { preferredCurrency } from '@/features/getting-started/setup-progress';
import { SetupSteps, setupStyles as styles } from '@/features/getting-started/setup-ui';
import { useSetupProgress } from '@/features/getting-started/use-setup-progress';
import { toUserFacingError } from '@/lib/user-facing-error';
import { useCreateOfflineAccount } from '@/offline/sync/use-create-offline-account';
import { useLocalFinanceReferenceData } from '@/offline/sync/use-local-finance-reference-data';
import { refreshFinanceReferenceData } from '@/offline/sync/reference-data';

function labelFromCode(code: string) {
  return code.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

export function OfflineAddAccountScreen() {
  const router = useRouter();
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const { profile } = useAuth();
  const progress = useSetupProgress();
  const reference = useLocalFinanceReferenceData();
  const create = useCreateOfflineAccount();
  const saving = useRef(false);
  const fetchingOptions = useRef(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [name, setName] = useState('');
  const [typeChoice, setTypeChoice] = useState<string | null>(null);
  const [currencyChoice, setCurrencyChoice] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const types = reference.data?.accountTypes ?? [];
  const currencies = reference.data?.currencies ?? [];
  const typeCode = typeChoice ?? types[0]?.code ?? '';
  const currencyCode = currencyChoice ?? preferredCurrency(currencies, profile?.base_currency_code);
  const chosenType = types.find(type => type.code === typeCode);
  const busy = create.isPending || loadingOptions;
  const ready = Boolean(chosenType && currencies.some(currency => currency.code === currencyCode));
  const canSave = ready && Boolean(name.trim()) && !busy;

  function navigateBack() {
    if (router.canGoBack()) router.back(); else router.replace('/home' as never);
  }
  function close() {
    if (!saving.current) navigateBack();
  }
  async function save() {
    if (saving.current || !canSave) return;
    saving.current = true;
    setError(null);
    try {
      await create.mutateAsync({ name, accountTypeCode: typeCode, currencyCode, openingBalance });
      if (setup === '1') router.dismissTo('/getting-started' as never); else navigateBack();
    } catch (cause) { setError(toUserFacingError(cause, 'account')); }
    finally { saving.current = false; }
  }

  async function retryOptions() {
    if (fetchingOptions.current || saving.current) return;
    fetchingOptions.current = true;
    setLoadingOptions(true);
    setError(null);
    try {
      await refreshFinanceReferenceData();
      await reference.refetch({ throwOnError: true });
    } catch (cause) { setError(toUserFacingError(cause, 'account')); }
    finally { fetchingOptions.current = false; setLoadingOptions(false); }
  }

  return <AppScreen keyboardAware footer={<View style={styles.stack}>
    <AppButton label={setup === '1' ? 'Save and continue' : 'Save account'} loading={busy} disabled={!canSave} onPress={() => { void save(); }} />
    <Text style={styles.caption}>Saved on this device first · syncs when connected</Text>
  </View>}>
    <Pressable accessibilityRole="button" accessibilityLabel="Close account form" disabled={busy} onPress={close} style={styles.textAction}>
      <Text style={styles.link}>Close</Text>
    </Pressable>
    <View style={styles.stack}>
      {setup === '1' && <><Text style={styles.eyebrow}>STEP 2 OF 3</Text><SetupSteps facts={progress.data} /></>}
      <Text accessibilityRole="header" style={styles.title}>{setup === '1' ? 'Start with one account' : 'Add an account'}</Text>
      <Text style={styles.body}>A wallet, bank account, or card gives your money a place to live.</Text>
    </View>
    {reference.isPending && <Text accessibilityLiveRegion="polite" style={styles.body}>Loading account options…</Text>}
    {(reference.isError || (!reference.isPending && !ready)) && <View style={styles.stack}>
      <InlineNotice tone="info" message="Account options are unavailable. Connect once to load supported account types and currencies." />
      <AppButton label="Retry options" variant="secondary" loading={loadingOptions} disabled={create.isPending}
        onPress={() => { void retryOptions(); }} />
    </View>}
    <View style={styles.card}>
      <Text style={styles.heading}>Account name</Text>
      <TextInput accessibilityLabel="Account name, required" editable={!busy} value={name} onChangeText={setName}
        autoCapitalize="words" placeholder="e.g. Everyday wallet" placeholderTextColor={colors.textTertiary} style={styles.input} />
      <Text style={styles.heading}>Account type</Text>
      <View style={styles.chips}>{types.map(type => <ChoiceChip key={type.code} role="radio" label={labelFromCode(type.code)}
        selected={type.code === typeCode} disabled={busy} onPress={() => setTypeChoice(type.code)} />)}</View>
      <Text style={styles.heading}>Currency</Text>
      <Text style={styles.body}>Your everyday currency is preselected when available. Each currency is tracked separately.</Text>
      <View style={styles.chips}>{currencies.map(currency => <ChoiceChip key={currency.code} role="radio" label={currency.code}
        selected={currency.code === currencyCode} disabled={busy} onPress={() => setCurrencyChoice(currency.code)} />)}</View>
      <Text style={styles.heading}>{chosenType?.balanceClass === 'liability' ? 'Amount currently owed' : 'Current balance'}</Text>
      <Text style={styles.body}>{chosenType?.balanceClass === 'liability'
        ? 'Enter a positive amount you owe. Finance Coach records it as a liability. Use zero to start fresh.'
        : 'Enter the money here now, or leave zero to start tracking from today.'}</Text>
      <Text style={styles.caption}>{currencyCode || 'Choose a currency'} · Opening balance</Text>
      <TextInput accessibilityLabel="Opening balance" editable={!busy} value={openingBalance} onChangeText={setOpeningBalance}
        keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textTertiary} style={styles.input} />
      {setup === '1' && <Text style={styles.caption}>Next, record a real expense or income. An opening balance sets your starting point.</Text>}
    </View>
    {error && <InlineNotice tone="error" message={error} />}
  </AppScreen>;
}
