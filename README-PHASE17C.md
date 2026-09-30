# Finance Coach — Phase 17C: App Lock & Privacy Mode

Merge this overlay into the existing project through Phase 17B. It adds six-digit PIN locking, optional strong biometric unlock, persistent failure delays, recovery codes, background and inactivity policies, native screen protection, and privacy controls under **Settings → App lock & privacy**.

## Install and rebuild

1. Back up the project and merge the ZIP at its root, preserving paths. Merge newer custom package/app configuration rather than overwriting it. Existing financial data, SQLCipher keys, database schema, and migrations are unchanged.
2. Install dependencies:

   ```sh
   npm install
   npx expo install expo-local-authentication expo-screen-capture
   ```

   The supplied package and lockfile also add the pure JavaScript `@noble/hashes` scrypt implementation, pinned to 1.8.0.
3. Build a new native development app. An OTA update alone cannot add these native modules. Using the existing Phase 17B development profile:

   ```sh
   npx eas-cli@latest build --platform android --profile development
   npx expo start --dev-client
   ```

   Keep your existing signing credentials so the new installation can update the current app. Do not uninstall or clear app data: unsynced financial records may be lost. If your project tracks generated native directories, regenerate their configuration from app.json through your established Expo prebuild workflow before building. No generated native files are included in this overlay.
4. Deploy the updated notification dispatcher using the same target project and JWT/scheduler configuration as your existing function:

   ```sh
   npx supabase functions deploy notification-dispatch --project-ref YOUR_PROJECT_REF
   ```

   This changes future push previews to generic text for every user, regardless of local privacy settings. Detailed messages remain in the authenticated notification center. No function deployment or live database change was performed for this delivery. Existing delivered notifications are not retroactively changed; clear older sensitive previews from your device.

## Lock behavior

App lock starts disabled. Enable it by entering and confirming a six-digit PIN. Repeated digits and the common 123456/654321 sequences are rejected. Save the displayed recovery code somewhere secure outside the app. It is not recoverable from the settings screen later.

The lock wraps the signed-in root navigation and subscription providers. A cold start requires unlock when enabled. Financial screens and their native dialogs are unmounted while locked or inactive, so a notification tap or deep link cannot directly reveal them. Settings are scoped to the authenticated account on this device. Logging in again to that account retains its lock settings.

The default policy locks immediately after a background transition. Optional 30-second, 60-second, and five-minute timeouts allow a background grace period and lock after foreground touch inactivity. Native biometric interruptions can temporarily cover the app without invalidating the result; a real background transition invalidates pending unlock authorization. Android notification-shade blur also covers financial screens. A backward clock at return forces locking. Failure delays use the device clock and are a local safeguard, not a server authentication rate limit.

Use **Lock now** to lock immediately. Changing or disabling the PIN and configuring biometric access requires the current PIN. Enabling biometrics also requires a successful system biometric prompt. Android uses strong/Class 3 authentication and disables device-passcode fallback. Cancellation, missing hardware, missing enrollment, or system lockout leaves PIN unlock available. Biometrics do not replace your recovery code.

SecureStore retains the configuration with device-only, when-unlocked keychain accessibility where supported. PIN and recovery credentials use domain-separated scrypt verifiers with independent random 256-bit salt rotation, N=16384, r=8, p=1, 32-byte output, and asynchronous yielding. Plaintext credentials and recovery codes are never written to storage or sent to the server. Existing financial storage continues to use SQLCipher. This is an application access lock, not a replacement for device security or protection against a compromised operating system.

Each credential attempt is serialized and persisted before verification. Five failures trigger 30 seconds of delay, increasing to a maximum of 15 minutes for repeated failures. Restarting the app does not clear recorded failures. PIN and recovery attempts share this budget. Successful PIN verification resets it. Native biometric authentication has its own OS failure handling and can still unlock when enabled.

Malformed configuration, unavailable secure storage, failed write acknowledgement, or failed native screen protection does not silently disable protection. Initialization errors show an explicit retry while financial screens remain hidden. These tools target native Android/iOS; secure initialization on unsupported web environments remains blocked.

## Recovery

