import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  useAiMessages,
  useSendAiCoachMessage,
} from './ai-coach-query';

import type {
  AiResponseSection,
} from './ai-coach-contract';


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


function sectionLabel(
  kind:
    AiResponseSection['kind'],
): string {
  switch (kind) {
    case 'fact':
      return 'FACT';

    case 'observation':
      return 'OBSERVATION';

    case 'suggestion':
      return 'SUGGESTION';

    case 'education':
      return 'EDUCATION';

    case 'caution':
      return 'CAUTION';
  }
}


export function AiChatScreen() {
  const params =
    useLocalSearchParams<{
      conversationId?:
        | string
        | string[];
      initialPrompt?:
        | string
        | string[];
    }>();

  const conversationId =
    firstParam(
      params.conversationId,
    );

  const initialPrompt =
    firstParam(
      params.initialPrompt,
    ).trim();

  const timezone =
    useMemo(() => deviceTimezone(), []);

  const messages =
    useAiMessages(
      conversationId,
    );

  const sendMutation =
    useSendAiCoachMessage(
      conversationId,
      timezone,
    );

  const [
    draft,
    setDraft,
  ] =
    useState('');

  const autoSentPrompt =
    useRef(false);

  useEffect(() => {
    if (
      !conversationId
      || !initialPrompt
      || autoSentPrompt.current
    ) {
      return;
    }

    autoSentPrompt.current = true;

    void sendMutation
      .mutateAsync(initialPrompt)
      .catch(() => {
        setDraft(initialPrompt);
      });
  }, [
    conversationId,
    initialPrompt,
    sendMutation,
  ]);


  async function send() {
    const message =
      draft.trim();

    if (
      !message
      ||
      sendMutation.isPending
    ) {
      return;
    }

    setDraft(
      '',
    );

    try {
      await sendMutation
        .mutateAsync(
          message,
        );
    } catch {
      setDraft(
        message,
      );
    }
  }


  const canSend =
    Boolean(
      draft.trim(),
    )
    && !sendMutation.isPending
    && Boolean(
      conversationId,
    );


  return (
    <KeyboardAvoidingView
      style={
        styles.screen
      }
      behavior={
        Platform.OS ===
          'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        style={
          styles.messages
        }
        contentContainerStyle={
          styles.messagesContent
        }
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={
            styles.introCard
          }
        >
          <Text
            style={
              styles.introTitle
            }
          >
            Finance Coach
          </Text>

          <Text
            style={
              styles.introBody
            }
          >
            Ask about your spending, budgets, savings, goals or loans. Answers use trusted server summaries and cannot change your financial records.
          </Text>
        </View>


        {messages.data?.map(
          (message) => (
            <View
              key={
                message.id
              }
              style={[
                styles.messageCard,

                message.role ===
                  'user'
                  ? styles.userCard
                  : styles.assistantCard,
              ]}
            >
              <Text
                style={
                  styles.roleLabel
                }
              >
                {message.role ===
                  'user'
                  ? 'YOU'
                  : 'FINANCE COACH'}
              </Text>

              <Text
                style={
                  styles.messageText
                }
              >
                {message.content}
              </Text>


              {message.role ===
                'assistant'
              && message.response_json ? (
                <>
                  {message.response_json.sections
                    .map(
                      (
                        section,
                        index,
                      ) => (
                        <View
                          key={
                            `${
                              message.id
                            }-${
                              index
                            }`
                          }
                          style={
                            styles.sectionBlock
                          }
                        >
                          <Text
                            style={
                              styles.sectionLabel
                            }
                          >
                            {sectionLabel(
                              section.kind,
                            )}
                          </Text>

                          <Text
                            style={
                              styles.sectionText
                            }
                          >
                            {section.text}
                          </Text>
                        </View>
                      ),
                    )}


                  {message.response_json
                    .data_limitations
                    .length > 0 ? (
                    <View
                      style={
                        styles.limitations
                      }
                    >
                      <Text
                        style={
                          styles.limitationsTitle
                        }
                      >
                        DATA LIMITATIONS
                      </Text>

                      {message.response_json
                        .data_limitations
                        .map(
                          (
                            limitation,
                            index,
                          ) => (
                            <Text
                              key={
                                `${
                                  message.id
                                }-limitation-${
                                  index
                                }`
                              }
                              style={
                                styles.limitationText
                              }
                            >
                              • {limitation}
                            </Text>
                          ),
                        )}
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ),
        )}


        {sendMutation.isPending ? (
          <View
            style={[
              styles.messageCard,
              styles.assistantCard,
            ]}
          >
            <Text
              style={
                styles.roleLabel
              }
            >
              FINANCE COACH
            </Text>

            <Text
              style={
                styles.thinkingText
              }
            >
              Reviewing your trusted financial context…
            </Text>
          </View>
        ) : null}


        {sendMutation.error ? (
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
              {sendMutation.error instanceof Error
                ? sendMutation.error.message
                : 'Could not reach Finance Coach.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>


      <View
        style={
          styles.composer
        }
      >
        <TextInput
          value={
            draft
          }
          onChangeText={
            setDraft
          }
          editable={
            !sendMutation.isPending
          }
          multiline
          maxLength={4000}
          placeholder="Ask about your finances…"
          style={
            styles.input
          }
        />

        <Pressable
          accessibilityRole="button"
          disabled={
            !canSend
          }
          onPress={() => {
            void send();
          }}
          style={[
            styles.sendButton,

            !canSend
              ? styles.disabled
              : null,
          ]}
        >
          <Text
            style={
              styles.sendText
            }
          >
            Send
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    messages: {
      flex: 1,
    },

    messagesContent: {
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },

    introCard: {
      marginBottom: 12,
      padding: 14,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceMuted,
      ...elevation.card
    },

    introTitle: {
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    introBody: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },

    messageCard: {
      marginBottom: 10,
      padding: 14,
      borderRadius: radii.lg,
      borderWidth: 1,
      ...elevation.card
    },

    userCard: {
      marginLeft: 32,
      backgroundColor: colors.primarySoft,
      borderColor: colors.border,
    },

    assistantCard: {
      marginRight: 18,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },

    roleLabel: {
      color: colors.accentStrong,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1,
    },

    messageText: {
      marginTop: 6,
      color: colors.text,
      fontSize: typography.small,
      lineHeight: 20,
    },

    sectionBlock: {
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },

    sectionLabel: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 0.9,
    },

    sectionText: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 18,
    },

    limitations: {
      marginTop: 12,
      padding: 10,
      borderRadius: radii.sm,
      backgroundColor: colors.surfaceMuted,
    },

    limitationsTitle: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 0.8,
    },

    limitationText: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 15,
    },

    thinkingText: {
      marginTop: 5,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 18,
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

    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 9,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },

    input: {
      flex: 1,
      maxHeight: 140,
      minHeight: layout.touchTarget,
      paddingHorizontal: 13,
      paddingVertical: 11,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceMuted,
      color: colors.text,
      fontSize: typography.small,
    },

    sendButton: {
      minWidth: 64,
      minHeight: layout.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    disabled: {
      opacity: 0.4,
    },

    sendText: {
      color: colors.textOnPrimary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },
  });
