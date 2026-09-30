import Ionicons from '@expo/vector-icons/Ionicons';

import {
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

import {
  AppButton,
} from '@/components/ui/app-button';

import {
  StatePanel,
} from '@/components/ui/state-panel';

import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  toUserFacingError,
} from '@/lib/user-facing-error';

import {
  useLocalFinanceReferenceData,
} from '../../offline/sync/use-local-finance-reference-data';

import {
  formatMinor,
} from '../budgets/budget-money';

import {
  interestBasisPointsToPercent,
  loanDirectionLabel,
} from './loan-format';

import {
  useLoanStatus,
} from './loan-query';

function friendlyDueDate(
  value: string | null,
): string {
  if (!value) {
    return 'No due date';
  }

  const parsed =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return `Due ${value}`;
  }

  return `Due ${parsed.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  )}`;
}

export function LoansScreen() {
  const router =
    useRouter();

  const query =
    useLoanStatus();

  const reference =
    useLocalFinanceReferenceData();

  const loans =
    query.data ?? [];

  const activeCount =
    loans.filter(
      loan =>
        loan.status !== 'settled',
    ).length;

  const overdueCount =
    loans.filter(
      loan =>
        loan.is_overdue
        && loan.status !== 'settled',
    ).length;

  const settledCount =
    loans.filter(
      loan =>
        loan.status === 'settled',
    ).length;

  function minorUnitFor(
    currencyCode: string,
  ): number {
    return (
      reference.data
        ?.currencies
        .find(
          currency =>
            currency.code
            === currencyCode,
        )
        ?.minorUnit
      ?? 2
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={
            query.isRefetching
          }
          onRefresh={() => {
            void query.refetch();
          }}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>
              LOANS
            </Text>

            <Text
              accessibilityRole="header"
              style={styles.title}
            >
              Money borrowed and given
            </Text>

            <Text style={styles.subtitle}>
              Keep principal, repayments, interest, and due dates clear without mixing them into everyday spending.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add loan"
            onPress={() => {
              router.push(
                '/create-loan' as never,
              );
            }}
            style={({ pressed }) => [
              styles.addButton,
              pressed
                ? styles.addButtonPressed
                : null,
            ]}
          >
            <Ionicons
              name="add"
              size={23}
              color={
                colors.textOnPrimary
              }
            />
          </Pressable>
        </View>

        {!query.isLoading
        && !query.error
        && loans.length > 0 ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryValue,
                  styles.summaryPrimary,
                ]}
              >
                {activeCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Active
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryValue,
                  overdueCount > 0
                    ? styles.summaryWarning
                    : null,
                ]}
              >
                {overdueCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Overdue
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryValue,
                  styles.summarySuccess,
                ]}
              >
                {settledCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Settled
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <AppButton label="Open debt dashboard" icon="stats-chart-outline" variant="secondary" onPress={() => router.push('/debt-dashboard' as never)} />
      {query.isLoading ? (
        <StatePanel
          loading
          title="Loading loans"
          description="Checking your loan balances and repayment status."
        />
      ) : null}

      {query.error ? (
        <StatePanel
          title="Loans unavailable"
          description={
            toUserFacingError(
              query.error,
              'loan',
            )
          }
          icon="alert-circle-outline"
          tone="danger"
          action={
            <AppButton
              label="Try again"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                void query.refetch();
              }}
            />
          }
        />
      ) : null}

      {!query.isLoading
      && !query.error
      && loans.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="cash-outline"
              size={28}
              color={
                colors.primary
              }
            />
          </View>

          <Text style={styles.emptyTitle}>
            Keep loan repayments clear
          </Text>

          <Text style={styles.emptyBody}>
            Add money you borrowed or money you gave to someone. Finance Coach will keep its repayment history separate.
          </Text>

          <AppButton
            label="Add loan"
            icon="add-outline"
            onPress={() => {
              router.push(
                '/create-loan' as never,
              );
            }}
          />
        </View>
      ) : null}

      {!query.isLoading
      && !query.error
      && loans.length > 0 ? (
        <View style={styles.list}>
          {loans.map(
            loan => {
              const minorUnit =
                minorUnitFor(
                  loan.currency_code,
                );

              const settled =
                loan.status
                === 'settled';

              const overdue =
                loan.is_overdue
                && !settled;

              return (
                <Pressable
                  key={loan.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open loan with ${loan.counterparty_name}`}
                  onPress={() => {
                    router.push({
                      pathname:
                        '/loan-detail' as never,
                      params: {
                        loanId:
                          loan.id,
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    overdue
                      ? styles.cardOverdue
                      : null,
                    settled
                      ? styles.cardSettled
                      : null,
                    pressed
                      ? styles.cardPressed
                      : null,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIdentity}>
                      <View
                        style={[
                          styles.cardIcon,
                          overdue
                            ? styles.cardIconOverdue
                            : null,
                          settled
                            ? styles.cardIconSettled
                            : null,
                        ]}
                      >
                        <Ionicons
                          name={
                            loan.direction
                              === 'borrowed'
                              ? 'arrow-down-outline'
                              : 'arrow-up-outline'
                          }
                          size={20}
                          color={
                            overdue
                              ? colors.warning
                              : settled
                                ? colors.success
                                : colors.primary
                          }
                        />
                      </View>

                      <View style={styles.cardHeaderCopy}>
                        <Text
                          numberOfLines={1}
                          style={styles.counterparty}
                        >
                          {loan.counterparty_name}
                        </Text>

                        <Text style={styles.direction}>
                          {loanDirectionLabel(
                            loan.direction,
                          )}
                          {'  |  '}
                          {loan.currency_code}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        overdue
                          ? styles.statusPillOverdue
                          : null,
                        settled
                          ? styles.statusPillSettled
                          : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          overdue
                            ? styles.statusTextOverdue
                            : null,
                          settled
                            ? styles.statusTextSettled
                            : null,
                        ]}
                      >
                        {settled
                          ? 'Settled'
                          : overdue
                            ? 'Overdue'
                            : 'Active'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.balanceBlock}>
                    <Text style={styles.balanceLabel}>
                      Remaining
                    </Text>

                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      style={styles.balanceValue}
                    >
                      {loan.currency_code}{' '}
                      {formatMinor(
                        loan.remaining_minor,
                        minorUnit,
                      )}
                    </Text>
                  </View>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>
                        Principal
                      </Text>

                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={styles.detailValue}
                      >
                        {loan.currency_code}{' '}
                        {formatMinor(
                          loan.principal_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>

                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>
                        Interest
                      </Text>

                      <Text style={styles.detailValue}>
                        {interestBasisPointsToPercent(
                          loan.interest_rate_basis_points,
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.footer}>
                    <View style={styles.footerItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={
                          overdue
                            ? colors.warning
                            : colors.textTertiary
                        }
                      />

                      <Text
                        style={[
                          styles.footerText,
                          overdue
                            ? styles.footerTextOverdue
                            : null,
                        ]}
                      >
                        {friendlyDueDate(
                          loan.due_date,
                        )}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward-outline"
                      size={18}
                      color={
                        colors.textTertiary
                      }
                    />
                  </View>
                </Pressable>
              );
            },
          )}
        </View>
      ) : null}
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
      flexGrow: 1,
      width: '100%',
      maxWidth:
        layout.contentMaxWidth,
      alignSelf: 'center',
      gap:
        spacing.lg,
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop:
        spacing.lg,
      paddingBottom:
        spacing.xl,
    },

    header: {
      gap:
        spacing.lg,
    },

    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.md,
    },

    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap:
        spacing.xs,
    },

    eyebrow: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: 1.1,
    },

    title: {
      color:
        colors.text,
      fontSize:
        typography.title,
      lineHeight:
        typography.lineHeightTitle,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.6,
    },

    subtitle: {
      maxWidth: 460,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    addButton: {
      width:
        layout.touchTarget,
      height:
        layout.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primary,
      ...elevation.card,
    },

    addButtonPressed: {
      opacity: 0.84,
      transform: [
        {
          scale: 0.97,
        },
      ],
    },

    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
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

    summaryItem: {
      flex: 1,
      alignItems: 'center',
      gap:
        spacing.xxs,
    },

    summaryDivider: {
      width: 1,
      height: 34,
      backgroundColor:
        colors.border,
    },

    summaryValue: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightExtraBold,
    },

    summaryPrimary: {
      color:
        colors.primary,
    },

    summaryWarning: {
      color:
        colors.warning,
    },

    summarySuccess: {
      color:
        colors.success,
    },

    summaryLabel: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    emptyCard: {
      alignItems: 'center',
      gap:
        spacing.sm,
      padding:
        spacing.xl,
      borderRadius:
        radii.xl,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    emptyIcon: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.primarySoft,
      marginBottom:
        spacing.xs,
    },

    emptyTitle: {
      color:
        colors.text,
      fontSize:
        typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
      textAlign: 'center',
    },

    emptyBody: {
      maxWidth: 390,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      textAlign: 'center',
    },

    list: {
      gap:
        spacing.md,
    },

    card: {
      gap:
        spacing.md,
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

    cardOverdue: {
      borderColor:
        colors.warning,
    },

    cardSettled: {
      borderColor:
        colors.accentStrong,
      backgroundColor:
        colors.successSurface,
    },

    cardPressed: {
      opacity: 0.84,
      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap:
        spacing.sm,
    },

    cardIdentity: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
    },

    cardIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primarySoft,
    },

    cardIconOverdue: {
      backgroundColor:
        colors.warningSurface,
    },

    cardIconSettled: {
      backgroundColor:
        colors.successSurface,
    },

    cardHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },

    counterparty: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    direction: {
      marginTop:
        spacing.xxs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    statusPill: {
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.neutralSurface,
    },

    statusPillOverdue: {
      backgroundColor:
        colors.warningSurface,
    },

    statusPillSettled: {
      backgroundColor:
        colors.successSurface,
    },

    statusText: {
      color:
        colors.neutral,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    statusTextOverdue: {
      color:
        colors.warning,
    },

    statusTextSettled: {
      color:
        colors.success,
    },

    balanceBlock: {
      gap:
        spacing.xxs,
    },

    balanceLabel: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    balanceValue: {
      color:
        colors.text,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.5,
    },

    detailsGrid: {
      flexDirection: 'row',
      gap:
        spacing.sm,
    },

    detailCell: {
      flex: 1,
      minWidth: 0,
      padding:
        spacing.sm,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.surfaceMuted,
    },

    detailLabel: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    detailValue: {
      marginTop:
        spacing.xxs,
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap:
        spacing.sm,
      paddingTop:
        spacing.sm,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        colors.border,
    },

    footerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.xs,
    },

    footerText: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    footerTextOverdue: {
      color:
        colors.warning,
      fontWeight:
        typography.weightBold,
    },
  });
