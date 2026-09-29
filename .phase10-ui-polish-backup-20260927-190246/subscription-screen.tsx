import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import RevenueCatUI from 'react-native-purchases-ui';

import type {
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  useSubscription,
} from './subscription-context';

import {
  getCurrentRevenueCatOffering,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
  revenueCatOperationErrorMessage,
  wasRevenueCatPurchaseCancelled,
} from './subscription-service';

import {
  getMyServerSubscriptionStatus,
  type ServerSubscriptionStatus,
} from './subscription-server-service';

import {
  premiumSubscriptionStatusFrom,
  type PremiumLifecycleStatus,
} from './subscription-status';


function lifecycleTitle(
  lifecycle:
    PremiumLifecycleStatus,
): string {
  switch (lifecycle) {
    case 'trial':
      return 'Premium trial active';

    case 'active':
      return 'Premium active';

    case 'cancelling':
      return 'Premium remains active';

    case 'billing_issue':
      return 'Premium needs attention';

    case 'expired':
      return 'Premium expired';

    case 'free':
      return 'Free plan';
  }
}


function lifecycleBody(
  lifecycle:
    PremiumLifecycleStatus,
): string {
  switch (lifecycle) {
    case 'trial':
      return 'Your trial currently unlocks Premium features.';

    case 'active':
      return 'Your Premium entitlement is active.';

    case 'cancelling':
      return 'Auto-renewal is off. Premium remains available until the current period ends.';

    case 'billing_issue':
      return 'Your entitlement is still active, but the store reported a billing issue. Review your subscription management options.';

    case 'expired':
      return 'Your previous Premium entitlement is no longer active.';

    case 'free':
      return 'Core Finance Coach features remain available. Premium-only features stay locked.';
  }
}


function formatDate(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return Intl.DateTimeFormat(
    undefined,
    {
      dateStyle:
        'medium',
    },
  ).format(
    date,
  );
}


function packageLabel(
  selectedPackage:
    PurchasesPackage,
): string {
  const title =
    selectedPackage
      .product
      .title
      .trim();

  return title
    || selectedPackage.identifier;
}


