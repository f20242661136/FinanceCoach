# Finance Coach — Phase 14: guided setup

Apply this overlay to the project with Phases 11–13 already installed.

## Install

1. Close the running Expo development server.
2. Merge the supplied `src` folder into your project root and replace matching files. Keep all other project files.
3. Restart with `npx expo start -c` (or `bunx expo start -c` if your project uses Bun).

No dependency installation, database migration, or backend change is required.

## What changed

- Currency setup introduces three steps, searchable supported currencies, a persistent selected-currency summary, and collapsible date/time preferences.
- Home shows the next setup action until an active account and an undeleted expense or income exist for the signed-in user.
- Account setup defaults to the profile currency when supported. The form explains balances and amounts owed, protects against duplicate taps, and refreshes supported options when Retry is pressed.
- Guided account saves lead to the next step. Guided transaction saves offer a completion screen and a return to Home. Ordinary account and transaction entry keep their existing navigation.
- The guide can be left at any time. Progress resumes from saved local data, including pending offline writes. Opening balances, adjustments, transfers, deleted transactions, and inactive accounts do not complete the corresponding steps.
- Existing users with both facts see their usual Home without the setup card. If all accounts are archived, the card asks for an active account and retains the existing transaction checkmark.

## Files

Four replacements:

- `src/app/(onboarding)/setup.tsx`
- `src/features/finance/offline-add-account-screen.tsx`
- `src/features/finance/offline-quick-add-screen.tsx`
- `src/features/smart-home/smart-home-screen.tsx`

Six additions:

- `src/app/(app)/(finance)/getting-started.tsx`
- `src/features/getting-started/setup-progress.ts`
- `src/features/getting-started/use-setup-progress.ts`
- `src/features/getting-started/setup-ui.tsx`
- `src/features/getting-started/getting-started-card.tsx`
- `src/features/getting-started/getting-started-screen.tsx`

The existing profile onboarding flag still completes after currency selection. Remaining steps run inside the finance route, where the encrypted local database is available. Progress is derived from user-scoped SQLite queries, with no additional onboarding state stored. Existing account/transaction mutations and sync invalidate the shared local-finance query family after saving.

## Validation

- `npx tsc --noEmit`: passed against the complete Expo SDK 57 source snapshot.
- `npx expo lint`: no errors; three existing warnings in unrelated files.
- Strict ESLint on all ten delivered source files: no warnings.
- 10 setup/currency regression tests and 9 SQLite query checks passed.

Run the included checks from this extracted folder with Node 24+ and Python 3:

```sh
node tests/setup.test.mjs
python3 tests/setup-query.test.py
```

## Device checks after merging

These need your running app and signed-in backend; no device session was available here.

1. With a new user, search currencies by name or code, select one, and continue. Home should show Step 2.
2. Add an account. Confirm its currency matches your selection; save and see Step 3. Canceling should leave progress intact.
3. Add an expense or income, then Continue. Confirm the completion message; View my Home should show the account/activity and hide the setup card.
4. Restart between steps and confirm the next action resumes. After options have loaded, repeat account/transaction entry offline and confirm local saves advance progress.
5. Check empty/error/retry currency and account options, liability balances, decimal precision, keyboard layout, large text, and ordinary entry outside the guide.
6. An existing user with accounts and transactions should see no setup card. Switching users must not reuse another user's progress.

First currency selection requires connectivity to retrieve supported currencies. Account types, currencies, and transaction categories must have been loaded once before offline entry is available. Home monthly totals continue to use the existing server summary, so an offline transaction can appear in recent activity before monthly totals refresh.
