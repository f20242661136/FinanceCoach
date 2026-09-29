import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useMemo,
} from 'react';

import {
  useRouter,
} from 'expo-router';

import {
  colors,
  elevation,
  radii,
  typography,
} from '@/design/tokens';

import {
  useSubscription,
} from './subscription-context';

import {
  premiumSubscriptionStatusFrom,
} from './subscription-status';


export function HomeSubscriptionCard() {
  const router =
    useRouter();

  const {
    status,
    customerInfo,
  } =
    useSubscription();

  const premium =
    useMemo(
      () =>
        premiumSubscriptionStatusFrom(
          customerInfo,
        ),
      [
        customerInfo,
      ],
    );

  const title =
    status === 'initializing'
      ? 'Checking your plan…'
      : premium.hasPremium
        ? premium.lifecycle ===
            'trial'
          ? 'Premium trial active'
          : 'Premium is active'
        : 'Free plan';

  const body =
    status === 'disabled'
      ? 'Subscriptions are unavailable in this build.'
      : premium.hasPremium
        ? 'Review renewal, trial, restore and subscription management details.'
        : 'Unlock features that are explicitly marked Premium.';


  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(
          '/subscription' as never,
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
          SUBSCRIPTION
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
        {title}
      </Text>

      <Text
        style={
          styles.body
        }
      >
        {body}
      </Text>
    </Pressable>
  );
}


const styles =
  StyleSheet.create({
    card: {
      marginBottom: 18,
      padding: 17,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
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
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    eyebrow: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      fontWeight:
        typography.weightBold,
      letterSpacing: 1.2,
    },

    chevron: {
      color:
        colors.textTertiary,
      fontSize: 22,
      lineHeight: 22,
    },

    title: {
      marginTop: 9,
      color:
        colors.text,
      fontSize:
        typography.subheading,
      fontWeight:
        typography.weightBold,
    },

    body: {
      marginTop: 5,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight: 18,
    },
  });
