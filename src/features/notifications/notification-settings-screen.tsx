import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
  disableCurrentDevicePush,
  registerCurrentDeviceForPush,
} from './notification-client';

import {
  useNotificationPreferences,
  useRefreshMyNotificationSchedule,
  useUpdateNotificationPreferences,
} from './notification-query';

import type {
  NotificationPreferences,
} from './notification-contract';


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


type BooleanPreferenceKey =
  | 'master_enabled'
  | 'push_enabled'
  | 'in_app_enabled'
  | 'quiet_hours_enabled'
  | 'bill_reminders_enabled'
  | 'budget_warnings_enabled'
  | 'savings_reminders_enabled'
  | 'loan_payment_reminders_enabled'
  | 'rosca_contribution_reminders_enabled'
  | 'challenge_reminders_enabled'
  | 'streak_reminders_enabled'
  | 'ai_insights_enabled'
  | 'motivational_messages_enabled';


function SettingToggle(
  props: {
    label: string;
    description: string;
    value: boolean;
    onValueChange:
      (
        value: boolean,
      ) => void;
  },
) {
  return (
    <View
      style={
        styles.toggleRow
      }
    >
      <View
        style={
          styles.toggleCopy
        }
      >
        <Text
          style={
            styles.toggleLabel
          }
        >
          {props.label}
        </Text>

        <Text
          style={
            styles.toggleDescription
          }
        >
          {props.description}
        </Text>
      </View>

      <Switch
        value={
          props.value
        }
        onValueChange={
          props.onValueChange
        }
      />
    </View>
  );
}


