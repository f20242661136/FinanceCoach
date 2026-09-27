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
  useFinancialInsights,
} from './ai-coach-query';


export function HomeAiCoachCard() {
  const router =
    useRouter();

  const insights =
    useFinancialInsights();

  const latest =
    insights.data?.[0]
    ?? null;


  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(
          '/ai-coach' as never,
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
          AI COACH
        </Text>

        <Text
          style={
            styles.chevron
          }
        >
          ›
        </Text>
      </View>


      {latest ? (
        <>
          <Text
            numberOfLines={1}
            style={
              styles.title
            }
          >
            {latest.title}
          </Text>

          <Text
            numberOfLines={3}
            style={
              styles.body
            }
          >
            {latest.body}
          </Text>
        </>
      ) : (
        <>
          <Text
            style={
              styles.title
            }
          >
            Ask your financial coach
          </Text>

          <Text
            style={
              styles.body
            }
          >
            Get explanations and suggestions grounded in trusted Finance Coach data.
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
      fontSize: typography.caption,
      lineHeight: 18,
    },
  });