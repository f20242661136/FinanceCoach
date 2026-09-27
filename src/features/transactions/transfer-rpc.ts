import {
  supabase,
} from '../../lib/supabase';


export type TransferRpcInput = {
  transactionId: string;
  operationId: string;

  fromAccountId: string;
  toAccountId: string;

  sourceAmountMinor: string;
  destinationAmountMinor: string;

  transactionDate: string;

  note?: string | null;
};


type TransferRpcCaller = (
  functionName: string,
  args: Record<string, unknown>,
) => Promise<{
  data: unknown;
  error: {
    message: string;
    code?: string;
  } | null;
}>;


/*
 * Keep the Supabase method bound to its client.
 *
 * Generated types currently represent PostgreSQL
 * BIGINT as JavaScript number. Finance Coach keeps
 * authoritative money as decimal strings instead.
 */
const callRpc =
  supabase.rpc.bind(
    supabase,
  ) as unknown as TransferRpcCaller;


export async function
createTransferRpc(
  input: TransferRpcInput,
): Promise<void> {
  const {
    error,
  } =
    await callRpc(
      'create_transfer',
      {
        p_client_operation_id:
          input.operationId,

        p_description:
          undefined,

        p_destination_amount_minor:
          input.destinationAmountMinor,

        p_from_account_id:
          input.fromAccountId,

        p_notes:
          input.note
          ?? undefined,

        p_source_amount_minor:
          input.sourceAmountMinor,

        p_to_account_id:
          input.toAccountId,

        p_transaction_date:
          input.transactionDate,

        p_transaction_id:
          input.transactionId,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }
}