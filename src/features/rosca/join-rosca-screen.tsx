import {
  useState,
} from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  colors,
  layout,
  radii,
  typography,
} from '@/design/tokens';

import {
  useRouter,
} from 'expo-router';

import {
  useJoinRoscaGroup,
} from './rosca-query';


export function JoinRoscaScreen() {
  const router =
    useRouter();

  const mutation =
    useJoinRoscaGroup();

  const [
    joinCode,
    setJoinCode,
  ] =
    useState('');

  const [
    displayName,
    setDisplayName,
  ] =
    useState('');

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );


  async function join() {
    setErrorMessage(
      null,
    );

    try {
      await mutation
        .mutateAsync({
          joinCode:
            joinCode
              .trim()
              .toUpperCase(),

          displayName:
            displayName.trim(),
        });


      router.replace(
        '/rosca' as never,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not join ROSCA group.',
      );
    }
  }


  const canJoin =
    Boolean(
      joinCode.trim()
      && displayName.trim(),
    )
    && !mutation.isPending;


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
        JOIN ROSCA
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Enter your invite code
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Your joining position becomes your payout order in the group.
      </Text>


      <Text
        style={
          styles.label
        }
      >
        Join code
      </Text>

      <TextInput
        value={
          joinCode
        }
        onChangeText={
          setJoinCode
        }
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="XXXXXXXXXX"
        style={[
          styles.input,
          styles.codeInput,
        ]}
      />


      <Text
        style={
          styles.label
        }
      >
        Display name
      </Text>

      <TextInput
        value={
          displayName
        }
        onChangeText={
          setDisplayName
        }
        placeholder="Name visible to group members"
        style={
          styles.input
        }
      />


      {errorMessage ? (
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
            {errorMessage}
          </Text>
        </View>
      ) : null}


      <Pressable
        accessibilityRole="button"
        disabled={
          !canJoin
        }
        onPress={() => {
          void join();
        }}
        style={[
          styles.saveButton,

          !canJoin
            ? styles.disabled
            : null,
        ]}
      >
        <Text
          style={
            styles.saveButtonText
          }
        >
          {mutation.isPending
            ? 'Joining…'
            : 'Join ROSCA'}
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
      marginBottom: 18,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight: 21,
    },

    label: {
      marginTop: 18,
      marginBottom: 8,
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: typography.small,
    },

    codeInput: {
      fontSize: 20,
      fontWeight: typography.weightBold,
      letterSpacing: 2,
    },

    errorCard: {
      marginTop: 18,
      padding: 13,
      borderRadius: radii.md,
      backgroundColor: colors.dangerSurface,
    },

    errorText: {
      color: colors.danger,
      fontSize: typography.small,
      lineHeight: 18,
    },

    saveButton: {
      minHeight: 54,
      marginTop: 22,
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
      fontSize: typography.body,
      fontWeight: typography.weightBold,
    },
  });