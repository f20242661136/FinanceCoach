import { supabase } from '@/lib/supabase';

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

export async function signOutCurrentSession(): Promise<void> {
  const { error } = await supabase.auth.signOut({
    scope: 'local',
  });

  if (error) {
    throw error;
  }
}
