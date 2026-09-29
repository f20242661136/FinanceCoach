# Finance Coach Subscription Architecture

## Phase 10 contract

RevenueCat is the subscription provider. The mobile SDK gives immediate purchase
and restore feedback, while Supabase stores a webhook-projected entitlement for
server-side authorization.

The entitlement identifier is:

`premium`

Only features that are explicitly marked Premium should be gated. At the time of
this Phase 10 implementation, gamification already has an `is_premium` flag and
is the first domain wired to that contract. Existing seeded challenges remain
free unless product configuration deliberately marks a challenge Premium.

Core finance features are not silently converted to Premium by this phase.

## Client flow

1. `SubscriptionProvider` configures RevenueCat with the authenticated Supabase
   user ID as the RevenueCat App User ID.
2. The Subscription screen fetches the current RevenueCat Offering.
3. A package purchase uses `Purchases.purchasePackage`.
4. Restore uses `Purchases.restorePurchases`.
5. Customer Center is available for subscription management.
6. `CustomerInfo.entitlements.active.premium` drives immediate client UX.
7. Trial, cancellation, billing-issue and expiration states are derived from the
   RevenueCat entitlement metadata.

## Server trust boundary

The client entitlement is not enough to authorize a protected server action.

RevenueCat webhooks are written into `subscription_webhook_events` and projected
into `subscription_entitlements`. Server-side Premium gates read that projected
row and require:

- `entitlement_id = 'premium'`;
- `is_active = true`;
- `current_period_ends_at` is null or still in the future.

Phase 10 adds this enforcement to Premium-marked gamification challenge starts.
Future Premium RPCs should reuse the same internal entitlement predicate rather
than trusting a client boolean.

After applying the Phase 10 migration, regenerate `src/types/database.types.ts`
from the migrated Supabase schema so the generated database contract includes
subscription tables and RPCs. The client status service currently uses a narrow
RPC boundary so this migration can be applied before regenerated types land.

## Trial and cancellation behavior

RevenueCat `period_type` is persisted on the projected entitlement. A trial is
still Premium while the entitlement is active. Cancellation does not revoke
access early; access remains until expiration. An `EXPIRATION` webhook removes
Premium access.

A billing issue is surfaced to the user, but access follows the entitlement
state projected by RevenueCat rather than being revoked merely because a billing
issue event exists.

## Google Play setup

Before purchase testing can succeed, configure RevenueCat and Google Play so
that:

1. The Android app uses package `com.f2024.financecoach`.
2. The Google Play subscription/base plan exists and is active for the test
   track being used.
3. The RevenueCat Google Play app is connected to the Play product.
4. The product is attached to the RevenueCat `premium` entitlement.
5. The package is included in RevenueCat's current Offering.
6. `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY` contains the Android public SDK key.
7. The RevenueCat webhook targets the deployed `revenuecat-webhook` Edge
   Function and uses the configured server-only authorization secret.
8. Webhook signing should be enabled when available and matched with
   `REVENUECAT_WEBHOOK_SIGNING_SECRET`.

RevenueCat purchases require a native development/release build; Expo Go is not
sufficient for validating Google Play Billing.

## Purchase verification timing

A successful store purchase can appear in `CustomerInfo` before the webhook has
updated Supabase. During that short window the UI may show Premium while a
protected server RPC still rejects the action. The Subscription screen exposes
both client and server status so this state is visible rather than silently
bypassed.

## Transfer events

`TRANSFER` webhooks are reconciled with RevenueCat's server API because the
transfer webhook itself does not contain enough entitlement lifecycle detail to
safely rebuild the projection. The Edge Function looks up each transferred
Finance Coach UUID with the server-only `REVENUECAT_SECRET_API_KEY`, derives the
current `premium` entitlement, and calls the service-role-only reconciliation
RPC.

If RevenueCat sends identifiers that are not Finance Coach UUIDs, the webhook
response records that manual reconciliation is still required for those
identifiers instead of granting access from untrusted guesses.

## Required real-device scenarios

- fresh free user;
- successful purchase;
- store-cancelled purchase dialog;
- restore with an entitled Play account;
- restore with no entitlement;
- active trial;
- cancellation while access remains active;
- expiration;
- billing issue;
- app reinstall followed by restore;
- sign out and sign in with a different Finance Coach user;
- webhook delay between local entitlement and server verification;
- Premium RPC invoked directly by a free user;
- RevenueCat transfer event reconciliation.
