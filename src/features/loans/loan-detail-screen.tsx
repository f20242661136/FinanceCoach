import Ionicons from '@expo/vector-icons/Ionicons';

import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocalSearchParams,
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
  useLoanPaymentHistory,
  useLoanStatus,
} from './loan-query';

function firstParam(
  value:
    | string
    | string[]
    | undefined,
): string {
  return Array.isArray(
    value,
  )
    ? value[0] ?? ''
    : value ?? '';
}

function friendlyDate(
  value: string | null,
): string {
  if (!value) {
    return 'Not set';
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
    return value;
  }

  return parsed.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  );
}

function paymentFrequencyLabel(
  value: string,
): string {
  if (value === 'none') {
    return 'Not set';
  }

  return value
    .replace(
      /_/g,
      ' ',
    )
    .replace(
      /\b\w/g,
      letter =>
        letter.toUpperCase(),
    );
}

export function LoanDetailScreen() {
  const router =
    useRouter();

  const params =
    useLocalSearchParams<{
      loanId?:
        | string
        | string[];
    }>();

  const loanId =
    firstParam(
      params.loanId,
    );

  const loansQuery =
    useLoanStatus();

  const historyQuery =
    useLoanPaymentHistory(
      loanId,
    );

  const reference =
    useLocalFinanceReferenceData();

  const loan =
    loansQuery.data
      ?.find(
        item =>
          item.id
          === loanId,
      )
    ?? null;

  const minorUnit =
    loan
      ? (
          reference.data
            ?.currencies
            .find(
              currency =>
                currency.code
                === loan.currency_code,
            )
            ?.minorUnit
          ?? 2
        )
      : 2;

  async function refresh() {
    await Promise.all([
      loansQuery.refetch(),
      historyQuery.refetch(),
    ]);
  }

  if (!loanId) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Loan unavailable"
          description="This loan link is missing the information needed to open it."
          icon="alert-circle-outline"
          tone="danger"
          action={
            <AppButton
              label="Go back"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                router.back();
              }}
            />
          }
        />
      </View>
    );
  }

  if (loansQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <StatePanel
          loading
          title="Loading loan"
          description="Preparing principal, repayment status, and payment history."
        />
      </View>
    );
  }

  if (
    loansQuery.error
    && !loan
  ) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Loan unavailable"
          description={
            toUserFacingError(
              loansQuery.error,
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
                void loansQuery.refetch();
              }}
            />
          }
        />
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={styles.centered}>
        <StatePanel
          title="Loan not found"
          description="This loan may no longer be available."
          icon="cash-outline"
          action={
            <AppButton
              label="Go back"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                router.back();
              }}
            />
          }
        />
      </View>
    );
  }

  const history =
    historyQuery.data
    ?? [];

  const settled =
    loan.status
    === 'settled';

  const overdue =
    loan.is_overdue
    && !settled;

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
            loansQuery.isRefetching
            || historyQuery.isRefetching
          }
          onRefresh={() => {
            void refresh();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          {loan.direction === 'borrowed'
            ? 'MONEY BORROWED'
            : 'MONEY GIVEN'}
        </Text>

        <Text
          accessibilityRole="header"
          style={styles.title}
        >
          {loan.counterparty_name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>
              {loanDirectionLabel(
                loan.direction,
              )}
            </Text>
          </View>

          <Text style={styles.metaText}>
            {loan.currency_code}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.heroCard,
          overdue
            ? styles.heroCardOverdue
            : null,
          settled
            ? styles.heroCardSettled
            : null,
        ]}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroMain}>
            <Text style={styles.heroLabel}>
              Remaining principal
            </Text>

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
              style={styles.heroAmount}
            >
              {loan.currency_code}{' '}
              {formatMinor(
                loan.remaining_minor,
                minorUnit,
              )}
            </Text>
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

        <View style={styles.moneyGrid}>
          <View style={styles.moneyCell}>
            <Text style={styles.moneyLabel}>
              Original principal
            </Text>

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={styles.moneyValue}
            >
              {loan.currency_code}{' '}
              {formatMinor(
                loan.principal_minor,
                minorUnit,
              )}
            </Text>
          </View>

          <View style={styles.moneyDivider} />

          <View style={styles.moneyCell}>
            <Text style={styles.moneyLabel}>
              Paid
            </Text>

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={styles.moneyValue}
            >
              {loan.currency_code}{' '}
              {formatMinor(
                loan.paid_minor,
                minorUnit,
              )}
            </Text>
          </View>
        </View>

        {!settled ? (
          <AppButton
            label="Record payment"
            icon="checkmark-circle-outline"
            onPress={() => {
              router.push({
                pathname:
                  '/loan-payment' as never,
                params: {
                  loanId:
                    loan.id,
                },
              });
            }}
          />
        ) : (
          <View style={styles.settledBanner}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={
                colors.success
              }
            />

            <Text style={styles.settledBannerText}>
              Loan principal is fully settled
            </Text>
          </View>
        )}
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.detailsHeader}>
          <Ionicons
            name="document-text-outline"
            size={20}
            color={
              colors.primary
            }
          />

          <Text style={styles.detailsTitle}>
            Loan details
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Start date
          </Text>

          <Text style={styles.detailValue}>
            {friendlyDate(
              loan.start_date,
            )}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Due date
          </Text>

          <Text
            style={[
              styles.detailValue,
              overdue
                ? styles.detailValueOverdue
                : null,
            ]}
          >
            {friendlyDate(
              loan.due_date,
            )}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Interest
          </Text>

          <Text style={styles.detailValue}>
            {interestBasisPointsToPercent(
              loan.interest_rate_basis_points,
            )}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Payment plan
          </Text>

          <Text style={styles.detailValue}>
            {paymentFrequencyLabel(
              loan.payment_frequency,
            )}
          </Text>
        </View>

        {loan.scheduled_payment_minor ? (
          <>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Scheduled amount
              </Text>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={styles.detailValue}
              >
                {loan.currency_code}{' '}
                {formatMinor(
                  loan.scheduled_payment_minor,
                  minorUnit,
                )}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {loan.notes ? (
        <View style={styles.noteCard}>
          <View style={styles.noteIcon}>
            <Ionicons
              name="document-outline"
              size={19}
              color={
                colors.primary
              }
            />
          </View>

          <View style={styles.noteCopy}>
            <Text style={styles.noteTitle}>
              Notes
            </Text>

            <Text style={styles.noteText}>
              {loan.notes}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.ledgerNotice}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={
            colors.primary
          }
        />

        <Text style={styles.ledgerNoticeText}>
          Loan payments update the payment history and remaining principal only. They do not automatically move money between accounts.
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Payment history
          </Text>

          <Text style={styles.sectionBody}>
            Permanent repayment records for this loan.
          </Text>
        </View>

        <Text style={styles.sectionMeta}>
          {loan.payment_count}
          {' payment'}
          {loan.payment_count === '1'
            ? ''
            : 's'}
        </Text>
      </View>

      {historyQuery.error ? (
        <StatePanel
          title="Payment history unavailable"
          description={
            toUserFacingError(
              historyQuery.error,
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
                void historyQuery.refetch();
              }}
            />
          }
        />
      ) : historyQuery.isLoading ? (
        <StatePanel
          loading
          title="Loading payments"
          description="Checking the repayment history for this loan."
        />
      ) : history.length === 0 ? (
        <View style={styles.emptyHistory}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="cash-outline"
              size={23}
              color={
                colors.primary
              }
            />
          </View>

          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>
              No payments yet
            </Text>

            <Text style={styles.emptyBody}>
              Repayments will appear here as a permanent history.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.historyCard}>
          {history.map(
            (
              payment,
              index,
            ) => (
              <View key={payment.id}>
                {index > 0 ? (
                  <View style={styles.divider} />
                ) : null}

                <View style={styles.historyRow}>
                  <View style={styles.historyIcon}>
                    <Ionicons
                      name="checkmark-outline"
                      size={17}
                      color={
                        colors.success
                      }
                    />
                  </View>

                  <View style={styles.historyCopy}>
                    <Text style={styles.historyDate}>
                      {friendlyDate(
                        payment.payment_date,
                      )}
                    </Text>

                    {payment.note ? (
                      <Text
                        numberOfLines={2}
                        style={styles.historyNote}
                      >
                        {payment.note}
                      </Text>
                    ) : (
                      <Text style={styles.historyNote}>
                        Loan payment
                      </Text>
                    )}
                  </View>

                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={styles.historyAmount}
                  >
                    {loan.currency_code}{' '}
                    {formatMinor(
                      payment.amount_minor,
                      minorUnit,
                    )}
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>
      )}
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

    centered: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
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

    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap:
        spacing.xs,
    },

    metaPill: {
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.primarySoft,
    },

    metaPillText: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    metaText: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    heroCard: {
      gap:
        spacing.lg,
      padding:
        spacing.lg,
      borderRadius:
        radii.xl,
      backgroundColor:
        colors.primary,
      ...elevation.floating,
    },

    heroCardOverdue: {
      backgroundColor:
        colors.text,
      borderWidth: 1,
      borderColor:
        colors.warning,
    },

    heroCardSettled: {
      backgroundColor:
        colors.text,
    },

    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
    },

    heroMain: {
      flex: 1,
      minWidth: 0,
    },

    heroLabel: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    heroAmount: {
      marginTop:
        spacing.xs,
      color:
        colors.textOnPrimary,
      fontSize:
        typography.title,
      lineHeight:
        typography.lineHeightTitle,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.7,
    },

    statusPill: {
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.xs,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.focus,
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
        colors.accentStrong,
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

    moneyGrid: {
      flexDirection: 'row',
      gap:
        spacing.md,
      paddingTop:
        spacing.md,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        colors.focus,
    },

    moneyCell: {
      flex: 1,
      minWidth: 0,
    },

    moneyDivider: {
      width: 1,
      backgroundColor:
        colors.focus,
    },

    moneyLabel: {
      color:
        colors.accentStrong,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    moneyValue: {
      marginTop:
        spacing.xxs,
      color:
        colors.textOnPrimary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightExtraBold,
    },

    settledBanner: {
      minHeight:
        layout.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap:
        spacing.xs,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.successSurface,
    },

    settledBannerText: {
      color:
        colors.success,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    detailsCard: {
      paddingHorizontal:
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

    detailsHeader: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        colors.border,
    },

    detailsTitle: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    detailRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
      paddingVertical:
        spacing.sm,
    },

    detailLabel: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    detailValue: {
      flex: 1,
      color:
        colors.text,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      textAlign: 'right',
    },

    detailValueOverdue: {
      color:
        colors.warning,
    },

    divider: {
      height:
        StyleSheet.hairlineWidth,
      backgroundColor:
        colors.border,
    },

    noteCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.surfaceMuted,
    },

    noteIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.white,
    },

    noteCopy: {
      flex: 1,
      gap:
        spacing.xxs,
    },

    noteTitle: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    noteText: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    ledgerNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.primarySoft,
    },

    ledgerNoticeText: {
      flex: 1,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
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

    sectionBody: {
      marginTop:
        spacing.xxs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    sectionMeta: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    emptyHistory: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.sm,
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

    emptyIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    emptyCopy: {
      flex: 1,
      gap:
        spacing.xxs,
    },

    emptyTitle: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    emptyBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    historyCard: {
      paddingHorizontal:
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

    historyRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
      paddingVertical:
        spacing.sm,
    },

    historyIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.successSurface,
    },

    historyCopy: {
      flex: 1,
      minWidth: 0,
    },

    historyDate: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    historyNote: {
      marginTop:
        spacing.xxs,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    historyAmount: {
      maxWidth: '42%',
      color:
        colors.success,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightExtraBold,
      textAlign: 'right',
    },
  });