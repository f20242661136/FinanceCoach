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
  formatUsagePercent,
} from './budget-money';

import {
  useBudgetStatus,
} from './budget-query';

function friendlyDate(
  value: string,
): string {
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
    },
  );
}

function periodLabel(
  start: string,
  end: string,
): string {
  return `${friendlyDate(
    start,
  )} - ${friendlyDate(
    end,
  )}`;
}

function progressWidth(
  basisPoints: string,
): `${number}%` {
  const raw =
    BigInt(
      basisPoints,
    );

  const clamped =
    raw < BigInt(0)
      ? BigInt(0)
      : raw > BigInt(10000)
        ? BigInt(10000)
        : raw;

  const percent =
    Number(
      clamped,
    )
    / 100;

  return `${percent}%`;
}

export function BudgetsScreen() {
  const router =
    useRouter();

  const query =
    useBudgetStatus();

  const reference =
    useLocalFinanceReferenceData();

  const budgets =
    query.data ?? [];

  const overCount =
    budgets.filter(
      budget =>
        budget.is_over_budget,
    ).length;

  const onTrackCount =
    budgets.length
    - overCount;

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
              PLAN YOUR SPENDING
            </Text>

            <Text
              accessibilityRole="header"
              style={styles.title}
            >
              Budgets
            </Text>

            <Text style={styles.subtitle}>
              Set clear limits, then compare them with spending from your ledger.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create budget"
            onPress={() => {
              router.push(
                '/create-budget' as never,
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
        && budgets.length > 0 ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {budgets.length}
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
                  styles.summaryGood,
                ]}
              >
                {onTrackCount}
              </Text>

              <Text style={styles.summaryLabel}>
                On track
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryValue,
                  overCount > 0
                    ? styles.summaryDanger
                    : null,
                ]}
              >
                {overCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Over
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {query.isLoading ? (
        <StatePanel
          loading
          title="Loading budgets"
          description="Checking your current limits against ledger spending."
        />
      ) : null}

      {query.error ? (
        <StatePanel
          title="Budgets unavailable"
          description={
            toUserFacingError(
              query.error,
              'budget',
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
      && budgets.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="pie-chart-outline"
              size={28}
              color={
                colors.primary
              }
            />
          </View>

          <Text style={styles.emptyTitle}>
            Create your first budget
          </Text>

          <Text style={styles.emptyBody}>
            Start simple with one overall monthly limit, or focus on a category you want to control.
          </Text>

          <AppButton
            label="Create budget"
            icon="add-outline"
            onPress={() => {
              router.push(
                '/create-budget' as never,
              );
            }}
          />
        </View>
      ) : null}

      {!query.isLoading
      && !query.error
      && budgets.length > 0 ? (
        <View style={styles.list}>
          {budgets.map(
            budget => {
              const minorUnit =
                minorUnitFor(
                  budget.currency_code,
                );

              const over =
                budget.is_over_budget;

              const remainingNegative =
                budget.remaining_minor
                  .startsWith('-');

              return (
                <View
                  key={budget.id}
                  style={[
                    styles.card,
                    over
                      ? styles.cardDanger
                      : null,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIdentity}>
                      <View
                        style={[
                          styles.cardIcon,
                          over
                            ? styles.cardIconDanger
                            : null,
                        ]}
                      >
                        <Ionicons
                          name={
                            budget.category_name
                              ? 'pricetag-outline'
                              : 'wallet-outline'
                          }
                          size={20}
                          color={
                            over
                              ? colors.danger
                              : colors.primary
                          }
                        />
                      </View>

                      <View style={styles.cardHeaderCopy}>
                        <Text
                          numberOfLines={1}
                          style={styles.cardTitle}
                        >
                          {budget.name}
                        </Text>

                        <Text style={styles.cardMeta}>
                          {budget.category_name
                            ?? 'Overall spending'}
                          {'  |  '}
                          {budget.currency_code}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        over
                          ? styles.statusPillDanger
                          : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          over
                            ? styles.statusPillTextDanger
                            : null,
                        ]}
                      >
                        {over
                          ? 'Over limit'
                          : `${formatUsagePercent(
                              budget.usage_basis_points,
                            )} used`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressArea}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabel}>
                        Spending progress
                      </Text>

                      <Text
                        style={[
                          styles.progressPercent,
                          over
                            ? styles.progressPercentDanger
                            : null,
                        ]}
                      >
                        {formatUsagePercent(
                          budget.usage_basis_points,
                        )}
                      </Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width:
                              progressWidth(
                                budget.usage_basis_points,
                              ),
                          },
                          over
                            ? styles.progressFillDanger
                            : null,
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.moneyGrid}>
                    <View style={styles.moneyCell}>
                      <Text style={styles.moneyLabel}>
                        Spent
                      </Text>

                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={styles.moneyValue}
                      >
                        {budget.currency_code}{' '}
                        {formatMinor(
                          budget.spent_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>

                    <View style={styles.moneyCell}>
                      <Text style={styles.moneyLabel}>
                        Limit
                      </Text>

                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={styles.moneyValue}
                      >
                        {budget.currency_code}{' '}
                        {formatMinor(
                          budget.limit_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailStrip}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Remaining
                      </Text>

                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                        style={[
                          styles.detailValue,
                          remainingNegative
                            ? styles.detailValueDanger
                            : null,
                        ]}
                      >
                        {budget.currency_code}{' '}
                        {formatMinor(
                          budget.remaining_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>

                    <View style={styles.detailDivider} />

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>
                        Projected
                      </Text>

                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                        style={styles.detailValue}
                      >
                        {budget.currency_code}{' '}
                        {formatMinor(
                          budget.projected_spend_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.periodRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={
                        colors.textTertiary
                      }
                    />

                    <Text style={styles.period}>
                      {periodLabel(
                        budget.period_start,
                        budget.period_end,
                      )}
                    </Text>
                  </View>
                </View>
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
      maxWidth: 450,
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

    summaryGood: {
      color:
        colors.success,
    },

    summaryDanger: {
      color:
        colors.danger,
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
      maxWidth: 380,
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

    cardDanger: {
      borderColor:
        colors.danger,
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

    cardIconDanger: {
      backgroundColor:
        colors.dangerSurface,
    },

    cardHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },

    cardTitle: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    cardMeta: {
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
        colors.primarySoft,
    },

    statusPillDanger: {
      backgroundColor:
        colors.dangerSurface,
    },

    statusPillText: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    statusPillTextDanger: {
      color:
        colors.danger,
    },

    progressArea: {
      gap:
        spacing.xs,
    },

    progressLabels: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap:
        spacing.md,
    },

    progressLabel: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    progressPercent: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    progressPercentDanger: {
      color:
        colors.danger,
    },

    progressTrack: {
      height: 10,
      overflow: 'hidden',
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.surfaceStrong,
    },

    progressFill: {
      height: '100%',
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.primary,
    },

    progressFillDanger: {
      backgroundColor:
        colors.danger,
    },

    moneyGrid: {
      flexDirection: 'row',
      gap:
        spacing.sm,
    },

    moneyCell: {
      flex: 1,
      minWidth: 0,
      padding:
        spacing.sm,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.surfaceMuted,
    },

    moneyLabel: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightSemibold,
    },

    moneyValue: {
      marginTop:
        spacing.xxs,
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightExtraBold,
    },

    detailStrip: {
      flexDirection: 'row',
      alignItems: 'stretch',
      padding:
        spacing.sm,
      borderRadius:
        radii.md,
      borderWidth: 1,
      borderColor:
        colors.border,
    },

    detailItem: {
      flex: 1,
      minWidth: 0,
    },

    detailDivider: {
      width: 1,
      marginHorizontal:
        spacing.sm,
      backgroundColor:
        colors.border,
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
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    detailValueDanger: {
      color:
        colors.danger,
    },

    periodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.xs,
    },

    period: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },
  });