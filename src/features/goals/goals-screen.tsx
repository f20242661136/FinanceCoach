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
  formatGoalProgressPercent,
  goalProgressWidth,
} from './savings-goal-format';

import {
  useSavingsGoalStatus,
} from './savings-goal-query';

function labelGoalType(
  value: string,
): string {
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

function friendlyTargetDate(
  value: string | null,
): string {
  if (!value) {
    return 'No target date';
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
    return `Target ${value}`;
  }

  return `Target ${parsed.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  )}`;
}

export function GoalsScreen() {
  const router =
    useRouter();

  const query =
    useSavingsGoalStatus();

  const reference =
    useLocalFinanceReferenceData();

  const goals =
    query.data ?? [];

  const reachedCount =
    goals.filter(
      goal =>
        goal.is_target_reached,
    ).length;

  const activeCount =
    goals.filter(
      goal =>
        goal.status
        === 'active'
        && !goal.is_target_reached,
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
              SAVE WITH PURPOSE
            </Text>

            <Text
              accessibilityRole="header"
              style={styles.title}
            >
              Savings goals
            </Text>

            <Text style={styles.subtitle}>
              Turn future plans into visible progress, one contribution at a time.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create savings goal"
            onPress={() => {
              router.push(
                '/create-goal' as never,
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
        && goals.length > 0 ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {goals.length}
              </Text>

              <Text style={styles.summaryLabel}>
                Total
              </Text>
            </View>

            <View style={styles.summaryDivider} />

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
                  styles.summarySuccess,
                ]}
              >
                {reachedCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Reached
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {query.isLoading ? (
        <StatePanel
          loading
          title="Loading goals"
          description="Bringing together your targets and contribution progress."
        />
      ) : null}

      {query.error ? (
        <StatePanel
          title="Goals unavailable"
          description={
            toUserFacingError(
              query.error,
              'goal',
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
      && goals.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="flag-outline"
              size={28}
              color={
                colors.primary
              }
            />
          </View>

          <Text style={styles.emptyTitle}>
            Give your savings a purpose
          </Text>

          <Text style={styles.emptyBody}>
            Create a target for an emergency fund, travel, education, a home, retirement, or anything else that matters to you.
          </Text>

          <AppButton
            label="Create goal"
            icon="add-outline"
            onPress={() => {
              router.push(
                '/create-goal' as never,
              );
            }}
          />
        </View>
      ) : null}

      {!query.isLoading
      && !query.error
      && goals.length > 0 ? (
        <View style={styles.list}>
          {goals.map(
            goal => {
              const minorUnit =
                minorUnitFor(
                  goal.currency_code,
                );

              const completed =
                goal.is_target_reached;

              return (
                <Pressable
                  key={goal.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${goal.name}`}
                  onPress={() => {
                    router.push({
                      pathname:
                        '/goal-detail' as never,
                      params: {
                        goalId:
                          goal.id,
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    completed
                      ? styles.cardCompleted
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
                          completed
                            ? styles.cardIconCompleted
                            : null,
                        ]}
                      >
                        <Ionicons
                          name={
                            completed
                              ? 'checkmark-outline'
                              : 'flag-outline'
                          }
                          size={20}
                          color={
                            completed
                              ? colors.success
                              : colors.primary
                          }
                        />
                      </View>

                      <View style={styles.cardHeaderCopy}>
                        <Text
                          numberOfLines={1}
                          style={styles.cardTitle}
                        >
                          {goal.name}
                        </Text>

                        <Text style={styles.cardMeta}>
                          {labelGoalType(
                            goal.goal_type,
                          )}
                          {'  |  '}
                          {goal.currency_code}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        completed
                          ? styles.statusPillCompleted
                          : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          completed
                            ? styles.statusPillTextCompleted
                            : null,
                        ]}
                      >
                        {completed
                          ? 'Reached'
                          : formatGoalProgressPercent(
                              goal.progress_basis_points,
                            )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressArea}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabel}>
                        Goal progress
                      </Text>

                      <Text
                        style={[
                          styles.progressPercent,
                          completed
                            ? styles.progressPercentCompleted
                            : null,
                        ]}
                      >
                        {formatGoalProgressPercent(
                          goal.progress_basis_points,
                        )}
                      </Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width:
                              goalProgressWidth(
                                goal.progress_basis_points,
                              ),
                          },
                          completed
                            ? styles.progressFillCompleted
                            : null,
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.moneyGrid}>
                    <View style={styles.moneyCell}>
                      <Text style={styles.moneyLabel}>
                        Saved
                      </Text>

                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={styles.moneyValue}
                      >
                        {goal.currency_code}{' '}
                        {formatMinor(
                          goal.contributed_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>

                    <View style={styles.moneyCell}>
                      <Text style={styles.moneyLabel}>
                        Target
                      </Text>

                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={styles.moneyValue}
                      >
                        {goal.currency_code}{' '}
                        {formatMinor(
                          goal.target_amount_minor,
                          minorUnit,
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.footerRow}>
                    <View style={styles.footerItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={
                          colors.textTertiary
                        }
                      />

                      <Text style={styles.footerText}>
                        {friendlyTargetDate(
                          goal.target_date,
                        )}
                      </Text>
                    </View>

                    <View style={styles.footerItem}>
                      <Ionicons
                        name="add-circle-outline"
                        size={15}
                        color={
                          colors.textTertiary
                        }
                      />

                      <Text style={styles.footerText}>
                        {goal.contribution_count}{' '}
                        contribution{
                          goal.contribution_count
                            === '1'
                            ? ''
                            : 's'
                        }
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

    summaryPrimary: {
      color:
        colors.primary,
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

    cardCompleted: {
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

    cardIconCompleted: {
      backgroundColor:
        colors.successSurface,
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

    statusPillCompleted: {
      backgroundColor:
        colors.successSurface,
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

    statusPillTextCompleted: {
      color:
        colors.success,
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

    progressPercentCompleted: {
      color:
        colors.success,
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

    progressFillCompleted: {
      backgroundColor:
        colors.success,
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

    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
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
  });