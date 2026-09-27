import {
  supabase,
} from '../../lib/supabase';

import {
  nullableSixJarProfileSchema,
  sixJarAllocationSchema,
  type SaveSixJarProfileInput,
  type SixJarAllocation,
  type SixJarProfile,
} from './six-jar-contract';


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
getSixJarProfile():
  Promise<
    SixJarProfile | null
  > {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_six_jar_profile',
      {},
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return nullableSixJarProfileSchema
    .parse(
      data,
    );
}


export async function
saveSixJarProfile(
  input:
    SaveSixJarProfileInput,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'save_six_jar_profile',
      {
        p_profile_id:
          input.profileId,

        p_name:
          input.name,

        p_currency_code:
          input.currencyCode,

        p_jars:
          input.jars.map(
            (jar) => ({
              id:
                jar.id,

              name:
                jar.name,

              code:
                jar.code,

              percentage_basis_points:
                jar.percentageBasisPoints,

              sort_order:
                jar.sortOrder,
            }),
          ),
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
      'Six-Jar profile save returned an invalid response.',
    );
  }


  return data;
}


export async function
calculateSixJarAllocation(
  incomeMinor: string,
): Promise<SixJarAllocation> {
  const {
    data,
    error,
  } =
    await callRpc(
      'calculate_six_jar_allocation',
      {
        p_income_minor:
          incomeMinor,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return sixJarAllocationSchema
    .parse(
      data,
    );
}