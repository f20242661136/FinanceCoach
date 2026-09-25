import { supabase } from '@/lib/supabase';

import {
  onboardingPreferencesSchema,
  type OnboardingPreferencesInput,
} from './profile-schemas';

export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
  minor_unit: number;
};

export async function listActiveCurrencies(): Promise<
  CurrencyOption[]
> {
  const { data, error } = await supabase
    .from('currencies')
    .select(
      'code,name,symbol,minor_unit',
    )
    .eq('is_active', true)
    .order('code', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function completeOnboarding(
  userId: string,
  input: OnboardingPreferencesInput,
): Promise<void> {
  const values =
    onboardingPreferencesSchema.parse(input);

  const { error } = await supabase
    .from('profiles')
    .update({
      base_currency_code:
        values.baseCurrencyCode,
      locale: values.locale,
      timezone: values.timezone,
      onboarding_completed: true,
    })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}