Choose **Forgot PIN?** on the lock screen, enter the saved recovery code, and confirm a new PIN. Recovery preserves financial records and pending sync operations. It rotates the recovery code and disables biometric unlock until you enable it again. Save the replacement code before continuing. Changing your PIN also rotates the code. If you interrupt code display, use the PIN you just set to unlock and change it again to generate a fresh code.

If both the PIN and recovery code are lost, this phase provides no offline bypass. A separately verified account recovery process is needed; reinstalling or clearing app data is not a safe recovery flow for unsynced records. Corrupted/unreadable secure settings likewise stay protected and require storage recovery rather than an automatic reset.

## Privacy and notifications

Privacy mode conceals the entire financial workspace: balances, transactions, account details, merchants, notes, debt analytics, charts, notification contents, and CSV tools. This intentionally uses a full cover rather than masking only amounts. Hidden descendants cannot receive touches or screen-reader focus. Navigation remains mounted so **Open privacy settings** can return to the security screen. Turn privacy mode off there to reveal the workspace. Financial records and queues are retained; sync can continue behind the privacy cover.

Native screen capture is prevented while signed in, with Android secure-window protection for recent-app previews and iOS app-switcher protection. A native rebuild and device verification are required. The capture block may remain in effect after logout until the app process restarts.

Foreground OS banners/lists are suppressed. Android reminder channels request secret lock-screen visibility, subject to existing OS channel settings. The deployed dispatcher always sends generic title/body text, which also protects closed-app notifications on iOS. The app cannot conceal a financial push body sent by an older dispatcher while its JavaScript is stopped; deploy the included server change before accepting this feature. A saved CSV in another application remains outside Finance Coach's privacy cover.

## Verification

**46 checks pass:** 23 secure credential/storage/KDF checks, 16 rendered lock/lifecycle/biometric/recovery checks, and 7 privacy/notification checks. Tests execute the delivered TypeScript with native storage/authentication boundaries mocked; the scrypt vector is checked independently against Node's crypto implementation. Tests include concurrent failure reservations, persistent cooldowns, corrupt settings, account isolation, interrupted unlocks, native protection errors, foreground inactivity, and generic push payload construction.

TypeScript passes. Expo lint reports no errors and three existing warnings in unrelated finance/gamification files. Changed security and notification files pass strict lint. Android Metro/Hermes export passes (1,842 modules). Metro reports a nonfatal package-exports fallback warning for the installed noble crypto helper. No APK was built, no native biometric hardware was tested, and no live push was sent. Existing financial tests from earlier phases are not counted again as new tests here.

From the merged project root with Node 24+:

```sh
node tests/security.test.cjs
node tests/security-ui.test.cjs
node tests/privacy-notifications.test.cjs
npx tsc --noEmit
npx expo lint
npx expo export --platform android
```

## Device acceptance checklist

- Enable app lock, save the code, cold-start, unlock, and verify no financial flash before unlock. Test a transaction deep link and notification launch while locked.
- Test incorrect PINs, increasing delay, restart during delay, correct PIN after expiry, PIN change, and disabled lock. Confirm account isolation after logout/login.
- Test enrolled strong biometrics, cancellation, OS lockout, unavailable hardware/enrollment, and fallback to PIN. Background the app during verification and confirm it stays locked.
- Test immediate background lock, all grace periods, touch inactivity, notification shade, and returning from interruptions. Check that keyboards/dialogs and recent-app snapshots do not reveal data.
- Reset with the recovery code offline. Verify records and unsynced queue entries remain, the previous code fails, and the new code works.
- Enable privacy, navigate through financial routes, inspect with TalkBack, open privacy settings, and reveal the workspace again. Verify CSV and notification views stay covered.
- Verify screenshots/recording and app-switcher previews on supported native devices. Test first launch after native installation and storage/protection initialization failures.
- After dispatcher deployment, receive a real push while foregrounded, backgrounded, locked, and closed. Confirm generic previews and authenticated detail access.

Next planned phase: **Phase 18 — Monetization & Subscriptions**, followed by Phase 19 production hardening and Phase 20 final QA/Google Play launch.
