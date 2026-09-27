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
  spacing,
  typography,
} from '@/design/tokens';

import {
  useRouter,
} from 'expo-router';

import {
  basisPointsToPercentText,
} from './six-jar-format';

import {
  useSixJarProfile,
} from './six-jar-query';


export function HomeSixJarCard() {
  const router =
    useRouter();

  const query =
    useSixJarProfile();

  const profile =
    query.data
      ?? null;


  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(
          '/six-jars' as never,
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
          SIX JARS
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
          Loading allocation plan…
        </Text>
      ) : !profile ? (
        <>
          <Text
            style={
              styles.title
            }
          >
            Plan your next income amount
          </Text>

          <Text
            style={
              styles.body
            }
          >
            Set up percentage rules for necessities, freedom, learning, savings, play and giving.
          </Text>
        </>
      ) : (
        <>
          <Text
            style={
              styles.title
            }
          >
            {profile.name}
          </Text>

          <Text
            numberOfLines={2}
            style={
              styles.body
            }
          >
            {profile.jars
              .slice(
                0,
                3,
              )
              .map(
                (jar) =>
                  `${
                    jar.name
                  } ${
                    basisPointsToPercentText(
                      jar.percentage_basis_points,
                    )
                  }`,
              )
              .join(' · ')}
            {profile.jars.length > 3
              ? ' · …'
              : ''}
          </Text>
        </>
      )}
    </Pressable>
  );
}


const styles =
  StyleSheet.create({
    card: {
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.card,
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
      gap: spacing.sm,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1.1,
    },

    chevron: {
      color: colors.textTertiary,
      fontSize: 22,
      lineHeight: 22,
    },

    title: {
      marginTop: spacing.sm,
      color: colors.text,
      fontSize: typography.subheading,
      lineHeight:
        typography.lineHeightSubheading,
      fontWeight:
        typography.weightBold,
    },

    body: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },
  });