export function NotificationSettingsScreen() {
  const timezone =
    useMemo(() => deviceTimezone(), []);

  const query =
    useNotificationPreferences(
      timezone,
    );

  const updateMutation =
    useUpdateNotificationPreferences(
      timezone,
    );

  const refreshMutation =
    useRefreshMyNotificationSchedule();

  const [
    draft,
    setDraft,
  ] =
    useState<
      NotificationPreferences
      | null
    >(
      null,
    );

  const [
    deviceMessage,
    setDeviceMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    saveMessage,
    setSaveMessage,
  ] =
    useState<string | null>(
      null,
    );


  useEffect(() => {
    if (
      query.data
      &&
      draft === null
    ) {
      // Server preferences intentionally hydrate a separate editable settings draft.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(
        query.data,
      );
    }
  }, [
    draft,
    query.data,
  ]);


  function updateBoolean(
    key:
      BooleanPreferenceKey,
    value:
      boolean,
  ) {
    setDraft(
      (
        current,
      ) =>
        current
          ? {
              ...current,

              [key]:
                value,
            }
          : current,
    );
  }


  async function save() {
    if (!draft) {
      return;
    }


    setSaveMessage(
      null,
    );


    try {
      const saved =
        await updateMutation
          .mutateAsync({
            ...draft,

            timezone,
          });


      setDraft(
        saved,
      );


      await refreshMutation
        .mutateAsync(
          timezone,
        );


      setSaveMessage(
        'Notification preferences saved.',
      );
    } catch (
      error
    ) {
      setSaveMessage(
        error instanceof Error
          ? error.message
          : 'Could not save notification preferences.',
      );
    }
  }


  async function enablePush() {
    setDeviceMessage(
      null,
    );


    try {
      const result =
        await registerCurrentDeviceForPush(
          true,
        );


      setDeviceMessage(
        result.status ===
          'registered'
          ? 'Push notifications are enabled on this device.'
          : result.message,
      );
    } catch (
      error
    ) {
      setDeviceMessage(
        error instanceof Error
          ? error.message
          : 'Could not register this device for push notifications.',
      );
    }
  }


  async function disablePush() {
    setDeviceMessage(
      null,
    );


    try {
      await disableCurrentDevicePush();

      setDeviceMessage(
        'This device will no longer receive Finance Coach push notifications.',
      );
    } catch (
      error
    ) {
      setDeviceMessage(
        error instanceof Error
          ? error.message
          : 'Could not disable push on this device.',
      );
    }
  }


  if (
    query.isLoading
    ||
    !draft
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
          Loading notification preferences…
        </Text>
      </View>
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
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        NOTIFICATIONS
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Reminders without the noise
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Choose what Finance Coach may remind you about. Financial amounts are not shown in lock-screen reminder text by default.
      </Text>


      <View
        style={
          styles.sectionCard
        }
      >
        <SettingToggle
          label="Notifications"
          description="Master switch for Finance Coach reminders."
          value={
            draft.master_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'master_enabled',
                value,
              )
          }
        />

        <SettingToggle
          label="Push notifications"
          description="Allow eligible reminders to be delivered to registered devices."
          value={
            draft.push_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'push_enabled',
                value,
              )
          }
        />

        <SettingToggle
          label="In-app notification center"
          description="Keep generated reminders visible inside Finance Coach."
          value={
            draft.in_app_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'in_app_enabled',
                value,
              )
          }
        />
      </View>


      <Text
        style={
          styles.sectionTitle
        }
      >
        Device push
      </Text>

      <View
        style={
          styles.sectionCard
        }
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void enablePush();
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
            Enable push on this device
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void disablePush();
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
            Disable this device
          </Text>
        </Pressable>

        {deviceMessage ? (
          <Text
            style={
              styles.messageText
            }
          >
            {deviceMessage}
          </Text>
        ) : null}
      </View>


      <Text
        style={
          styles.sectionTitle
        }
      >
        Quiet hours
      </Text>

      <View
        style={
          styles.sectionCard
        }
      >
        <SettingToggle
          label="Use quiet hours"
          description="Server reminders scheduled during this window are moved to the end of quiet hours."
          value={
            draft.quiet_hours_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'quiet_hours_enabled',
                value,
              )
          }
        />


        <View
          style={
            styles.timeRow
          }
        >
          <View
            style={
              styles.timeField
            }
          >
            <Text
              style={
                styles.fieldLabel
              }
            >
              Starts
            </Text>

            <TextInput
              value={
                draft.quiet_hours_start
              }
              onChangeText={
                (
                  value,
                ) =>
                  setDraft({
                    ...draft,

                    quiet_hours_start:
                      value,
                  })
              }
              placeholder="22:00"
              style={
                styles.input
              }
            />
          </View>

          <View
            style={
              styles.timeField
            }
          >
            <Text
              style={
                styles.fieldLabel
              }
            >
              Ends
            </Text>

            <TextInput
              value={
                draft.quiet_hours_end
              }
              onChangeText={
                (
                  value,
                ) =>
                  setDraft({
                    ...draft,

                    quiet_hours_end:
                      value,
                  })
              }
              placeholder="07:00"
              style={
                styles.input
              }
            />
          </View>
        </View>


        <Text
          style={
            styles.fieldLabel
          }
        >
          General reminder time
        </Text>

        <TextInput
          value={
            draft.reminder_time_local
          }
          onChangeText={
            (
              value,
            ) =>
              setDraft({
                ...draft,

                reminder_time_local:
                  value,
              })
          }
          placeholder="09:00"
          style={
            styles.input
          }
        />


        <Text
          style={
            styles.fieldLabel
          }
        >
          Streak reminder time
        </Text>

        <TextInput
          value={
            draft.streak_reminder_time_local
          }
          onChangeText={
            (
              value,
            ) =>
              setDraft({
                ...draft,

                streak_reminder_time_local:
                  value,
              })
          }
          placeholder="19:00"
          style={
            styles.input
          }
        />

        <Text
          style={
            styles.timezoneText
          }
        >
          Timezone: {timezone}
        </Text>
      </View>


      <Text
        style={
          styles.sectionTitle
        }
      >
        Reminder categories
      </Text>

      <View
        style={
          styles.sectionCard
        }
      >
        <SettingToggle
          label="Bills"
          description="Upcoming recurring payment reminders."
          value={
            draft.bill_reminders_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'bill_reminders_enabled',
                value,
              )
          }
        />

        <SettingToggle
          label="Budget warnings"
          description="Warn when a budget reaches its configured threshold."
          value={
            draft.budget_warnings_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'budget_warnings_enabled',
                value,
              )
          }
        />

        <SettingToggle
          label="Savings"
          description="Gentle check-ins for active savings goals."
          value={
            draft.savings_reminders_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'savings_reminders_enabled',
                value,
              )
          }
        />

        <SettingToggle
          label="Loans"
          description="Upcoming loan payment and due-date reminders."
          value={
            draft.loan_payment_reminders_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'loan_payment_reminders_enabled',
                value,
              )
          }
        />

        <SettingToggle
          label="ROSCA"
          description="Upcoming ROSCA contribution reminders."
          value={
            draft.rosca_contribution_reminders_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'rosca_contribution_reminders_enabled',
                value,
              )
          }
        />

        <SettingToggle
          label="Challenges"
          description="Remind you before an active challenge ends."
          value={
            draft.challenge_reminders_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'challenge_reminders_enabled',
                value,
              )
          }
        />

        <SettingToggle
          label="Streaks"
          description="Optional habit reminder when an active streak is at risk."
          value={
            draft.streak_reminders_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'streak_reminders_enabled',
                value,
              )
          }
        />

        <SettingToggle
          label="AI insights"
          description="Tell you when a new trusted Finance Coach insight is ready."
          value={
            draft.ai_insights_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'ai_insights_enabled',
                value,
              )
          }
        />

        <SettingToggle
          label="Motivational check-ins"
          description="Optional weekly habit message. Disabled by default."
          value={
            draft.motivational_messages_enabled
          }
          onValueChange={
            (
              value,
            ) =>
              updateBoolean(
                'motivational_messages_enabled',
                value,
              )
          }
        />
      </View>


      <Text
        style={
          styles.sectionTitle
        }
      >
        Budget warning threshold
      </Text>

      <View
        style={
          styles.thresholdRow
        }
      >
        {[
          8000,
          9000,
          10000,
        ].map(
          (
            value,
          ) => (
            <Pressable
              key={
                value
              }
              accessibilityRole="button"
              accessibilityState={{
                selected:
                  draft.budget_warning_threshold_basis_points ===
                    value,
              }}
              onPress={() => {
                setDraft({
                  ...draft,

                  budget_warning_threshold_basis_points:
                    value,
                });
              }}
              style={[
                styles.thresholdChip,

                draft.budget_warning_threshold_basis_points ===
                  value
                  ? styles.thresholdSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.thresholdText,

                  draft.budget_warning_threshold_basis_points ===
                    value
                    ? styles.thresholdTextSelected
                    : null,
                ]}
              >
                {value / 100}%
              </Text>
            </Pressable>
          ),
        )}
      </View>


      {saveMessage ? (
        <Text
          style={
            styles.saveMessage
          }
        >
          {saveMessage}
        </Text>
      ) : null}


      <Pressable
        accessibilityRole="button"
        disabled={
          updateMutation.isPending
          ||
          refreshMutation.isPending
        }
        onPress={() => {
          void save();
        }}
        style={[
          styles.saveButton,

          updateMutation.isPending
          ||
          refreshMutation.isPending
            ? styles.disabled
            : null,
        ]}
      >
        <Text
          style={
            styles.saveButtonText
          }
        >
          {updateMutation.isPending
          || refreshMutation.isPending
            ? 'Saving…'
            : 'Save notification settings'}
        </Text>
      </Pressable>
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

    sectionTitle: {
      marginTop: 22,
      marginBottom: 9,
      color: colors.text,
      fontSize: typography.body,
      fontWeight: typography.weightBold,
    },

    sectionCard: {
      paddingHorizontal: 15,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card
    },

    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      minHeight: 70,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    toggleCopy: {
      flex: 1,
    },

    toggleLabel: {
      color: colors.text,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    toggleDescription: {
      marginTop: 3,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 15,
    },

    primaryButton: {
      minHeight: layout.touchTarget,
      marginTop: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    primaryButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    secondaryButton: {
      minHeight: layout.touchTarget,
      marginTop: 9,
      marginBottom: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },

    secondaryButtonText: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    messageText: {
      marginBottom: 14,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 16,
    },

    timeRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },

    timeField: {
      flex: 1,
    },

    fieldLabel: {
      marginTop: 13,
      marginBottom: 6,
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    input: {
      minHeight: layout.touchTarget,
      paddingHorizontal: 12,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      color: colors.text,
      fontSize: typography.caption,
    },

    timezoneText: {
      marginTop: 12,
      marginBottom: 14,
      color: colors.textTertiary,
      fontSize: typography.caption,
    },

    thresholdRow: {
      flexDirection: 'row',
      gap: 8,
    },

    thresholdChip: {
      flex: 1,
      minHeight: layout.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    thresholdSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },

    thresholdText: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    thresholdTextSelected: {
      color: colors.primary,
    },

    saveMessage: {
      marginTop: 16,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 17,
    },

    saveButton: {
      minHeight: 52,
      marginTop: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    disabled: {
      opacity: 0.45,
    },

    saveButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },
  });