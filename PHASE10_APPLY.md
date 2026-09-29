# Phase 10 — Monetization & Subscriptions

This package contains only the files changed for Phase 10 plus `phase10.patch`.

## Apply

Either copy/extract the project-relative files over the existing project, or apply the patch from the project root:

```bash
patch -p1 < phase10.patch
```

## Then run in the real project

```bash
npm install
npx tsc --noEmit
npx expo lint
supabase db reset
supabase test db
```

Regenerate Supabase types after the migration is applied:

```bash
supabase gen types typescript --local > src/types/database.types.ts
```

## External configuration required

Configure the RevenueCat `premium` entitlement, a current Offering containing the Google Play subscription package, the Android public SDK key, webhook authorization/signing secrets, and `REVENUECAT_SECRET_API_KEY` for transfer reconciliation. Real purchase validation requires a native development/release build and a real Google Play test account/device.
