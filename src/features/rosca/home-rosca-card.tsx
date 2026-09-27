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
  useRoscaGroups,
} from './rosca-query';


export function HomeRoscaCard() {
  const router =
    useRouter();

  const query =
    useRoscaGroups();

  const groups =
    query.data ?? [];

  const active =
    groups.filter(
      (group) =>
        group.status ===
          'active',
    );

  const forming =
    groups.filter(
      (group) =>
        group.status ===
          'forming',
    );


  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(
          '/rosca' as never,
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
          ROSCA
        </Text>

        <Text
          style={
            styles.chevron
          }
        >
          ›
        </Text>
      </View>


      {query.isLoading ? (
        <Text
          style={
            styles.body
          }
        >
          Loading savings groups…
        </Text>
      ) : groups.length === 0 ? (
        <>
          <Text
            style={
              styles.title
            }
          >
            Rotating savings, organized
          </Text>

          <Text
            style={
              styles.body
            }
          >
            Create or join a ROSCA with explicit contribution and payout history.
          </Text>
        </>
      ) : (
        <>
          <Text
            style={
              styles.title
            }
          >
            {active.length} active
            {' · '}
            {forming.length} forming
          </Text>

          <Text
            style={
              styles.body
            }
          >
            {groups.length}{' '}
            group{
              groups.length === 1
                ? ''
                : 's'
            } total
          </Text>
        </>
      )}
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
      opacity: 0.84,
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
      fontSize: typography.heading,
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
      fontSize: typography.small,
      lineHeight: 19,
    },
  });