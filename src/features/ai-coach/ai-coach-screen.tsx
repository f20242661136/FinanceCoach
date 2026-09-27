import {
  useMemo,
} from 'react';

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
  useAiConversations,
  useCreateAiConversation,
  useFinancialInsights,
  useGenerateAiFinancialInsight,
} from './ai-coach-query';


function deviceTimezone(): string {
  try {
    return (
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone
      || 'UTC'
    );
  } catch {
    return 'UTC';
  }
}


export function AiCoachScreen() {
  const router =
    useRouter();

  const timezone =
    useMemo(() => deviceTimezone(), []);

  const conversations =
    useAiConversations();

  const insights =
    useFinancialInsights();

  const createConversation =
    useCreateAiConversation();

  const generateInsight =
    useGenerateAiFinancialInsight(
      timezone,
    );


  const latestInsight =
    insights.data?.[0]
    ?? null;


  async function newConversation() {
    const conversationId =
      await createConversation
        .mutateAsync(
          undefined,
        );


    router.push({
      pathname:
        '/ai-chat' as never,

      params: {
        conversationId,
      },
    });
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
            conversations.isRefetching
            || insights.isRefetching
          }
          onRefresh={() => {
            void Promise.all([
              conversations.refetch(),
              insights.refetch(),
            ]);
          }}
        />
      }
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        AI COACH
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Understand your money
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Finance Coach explains trusted app data, highlights patterns and suggests practical next steps. It cannot move or modify your money.
      </Text>


      <Pressable
        accessibilityRole="button"
        disabled={
          createConversation.isPending
        }
        onPress={() => {
          void newConversation();
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
          {createConversation.isPending
            ? 'Opening…'
            : 'Ask Finance Coach'}
        </Text>
      </Pressable>


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
          Latest insight
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={
            generateInsight.isPending
          }
          onPress={() => {
            void generateInsight
              .mutateAsync();
          }}
        >
          <Text
            style={
              styles.linkText
            }
          >
            {generateInsight.isPending
              ? 'Generating…'
              : latestInsight
                ? 'Refresh'
                : 'Generate'}
          </Text>
        </Pressable>
      </View>


      {generateInsight.error ? (
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
            {generateInsight.error instanceof Error
              ? generateInsight.error.message
              : 'Could not generate an insight.'}
          </Text>
        </View>
      ) : null}


      {latestInsight ? (
        <View
          style={
            styles.insightCard
          }
        >
          <Text
            style={
              styles.insightType
            }
          >
            {latestInsight.insight_type
              .replace(
                /_/g,
                ' ',
              )
              .toUpperCase()}
          </Text>

          <Text
            style={
              styles.insightTitle
            }
          >
            {latestInsight.title}
          </Text>

          <Text
            style={
              styles.insightBody
            }
          >
            {latestInsight.body}
          </Text>

          {latestInsight.source_period_start
          && latestInsight.source_period_end ? (
            <Text
              style={
                styles.insightPeriod
              }
            >
              Based on {
                latestInsight.source_period_start
              } to {
                latestInsight.source_period_end
              }
            </Text>
          ) : null}
        </View>
      ) : (
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
            No AI insight yet
          </Text>

          <Text
            style={
              styles.emptyBody
            }
          >
            Generate an insight when you want the coach to review your trusted financial summary.
          </Text>
        </View>
      )}


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
          Conversations
        </Text>
      </View>


      {conversations.data?.length ? (
        <View
          style={
            styles.conversationList
          }
        >
          {conversations.data.map(
            (conversation) => (
              <Pressable
                key={
                  conversation.id
                }
                accessibilityRole="button"
                onPress={() => {
                  router.push({
                    pathname:
                      '/ai-chat' as never,

                    params: {
                      conversationId:
                        conversation.id,
                    },
                  });
                }}
                style={({ pressed }) => [
                  styles.conversationCard,

                  pressed
                    ? styles.pressed
                    : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={
                    styles.conversationTitle
                  }
                >
                  {conversation.title}
                </Text>

                <Text
                  numberOfLines={2}
                  style={
                    styles.conversationPreview
                  }
                >
                  {conversation.last_message_preview
                    ?? 'Start the conversation'}
                </Text>

                <Text
                  style={
                    styles.conversationDate
                  }
                >
                  {new Date(
                    conversation.updated_at,
                  ).toLocaleDateString()}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      ) : (
        <View
          style={
            styles.emptyCard
          }
        >
          <Text
            style={
              styles.emptyBody
            }
          >
            Your AI conversations will appear here.
          </Text>
        </View>
      )}


      <View
        style={
          styles.trustCard
        }
      >
        <Text
          style={
            styles.trustTitle
          }
        >
          Trusted-data boundary
        </Text>

        <Text
          style={
            styles.trustBody
          }
        >
          The coach receives server-calculated summaries instead of your raw financial database. Different currencies stay separate, and the AI has no tools for changing financial records.
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

    primaryButton: {
      minHeight: 52,
      marginTop: 20,
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

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 24,
      marginBottom: 10,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: typography.subheading,
      fontWeight: typography.weightBold,
    },

    linkText: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    insightCard: {
      padding: 17,
      borderRadius: radii.lg,
      backgroundColor: colors.text,
      ...elevation.card
    },

    insightType: {
      color: colors.accentStrong,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1,
    },

    insightTitle: {
      marginTop: 7,
      color: colors.textOnPrimary,
      fontSize: typography.subheading,
      lineHeight: 22,
      fontWeight: typography.weightBold,
    },

    insightBody: {
      marginTop: 8,
      color: colors.borderStrong,
      fontSize: typography.caption,
      lineHeight: 19,
    },

    insightPeriod: {
      marginTop: 11,
      color: colors.accentStrong,
      fontSize: typography.caption,
    },

    emptyCard: {
      padding: 15,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    emptyTitle: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    emptyBody: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },

    conversationList: {
      gap: 8,
    },

    conversationCard: {
      padding: 14,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    pressed: {
      opacity: 0.82,
      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    conversationTitle: {
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    conversationPreview: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 16,
    },

    conversationDate: {
      marginTop: 7,
      color: colors.textTertiary,
      fontSize: typography.caption,
    },

    trustCard: {
      marginTop: 22,
      padding: 14,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceMuted,
      ...elevation.card
    },

    trustTitle: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    trustBody: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },

    errorCard: {
      marginBottom: 10,
      padding: 12,
      borderRadius: radii.md,
      backgroundColor: colors.dangerSurface,
      ...elevation.card
    },

    errorText: {
      color: colors.danger,
      fontSize: typography.caption,
      lineHeight: 17,
    },
  });