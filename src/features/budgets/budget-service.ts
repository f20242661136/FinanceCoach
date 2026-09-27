import {
  supabase,
} from '../../lib/supabase';

import {
  budgetStatusListSchema,
  type BudgetStatus,
  type CreateBudgetInput,
} from './budget-contract';

type RpcError = {
  message: string;
  code?: string;
};

type RpcResult = {
  data: unknown;
  error: RpcError | null;
};

const callRpc =
  supabase.rpc.bind(
    supabase,
  ) as unknown as (
    functionName: string,
    args?: Record<
      string,
      unknown
    >,
  ) => Promise<RpcResult>;

export async function
createBudget(
  input: CreateBudgetInput,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'create_budget',
      {
        p_budget_id:
          input.budgetId,

        p_name:
          input.name,

        p_currency_code:
          input.currencyCode,

        p_period_type:
          input.periodType,

        p_period_start:
          input.periodStart,

        p_period_end:
          input.periodEnd,

        p_limit_minor:
          input.limitMinor,

        p_category_id:
          input.categoryId
          ?? undefined,
      },
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (
    typeof data !== 'string'
  ) {
    throw new Error(
      'Budget creation returned an invalid response.',
    );
  }

  return data;
}

export async function
getBudgetStatus(
  asOf?: string,
): Promise<BudgetStatus[]> {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_budget_status',
      asOf
        ? {
            p_as_of:
              asOf,
          }
        : {},
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return budgetStatusListSchema
    .parse(
      data,
    );
}