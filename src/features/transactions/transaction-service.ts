import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type TransactionKind =
  | 'income'
  | 'expense';

export type CategoryOption =
  Database['public']['Tables']['categories']['Row'];

export type RecentActivity =
  Database['public']['Functions']['get_recent_activity']['Returns'][number];

export type CreateTransactionInput = {
  accountId: string;
  categoryId: string;
  type: TransactionKind;
  amountMinor: string;
  transactionDate: string;
  merchant?: string;
  description?: string;
  notes?: string;
};

export async function listCategories(
  kind: TransactionKind,
): Promise<CategoryOption[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('kind', kind)
    .order('default_name');

  if (error) {
    throw error;
  }

  return data;
}

export async function listRecentActivity(
  limit = 30,
): Promise<RecentActivity[]> {
  const { data, error } = await supabase.rpc(
    'get_recent_activity',
    {
      p_limit: limit,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'create_financial_transaction',
    {
      p_account_id: input.accountId,
      p_amount_minor: input.amountMinor,
      p_category_id: input.categoryId,
      p_client_operation_id:
        Crypto.randomUUID(),

      p_description:
        input.description?.trim() || undefined,

      p_merchant:
        input.merchant?.trim() || undefined,

      p_notes:
        input.notes?.trim() || undefined,

      p_transaction_date:
        input.transactionDate,

      p_transaction_id:
        Crypto.randomUUID(),

      p_type: input.type,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}