import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';

import { AppButton } from '@/components/ui/app-button';
import { AuthShell } from '@/components/ui/auth-shell';
import { InlineNotice } from '@/components/ui/inline-notice';
import {
  colors,
  radii,
  spacing,
  typography,
} from '@/design/tokens';
import {
  getFriendlyAuthError,
  resendSignupConfirmation,
} from '@/features/auth/auth-service';
import { copy } from '@/i18n/copy';

export default function VerifyEmailScreen() {
  const router = useRouter();

  const { email } =
    useLocalSearchParams<{
      email?: string;
    }>();

  const resolvedEmail =
    typeof email === 'string'
      ? email
      : '';

  const [isResending, setIsResending] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const resend = async () => {
    if (!resolvedEmail) {
      return;
    }

    setIsResending(true);
    setMessage(null);
    setError(null);

    try {
      await resendSignupConfirmation(
        resolvedEmail,
      );

      setMessage(
        copy.auth.verify.resent,
      );
    } catch (resendError) {
      setError(
        getFriendlyAuthError(
          resendError,
        ),
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell
      eyebrow={copy.auth.verify.eyebrow}
      title={copy.auth.verify.title}
      subtitle={copy.auth.verify.body}
    >
      <View style={styles.icon}>
        <Ionicons
          name="mail-outline"
          size={32}
          color={colors.primary}
        />
      </View>

      {resolvedEmail ? (
        <View style={styles.emailPill}>
          <Text style={styles.email}>
            {resolvedEmail}
          </Text>
        </View>
      ) : null}

      {message ? (
        <InlineNotice
          message={message}
          tone="success"
        />
      ) : null}

      {error ? (
        <InlineNotice
          message={error}
          tone="error"
        />
      ) : null}

      <AppButton
        label={copy.auth.verify.resend}
        variant="secondary"
        loading={isResending}
        disabled={!resolvedEmail}
        onPress={() => {
          void resend();
        }}
      />

      <AppButton
        label={copy.auth.verify.back}
        variant="ghost"
        onPress={() => {
          router.replace('/sign-in');
        }}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  emailPill: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor:
      colors.surfaceMuted,
    borderRadius: radii.pill,
  },

  email: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
  },
});