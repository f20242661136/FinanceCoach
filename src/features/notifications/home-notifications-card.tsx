import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  elevation,
  radii,
  typography,
} from '@/design/tokens';

import {
  useRouter,
} from 'expo-router';

import {
  useNotificationCenter,
} from './notification-query';


export function HomeNotificationsCard() {
  const router =
    useRouter();

  const query =
    useNotificationCenter();

  const items =
    query.data
    ?? [];

  const unread =
    items.filter(
      (
        item,
      ) =>
        !item.opened,
    );


  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(
          '/notifications' as never,
        );
      }}
      style={({ pressed }) => [
        styles.card,

        pressed
          ? styles.pressed
          : null,
      ]}
    >
      <View
        style={
          styles.header
        }
      >
        <Text
          style={
            styles.eyebrow
          }
        >
          REMINDERS
        </Text>

        <Text
          style={
            styles.chevron
          }
        >
          ›
        </Text>
      </View>


      <Text
        style={
          styles.title
        }
      >
        {unread.length === 0
          ? 'You’re caught up'
          : `${unread.length} reminder${
              unread.length === 1
                ? ''
                : 's'
            } to review`}
      </Text>

      <Text
        style={
          styles.body
        }
      >
        {items[0]
          ? items[0].title
          : 'Budget, savings, loan, ROSCA, challenge and AI reminders appear here when relevant.'}
      </Text>
    </Pressable>
  );
}


const styles =
  StyleSheet.create({
    card: {
      marginBottom: 18,
      padding: 17,
      borderRadius: radii.lg,
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

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1.2,
    },

    chevron: {
      color: colors.textTertiary,
      fontSize: 22,
      lineHeight: 22,
    },

    title: {
      marginTop: 9,
      color: colors.text,
      fontSize: typography.subheading,
      fontWeight: typography.weightBold,
    },

    body: {
      marginTop: 5,
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 18,
    },
  });