import {
  supabase,
} from '../../lib/supabase';

import {
  challengeRefreshResultSchema,
  gamificationSummarySchema,
  type GamificationSummary,
} from './gamification-contract';


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
getGamificationSummary(
  timezone: string,
): Promise<GamificationSummary> {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_gamification_summary',
      {
        p_timezone:
          timezone,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return gamificationSummarySchema
    .parse(
      data,
    );
}


export async function
startGamificationChallenge(
  challengeId: string,
  timezone: string,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'start_gamification_challenge',
      {
        p_challenge_id:
          challengeId,

        p_timezone:
          timezone,
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
      'Challenge start returned an invalid response.',
    );
  }


  return data;
}


export async function
refreshGamificationChallenge(
  userChallengeId: string,
) {
  const {
    data,
    error,
  } =
    await callRpc(
      'refresh_gamification_challenge',
      {
        p_user_challenge_id:
          userChallengeId,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return challengeRefreshResultSchema
    .parse(
      data,
    );
}