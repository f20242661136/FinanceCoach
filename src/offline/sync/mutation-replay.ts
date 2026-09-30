import { replayCorrection } from '@/features/corrections/correction-service';
import { replayCSV } from '@/features/csv/csv-service';
import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  ZodError,
} from 'zod';

import {
  supabase,
} from '../../lib/supabase';

import {
  completeMutation,
  failMutation,
  listReadyMutations,
  markMutationProcessing,
  type SyncQueueRow,
} from '../database/sync-queue';

import {
  accountCreatePayloadSchema,
  transactionCreatePayloadSchema,
} from './mutation-payloads';


export type ReplayResult = {
  attempted: number;
  completed: number;
  failed: number;
};


function retryDelayMs(
  attemptCount: number,
): number {
  const seconds =
    Math.min(
      60 * 60,
      2 ** Math.min(
        attemptCount + 1,
        12,
      ),
    );

  return seconds * 1000;
}


function retryAt(
  attemptCount: number,
): string {
  return new Date(
    Date.now()
      + retryDelayMs(
          attemptCount,
        ),
  ).toISOString();
}


function isPermanentError(
  code: string | undefined,
): boolean {
  if (!code) {
    return false;
  }

  return (
    code.startsWith('22')
    || code.startsWith('23')
    || code === '42501'
    || code === 'P0001'
  );
}


async function replayAccountCreate(
  row: SyncQueueRow,
): Promise<{
  code?: string;
  message?: string;
}> {
  const payload =
    accountCreatePayloadSchema.parse(
      JSON.parse(
        row.payload_json,
      ),
    );

  const {
    error,
  } =
    await supabase.rpc(
      'create_account',
      {
        p_account_id:
          payload.accountId,

        p_account_type_code:
          payload.accountTypeCode,

        p_currency_code:
          payload.currencyCode,

        p_name:
          payload.name,

        p_opening_balance_minor:
          payload.openingBalanceMinor,
      },
    );

  return error
    ? {
        code:
          error.code,

        message:
          error.message,
      }
    : {};
}


async function replayTransactionCreate(
  row: SyncQueueRow,
): Promise<{
  code?: string;
  message?: string;
}> {
  const payload =
    transactionCreatePayloadSchema.parse(
      JSON.parse(
        row.payload_json,
      ),
    );

  const {
    error,
  } =
    await supabase.rpc(
      'create_financial_transaction',
      {
        p_account_id:
          payload.accountId,

        p_amount_minor:
          payload.amountMinor,

        p_category_id:
          payload.categoryId,

        p_client_operation_id:
          payload.clientOperationId,

        p_description:
          payload.description ?? undefined,

        p_merchant:
          payload.merchant ?? undefined,

        p_notes:
          payload.notes ?? undefined,

        p_transaction_date:
          payload.transactionDate,

        p_transaction_id:
          payload.transactionId,

        p_type:
          payload.type,
      },
    );

  return error
    ? {
        code:
          error.code,

        message:
          error.message,
      }
    : {};
}


async function replayRow(
  row: SyncQueueRow,
) {
  if (row.mutation_kind === 'create' && row.entity_type === 'transaction' && JSON.parse(row.payload_json)?.csv) return replayCSV(row);
  if (row.mutation_kind !== 'create' && (row.entity_type === 'transaction' || row.entity_type === 'transfer')) return replayCorrection(row);
  if (
    row.mutation_kind !==
    'create'
  ) {
    return {
      code:
        'UNSUPPORTED',

      message:
        'Unsupported queued mutation kind.',
    };
  }


  if (
    row.entity_type ===
    'account'
  ) {
    return replayAccountCreate(
      row,
    );
  }


  if (
    row.entity_type ===
    'transaction'
  ) {
    return replayTransactionCreate(
      row,
    );
  }


  return {
    code:
      'UNSUPPORTED',

    message:
      'Unsupported queued entity.',
  };
}


export async function
replayQueuedMutations(
  db: SQLiteDatabase,
  userId: string,
): Promise<ReplayResult> {
  const rows =
    await listReadyMutations(
      db,
      userId,
      20,
    );

  const result: ReplayResult = {
    attempted: 0,
    completed: 0,
    failed: 0,
  };


  for (const row of rows) {
    const claimed = await markMutationProcessing(userId, row.operation_id);
    if (!claimed) continue;
    result.attempted += 1;

    try {
      const replay =
        await replayRow(
          row,
        );

      if (!replay.message) {
        await completeMutation(
          userId,
          row.operation_id,
        );

        result.completed += 1;

        continue;
      }


      const permanent =
        replay.code === 'CORRECTION_REJECTED' || replay.code ===
          'UNSUPPORTED'
        ||
        isPermanentError(
          replay.code,
        );

      await failMutation(
        userId,
        row.operation_id,
        replay.message,
        permanent
          ? null
          : retryAt(
              row.attempt_count,
            ),
      );

      result.failed += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      /*
       * Transport failures from Supabase/fetch are thrown rather
       * than returned as PostgREST errors. They must remain
       * automatically retryable. Malformed durable queue payloads
       * are local permanent failures and require user attention.
       */
      const permanent =
        row.mutation_kind === 'create' && !row.payload_json.includes('"csv"') && (error instanceof ZodError || error instanceof SyntaxError);

      await failMutation(
        userId,
        row.operation_id,
        message,
        permanent
          ? null
          : retryAt(
              row.attempt_count,
            ),
      );

      result.failed += 1;
    }
  }


  return result;
}
