import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
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
import { useState } from 'react';

import { AppButton } from '@/components/ui/app-button';
import { AuthShell } from '@/components/ui/auth-shell';
import { InlineNotice } from '@/components/ui/inline-notice';
import { TextField } from '@/components/ui/text-field';
import {
  colors,
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
import { copy } from '@/i18n/copy';

export default function SignInScreen() {
  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (
    values: SignInInput,
  ) => {
    setSubmitError(null);

    try {
      await signInWithEmail(values);
    } catch (error) {
      setSubmitError(
        getFriendlyAuthError(error),
      );
    }
  };

  return (
    <AuthShell
      eyebrow={copy.auth.signIn.eyebrow}
      title={copy.auth.signIn.title}
      subtitle={copy.auth.signIn.subtitle}
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {copy.auth.signIn.trust}
          </Text>
        </View>
      }
    >
      {submitError ? (
        <InlineNotice
          message={submitError}
          tone="error"
        />
      ) : null}

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
            label={
              copy.auth.signIn.emailLabel
            }
            placeholder={
              copy.auth.signIn
                .emailPlaceholder
            }
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.email?.message}
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
            label={
              copy.auth.signIn.passwordLabel
            }
            placeholder={
              copy.auth.signIn
                .passwordPlaceholder
            }
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            secure
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.password?.message}
          />
        )}
      />

      <AppButton
        label={copy.auth.signIn.submit}
        loading={isSubmitting}
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>
          {copy.auth.signIn.noAccount}
        </Text>

        <Link
          href="/sign-up"
          asChild
        >
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.link}>
              {
                copy.auth.signIn
                  .createAccount
              }
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },

  switchText: {
    color: colors.textSecondary,
    fontSize: typography.small,
  },

  link: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: '800',
  },

  footer: {
    alignItems: 'center',
  },

  footerText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});