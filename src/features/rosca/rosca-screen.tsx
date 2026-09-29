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
  roscaFrequencyLabel,
  roscaStatusLabel,
} from './rosca-format';

import {
  useRoscaGroups,
} from './rosca-query';

function friendlyDate(
  value: string | null,
): string | null {
  if (!value) {
    return null;
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

export function RoscaScreen() {
  const router =
    useRouter();

  const query =
    useRoscaGroups();

  const reference =
    useLocalFinanceReferenceData();

  const groups =
    query.data ?? [];

  const activeCount =
    groups.filter(
      group =>
        group.status
        === 'active',
    ).length;

  const formingCount =
    groups.filter(
      group =>
        group.status
        === 'forming',
    ).length;

  const completedCount =
    groups.filter(
      group =>
        group.status
        === 'completed',
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
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>
            SHARED SAVING
          </Text>

          <Text
            accessibilityRole="header"
            style={styles.title}
          >
            ROSCA groups
          </Text>

          <Text style={styles.subtitle}>
            Keep member order, contributions, and payouts organized without mixing group activity into your normal ledger.
          </Text>
        </View>

        <View style={styles.actions}>
          <AppButton
            label="Create group"
            icon="add-outline"
            onPress={() => {
              router.push(
                '/create-rosca' as never,
              );
            }}
          />

          <AppButton
            label="Join with code"
            variant="secondary"
            icon="people-outline"
            onPress={() => {
              router.push(
                '/join-rosca' as never,
              );
            }}
          />
        </View>

        {!query.isLoading
        && !query.error
        && groups.length > 0 ? (
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
              <Text style={styles.summaryValue}>
                {formingCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Forming
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
                {completedCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Complete
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {query.isLoading ? (
        <StatePanel
          loading
          title="Loading ROSCA groups"
          description="Checking your shared saving groups and upcoming cycles."
        />
      ) : null}

      {query.error ? (
        <StatePanel
          title="ROSCA groups unavailable"
          description={
            toUserFacingError(
              query.error,
              'rosca',
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
      && groups.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="people-outline"
              size={28}
              color={
                colors.primary
              }
            />
          </View>

          <Text style={styles.emptyTitle}>
            Start or join a saving circle
          </Text>

          <Text style={styles.emptyBody}>
            Create a new ROSCA group for people you know, or enter an invite code to join an existing group.
          </Text>
        </View>
      ) : null}

      {!query.isLoading
      && !query.error
      && groups.length > 0 ? (
        <View style={styles.list}>
          {groups.map(
            group => {
              const minorUnit =
                minorUnitFor(
                  group.currency_code,
                );

              const completed =
                group.status
                === 'completed';

              const nextDate =
                friendlyDate(
                  group.next_due_date,
                );

              return (
                <Pressable
                  key={group.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${group.name}`}
                  onPress={() => {
                    router.push({
                      pathname:
                        '/rosca-detail' as never,
                      params: {
                        groupId:
                          group.id,
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
                              : 'people-outline'
                          }
                          size={20}
                          color={
                            completed
                              ? colors.success
                              : colors.primary
                          }
                        />
                      </View>

                      <View style={styles.cardCopy}>
                        <Text
                          numberOfLines={1}
                          style={styles.cardTitle}
                        >
                          {group.name}
                        </Text>

                        <Text style={styles.cardMeta}>
                          {roscaFrequencyLabel(
                            group.contribution_frequency,
                          )}
                          {'  |  '}
                          {group.member_count}
                          /
                          {group.cycle_count}
                          {' members'}
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
                          styles.statusText,
                          completed
                            ? styles.statusTextCompleted
                            : null,
                        ]}
                      >
                        {roscaStatusLabel(
                          group.status,
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountBlock}>
                    <Text style={styles.amountLabel}>
                      Contribution per member / cycle
                    </Text>

                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                      style={styles.amount}
                    >
                      {group.currency_code}{' '}
                      {formatMinor(
                        group.contribution_amount_minor,
                        minorUnit,
                      )}
                    </Text>
                  </View>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>
                        Your payout order
                      </Text>

                      <Text style={styles.detailValue}>
                        #{group.my_member_order}
                      </Text>
                    </View>

                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>
                        Next cycle
                      </Text>

                      <Text
                        numberOfLines={2}
                        style={styles.detailValue}
                      >
                        {nextDate
                          ? nextDate
                          : group.status
                            === 'forming'
                            ? 'Waiting for members'
                            : 'No upcoming cycle'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>
                      Group contributions stay separate from your normal ledger.
                    </Text>

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

    headerCopy: {
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

    actions: {
      gap:
        spacing.sm,
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
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    cardIconCompleted: {
      backgroundColor:
        colors.successSurface,
    },

    cardCopy: {
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

    statusText: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
    },

    statusTextCompleted: {
      color:
        colors.success,
    },

    amountBlock: {
      gap:
        spacing.xxs,
    },

    amountLabel: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    amount: {
      color:
        colors.text,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.4,
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

    footerText: {
      flex: 1,
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },
  });