import {
  supabase,
} from '../../lib/supabase';

import {
  savingsContributionListSchema,
  savingsGoalSummaryListSchema,
  type AddSavingsContributionInput,
  type CreateSavingsGoalInput,
  type SavingsContribution,
  type SavingsGoalSummary,
} from './savings-goal-contract';


type RpcError = {
  message: string;
  code?: string;
};


type RpcResult = {
  data: unknown;
  error: RpcError | null;
};


/*
 * Keep RPC calls bound to the Supabase client.
 *
 * Money values deliberately remain decimal
 * strings at the network boundary.
 */
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
createSavingsGoal(
  input:
    CreateSavingsGoalInput,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'create_savings_goal',
      {
        p_goal_id:
          input.goalId,

        p_name:
          input.name,

        p_goal_type:
          input.goalType,

        p_currency_code:
          input.currencyCode,

        p_target_amount_minor:
          input.targetAmountMinor,

        p_target_date:
          input.targetDate
          ?? undefined,

        p_notes:
          input.notes
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
      'Savings goal creation returned an invalid response.',
    );
  }


  return data;
}


export async function
addSavingsContribution(
  input:
    AddSavingsContributionInput,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'add_savings_contribution',
      {
        p_contribution_id:
          input.contributionId,

        p_goal_id:
          input.goalId,

        p_amount_minor:
          input.amountMinor,

        p_contribution_date:
          input.contributionDate,

        p_note:
          input.note
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
      'Savings contribution returned an invalid response.',
    );
  }


  return data;
}


export async function
getSavingsGoalStatus():
  Promise<
    SavingsGoalSummary[]
  > {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_savings_goal_status',
      {},
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return savingsGoalSummaryListSchema
    .parse(
      data,
    );
}


export async function
getSavingsContributionHistory(
  goalId: string,
  limit = 100,
): Promise<
  SavingsContribution[]
> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.trunc(
          limit,
        ),
        500,
      ),
    );


  const {
    data,
    error,
  } =
    await callRpc(
      'get_savings_contribution_history',
      {
        p_goal_id:
          goalId,

        p_limit:
          safeLimit,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return savingsContributionListSchema
    .parse(
      data,
    );
}