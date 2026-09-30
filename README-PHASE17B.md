# Finance Coach — Phase 17B: CSV Import/Export

This is a file overlay for the existing project through Phase 17A. It adds transaction imports with mapping, validation, duplicate checks, durable offline processing, resumable reports, and CSV exports for transactions, accounts, the saved debt dashboard, and import reports.

## Install and open

1. Back up your project and merge this ZIP into its root, preserving the directory paths. It is not a standalone app. Keep your existing environment variables, signing credentials, and other project files. If package.json, app.json, or eas.json changed since Phase 17A, merge their additions rather than replacing your newer configuration.
2. Install the supplied dependencies from the project root:

   ```sh
   npm install
   npx expo install expo-document-picker expo-file-system expo-sharing
   ```

3. Apply `supabase/migrations/20260930060000_phase17b_csv_import.sql` after all existing migrations through Phase 17A. Use your established Supabase migration process. If this exact migration is already applied, do not run it again. No live database migration was performed while preparing this package.
4. Rebuild the Android development app because the file picker and sharing modules contain native code. The included EAS development profile produces an internal APK:

   ```sh
   npx eas-cli@latest build --platform android --profile development
   ```

   Configure the development environment with the same required app variables used by your existing development build. Use compatible existing signing credentials to update your installation; uninstalling or clearing app data would remove its local database. Alternatively, with an Android development environment, run `npx expo run:android`.
5. Install the development build and start Metro:

   ```sh
   npx expo start --dev-client
   ```

6. Sign in, sync accounts/categories, then open **Plan → Data tools → CSV import & export**. CSV file tools require the native Android or iOS app; they display an explanatory error on web. Android is the verified bundle target for this delivery.

## Import workflow

Choose the separator before selecting the file: comma, semicolon, or tab. Check the automatic column mapping, select account/category/type defaults, date format, decimal separator, and source label. Map a bank reference column when available. Select **Validate & preview**, inspect every error and duplicate, then import the valid rows.

- Supported transaction types: income and expense. Transfers and adjustments are rejected with row errors.
- Amounts use exact integer minor units, respect currency precision, and match the account currency. Thousands separators and scientific notation are rejected. Signed amount mode explicitly infers expense from negative amounts and income from positive amounts.
- Dates use the chosen ISO, DMY, or MDY format. Impossible dates are rejected.
- Accounts must be active and owned by the current user. Categories must match transaction type. Missing or ambiguous references are rejected.
- UTF-8, optional UTF-8 BOM, and UTF-16 LE/BE with BOM are supported, including Urdu and emoji. Invalid encoding is rejected. Quoted commas, escaped quotes, multiline cells, and CRLF are supported.
- Limits: 10 MiB, 10,000 nonempty data records, 128 columns, and 16,384 UTF-16 units per cell. Oversized files produce an actionable error; split them into smaller files.
- All rows are validated before ledger writes. Invalid rows remain in the report; valid rows can be imported independently. Record numbers count nonempty CSV records, with the header as record 1.

**Skip identical transactions** is enabled by default and compares financial fields against the current ledger and import journal. Turn it off to keep legitimate identical records from different rows. Reimporting the exact same file still skips its known rows. Editing the file changes its identity; mapping stable bank references with the same source label gives stronger protection across edited files. Reusing a bank reference with changed data is rejected. Transaction exports include IDs for safe reimport; unsupported exported transaction types still need review.

## Offline, cancellation, and reports

Imports persist a validated batch in the encrypted local database, then commit valid rows and their queue entries in atomic chunks. Offline rows are **pending**, not server-confirmed; balances are not optimistically changed. Resume remaining **ready** rows from history after cancellation or restart. Use **Sync pending rows** when connected; the existing queue applies authenticated server receipts and authoritative ledger snapshots.

Reports distinguish ready, invalid, duplicate, pending, imported, and failed records. A connection failure leaves work retryable. Permanent sync failures retain the row and explanation. Correct invalid input and reimport it; use **Retry failed sync rows** after resolving the underlying failure. This uses the existing shared mutation queue and can retry other failed operations for the current user too.

The backend receipt key is scoped to the user and guarded by database locks. Retrying after a lost response returns the original transaction, including when another device used different client IDs. Receipt acknowledgement, queue cleanup, and local report changes are atomic. Import history displays the latest 50 batches; individual reports support up to the file record limit and display 50 records at a time.

## Exports and privacy

Exports use a consistent encrypted database read snapshot and stream rows into a UTF-8 BOM CSV with CRLF endings. Exact monetary values, currency, source IDs, and sync status are retained. Deleted transactions are excluded. Account balances reflect saved data; the debt export includes the cached dashboard capture time. Sync first when you need current server data. Pending or failed records remain clearly labelled.

Spreadsheet formula prefixes in text cells are escaped. Transaction exports mark their safety format so reimport restores text without removing legitimate leading apostrophes. Raw CSV input is not uploaded or retained after processing; validated row payloads and reports remain in encrypted local storage as needed for resumable work and audit history.

Exported CSV files are unencrypted. The device share sheet lets you choose a destination; opening it does not confirm that another app saved the file. Successful temporary exports remain available for receiving apps and are cleaned after 24 hours on the next use of these tools. **Clear temporary CSV files** removes these local copies immediately. Cancelled or failed exports remove partial files. Copies you save in another app remain there. Picker cleanup only removes the app's copied cache file, never the original provider file.

## Verification

The completed delivery passed **92 checks**: 31 parser/import/offline/replay checks, 15 picker/export/privacy checks, 8 rendered-screen checks, 19 CSV database checks, and 19 existing Phase 16 ledger regression checks. The database checks loaded all 29 migrations in PGlite and exercised the actual RPC definitions and client acknowledgement schema. Native picker, sharing, and hook boundaries are mocked in automated checks; these are not device tests.

TypeScript passes. Expo lint has no errors and three existing warnings in unrelated finance/gamification files. Delivered CSV source passes strict lint. The Android Metro/Hermes bundle compiled successfully. An APK was not built, and no physical device or live Supabase environment was available for testing.

From the merged project root, run the supplied local checks with Node 24+:

```sh
node tests/csv.test.cjs
node tests/csv-files.test.cjs
node tests/csv-ui.test.cjs
npx tsc --noEmit
npx expo lint
```

Optional isolated PostgreSQL test dependency (not an app dependency):

```sh
npm install --prefix .phase17b-test-tools --no-save @electric-sql/pglite
node tests/csv-backend.cjs
```

The 19 Phase 16 regression checks use the existing Phase 17A test file; it is not duplicated in this overlay. CHECKSUMS.sha256 covers all delivered files except itself.

## Android acceptance checks

Before accepting Phase 17B on your device:

1. Open the CSV screen from Plan and return with Back to Plan. Verify empty, loading, and retry states.
2. Pick and cancel files from local storage and a document provider; test Unicode and quoted multiline text, and select semicolon before picking a semicolon file.
3. Preview a mixed valid/invalid/duplicate file. Import offline, restart the app, resume remaining rows, reconnect, and confirm server balances and report statuses.
4. Reimport the same file, retry after an interrupted response, and test legitimate identical transactions with the matching switch disabled.
5. Export each format and save it through the Android share sheet. Check Unicode and exact values in the saved file, cancel sharing, clear temporary files, and test export while offline.
6. Switch users and confirm that imports, reports, receipts, and exports are isolated. Test a row rejected because its account/category changed before sync.

The next planned subphase is 17C — App Lock & Privacy Mode, after these Phase 17B device checks.
