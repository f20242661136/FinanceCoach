import { zodResolver } from '@hookform/resolvers/zod';
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
  signUpWithEmail,
} from '@/features/auth/auth-service';
import {
  signUpSchema,
  type SignUpInput,
} from '@/features/auth/auth-schemas';
import { copy } from '@/i18n/copy';

export default function SignUpScreen() {
  const router = useRouter();

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (
    values: SignUpInput,
  ) => {
    setSubmitError(null);

    try {
      const data =
        await signUpWithEmail(values);

      if (!data.session) {
        router.replace({
          pathname: '/verify-email',
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
        getFriendlyAuthError(error),
      );
    }
  };

  return (
    <AuthShell
      eyebrow={copy.auth.signUp.eyebrow}
      title={copy.auth.signUp.title}
      subtitle={copy.auth.signUp.subtitle}
      footer={
        <Text style={styles.consent}>
          {copy.auth.signUp.consent}
        </Text>
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
              copy.auth.signUp.nameLabel
            }
            placeholder={
              copy.auth.signUp
                .namePlaceholder
            }
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={
              errors.fullName?.message
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
              copy.auth.signUp.emailLabel
            }
            placeholder={
              copy.auth.signUp
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
            required
            label={
              copy.auth.signUp.passwordLabel
            }
            placeholder={
              copy.auth.signUp
                .passwordPlaceholder
            }
            helperText={
              copy.auth.signUp.passwordHint
            }
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            secure
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.password?.message}
          />
        )}
      />

      <AppButton
        label={copy.auth.signUp.submit}
        loading={isSubmitting}
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>
          {
            copy.auth.signUp
              .existingAccount
          }
        </Text>

        <Link
          href="/sign-in"
          asChild
        >
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.link}>
              {copy.auth.signUp.signIn}
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

  consent: {
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});