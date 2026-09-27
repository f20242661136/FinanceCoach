import {
  supabase,
} from '../../lib/supabase';

import {
  createRoscaGroupResultSchema,
  roscaGroupDetailSchema,
  roscaGroupSummaryListSchema,
  type CreateRoscaGroupInput,
  type JoinRoscaGroupInput,
  type MarkRoscaContributionPaidInput,
  type MarkRoscaPayoutPaidInput,
  type RoscaGroupDetail,
  type RoscaGroupSummary,
} from './rosca-contract';


type RpcResult = {
  data: unknown;

  error: {
    message: string;
    code?: string;
  } | null;
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
createRoscaGroup(
  input:
    CreateRoscaGroupInput,
): Promise<{
  groupId: string;
  joinCode: string;
}> {
  const {
    data,
    error,
  } =
    await callRpc(
      'create_rosca_group',
      {
        p_group_id:
          input.groupId,

        p_member_id:
          input.memberId,

        p_name:
          input.name,

        p_currency_code:
          input.currencyCode,

        p_contribution_amount_minor:
          input.contributionAmountMinor,

        p_contribution_frequency:
          input.contributionFrequency,

        p_cycle_count:
          input.cycleCount,

        p_start_date:
          input.startDate,

        p_creator_display_name:
          input.creatorDisplayName,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  const parsed =
    createRoscaGroupResultSchema
      .parse(
        data,
      );


  return {
    groupId:
      parsed.group_id,

    joinCode:
      parsed.join_code,
  };
}


export async function
joinRoscaGroup(
  input:
    JoinRoscaGroupInput,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'join_rosca_group',
      {
        p_member_id:
          input.memberId,

        p_join_code:
          input.joinCode,

        p_display_name:
          input.displayName,
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
      'ROSCA join returned an invalid response.',
    );
  }


  return data;
}


export async function
markRoscaContributionPaid(
  input:
    MarkRoscaContributionPaidInput,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'mark_rosca_contribution_paid',
      {
        p_contribution_id:
          input.contributionId,

        p_paid_date:
          input.paidDate,

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
      'ROSCA contribution update returned an invalid response.',
    );
  }


  return data;
}


export async function
markRoscaPayoutPaid(
  input:
    MarkRoscaPayoutPaidInput,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'mark_rosca_payout_paid',
      {
        p_payout_id:
          input.payoutId,

        p_paid_date:
          input.paidDate,

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
      'ROSCA payout update returned an invalid response.',
    );
  }


  return data;
}


export async function
getRoscaGroups():
  Promise<
    RoscaGroupSummary[]
  > {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_rosca_groups',
      {},
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return roscaGroupSummaryListSchema
    .parse(
      data,
    );
}


export async function
getRoscaGroupDetail(
  groupId: string,
): Promise<RoscaGroupDetail> {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_rosca_group_detail',
      {
        p_group_id:
          groupId,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return roscaGroupDetailSchema
    .parse(
      data,
    );
}