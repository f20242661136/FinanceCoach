import Ionicons from '@expo/vector-icons/Ionicons';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import {
  Link,
  useRouter,
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
  signUpWithEmail,
} from '@/features/auth/auth-service';

import {
  signUpSchema,
  type SignUpInput,
} from '@/features/auth/auth-schemas';

import {
  copy,
} from '@/i18n/copy';

export default function SignUpScreen() {
  const router =
    useRouter();

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
  } = useForm<SignUpInput>({
    resolver:
      zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit =
    async (
      values: SignUpInput,
    ) => {
      setSubmitError(null);

      try {
        const data =
          await signUpWithEmail(
            values,
          );

        if (!data.session) {
          router.replace({
            pathname:
              '/verify-email',
            params: {
              email:
                values.email
                  .trim()
                  .toLowerCase(),
            },
          });
        }
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
      eyebrow="Get started"
      title="Build a clearer money routine."
      subtitle="Create your account now. Your currency and financial preferences come next."
      footer={
        <Text style={styles.consent}>
          {copy.auth.signUp.consent}
        </Text>
      }
    >
      <View style={styles.formHeading}>
        <Text style={styles.formTitle}>
          Create your account
        </Text>

        <Text style={styles.formBody}>
          Just the essentials first. Setup takes about a minute.
        </Text>
      </View>

      {submitError ? (
        <View
          accessibilityRole="alert"
          style={styles.submitErrorBlock}
        >
          <Text style={styles.submitErrorTitle}>
            Account creation problem
          </Text>

          <InlineNotice
            message={submitError}
            tone="error"
          />
        </View>
      ) : null}

      <View style={styles.fields}>
        <Controller
          control={control}
          name="fullName"
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
                copy.auth.signUp
                  .nameLabel
              }
              placeholder="Your name"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={
                errors.fullName
                  ?.message
              }
            />
          )}
        />

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
                copy.auth.signUp
                  .emailLabel
              }
              placeholder={
                copy.auth.signUp
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
                copy.auth.signUp
                  .passwordLabel
              }
              placeholder="At least 8 characters"
              helperText={
                copy.auth.signUp
                  .passwordHint
              }
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              secure
              returnKeyType="done"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={
                errors.password
                  ?.message
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

      <View style={styles.nextStep}>
        <View style={styles.nextStepIcon}>
          <Ionicons
            name="checkmark-outline"
            size={17}
            color={
              colors.textOnPrimary
            }
          />
        </View>

        <Text style={styles.nextStepText}>
          Next: choose your primary currency and preferences.
        </Text>
      </View>

      <AppButton
        label="Create account"
        icon="person-add-outline"
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
            name="log-in-outline"
            size={20}
            color={
              colors.primary
            }
          />
        </View>

        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>
            Already have an account?
          </Text>

          <Text style={styles.switchText}>
            Sign in and continue where you left off.
          </Text>
        </View>

        <Link
          href="/sign-in"
          asChild
        >
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Sign in"
            hitSlop={8}
            style={({ pressed }) => [
              styles.switchAction,
              pressed
                && styles.switchActionPressed,
            ]}
          >
            <Text style={styles.link}>
              Sign in
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}

const styles =
  StyleSheet.create({
    submitErrorBlock: {
      gap: spacing.xs,
      marginBottom: spacing.sm,
      padding: spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerSurface,
    },

    submitErrorTitle: {
      color: colors.danger,
      fontSize: typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight: '800',
    },

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

    nextStep: {
      flexDirection: 'row',
      alignItems: 'center',
      gap:
        spacing.sm,
      padding:
        spacing.sm,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.primarySoft,
    },

    nextStepIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.primary,
    },

    nextStepText: {
      flex: 1,
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightSemibold,
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

    consent: {
      color:
        colors.textTertiary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      textAlign: 'center',
      paddingHorizontal:
        spacing.sm,
    },
  });