import {
  z,
} from 'zod';

import {
  supabase,
} from '@/lib/supabase';


const serverSubscriptionStatusSchema =
  z.object({
    entitlement_id:
      z.literal('premium'),

    has_premium:
      z.boolean(),

    product_id:
      z.string().nullable(),

    store:
      z.string().nullable(),

    environment:
      z.string().nullable(),

    period_type:
      z.string().nullable()
        .optional()
        .default(null),

    current_period_ends_at:
      z.string().nullable(),

    will_renew:
      z.boolean().nullable(),

    last_event_type:
      z.string().nullable(),

    updated_at:
      z.string().nullable(),
  });

export type ServerSubscriptionStatus =
  z.infer<
    typeof serverSubscriptionStatusSchema
  >;


type RpcResult = {
  data: unknown;

  error: {
    message: string;
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
getMyServerSubscriptionStatus():
  Promise<ServerSubscriptionStatus> {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_my_subscription_status',
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return serverSubscriptionStatusSchema
    .parse(
      data,
    );
}
