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
  useRouter,
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
  useRoscaGroups,
} from './rosca-query';


export function RoscaScreen() {
  const router =
    useRouter();

  const query =
    useRoscaGroups();

  const reference =
    useLocalFinanceReferenceData();

  const groups =
    query.data ?? [];


  function minorUnitFor(
    currencyCode: string,
  ): number {
    return (
      reference.data
        ?.currencies
        .find(
          (currency) =>
            currency.code ===
            currencyCode,
        )
        ?.minorUnit
      ?? 2
    );
  }


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
        ROSCA
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Rotating savings groups
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Track member order, planned contributions, paid contributions and payouts without mixing them into your normal ledger.
      </Text>


      <View
        style={
          styles.actions
        }
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push(
              '/create-rosca' as never,
            );
          }}
          style={
            styles.primaryButton
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Create group
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push(
              '/join-rosca' as never,
            );
          }}
          style={
            styles.secondaryButton
          }
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Join with code
          </Text>
        </Pressable>
      </View>


      {query.isLoading ? (
        <View
          style={
            styles.stateCard
          }
        >
          <Text
            style={
              styles.stateText
            }
          >
            Loading groups…
          </Text>
        </View>
      ) : null}


      {!query.isLoading
      && groups.length === 0 ? (
        <View
          style={
            styles.emptyCard
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            No ROSCA groups yet
          </Text>

          <Text
            style={
              styles.emptyBody
            }
          >
            Create a group or enter an invite code to join an existing one.
          </Text>
        </View>
      ) : null}


      <View
        style={
          styles.list
        }
      >
        {groups.map(
          (group) => {
            const minorUnit =
              minorUnitFor(
                group.currency_code,
              );

            return (
              <Pressable
                key={
                  group.id
                }
                accessibilityRole="button"
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

                  group.status ===
                    'completed'
                    ? styles.completedCard
                    : null,

                  pressed
                    ? styles.pressed
                    : null,
                ]}
              >
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.cardCopy
                    }
                  >
                    <Text
                      style={
                        styles.cardTitle
                      }
                    >
                      {group.name}
                    </Text>

                    <Text
                      style={
                        styles.cardMeta
                      }
                    >
                      {roscaFrequencyLabel(
                        group.contribution_frequency,
                      )}
                      {' · '}
                      {group.member_count}
                      /
                      {group.cycle_count}
                      {' members'}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.statusPill
                    }
                  >
                    <Text
                      style={
                        styles.statusText
                      }
                    >
                      {roscaStatusLabel(
                        group.status,
                      )}
                    </Text>
                  </View>
                </View>


                <Text
                  style={
                    styles.amount
                  }
                >
                  {group.currency_code}{' '}
                  {formatMinor(
                    group.contribution_amount_minor,
                    minorUnit,
                  )}
                </Text>

                <Text
                  style={
                    styles.amountLabel
                  }
                >
                  contribution per member / cycle
                </Text>


                <View
                  style={
                    styles.footer
                  }
                >
                  <Text
                    style={
                      styles.footerText
                    }
                  >
                    Your payout order: #
                    {group.my_member_order}
                  </Text>

                  <Text
                    style={
                      styles.footerText
                    }
                  >
                    {group.next_due_date
                      ? `Next ${group.next_due_date}`
                      : group.status === 'forming'
                        ? 'Waiting for members'
                        : 'No upcoming cycle'}
                  </Text>
                </View>
              </Pressable>
            );
          },
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
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: layout.screenHorizontalPadding,
      paddingTop: 22,
      paddingBottom: 120,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1.4,
    },

    title: {
      marginTop: 8,
      color: colors.text,
      fontSize: typography.title,
      lineHeight: 35,
      fontWeight: typography.weightBold,
    },

    subtitle: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight: 21,
    },

    actions: {
      flexDirection: 'row',
      gap: 9,
      marginTop: 20,
      marginBottom: 18,
    },

    primaryButton: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    primaryButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    secondaryButton: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },

    secondaryButtonText: {
      color: colors.primary,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    stateCard: {
      padding: 17,
      borderRadius: 16,
      backgroundColor: colors.surface,
      ...elevation.card
    },

    stateText: {
      color: colors.textSecondary,
      fontSize: typography.small,
    },

    emptyCard: {
      padding: 19,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    emptyTitle: {
      color: colors.text,
      fontSize: typography.body,
      fontWeight: typography.weightBold,
    },

    emptyBody: {
      marginTop: 5,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 18,
    },

    list: {
      gap: 12,
    },

    card: {
      padding: 17,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    completedCard: {
      backgroundColor: colors.successSurface,
      borderColor: colors.accentStrong,
    },

    pressed: {
      opacity: 0.84,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },

    cardCopy: {
      flex: 1,
    },

    cardTitle: {
      color: colors.text,
      fontSize: typography.subheading,
      fontWeight: typography.weightBold,
    },

    cardMeta: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
    },

    statusPill: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: colors.primarySoft,
    },

    statusText: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    amount: {
      marginTop: 15,
      color: colors.text,
      fontSize: 20,
      fontWeight: typography.weightBold,
    },

    amountLabel: {
      marginTop: 2,
      color: colors.textTertiary,
      fontSize: typography.caption,
    },

    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 13,
    },

    footerText: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 15,
    },
  });