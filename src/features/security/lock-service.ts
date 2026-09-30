import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';
import { scryptAsync } from '@noble/hashes/scrypt';

const hex = z.string().regex(/^[a-f0-9]{64}$/);
export const lockSchema = z.object({
  version: z.literal(1), enabled: z.boolean(), biometric: z.boolean(), privacy: z.boolean(),
  timeout: z.union([z.literal(0), z.literal(30), z.literal(60), z.literal(300)]),
  pepper: hex, pinHash: hex.nullable(), recoveryHash: hex.nullable(),
  failures: z.number().int().min(0).max(1000000), blockedUntil: z.number().int().min(0),
}).strict().refine(v => !v.enabled || Boolean(v.pinHash && v.recoveryHash), 'Incomplete lock credentials');
export type LockConfig = z.infer<typeof lockSchema>;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
let tail: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const task = tail.then(fn, fn); tail = task.catch(() => {}); return task;
}
function key(user: string) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(user)) throw Error('Invalid account for app lock.');
  return `finance-coach.lock.v1.${user}`;
}
async function randomHex() {
  return Array.from(await Crypto.getRandomBytesAsync(32), b => b.toString(16).padStart(2, '0')).join('');
}
export async function credentialHash(config: LockConfig, kind: 'pin' | 'recovery', value: string) {
  const bytes = await scryptAsync(value, `${kind}:${config.pepper}`, { N: 16384, r: 8, p: 1, dkLen: 32, asyncTick: 8 });
  const result = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  bytes.fill(0); return result;
}
export function equalHash(a: string, b: string) {
  let different = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) different |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return different === 0;
}
export function validatePIN(pin: string) {
  if (!/^\d{6}$/.test(pin) || /^(\d)\1{5}$/.test(pin) || ['123456', '654321'].includes(pin)) {
    throw Error('Choose a six-digit PIN without repeated or sequential digits.');
  }
}
async function read(user: string): Promise<LockConfig> {
  if (!await SecureStore.isAvailableAsync()) throw Error('Secure app lock storage is unavailable on this device.');
  const raw = await SecureStore.getItemAsync(key(user), options);
  if (raw !== null) {
    try { return lockSchema.parse(JSON.parse(raw)); } catch { throw Error('App lock settings could not be verified. Access remains protected. Retry secure storage.'); }
  }
  const config: LockConfig = { version: 1, enabled: false, biometric: false, privacy: false, timeout: 0,
    pepper: await randomHex(), pinHash: null, recoveryHash: null, failures: 0, blockedUntil: 0 };
  await write(user, config); return config;
}
async function write(user: string, config: LockConfig) {
  const raw = JSON.stringify(lockSchema.parse(config));
  await SecureStore.setItemAsync(key(user), raw, options);
  if (await SecureStore.getItemAsync(key(user), options) !== raw) throw Error('App lock settings were not saved. Please retry.');
}
export const loadLock = (user: string) => serial(() => read(user));
export const updateLock = (user: string, patch: Partial<Pick<LockConfig, 'privacy' | 'timeout'>>) => serial(async () => {
  const config = { ...await read(user), ...patch }; await write(user, config); return config;
});
export function remainingDelay(config: LockConfig, now = Date.now()) { return Math.max(0, Math.ceil((config.blockedUntil - now) / 1000)); }
async function verify(user: string, kind: 'pin' | 'recovery', value: string) {
  const config = await read(user);
  if (!config.enabled) throw Error('App lock is not enabled.');
  const wait = remainingDelay(config); if (wait) throw Error(`Too many attempts. Try again in ${wait} seconds.`);
  // Reserve and persist each attempt before hashing; interruption cannot erase failures.
  config.failures = Math.min(1000000, config.failures + 1);
  if (config.failures >= 5) config.blockedUntil = Date.now() + Math.min(900, 30 * 2 ** Math.min(5, config.failures - 5)) * 1000;
  await write(user, config);
  const normalized = kind === 'recovery' ? value.replace(/[\s-]/g, '').toLowerCase() : value;
  if (normalized.length > 128) throw Error('Incorrect credential.');
  const expected = kind === 'pin' ? config.pinHash : config.recoveryHash;
  if (!expected || !equalHash(expected, await credentialHash(config, kind, normalized))) throw Error('Incorrect credential. Your financial data has not changed.');
  return config;
}
export const unlockPIN = (user: string, pin: string) => serial(async () => {
  const config = await verify(user, 'pin', pin); config.failures = 0; config.blockedUntil = 0;
  await write(user, config); return config;
});
async function replacePIN(user: string, pin: string, config: LockConfig) {
  validatePIN(pin); const recovery = await randomHex(); config.pepper = await randomHex();
  config.pinHash = await credentialHash(config, 'pin', pin); config.recoveryHash = await credentialHash(config, 'recovery', recovery);
  config.enabled = true; config.biometric = false; config.failures = 0; config.blockedUntil = 0;
  await write(user, config); return { config, recovery: recovery.match(/.{1,8}/g)!.join('-') };
}
export const setPIN = (user: string, pin: string, currentPIN: string) => serial(async () => {
  validatePIN(pin); let config = await read(user); if (config.enabled) config = await verify(user, 'pin', currentPIN);
  return replacePIN(user, pin, config);
});
export const recoverPIN = (user: string, recovery: string, pin: string) => serial(async () => {
  validatePIN(pin); return replacePIN(user, pin, await verify(user, 'recovery', recovery));
});
export const disableLock = (user: string, pin: string) => serial(async () => {
  const config = await verify(user, 'pin', pin); config.enabled = false; config.biometric = false;
  config.pinHash = null; config.recoveryHash = null; config.failures = 0; config.blockedUntil = 0;
  await write(user, config); return config;
});
export const configureBiometric = (user: string, pin: string, enabled: boolean) => serial(async () => {
  const config = await verify(user, 'pin', pin); config.biometric = enabled; config.failures = 0; config.blockedUntil = 0;
  await write(user, config); return config;
});
export function shouldAutoLock(config: LockConfig, inactiveAt: number, now: number) {
  return config.enabled && (config.timeout === 0 || now - inactiveAt >= config.timeout * 1000 || now < inactiveAt);
}
