import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type AccountSummary =
  Database['public']['Functions']['get_account_summaries']['Returns'][number];

export type AccountTypeOption =
  Database['public']['Tables']['account_types']['Row'];

export type CurrencyOption =
  Database['public']['Tables']['currencies']['Row'];

export type CreateAccountInput = {
  name: string;
  accountTypeCode: string;
  currencyCode: string;
  openingBalanceMinor: string;
};

export async function listAccountSummaries(): Promise<AccountSummary[]> {
  const { data, error } = await supabase.rpc(
    'get_account_summaries',
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccountSetupOptions() {
  const [
    accountTypesResult,
    currenciesResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from('account_types')
      .select('*')
      .eq('is_active', true)
      .order('code'),

    supabase
      .from('currencies')
      .select('*')
      .eq('is_active', true)
      .order('code'),

    supabase
      .from('profiles')
      .select('base_currency_code')
      .maybeSingle(),
  ]);

  if (accountTypesResult.error) {
    throw accountTypesResult.error;
  }

  if (currenciesResult.error) {
    throw currenciesResult.error;
  }

  if (profileResult.error) {
    throw profileResult.error;
  }

  return {
    accountTypes: accountTypesResult.data,
    currencies: currenciesResult.data,
    baseCurrencyCode:
      profileResult.data?.base_currency_code ?? null,
  };
}

export async function createAccount(
  input: CreateAccountInput,
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'create_account',
    {
      p_account_id: Crypto.randomUUID(),
      p_account_type_code: input.accountTypeCode,
      p_currency_code: input.currencyCode,
      p_name: input.name.trim(),
      p_opening_balance_minor:
        input.openingBalanceMinor,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}