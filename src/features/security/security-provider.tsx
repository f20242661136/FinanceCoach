import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { useAuth } from '@/features/auth/auth-context';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/design/tokens';
import { loadLock, unlockPIN, recoverPIN, shouldAutoLock, type LockConfig } from './lock-service';

type SecurityValue = { user: string; config: LockConfig | null; reload: () => Promise<void>; lock: () => void };
const SecurityContext = createContext<SecurityValue | null>(null);
export function useSecurity() { const value = useContext(SecurityContext); if (!value) throw Error('Security provider missing'); return value; }
export function SecurityProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  return session ? <AccountSecurity key={session.user.id} user={session.user.id}>{children}</AccountSecurity> : <>{children}</>;
}
function AccountSecurity({ user, children }: PropsWithChildren<{ user: string }>) {
  const [config, setConfig] = useState<LockConfig | null>(null), [locked, setLocked] = useState(true);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [pin, setPin] = useState('');
  const [recovery, setRecovery] = useState(''), [newPIN, setNewPIN] = useState(''), [confirmPIN, setConfirmPIN] = useState(''), [recovering, setRecovering] = useState(false), [newRecovery, setNewRecovery] = useState('');
  const [active, setActive] = useState(AppState.currentState === 'active');
  const epoch = useRef(0), mounted = useRef(true), configRef = useRef(config), inactiveAt = useRef<number | null>(null), lastTouch = useRef(0), busyRef = useRef(false);
  useEffect(() => { configRef.current = config; }, [config]);
  const lock = useCallback(() => { epoch.current++; setLocked(true); setPin(''); setRecovery(''); setNewPIN(''); setConfirmPIN(''); setNewRecovery(''); }, []);
  async function reload() { const next = await loadLock(user); if (mounted.current) { configRef.current = next; setConfig(next); } }
  useEffect(() => {
    mounted.current = true; lastTouch.current = Date.now();
    void loadLock(user).then(async next => {
      if (Platform.OS !== 'web') {
        await ScreenCapture.preventScreenCaptureAsync('finance-security');
        if (Platform.OS === 'ios') await ScreenCapture.enableAppSwitcherProtectionAsync(1);
      }
      if (mounted.current) { configRef.current = next; setConfig(next); setLocked(next.enabled); }
    }).catch(() => { if (mounted.current) setError('Secure storage or screen protection could not initialize. Financial screens remain hidden. Retry initialization.'); });
    const listener = AppState.addEventListener('change', state => {
      setActive(state === 'active');
      if (state === 'background') { epoch.current++; inactiveAt.current ??= Date.now(); setPin(''); setRecovery(''); setNewPIN(''); setConfirmPIN(''); setNewRecovery(''); }
      if (state === 'active') {
        if (inactiveAt.current !== null && configRef.current && shouldAutoLock(configRef.current, inactiveAt.current, Date.now())) lock();
        inactiveAt.current = null; lastTouch.current = Date.now();
      }
    });
    const blur = Platform.OS === 'android' ? AppState.addEventListener('blur', () => setActive(false)) : null;
    const focus = Platform.OS === 'android' ? AppState.addEventListener('focus', () => setActive(AppState.currentState === 'active')) : null;
    const timer = setInterval(() => {
      const current = configRef.current;
      if (current?.enabled && current.timeout > 0 && !busyRef.current && Date.now() - lastTouch.current >= current.timeout * 1000) lock();
    }, 1000);
    return () => { mounted.current = false; listener.remove(); blur?.remove(); focus?.remove(); clearInterval(timer); };
    // This component is keyed by the authenticated account; stale work cannot unlock a new account.
  }, [user, lock]);
  async function runUnlock(biometric = false) {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setError('');
    const token = epoch.current;
    try {
      let next: LockConfig;
      if (recovering) {
        if (newPIN !== confirmPIN) throw Error('New PIN confirmation does not match.');
        const result = await recoverPIN(user, recovery, newPIN); next = result.config;
        if (mounted.current && epoch.current === token) setNewRecovery(result.recovery);
      } else if (biometric) {
        next = await loadLock(user);
        if (!next.enabled || !next.biometric || !await LocalAuthentication.hasHardwareAsync() || !await LocalAuthentication.isEnrolledAsync()) throw Error('Biometric unlock is unavailable. Use your PIN.');
        const response = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Finance Coach', disableDeviceFallback: true, fallbackLabel: '', biometricsSecurityLevel: 'strong' });
        if (!response.success) throw Error('Biometric unlock was cancelled or unavailable. Use your PIN.');
      } else next = await unlockPIN(user, pin);
      if (!mounted.current || token !== epoch.current || AppState.currentState !== 'active') return;
      configRef.current = next; setConfig(next); setPin(''); setRecovery(''); setNewPIN(''); setConfirmPIN(''); lastTouch.current = Date.now();
      if (!recovering) setLocked(false);
    } catch (e) { if (mounted.current) { setPin(''); setError(e instanceof Error ? e.message : 'Unlock failed. Please retry.'); } }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }
  const value = { user, config, reload, lock };
  if (!active) return <View style={styles.cover}><Text style={styles.heading}>Finance Coach</Text><Text>Financial information is hidden while the app is inactive.</Text></View>;
  if (!config) return <View style={styles.cover}><ActivityIndicator/><Text>{error || 'Preparing secure workspace…'}</Text>{error && <AppButton label="Retry initialization" onPress={() => { setError(''); void loadLock(user).then(async next => { await ScreenCapture.preventScreenCaptureAsync('finance-security'); if (Platform.OS === 'ios') await ScreenCapture.enableAppSwitcherProtectionAsync(1); if (mounted.current) { setConfig(next); setLocked(next.enabled); } }).catch(() => setError('Secure initialization failed. Access remains hidden.')); }}/>}</View>;
  if (locked && config.enabled) return <View style={styles.cover} onTouchStart={() => { lastTouch.current = Date.now(); }}>
    <Text accessibilityRole="header" style={styles.heading}>Finance Coach is locked</Text>
    {newRecovery ? <><Text>PIN reset. Save this replacement recovery code securely. The previous code no longer works.</Text><Text selectable style={styles.code}>{newRecovery}</Text><AppButton label="I saved my recovery code" onPress={() => { setNewRecovery(''); setRecovering(false); setLocked(false); }}/></> : <>
      <Text>{recovering ? 'Use your saved recovery code to set a new PIN. This preserves your financial data.' : 'Enter your six-digit PIN.'}</Text>
      {recovering ? <><TextInput accessibilityLabel="Recovery code" maxLength={128} value={recovery} onChangeText={setRecovery} autoCapitalize="none" autoCorrect={false} secureTextEntry style={styles.input}/><TextInput accessibilityLabel="New PIN" value={newPIN} onChangeText={setNewPIN} keyboardType="number-pad" maxLength={6} secureTextEntry style={styles.input}/><TextInput accessibilityLabel="Confirm new PIN" value={confirmPIN} onChangeText={setConfirmPIN} keyboardType="number-pad" maxLength={6} secureTextEntry style={styles.input}/></> : <TextInput accessibilityLabel="App PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={6} secureTextEntry autoCorrect={false} style={styles.input}/>}
      <AppButton label={recovering ? 'Reset PIN' : 'Unlock'} loading={busy} onPress={() => { void runUnlock(); }}/>
      {!recovering && config.biometric && <AppButton label="Unlock with biometrics" disabled={busy} onPress={() => { void runUnlock(true); }}/>} 
      <AppButton label={recovering ? 'Back to PIN' : 'Forgot PIN?'} disabled={busy} variant="ghost" onPress={() => { setRecovering(!recovering); setError(''); setPin(''); setRecovery(''); }}/>
      {recovering && <Text>If you lost both credentials, there is no offline bypass. Do not clear app data: unsynced records could be lost.</Text>}
    </>}{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
  return <SecurityContext.Provider value={value}><View style={styles.fill} onTouchStart={() => { lastTouch.current = Date.now(); }}>{children}</View></SecurityContext.Provider>;
}
export const securityStyles = StyleSheet.create({ input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.text }, code: { fontFamily: 'monospace', fontSize: 15, color: colors.text } });
const styles = StyleSheet.create({ ...securityStyles, fill: { flex: 1 }, cover: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: colors.background }, heading: { fontSize: 24, fontWeight: '700', color: colors.text }, error: { color: colors.danger } });