export function SubscriptionScreen() {
  const router =
    useRouter();

  const {
    status,
    customerInfo,
    hasPremiumEntitlement,
    error:
      subscriptionRuntimeError,
    refreshSubscription,
  } =
    useSubscription();

  const premiumStatus =
    useMemo(
      () =>
        premiumSubscriptionStatusFrom(
          customerInfo,
        ),
      [
        customerInfo,
      ],
    );

  const [
    offering,
    setOffering,
  ] =
    useState<
      PurchasesOffering | null
    >(
      null,
    );

  const [
    offeringLoading,
    setOfferingLoading,
  ] =
    useState(false);

  const [
    operation,
    setOperation,
  ] =
    useState<
      'purchase'
      | 'restore'
      | 'manage'
      | null
    >(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    operationError,
    setOperationError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    serverStatus,
    setServerStatus,
  ] =
    useState<
      ServerSubscriptionStatus | null
    >(
      null,
    );

  const [
    serverStatusError,
    setServerStatusError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const refreshServerStatus =
    useCallback(
      async () => {
        try {
          const nextStatus =
            await getMyServerSubscriptionStatus();

          setServerStatus(
            nextStatus,
          );

          setServerStatusError(
            null,
          );
        } catch (
          serverError
        ) {
          setServerStatusError(
            revenueCatOperationErrorMessage(
              serverError,
            ),
          );
        }
      },
      [],
    );


  const loadOffering =
    useCallback(
      async () => {
        if (
          status !== 'ready'
        ) {
          return;
        }

        setOfferingLoading(
          true,
        );

        try {
          const nextOffering =
            await getCurrentRevenueCatOffering();

          setOffering(
            nextOffering,
          );
        } catch (
          offeringError
        ) {
          setOperationError(
            revenueCatOperationErrorMessage(
              offeringError,
            ),
          );
        } finally {
          setOfferingLoading(
            false,
          );
        }
      },
      [
        status,
      ],
    );


  useEffect(() => {
    if (
      status !== 'ready'
    ) {
      return;
    }

    const timer =
      setTimeout(
        () => {
          void loadOffering();
          void refreshServerStatus();
        },
        0,
      );

    return () => {
      clearTimeout(
        timer,
      );
    };
  }, [
    loadOffering,
    refreshServerStatus,
    status,
  ]);


  async function refreshAll() {
    setRefreshing(
      true,
    );

    try {
      await refreshSubscription();
      await Promise.all([
        loadOffering(),
        refreshServerStatus(),
      ]);
    } finally {
      setRefreshing(
        false,
      );
    }
  }


  async function purchase(
    selectedPackage:
      PurchasesPackage,
  ) {
    setOperation(
      'purchase',
    );

    setOperationError(
      null,
    );

    setMessage(
      null,
    );

    try {
      const nextCustomerInfo =
        await purchaseRevenueCatPackage(
          selectedPackage,
        );

      const purchasedStatus =
        premiumSubscriptionStatusFrom(
          nextCustomerInfo,
        );

      await refreshSubscription();
      await refreshServerStatus();

      setMessage(
        purchasedStatus.hasPremium
          ? 'Premium is active on this device. Server verification will follow the RevenueCat webhook.'
          : 'The store completed the purchase, but Premium is not active yet. Refresh after RevenueCat finishes syncing.',
      );
    } catch (
      purchaseError
    ) {
      if (
        !wasRevenueCatPurchaseCancelled(
          purchaseError,
        )
      ) {
        setOperationError(
          revenueCatOperationErrorMessage(
            purchaseError,
          ),
        );
      }
    } finally {
      setOperation(
        null,
      );
    }
  }


  async function restore() {
    setOperation(
      'restore',
    );

    setOperationError(
      null,
    );

    setMessage(
      null,
    );

    try {
      const restoredInfo =
        await restoreRevenueCatPurchases();

      const restoredStatus =
        premiumSubscriptionStatusFrom(
          restoredInfo,
        );

      await refreshSubscription();
      await refreshServerStatus();

      setMessage(
        restoredStatus.hasPremium
          ? 'Premium purchases restored.'
          : 'Restore completed. No active Premium entitlement was found for this store account.',
      );
    } catch (
      restoreError
    ) {
      setOperationError(
        revenueCatOperationErrorMessage(
          restoreError,
        ),
      );
    } finally {
      setOperation(
        null,
      );
    }
  }


  async function manageSubscription() {
    setOperation(
      'manage',
    );

    setOperationError(
      null,
    );

    try {
      await RevenueCatUI
        .presentCustomerCenter();

      await refreshSubscription();
      await refreshServerStatus();
    } catch (
      manageError
    ) {
      setOperationError(
        revenueCatOperationErrorMessage(
          manageError,
        ),
      );
    } finally {
      setOperation(
        null,
      );
    }
  }


  const expirationLabel =
    formatDate(
      premiumStatus
        .expirationDate,
    );

  const serverPeriodEnd =
    formatDate(
      serverStatus
        ?.current_period_ends_at
      ?? null,
    );

  const runtimeUnavailable =
    status === 'disabled';

  const runtimeBusy =
    status === 'idle'
    || status === 'initializing';

  const operationBusy =
    operation !== null;


  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
      refreshControl={
        <RefreshControl
          refreshing={
            refreshing
          }
          onRefresh={() => {
            void refreshAll();
          }}
        />
      }
    >
      <View
        style={
          styles.header
        }
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.back();
          }}
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            Ã¢â‚¬Â¹ Back
          </Text>
        </Pressable>

        <Text
          style={
            styles.eyebrow
          }
        >
          FINANCE COACH PREMIUM
        </Text>

        <Text
          style={
            styles.title
          }
        >
          Subscription
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Purchases are handled by your app-store account through RevenueCat. Premium access is also verified server-side before protected features can run.
        </Text>
      </View>


      <View
        style={
          styles.statusCard
        }
      >
        <Text
          style={
            styles.statusEyebrow
          }
        >
          CURRENT PLAN
        </Text>

        <Text
          style={
            styles.statusTitle
          }
        >
          {runtimeBusy
            ? 'Checking subscriptionÃ¢â‚¬Â¦'
            : lifecycleTitle(
                premiumStatus.lifecycle,
              )}
        </Text>

        <Text
          style={
            styles.body
          }
        >
          {runtimeUnavailable
            ? 'RevenueCat is not configured for this platform/build.'
            : lifecycleBody(
                premiumStatus.lifecycle,
              )}
        </Text>

        {expirationLabel ? (
          <Text
            style={
              styles.meta
            }
          >
            {premiumStatus.lifecycle ===
              'trial'
              ? 'Trial ends'
              : premiumStatus.lifecycle ===
                  'cancelling'
                ? 'Access until'
                : 'Current period ends'}
            {': '}
            {expirationLabel}
          </Text>
        ) : null}

        {premiumStatus.productIdentifier ? (
          <Text
            style={
              styles.meta
            }
          >
            Product: {
              premiumStatus
                .productIdentifier
            }
          </Text>
        ) : null}

        {premiumStatus.isSandbox ? (
          <View
            style={
              styles.sandboxPill
            }
          >
            <Text
              style={
                styles.sandboxText
              }
            >
              SANDBOX
            </Text>
          </View>
        ) : null}
      </View>


      {subscriptionRuntimeError ? (
        <View
          style={
            styles.errorCard
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            {subscriptionRuntimeError}
          </Text>
        </View>
      ) : null}

      {operationError ? (
        <View
          style={
            styles.errorCard
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            {operationError}
          </Text>
        </View>
      ) : null}

      {message ? (
        <View
          style={
            styles.infoCard
          }
        >
          <Text
            style={
              styles.infoText
            }
          >
            {message}
          </Text>
        </View>
      ) : null}


      {!hasPremiumEntitlement ? (
        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Upgrade to Premium
          </Text>

          <Text
            style={
              styles.body
            }
          >
            Only features explicitly marked as Premium are gated. Existing core finance features remain available on the free plan.
          </Text>

          {offeringLoading ? (
            <View
              style={
                styles.loadingRow
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  colors.primary
                }
              />

              <Text
                style={
                  styles.body
                }
              >
                Loading subscription optionsÃ¢â‚¬Â¦
              </Text>
            </View>
          ) : offering
              ?.availablePackages
              .length ? (
            <View
              style={
                styles.packageStack
              }
            >
              {offering
                .availablePackages
                .map(
                  (
                    availablePackage,
                  ) => (
                    <View
                      key={
                        availablePackage
                          .identifier
                      }
                      style={
                        styles.packageCard
                      }
                    >
                      <View
                        style={
                          styles.packageCopy
                        }
                      >
                        <Text
                          style={
                            styles.packageTitle
                          }
                        >
                          {packageLabel(
                            availablePackage,
                          )}
                        </Text>

                        <Text
                          style={
                            styles.packagePrice
                          }
                        >
                          {availablePackage
                            .product
                            .priceString}
                        </Text>

                        {availablePackage
                          .product
                          .description ? (
                          <Text
                            style={
                              styles.packageDescription
                            }
                          >
                            {availablePackage
                              .product
                              .description}
                          </Text>
                        ) : null}
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        disabled={
                          operationBusy
                        }
                        onPress={() => {
                          void purchase(
                            availablePackage,
                          );
                        }}
                        style={[
                          styles.primaryButton,
                          operationBusy
                            ? styles.disabled
                            : null,
                        ]}
                      >
                        <Text
                          style={
                            styles.primaryButtonText
                          }
                        >
                          {operation ===
                            'purchase'
                            ? 'ProcessingÃ¢â‚¬Â¦'
                            : `Subscribe Ã‚Â· ${availablePackage.product.priceString}`}
                        </Text>
                      </Pressable>
                    </View>
                  ),
                )}
            </View>
          ) : status === 'ready' ? (
            <View
              style={
                styles.infoCard
              }
            >
              <Text
                style={
                  styles.infoText
                }
              >
                No current RevenueCat Offering is available. Configure a Google Play subscription product, attach it to the premium entitlement, and add it to the current Offering.
              </Text>
            </View>
          ) : null}

          <Text
            style={
              styles.legalNote
            }
          >
            Any free trial or introductory offer configured for the store product is displayed by the store before purchase. Renewal and cancellation follow the store terms shown at checkout.
          </Text>
        </View>
      ) : null}


      <View
        style={
          styles.section
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Purchase controls
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={
            operationBusy
            || runtimeUnavailable
            || runtimeBusy
          }
          onPress={() => {
            void restore();
          }}
          style={[
            styles.secondaryButton,
            operationBusy
            || runtimeUnavailable
            || runtimeBusy
              ? styles.disabled
              : null,
          ]}
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            {operation === 'restore'
              ? 'RestoringÃ¢â‚¬Â¦'
              : 'Restore purchases'}
          </Text>
        </Pressable>

        {premiumStatus.lifecycle !==
          'free' ? (
          <Pressable
            accessibilityRole="button"
            disabled={
              operationBusy
              || runtimeUnavailable
            }
            onPress={() => {
              void manageSubscription();
            }}
            style={[
              styles.secondaryButton,
              operationBusy
              || runtimeUnavailable
                ? styles.disabled
                : null,
            ]}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              {operation === 'manage'
                ? 'OpeningÃ¢â‚¬Â¦'
                : 'Manage subscription'}
            </Text>
          </Pressable>
        ) : null}
      </View>


      <View
        style={
          styles.section
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Server verification
        </Text>

        <Text
          style={
            styles.body
          }
        >
          Premium RPCs use the webhook-backed entitlement stored in Supabase rather than trusting the mobile UI alone.
        </Text>

        {serverStatus ? (
          <View
            style={
              styles.serverGrid
            }
          >
            <Text
              style={
                styles.meta
              }
            >
              Verified access: {
                serverStatus
                  .has_premium
                  ? 'Yes'
                  : 'No'
              }
            </Text>

            {serverStatus.period_type ? (
              <Text
                style={
                  styles.meta
                }
              >
                Period: {
                  serverStatus
                    .period_type
                }
              </Text>
            ) : null}

            {serverStatus
              .last_event_type ? (
              <Text
                style={
                  styles.meta
                }
              >
                Last event: {
                  serverStatus
                    .last_event_type
                }
              </Text>
            ) : null}

            {serverPeriodEnd ? (
              <Text
                style={
                  styles.meta
                }
              >
                Server period end: {
                  serverPeriodEnd
                }
              </Text>
            ) : null}
          </View>
        ) : serverStatusError ? (
          <Text
            style={
              styles.warningText
            }
          >
            Could not read server subscription status: {
              serverStatusError
            }
          </Text>
        ) : (
          <Text
            style={
              styles.body
            }
          >
            Waiting for subscription statusÃ¢â‚¬Â¦
          </Text>
        )}

        {hasPremiumEntitlement
        && serverStatus
        && !serverStatus.has_premium ? (
          <View
            style={
              styles.warningCard
            }
          >
            <Text
              style={
                styles.warningText
              }
            >
              RevenueCat reports Premium locally, but the server webhook has not verified it yet. Protected server actions remain locked until verification arrives.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    content: {
      width: '100%',
      maxWidth:
        layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop:
        spacing.lg,
      paddingBottom:
        spacing.xxxl,
    },

    header: {
      marginBottom:
        spacing.lg,
    },

    backButton: {
      alignSelf:
        'flex-start',
      minHeight:
        layout.touchTarget,
      justifyContent:
        'center',
      marginBottom:
        spacing.sm,
    },

    backText: {
      color:
        colors.primary,
      fontSize:
        typography.small,
      fontWeight:
        typography.weightBold,
    },

    eyebrow: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1.2,
    },

    title: {
      marginTop:
        spacing.xs,
      color:
        colors.text,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
    },

    subtitle: {
      marginTop:
        spacing.sm,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    statusCard: {
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    statusEyebrow: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1,
    },

    statusTitle: {
      marginTop:
        spacing.xs,
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    body: {
      marginTop:
        spacing.xs,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    meta: {
      marginTop:
        spacing.xs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    sandboxPill: {
      alignSelf:
        'flex-start',
      marginTop:
        spacing.sm,
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xxs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.warningSurface,
    },

    sandboxText: {
      color:
        colors.warning,
      fontSize:
        typography.caption,
      fontWeight:
        typography.weightBold,
    },

    section: {
      marginTop:
        spacing.lg,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
    },

    sectionTitle: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    loadingRow: {
      marginTop:
        spacing.md,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.sm,
    },

    packageStack: {
      marginTop:
        spacing.md,
      gap:
        spacing.sm,
    },

    packageCard: {
      padding:
        spacing.md,
      borderRadius:
        radii.md,
      borderWidth: 1,
      borderColor:
        colors.borderStrong,
      backgroundColor:
        colors.surfaceMuted,
    },

    packageCopy: {
      marginBottom:
        spacing.md,
    },

    packageTitle: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    packagePrice: {
      marginTop:
        spacing.xxs,
      color:
        colors.primary,
      fontSize:
        typography.subheading,
      fontWeight:
        typography.weightBold,
    },

    packageDescription: {
      marginTop:
        spacing.xs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    primaryButton: {
      minHeight:
        layout.touchTarget,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal:
        spacing.md,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primary,
    },

    primaryButtonText: {
      color:
        colors.textOnPrimary,
      fontSize:
        typography.small,
      fontWeight:
        typography.weightBold,
    },

    secondaryButton: {
      minHeight:
        layout.touchTarget,
      marginTop:
        spacing.sm,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal:
        spacing.md,
      borderRadius:
        radii.md,
      borderWidth: 1,
      borderColor:
        colors.borderStrong,
      backgroundColor:
        colors.surfaceMuted,
    },

    secondaryButtonText: {
      color:
        colors.primary,
      fontSize:
        typography.small,
      fontWeight:
        typography.weightBold,
    },

    disabled: {
      opacity: 0.45,
    },

    legalNote: {
      marginTop:
        spacing.md,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    infoCard: {
      marginTop:
        spacing.md,
      padding:
        spacing.md,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.infoSurface,
    },

    infoText: {
      color:
        colors.info,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    errorCard: {
      marginTop:
        spacing.md,
      padding:
        spacing.md,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.dangerSurface,
    },

    errorText: {
      color:
        colors.danger,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    warningCard: {
      marginTop:
        spacing.sm,
      padding:
        spacing.sm,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.warningSurface,
    },

    warningText: {
      marginTop:
        spacing.xs,
      color:
        colors.warning,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    serverGrid: {
      marginTop:
        spacing.sm,
    },
  });
