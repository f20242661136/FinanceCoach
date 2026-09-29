import Ionicons from '@expo/vector-icons/Ionicons';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import {
  Link,
} from 'expo-router';

import {
  Controller,
  useForm,
} from 'react-hook-form';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useState,
} from 'react';

import {
  AppButton,
} from '@/components/ui/app-button';

import {
  AuthShell,
} from '@/components/ui/auth-shell';

import {
  InlineNotice,
} from '@/components/ui/inline-notice';

import {
  TextField,
} from '@/components/ui/text-field';

import {
  colors,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  getFriendlyAuthError,
  signInWithEmail,
} from '@/features/auth/auth-service';

import {
  signInSchema,
  type SignInInput,
} from '@/features/auth/auth-schemas';

import {
  copy,
} from '@/i18n/copy';

export default function SignInScreen() {
  const [
    submitError,
    setSubmitError,
  ] = useState<string | null>(
    null,
  );

  const {
    control,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<SignInInput>({
    resolver:
      zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit =
    async (
      values: SignInInput,
    ) => {
      setSubmitError(null);

      try {
        await signInWithEmail(
          values,
        );
      } catch (error) {
        setSubmitError(
          getFriendlyAuthError(
            error,
          ),
        );
      }
    };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Good to see you again."
      subtitle="Sign in to continue managing your accounts, plans, goals, and financial progress."
      footer={
        <View style={styles.footerNote}>
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color={
              colors.textSecondary
            }
          />

          <Text style={styles.footerText}>
            Your financial workspace is protected by your Finance Coach account.
          </Text>
        </View>
      }
    >
      <View style={styles.formHeading}>
        <Text style={styles.formTitle}>
          Sign in
        </Text>

        <Text style={styles.formBody}>
          Enter the email and password connected to your account.
        </Text>
      </View>

      {submitError ? (
        <InlineNotice
          message={submitError}
          tone="error"
        />
      ) : null}

      <View style={styles.fields}>
        <Controller
          control={control}
          name="email"
          render={({
            field: {
              onBlur,
              onChange,
              value,
            },
          }) => (
            <TextField
              required
              label={
                copy.auth.signIn
                  .emailLabel
              }
              placeholder={
                copy.auth.signIn
                  .emailPlaceholder
              }
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={
                errors.email?.message
              }
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({
            field: {
              onBlur,
              onChange,
              value,
            },
          }) => (
            <TextField
              required
              label={
                copy.auth.signIn
                  .passwordLabel
              }
              placeholder={
                copy.auth.signIn
                  .passwordPlaceholder
              }
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              secure
              returnKeyType="done"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={
                errors.password?.message
              }
              onSubmitEditing={() => {
                void handleSubmit(
                  onSubmit,
                )();
              }}
            />
          )}
        />
      </View>

      <AppButton
        label="Sign in"
        icon="log-in-outline"
        loading={isSubmitting}
        onPress={() => {
          void handleSubmit(
            onSubmit,
          )();
        }}
      />

      <View style={styles.switchPanel}>
        <View style={styles.switchIcon}>
          <Ionicons
            name="person-add-outline"
            size={20}
            color={
              colors.primary
            }
          />
        </View>

        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>
            New to Finance Coach?
          </Text>

          <Text style={styles.switchText}>
            Create an account and set up your financial home base.
          </Text>
        </View>

        <Link
          href="/sign-up"
          asChild
        >
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Create an account"
            hitSlop={8}
            style={({ pressed }) => [
              styles.switchAction,
              pressed
                && styles.switchActionPressed,
            ]}
          >
            <Text style={styles.link}>
              Create
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}

const styles =
  StyleSheet.create({
    formHeading: {
      gap:
        spacing.xs,
    },

    formTitle: {
      color:
        colors.text,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.4,
    },

    formBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    fields: {
      gap:
        spacing.md,
    },

    switchPanel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
    },

    switchIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primarySoft,
    },

    switchCopy: {
      flex: 1,
      minWidth: 0,
      gap:
        spacing.xxs,
    },

    switchTitle: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    switchText: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    switchAction: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal:
        spacing.sm,
      borderRadius:
        radii.pill,
    },

    switchActionPressed: {
      backgroundColor:
        colors.primarySoft,
    },

    link: {
      color:
        colors.primary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightExtraBold,
    },

    footerNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap:
        spacing.xs,
      paddingHorizontal:
        spacing.md,
    },

    footerText: {
      flex: 1,
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      textAlign: 'center',
    },
  });