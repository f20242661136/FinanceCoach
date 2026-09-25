import { supabase } from '@/lib/supabase';
import { copy } from '@/i18n/copy';

import {
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from './auth-schemas';

export async function signInWithEmail(
  input: SignInInput,
) {
  const values = signInSchema.parse(input);

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: values.email.trim().toLowerCase(),
      password: values.password,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail(
  input: SignUpInput,
) {
  const values = signUpSchema.parse(input);

  const { data, error } =
    await supabase.auth.signUp({
      email: values.email.trim().toLowerCase(),
      password: values.password,

      options: {
        data: {
          full_name: values.fullName.trim(),
        },
      },
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function resendSignupConfirmation(
  email: string,
): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
  });

  if (error) {
    throw error;
  }
}

export async function signOutCurrentSession(): Promise<void> {
  const { error } = await supabase.auth.signOut({
    scope: 'local',
  });

  if (error) {
    throw error;
  }
}

export function getFriendlyAuthError(
  error: unknown,
): string {
  if (!(error instanceof Error)) {
    return copy.auth.errors.generic;
  }

  const message =
    error.message.toLowerCase();

  if (
    message.includes(
      'invalid login credentials',
    )
  ) {
    return copy.auth.errors.invalidCredentials;
  }

  if (
    message.includes(
      'already registered',
    ) ||
    message.includes(
      'user already registered',
    )
  ) {
    return copy.auth.errors.alreadyRegistered;
  }

  if (
    message.includes('network') ||
    message.includes('fetch')
  ) {
    return copy.auth.errors.network;
  }

  return copy.auth.errors.generic;
}