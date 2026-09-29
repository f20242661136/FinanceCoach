import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useMemo,
  useState,
} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { InlineNotice } from '@/components/ui/inline-notice';
import { StatePanel } from '@/components/ui/state-panel';
import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';
import { toUserFacingError } from '@/lib/user-facing-error';
import {
  useAiConversations,
  useCreateAiConversation,
  useFinancialInsights,
  useGenerateAiFinancialInsight,
} from './ai-coach-query';

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function friendlyPeriod(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  if (
    Number.isNaN(startDate.getTime())
    || Number.isNaN(endDate.getTime())
  ) {
    return `${start} to ${end}`;
  }

  return `${startDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} - ${endDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
}

const suggestions = [
  'Where am I overspending?',
  'What changed this month?',
  'How are my goals doing?',
];

export function AiCoachScreen() {
  const router = useRouter();
  const timezone = useMemo(() => deviceTimezone(), []);
  const [prompt, setPrompt] = useState('');

  const conversations = useAiConversations();
  const insights = useFinancialInsights();
  const createConversation = useCreateAiConversation();
  const generateInsight = useGenerateAiFinancialInsight(timezone);

  const latestInsight = insights.data?.[0] ?? null;

  async function startConversation(message: string) {
    const cleaned = message.trim();

    if (!cleaned || createConversation.isPending) {
      return;
    }

    try {
      const conversationId = await createConversation.mutateAsync(undefined);
      setPrompt('');
      router.push({
        pathname: '/ai-chat' as never,
        params: {
          conversationId,
          initialPrompt: cleaned,
        },
      });
    } catch {
      // The mutation error is rendered below with the shared user-facing error mapper.
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons
            name="sparkles-outline"
            size={23}
            color={colors.primary}
          />
        </View>
        <View style={styles.heroCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            Coach
          </Text>
          <Text style={styles.subtitle}>
            Ask about your real Finance Coach summaries and get practical explanations without giving AI control of your money.
          </Text>
        </View>
      </View>

      {createConversation.error ? (
        <InlineNotice
          tone="error"
          message={toUserFacingError(createConversation.error, 'generic')}
        />
      ) : null}

      <View style={styles.composerCard}>
        <TextInput
          accessibilityLabel="Ask Finance Coach"
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask Finance Coach…"
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.focus}
          multiline
          style={styles.composerInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send question to Finance Coach"
          accessibilityState={{
            disabled: !prompt.trim() || createConversation.isPending,
            busy: createConversation.isPending,
          }}
          disabled={!prompt.trim() || createConversation.isPending}
          onPress={() => void startConversation(prompt)}
          style={({ pressed }) => [
            styles.sendButton,
            !prompt.trim() || createConversation.isPending
              ? styles.sendButtonDisabled
              : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons
            name={createConversation.isPending ? 'ellipsis-horizontal' : 'arrow-up'}
            size={20}
            color={colors.textOnPrimary}
          />
        </Pressable>
      </View>

      <View style={styles.trustLine}>
        <Ionicons
          name="lock-closed-outline"
          size={15}
          color={colors.textTertiary}
        />
        <Text style={styles.trustText}>
          Uses trusted summaries · Cannot move money
        </Text>
      </View>

      <View style={styles.suggestions}>
        {suggestions.map(suggestion => (
          <Pressable
            key={suggestion}
            accessibilityRole="button"
            accessibilityLabel={suggestion}
            onPress={() => void startConversation(suggestion)}
            style={({ pressed }) => [
              styles.suggestionChip,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionTitle}>Latest insight</Text>
            <Text style={styles.sectionBody}>
              A generated explanation based on your financial summary.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={latestInsight ? 'Refresh AI insight' : 'Generate AI insight'}
            disabled={generateInsight.isPending}
            onPress={() => void generateInsight.mutateAsync()}
            style={({ pressed }) => [
              styles.textButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.textButtonLabel}>
              {generateInsight.isPending
                ? 'Working…'
                : latestInsight
                  ? 'Refresh'
                  : 'Generate'}
            </Text>
          </Pressable>
        </View>

        {generateInsight.error ? (
          <InlineNotice
            tone="error"
            message={toUserFacingError(generateInsight.error, 'generic')}
          />
        ) : null}

        {insights.error && !latestInsight ? (
          <StatePanel
            title="Insights unavailable"
            description={toUserFacingError(insights.error, 'generic')}
            icon="alert-circle-outline"
            tone="danger"
          />
        ) : latestInsight ? (
          <View style={styles.insightCard}>
            <View style={styles.insightTop}>
              <View style={styles.insightIcon}>
                <Ionicons
                  name="bulb-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.insightType}>
                {latestInsight.insight_type.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>

            <Text style={styles.insightTitle}>{latestInsight.title}</Text>
            <Text style={styles.insightBody}>{latestInsight.body}</Text>

            {latestInsight.source_period_start && latestInsight.source_period_end ? (
              <Text style={styles.insightPeriod}>
                Based on {friendlyPeriod(
                  latestInsight.source_period_start,
                  latestInsight.source_period_end,
                )}
              </Text>
            ) : null}
          </View>
        ) : insights.isLoading ? (
          <StatePanel
            loading
            title="Checking insights"
            description="Looking for your latest generated financial insight."
          />
        ) : (
          <View style={styles.emptyInsight}>
            <Text style={styles.emptyInsightTitle}>No insight yet</Text>
            <Text style={styles.emptyInsightBody}>
              Generate one when you want the coach to review your trusted financial summary.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadingCopy}>
          <Text style={styles.sectionTitle}>Recent conversations</Text>
          <Text style={styles.sectionBody}>
            Pick up where you left off.
          </Text>
        </View>

        {conversations.error && !conversations.data ? (
          <StatePanel
            title="Conversations unavailable"
            description={toUserFacingError(conversations.error, 'generic')}
            icon="alert-circle-outline"
            tone="danger"
          />
        ) : conversations.data?.length ? (
          <View style={styles.conversationList}>
            {conversations.data.slice(0, 3).map(conversation => (
              <Pressable
                key={conversation.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${conversation.title}`}
                onPress={() => {
                  router.push({
                    pathname: '/ai-chat' as never,
                    params: { conversationId: conversation.id },
                  });
                }}
                style={({ pressed }) => [
                  styles.conversationRow,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.conversationIcon}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.conversationCopy}>
                  <Text numberOfLines={1} style={styles.conversationTitle}>
                    {conversation.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.conversationPreview}>
                    {conversation.last_message_preview ?? 'Start the conversation'}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.noConversationText}>
            Your saved conversations will appear here.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenHorizontalPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },

  title: {
    color: colors.text,
    fontSize: typography.title,
    lineHeight: typography.lineHeightTitle,
    fontWeight: typography.weightBold,
    letterSpacing: -0.5,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  composerCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...elevation.card,
  },

  composerInput: {
    flex: 1,
    minHeight: 56,
    maxHeight: 130,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
    textAlignVertical: 'top',
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  sendButtonDisabled: {
    opacity: 0.4,
  },

  trustLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: -spacing.sm,
  },

  trustText: {
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: typography.lineHeightCaption,
  },

  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  suggestionChip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },

  suggestionText: {
    color: colors.primary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    fontWeight: typography.weightMedium,
  },

  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  sectionHeadingCopy: {
    flex: 1,
    gap: 2,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    lineHeight: typography.lineHeightSubheading,
    fontWeight: typography.weightSemibold,
  },

  sectionBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  textButton: {
    minHeight: layout.touchTarget,
    justifyContent: 'center',
  },

  textButtonLabel: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: typography.weightSemibold,
  },

  insightCard: {
    gap: spacing.sm,
    padding: layout.cardPadding,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
  },

  insightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  insightType: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weightSemibold,
    letterSpacing: 0.7,
  },

  insightTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    lineHeight: typography.lineHeightSubheading,
    fontWeight: typography.weightSemibold,
  },

  insightBody: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: typography.lineHeightBody,
  },

  insightPeriod: {
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: typography.lineHeightCaption,
  },

  emptyInsight: {
    gap: spacing.xs,
    padding: layout.cardPadding,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },

  emptyInsightTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weightSemibold,
  },

  emptyInsightBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  conversationList: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...elevation.card,
  },

  conversationRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  conversationIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },

  conversationCopy: {
    flex: 1,
  },

  conversationTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weightSemibold,
  },

  conversationPreview: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  noConversationText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
  },

  pressed: {
    opacity: 0.72,
  },
});
