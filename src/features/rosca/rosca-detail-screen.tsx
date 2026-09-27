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
  typography,
} from '@/design/tokens';

import {
  useLocalSearchParams,
} from 'expo-router';

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
  useMarkRoscaContributionPaid,
  useMarkRoscaPayoutPaid,
  useRoscaGroupDetail,
} from './rosca-query';


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


function today(): string {
  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}


export function RoscaDetailScreen() {
  const params =
    useLocalSearchParams<{
      groupId?:
        | string
        | string[];
    }>();

  const groupId =
    firstParam(
      params.groupId,
    );

  const query =
    useRoscaGroupDetail(
      groupId,
    );

  const reference =
    useLocalFinanceReferenceData();

  const contributionMutation =
    useMarkRoscaContributionPaid(
      groupId,
    );

  const payoutMutation =
    useMarkRoscaPayoutPaid(
      groupId,
    );

  const group =
    query.data;


  const minorUnit =
    group
      ? (
          reference.data
            ?.currencies
            .find(
              (currency) =>
                currency.code ===
                group.currency_code,
            )
            ?.minorUnit
          ?? 2
        )
      : 2;


  if (
    query.isLoading
    || !group
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
          {query.error
            ? 'ROSCA group unavailable'
            : 'Loading ROSCA…'}
        </Text>
      </View>
    );
  }


  const isOwner =
    group.my_role ===
      'owner';


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
            query.isRefetching
          }
          onRefresh={() => {
            void query.refetch();
          }}
        />
      }
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        ROSCA · {roscaStatusLabel(
          group.status,
        ).toUpperCase()}
      </Text>

      <Text
        style={
          styles.title
        }
      >
        {group.name}
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        {roscaFrequencyLabel(
          group.contribution_frequency,
        )}
        {' · '}
        {group.cycle_count}
        {' cycles · '}
        {group.currency_code}
      </Text>


      <View
        style={
          styles.summaryCard
        }
      >
        <Text
          style={
            styles.summaryLabel
          }
        >
          Contribution per member
        </Text>

        <Text
          style={
            styles.summaryAmount
          }
        >
          {group.currency_code}{' '}
          {formatMinor(
            group.contribution_amount_minor,
            minorUnit,
          )}
        </Text>

        <View
          style={
            styles.summaryFooter
          }
        >
          <Text
            style={
              styles.summaryMeta
            }
          >
            Starts {group.start_date}
          </Text>

          <Text
            style={
              styles.summaryMeta
            }
          >
            {group.members.length}
            /
            {group.cycle_count}
            {' members'}
          </Text>
        </View>
      </View>


      {group.status ===
        'forming' ? (
        <View
          style={
            styles.inviteCard
          }
        >
          <Text
            style={
              styles.sectionEyebrow
            }
          >
            INVITE CODE
          </Text>

          <Text
            selectable
            style={
              styles.joinCode
            }
          >
            {group.join_code}
          </Text>

          <Text
            style={
              styles.inviteText
            }
          >
            The group activates automatically when all {group.cycle_count} member slots are filled.
          </Text>
        </View>
      ) : null}


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
          Payout order
        </Text>
      </View>

      <View
        style={
          styles.memberList
        }
      >
        {group.members.map(
          (member) => (
            <View
              key={
                member.id
              }
              style={
                styles.memberRow
              }
            >
              <View
                style={
                  styles.orderBadge
                }
              >
                <Text
                  style={
                    styles.orderText
                  }
                >
                  {member.member_order}
                </Text>
              </View>

              <Text
                style={
                  styles.memberName
                }
              >
                {member.display_name}
                {member.is_me
                  ? ' · You'
                  : ''}
              </Text>

              <Text
                style={
                  styles.memberRole
                }
              >
                {member.role}
              </Text>
            </View>
          ),
        )}
      </View>


      {group.cycles.length > 0 ? (
        <>
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
              Cycles
            </Text>
          </View>

          <View
            style={
              styles.cycleList
            }
          >
            {group.cycles.map(
              (cycle) => (
                <View
                  key={
                    cycle.id
                  }
                  style={[
                    styles.cycleCard,

                    cycle.status ===
                      'closed'
                      ? styles.closedCycle
                      : null,
                  ]}
                >
                  <View
                    style={
                      styles.cycleHeader
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.cycleTitle
                        }
                      >
                        Cycle {cycle.cycle_number}
                      </Text>

                      <Text
                        style={
                          styles.cycleDate
                        }
                      >
                        Due {cycle.due_date}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.cycleStatus
                      }
                    >
                      {cycle.status}
                    </Text>
                  </View>


                  <Text
                    style={
                      styles.miniLabel
                    }
                  >
                    CONTRIBUTIONS
                  </Text>

                  {cycle.contributions.map(
                    (contribution) => {
                      const canMark =
                        contribution.status !==
                          'paid'
                        &&
                        (
                          contribution.is_mine
                          || isOwner
                        );

                      return (
                        <View
                          key={
                            contribution.id
                          }
                          style={
                            styles.contributionRow
                          }
                        >
                          <View
                            style={
                              styles.contributionCopy
                            }
                          >
                            <Text
                              style={
                                styles.contributionName
                              }
                            >
                              {contribution.display_name}
                              {contribution.is_mine
                                ? ' · You'
                                : ''}
                            </Text>

                            <Text
                              style={
                                styles.contributionStatus
                              }
                            >
                              {contribution.status ===
                                'paid'
                                ? `Paid ${contribution.paid_date ?? ''}`
                                : 'Planned'}
                            </Text>
                          </View>

                          {canMark ? (
                            <Pressable
                              accessibilityRole="button"
                              disabled={
                                contributionMutation.isPending
                              }
                              onPress={() => {
                                void contributionMutation
                                  .mutateAsync({
                                    contributionId:
                                      contribution.id,

                                    paidDate:
                                      today(),

                                    note:
                                      null,
                                  });
                              }}
                              style={
                                styles.smallButton
                              }
                            >
                              <Text
                                style={
                                  styles.smallButtonText
                                }
                              >
                                Mark paid
                              </Text>
                            </Pressable>
                          ) : (
                            <Text
                              style={[
                                styles.amountSmall,

                                contribution.status ===
                                  'paid'
                                  ? styles.paidText
                                  : null,
                              ]}
                            >
                              {group.currency_code}{' '}
                              {formatMinor(
                                contribution.planned_amount_minor,
                                minorUnit,
                              )}
                            </Text>
                          )}
                        </View>
                      );
                    },
                  )}


                  {cycle.payout ? (
                    <View
                      style={
                        styles.payoutCard
                      }
                    >
                      <View
                        style={
                          styles.payoutCopy
                        }
                      >
                        <Text
                          style={
                            styles.payoutLabel
                          }
                        >
                          PAYOUT
                        </Text>

                        <Text
                          style={
                            styles.payoutRecipient
                          }
                        >
                          {cycle.payout.recipient_display_name}
                        </Text>

                        <Text
                          style={
                            styles.payoutAmount
                          }
                        >
                          {group.currency_code}{' '}
                          {formatMinor(
                            cycle.payout.planned_amount_minor,
                            minorUnit,
                          )}
                        </Text>
                      </View>

                      {isOwner
                      && cycle.payout.status !==
                        'paid' ? (
                        <Pressable
                          accessibilityRole="button"
                          disabled={
                            payoutMutation.isPending
                          }
                          onPress={() => {
                            void payoutMutation
                              .mutateAsync({
                                payoutId:
                                  cycle.payout!.id,

                                paidDate:
                                  today(),

                                note:
                                  null,
                              });
                          }}
                          style={
                            styles.payoutButton
                          }
                        >
                          <Text
                            style={
                              styles.payoutButtonText
                            }
                          >
                            Mark payout paid
                          </Text>
                        </Pressable>
                      ) : (
                        <Text
                          style={
                            styles.payoutStatus
                          }
                        >
                          {cycle.payout.status ===
                            'paid'
                            ? `Paid ${cycle.payout.paid_date ?? ''}`
                            : 'Planned'}
                        </Text>
                      )}
                    </View>
                  ) : null}
                </View>
              ),
            )}
          </View>
        </>
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
          ROSCA records stay separate
        </Text>

        <Text
          style={
            styles.ledgerNoticeText
          }
        >
          Marking a ROSCA contribution or payout paid does not automatically create a normal transaction or alter an account balance.
        </Text>
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
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: layout.screenHorizontalPadding,
      paddingTop: 22,
      paddingBottom: 120,
    },

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },

    muted: {
      color: colors.textSecondary,
      fontSize: typography.small,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1.2,
    },

    title: {
      marginTop: 7,
      color: colors.text,
      fontSize: typography.title,
      fontWeight: typography.weightBold,
    },

    subtitle: {
      marginTop: 7,
      color: colors.textSecondary,
      fontSize: typography.small,
    },

    summaryCard: {
      marginTop: 19,
      padding: 17,
      borderRadius: radii.lg,
      backgroundColor: colors.text,
      ...elevation.card
    },

    summaryLabel: {
      color: colors.borderStrong,
      fontSize: typography.caption,
    },

    summaryAmount: {
      marginTop: 4,
      color: colors.textOnPrimary,
      fontSize: typography.heading,
      fontWeight: typography.weightBold,
    },

    summaryFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 13,
    },

    summaryMeta: {
      color: colors.borderStrong,
      fontSize: typography.caption,
    },

    inviteCard: {
      marginTop: 13,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.primarySoft,
      ...elevation.card
    },

    sectionEyebrow: {
      color: colors.textSecondary,
      fontSize: 9,
      fontWeight: typography.weightBold,
      letterSpacing: 1,
    },

    joinCode: {
      marginTop: 6,
      color: colors.primary,
      fontSize: 24,
      fontWeight: typography.weightBold,
      letterSpacing: 2,
    },

    inviteText: {
      marginTop: 7,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },

    sectionHeader: {
      marginTop: 23,
      marginBottom: 10,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: typography.weightBold,
    },

    memberList: {
      gap: 7,
    },

    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    orderBadge: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.pill,
      backgroundColor: colors.primarySoft,
    },

    orderText: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    memberName: {
      flex: 1,
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    memberRole: {
      color: colors.textTertiary,
      fontSize: 9,
      textTransform: 'capitalize',
    },

    cycleList: {
      gap: 12,
    },

    cycleCard: {
      padding: 15,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    closedCycle: {
      backgroundColor: colors.successSurface,
    },

    cycleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },

    cycleTitle: {
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    cycleDate: {
      marginTop: 3,
      color: colors.textSecondary,
      fontSize: typography.caption,
    },

    cycleStatus: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      textTransform: 'capitalize',
    },

    miniLabel: {
      marginTop: 14,
      marginBottom: 5,
      color: colors.textTertiary,
      fontSize: 8,
      fontWeight: typography.weightBold,
      letterSpacing: 1,
    },

    contributionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    contributionCopy: {
      flex: 1,
    },

    contributionName: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    contributionStatus: {
      marginTop: 2,
      color: colors.textTertiary,
      fontSize: 9,
    },

    amountSmall: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    paidText: {
      color: colors.primary,
    },

    smallButton: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 9,
      backgroundColor: colors.primarySoft,
    },

    smallButtonText: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: typography.weightBold,
    },

    payoutCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
      padding: 12,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceMuted,
      ...elevation.card
    },

    payoutCopy: {
      flex: 1,
    },

    payoutLabel: {
      color: colors.textTertiary,
      fontSize: 8,
      fontWeight: typography.weightBold,
      letterSpacing: 1,
    },

    payoutRecipient: {
      marginTop: 3,
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    payoutAmount: {
      marginTop: 2,
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    payoutButton: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 9,
      backgroundColor: colors.primary,
    },

    payoutButtonText: {
      color: colors.textOnPrimary,
      fontSize: 9,
      fontWeight: typography.weightBold,
    },

    payoutStatus: {
      color: colors.textSecondary,
      fontSize: 9,
      fontWeight: typography.weightBold,
    },

    ledgerNotice: {
      marginTop: 18,
      padding: 14,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceMuted,
    },

    ledgerNoticeTitle: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    ledgerNoticeText: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },
  });