import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
} from '@/design/tokens';

import {
  useQueueHealth,
  useRetryQueuedMutations,
} from '../../offline/sync/queue-health';


export function SyncQueueBanner() {
  const queue =
    useQueueHealth();

  const retry =
    useRetryQueuedMutations();


  const health =
    queue.data;


  if (
    !health
    || (
      health.pending === 0
      && health.processing === 0
      && health.failed === 0
    )
  ) {
    return null;
  }


  const waiting =
    health.pending
    + health.processing;


  const hasFailure =
    health.failed > 0;


  return (
    <View
      style={[
        styles.card,

        hasFailure
          ? styles.failureCard
          : null,
      ]}
    >
      <View
        style={
          styles.copy
        }
      >
        <Text
          style={[
            styles.title,

            hasFailure
              ? styles.failureTitle
              : null,
          ]}
        >
          {hasFailure
            ? `${
                health.failed
              } change${
                health.failed === 1
                  ? ''
                  : 's'
              } need attention`
            : `${
                waiting
              } change${
                waiting === 1
                  ? ''
                  : 's'
              } waiting to sync`}
        </Text>

        <Text
          numberOfLines={2}
          style={
            styles.body
          }
        >
          {hasFailure
            ? (
                health.latestError
                ?? 'The last sync attempt did not complete.'
              )
            : 'Saved securely on this device. We’ll sync automatically when connected.'}
        </Text>
      </View>


      <Pressable
        accessibilityRole="button"
        disabled={
          retry.isPending
        }
        onPress={() => {
          void retry.mutateAsync();
        }}
        style={({ pressed }) => [
          styles.button,

          pressed
            ? styles.buttonPressed
            : null,

          retry.isPending
            ? styles.buttonDisabled
            : null,
        ]}
      >
        <Text
          style={
            styles.buttonText
          }
        >
          {retry.isPending
            ? 'Syncing…'
            : hasFailure
              ? 'Retry'
              : 'Sync now'}
        </Text>
      </Pressable>
    </View>
  );
}


const styles =
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,

      marginBottom: 16,
      padding: 14,

      borderRadius: 14,

      backgroundColor:
        colors.surfaceMuted,
    },

    failureCard: {
      backgroundColor:
        colors.warningSurface,
    },

    copy: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      color: colors.primary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
    },

    failureTitle: {
      color: colors.warning,
    },

    body: {
      marginTop: 3,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },

    button: {
      minHeight: 38,
      paddingHorizontal: 13,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 11,

      backgroundColor:
        colors.primary,
    },

    buttonPressed: {
      opacity: 0.82,
    },

    buttonDisabled: {
      opacity: 0.5,
    },

    buttonText: {
      color: colors.textOnPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
  });