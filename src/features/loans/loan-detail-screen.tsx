import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

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
        (item) =>
          item.id ===
          loanId,
      )
    ?? null;


  const minorUnit =
    loan
      ? (
          reference.data
            ?.currencies
            .find(
              (currency) =>
                currency.code ===
                loan.currency_code,
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


  if (
    loansQuery.isLoading
  ) {
    return (
      <View
        style={
          styles.centered
        }
      >
        <Text
          style={
            styles.muted
          }
        >
          Loading loan…
        </Text>
      </View>
    );
  }


  if (!loan) {
    return (
      <View
        style={
          styles.centered
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Loan unavailable
        </Text>
      </View>
    );
  }


  const history =
    historyQuery.data
      ?? [];


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
            loansQuery.isRefetching
            || historyQuery.isRefetching
          }
          onRefresh={() => {
            void refresh();
          }}
        />
      }
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        {loan.direction ===
          'borrowed'
          ? 'BORROWED'
          : 'GIVEN'}
      </Text>

      <Text
        style={
          styles.title
        }
      >
        {loan.counterparty_name}
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        {loanDirectionLabel(
          loan.direction,
        )}
        {' · '}
        {loan.currency_code}
      </Text>


      <View
        style={[
          styles.heroCard,

          loan.is_overdue
            ? styles.heroOverdue
            : null,
        ]}
      >
        <View
          style={
            styles.heroTop
          }
        >
          <View>
            <Text
              style={
                styles.heroLabel
              }
            >
              Remaining principal
            </Text>

            <Text
              style={
                styles.heroAmount
              }
            >
              {loan.currency_code}{' '}
              {formatMinor(
                loan.remaining_minor,
                minorUnit,
              )}
            </Text>
          </View>

          <View
            style={
              styles.heroRight
            }
          >
            <Text
              style={
                styles.heroLabel
              }
            >
              Status
            </Text>

            <Text
              style={[
                styles.statusValue,

                loan.is_overdue
                  ? styles.overdueText
                  : null,
              ]}
            >
              {loan.status ===
                'settled'
                ? 'Settled'
                : loan.is_overdue
                  ? 'Overdue'
                  : 'Active'}
            </Text>
          </View>
        </View>


        <View
          style={
            styles.statRow
          }
        >
          <View>
            <Text
              style={
                styles.statLabel
              }
            >
              Principal
            </Text>

            <Text
              style={
                styles.statValue
              }
            >
              {loan.currency_code}{' '}
              {formatMinor(
                loan.principal_minor,
                minorUnit,
              )}
            </Text>
          </View>

          <View
            style={
              styles.statRight
            }
          >
            <Text
              style={
                styles.statLabel
              }
            >
              Paid
            </Text>

            <Text
              style={
                styles.statValue
              }
            >
              {loan.currency_code}{' '}
              {formatMinor(
                loan.paid_minor,
                minorUnit,
              )}
            </Text>
          </View>
        </View>


        {loan.status !==
          'settled' ? (
          <Pressable
            accessibilityRole="button"
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
            style={
              styles.paymentButton
            }
          >
            <Text
              style={
                styles.paymentButtonText
              }
            >
              Record payment
            </Text>
          </Pressable>
        ) : null}
      </View>


      <View
        style={
          styles.infoCard
        }
      >
        <View
          style={
            styles.infoRow
          }
        >
          <Text
            style={
              styles.infoLabel
            }
          >
            Start date
          </Text>

          <Text
            style={
              styles.infoValue
            }
          >
            {loan.start_date}
          </Text>
        </View>

        <View
          style={
            styles.infoRow
          }
        >
          <Text
            style={
              styles.infoLabel
            }
          >
            Due date
          </Text>

          <Text
            style={
              styles.infoValue
            }
          >
            {loan.due_date
              ?? 'Not set'}
          </Text>
        </View>

        <View
          style={
            styles.infoRow
          }
        >
          <Text
            style={
              styles.infoLabel
            }
          >
            Interest
          </Text>

          <Text
            style={
              styles.infoValue
            }
          >
            {interestBasisPointsToPercent(
              loan.interest_rate_basis_points,
            )}
          </Text>
        </View>

        <View
          style={
            styles.infoRow
          }
        >
          <Text
            style={
              styles.infoLabel
            }
          >
            Payment plan
          </Text>

          <Text
            style={
              styles.infoValue
            }
          >
            {loan.payment_frequency ===
              'none'
              ? 'Not set'
              : loan.payment_frequency}
          </Text>
        </View>

        {loan.scheduled_payment_minor ? (
          <View
            style={
              styles.infoRow
            }
          >
            <Text
              style={
                styles.infoLabel
              }
            >
              Scheduled amount
            </Text>

            <Text
              style={
                styles.infoValue
              }
            >
              {loan.currency_code}{' '}
              {formatMinor(
                loan.scheduled_payment_minor,
                minorUnit,
              )}
            </Text>
          </View>
        ) : null}
      </View>


      {loan.notes ? (
        <View
          style={
            styles.noteCard
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Notes
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {loan.notes}
          </Text>
        </View>
      ) : null}


      <View
        style={
          styles.ledgerNotice
        }
      >
        <Text
          style={
            styles.ledgerNoticeTitle
          }
        >
          Separate loan record
        </Text>

        <Text
          style={
            styles.ledgerNoticeText
          }
        >
          Recording a loan payment here updates loan history only. It does not automatically change an account balance or create a transaction.
        </Text>
      </View>


      <View
        style={
          styles.sectionHeader
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Payment history
        </Text>

        <Text
          style={
            styles.sectionMeta
          }
        >
          {loan.payment_count}{' '}
          payment{
            loan.payment_count ===
              '1'
              ? ''
              : 's'
          }
        </Text>
      </View>


      {!historyQuery.isLoading
      && history.length === 0 ? (
        <View
          style={
            styles.emptyHistory
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            No payments yet
          </Text>

          <Text
            style={
              styles.muted
            }
          >
            Payments will appear here as a permanent history.
          </Text>
        </View>
      ) : null}


      <View
        style={
          styles.historyList
        }
      >
        {history.map(
          (payment) => (
            <View
              key={
                payment.id
              }
              style={
                styles.historyRow
              }
            >
              <View
                style={
                  styles.historyCopy
                }
              >
                <Text
                  style={
                    styles.historyDate
                  }
                >
                  {payment.payment_date}
                </Text>

                {payment.note ? (
                  <Text
                    numberOfLines={2}
                    style={
                      styles.historyNote
                    }
                  >
                    {payment.note}
                  </Text>
                ) : null}
              </View>

              <Text
                style={
                  styles.historyAmount
                }
              >
                {loan.currency_code}{' '}
                {formatMinor(
                  payment.amount_minor,
                  minorUnit,
                )}
              </Text>
            </View>
          ),
        )}
      </View>
    </ScrollView>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      flexGrow: 1,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop: spacing.lg,
      paddingBottom: 120,
    },

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      backgroundColor: colors.background,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1.2,
    },

    title: {
      marginTop: spacing.sm,
      color: colors.text,
      fontSize: typography.title,
      lineHeight:
        typography.lineHeightTitle,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.6,
    },

    subtitle: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    heroCard: {
      marginTop: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    heroOverdue: {
      backgroundColor:
        colors.warningSurface,
      borderColor: colors.warning,
    },

    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },

    heroRight: {
      alignItems: 'flex-end',
    },

    heroLabel: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightSemibold,
    },

    heroAmount: {
      marginTop: spacing.xxs,
      color: colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.4,
    },

    statusValue: {
      marginTop: spacing.xxs,
      color: colors.primary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    overdueText: {
      color: colors.warning,
    },

    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },

    statRight: {
      alignItems: 'flex-end',
    },

    statLabel: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    statValue: {
      marginTop: spacing.xxs,
      color: colors.text,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    paymentButton: {
      minHeight: layout.touchTarget,
      marginTop: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    paymentButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight:
        typography.weightBold,
    },

    infoCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },

    infoLabel: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    infoValue: {
      flexShrink: 1,
      color: colors.text,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      textAlign: 'right',
      textTransform: 'capitalize',
    },

    noteCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor:
        colors.surfaceMuted,
    },

    noteText: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    ledgerNotice: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor:
        colors.infoSurface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    ledgerNoticeTitle: {
      color: colors.info,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    ledgerNoticeText: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    sectionMeta: {
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    emptyHistory: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    emptyTitle: {
      marginBottom: spacing.xs,
      color: colors.text,
      fontSize: typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    muted: {
      color: colors.textTertiary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    errorTitle: {
      color: colors.danger,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    historyList: {
      gap: spacing.sm,
    },

    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
    },

    historyCopy: {
      flex: 1,
      minWidth: 0,
    },

    historyDate: {
      color: colors.text,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightSemibold,
    },

    historyNote: {
      marginTop: spacing.xxs,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    historyAmount: {
      color: colors.success,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
      textAlign: 'right',
    },
  });
