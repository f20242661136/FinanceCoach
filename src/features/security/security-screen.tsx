import { useRef, useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { AppScreen } from '@/components/ui/app-screen';
import { AppButton } from '@/components/ui/app-button';
import { configureBiometric, disableLock, setPIN, updateLock } from './lock-service';
import { securityStyles, useSecurity } from './security-provider';

export function SecurityScreen() {
  const { user, config, reload, lock } = useSecurity(); const router = useRouter();
  const [pin, setPin] = useState(''), [newPIN, setNewPIN] = useState(''), [confirm, setConfirm] = useState('');
  const [recovery, setRecovery] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  async function run(task: () => Promise<void>) {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setError('');
    try { await task(); await reload(); setPin(''); setNewPIN(''); setConfirm(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Security settings could not save.'); setPin(''); }
    finally { busyRef.current = false; setBusy(false); }
  }
  if (!config) return null;
  return <AppScreen><Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700' }}>App lock & privacy</Text>
    <AppButton label="Back to Settings" variant="ghost" disabled={busy || !!recovery} onPress={() => router.replace('/settings' as never)}/>
    <Text>Settings apply to this account on this device. A cold start always requires unlock when app lock is enabled. Background screens and app-switcher previews are protected.</Text>
    {!!error && <Text accessibilityRole="alert">{error}</Text>}
    {recovery ? <View style={{ gap: 12 }}><Text>Save this recovery code somewhere secure outside the app. It resets your PIN without deleting financial data. It is shown only now; changing your PIN replaces it.</Text><Text selectable style={securityStyles.code}>{recovery}</Text><AppButton label="I saved my recovery code" onPress={() => setRecovery('')}/></View> : <>
      <Text>App lock: {config.enabled ? 'Enabled' : 'Disabled'}</Text>
      {config.enabled && <TextInput accessibilityLabel="Current PIN" placeholder="Current PIN" value={pin} onChangeText={setPin} maxLength={6} keyboardType="number-pad" secureTextEntry style={securityStyles.input} editable={!busy}/>}
      <TextInput accessibilityLabel="New six-digit PIN" placeholder="New six-digit PIN" value={newPIN} onChangeText={setNewPIN} maxLength={6} keyboardType="number-pad" secureTextEntry style={securityStyles.input} editable={!busy}/>
      <TextInput accessibilityLabel="Confirm PIN" placeholder="Confirm PIN" value={confirm} onChangeText={setConfirm} maxLength={6} keyboardType="number-pad" secureTextEntry style={securityStyles.input} editable={!busy}/>
      <AppButton label={config.enabled ? 'Change PIN & recovery code' : 'Enable app lock'} loading={busy} onPress={() => { void run(async () => { if (newPIN !== confirm) throw Error('PIN confirmation does not match.'); const result = await setPIN(user, newPIN, pin); setRecovery(result.recovery); }); }}/>
      {config.enabled && <><AppButton label="Disable app lock with current PIN" disabled={busy} variant="ghost" onPress={() => { void run(async () => { await disableLock(user, pin); }); }}/>
        <AppButton label={config.biometric ? 'Disable biometric unlock' : 'Enable biometric unlock with current PIN'} disabled={busy} variant="secondary" onPress={() => { void run(async () => {
          if (!config.biometric) {
            if (!await LocalAuthentication.hasHardwareAsync() || !await LocalAuthentication.isEnrolledAsync()) throw Error('Biometrics are unavailable or not enrolled. Your PIN remains available.');
            const response = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable biometric unlock', disableDeviceFallback: true, fallbackLabel: '', biometricsSecurityLevel: 'strong' });
            if (!response.success) throw Error('Biometric confirmation cancelled or failed.');
          }
          await configureBiometric(user, pin, !config.biometric);
        }); }}/>
        <Text>Auto-lock after background or inactivity: {config.timeout === 0 ? 'Immediately on background' : `${config.timeout} seconds`}</Text>
        {([0, 30, 60, 300] as const).map(timeout => <AppButton key={timeout} label={timeout ? `${timeout} seconds` : 'Immediately on background'} disabled={busy || timeout === config.timeout} variant="ghost" onPress={() => { void run(async () => { await updateLock(user, { timeout }); }); }}/>) }
        <AppButton label="Lock now" disabled={busy} onPress={lock}/>
      </>}
    </>}
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text>Privacy mode</Text><Switch accessibilityLabel="Privacy mode" value={config.privacy} disabled={busy || !!recovery} onValueChange={privacy => { void run(async () => { await updateLock(user, { privacy }); }); }}/></View>
    <Text>Privacy mode hides the entire financial workspace, including balances, merchants, notes, charts, notifications, and exports. Open these security settings to reveal it again. Data and queued changes remain saved. Screenshots are blocked while signed in. Push previews always use generic text; details are available inside the app after unlock.</Text>
    <Text>PINs are never stored as plain text. Failed credential attempts are saved before verification and trigger increasing delays. A recovery code is the only offline PIN reset path. Losing both credentials requires a separately verified account recovery process; clearing app data can lose unsynced records.</Text>
  </AppScreen>;
}
