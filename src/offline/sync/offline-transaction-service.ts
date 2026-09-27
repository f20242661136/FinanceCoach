import * as Crypto from 'expo-crypto';

import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  supabase,
} from '../../lib/supabase';

import {
  withEncryptedWriteTransaction,
} from '../database/encrypted-writer';

import {
  transactionCreatePayloadSchema,
} from './mutation-payloads';


type AccountRow = {
  id: string;
  currency_code: string;
  currency_minor_unit: number;
  status: string;
};


export type OfflineTransactionInput = {
  accountId: string;
  categoryId: string | null;

  type:
    | 'income'
    | 'expense';

  amount: string;

  transactionDate: string;

  merchant?: string | null;
  description?: string | null;
  notes?: string | null;
};


export type OfflineTransactionResult = {
  transactionId: string;
  operationId: string;
};


function cleanOptional(
  value:
    | string
    | null
    | undefined,
): string | null {
  const cleaned =
    value?.trim();

  return cleaned
    ? cleaned
    : null;
}


function parseAmountToMinor(
  rawValue: string,
  minorUnit: number,
): string {
  const value =
    rawValue
      .trim()
      .replace(/,/g, '');

  if (
    !/^\d+(?:\.\d+)?$/.test(
      value,
    )
  ) {
    throw new Error(
      'Enter a valid positive amount.',
    );
  }

  const [
    whole,
    fraction = '',
  ] =
    value.split('.');


  if (
    fraction.length >
    minorUnit
  ) {
    throw new Error(
      `This currency supports at most ${minorUnit} decimal places.`,
    );
  }


  const scale =
    BigInt(10)
      ** BigInt(
        minorUnit,
      );

  const wholeMinor =
    BigInt(whole)
      * scale;

  const fractionMinor =
    minorUnit === 0
      ? BigInt(0)
      : BigInt(
          fraction.padEnd(
            minorUnit,
            '0',
          ),
        );

  const result =
    wholeMinor
      + fractionMinor;

  if (result <= BigInt(0)) {
    throw new Error(
      'Amount must be greater than zero.',
    );
  }

  return result.toString();
}


function assertDate(
  value: string,
): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    throw new Error(
      'Enter the date as YYYY-MM-DD.',
    );
  }

  return value;
}


async function requireUserId():
  Promise<string> {
  const {
    data: {
      session,
    },
    error,
  } =
    await supabase.auth
      .getSession();

  if (error) {
    throw new Error(
      `Could not read session: ${error.message}`,
    );
  }

  if (!session?.user.id) {
    throw new Error(
      'Authentication required.',
    );
  }

  return session.user.id;
}


export async function
createOfflineTransaction(
  db: SQLiteDatabase,
  input: OfflineTransactionInput,
): Promise<OfflineTransactionResult> {
  const userId =
    await requireUserId();


  const account =
    await db.getFirstAsync<
      AccountRow
    >(
      `
        SELECT
          id,
          currency_code,
          currency_minor_unit,
          status

        FROM local_accounts

        WHERE
          user_id = ?
          AND id = ?

        LIMIT 1
      `,
      userId,
      input.accountId,
    );


  if (!account) {
    throw new Error(
      'The selected account is unavailable on this device.',
    );
  }


  if (
    account.status !==
    'active'
  ) {
    throw new Error(
      'The selected account is not active.',
    );
  }


  const amountMinor =
    parseAmountToMinor(
      input.amount,
      account.currency_minor_unit,
    );


  const transactionId =
    Crypto.randomUUID();

  const operationId =
    Crypto.randomUUID();

  const now =
    new Date()
      .toISOString();


  if (!input.categoryId) {
    throw new Error(
      'Select a category.',
    );
  }


  const payload =
    transactionCreatePayloadSchema.parse({
      transactionId,

      clientOperationId:
        operationId,

      accountId:
        input.accountId,

      categoryId:
        input.categoryId,

      type:
        input.type,

      amountMinor,

      transactionDate:
        assertDate(
          input.transactionDate,
        ),

      merchant:
        cleanOptional(
          input.merchant,
        ),

      description:
        cleanOptional(
          input.description,
        ),

      notes:
        cleanOptional(
          input.notes,
        ),
    });


  /*
   * Local transaction + durable queue item
   * MUST commit together.
   */
  await withEncryptedWriteTransaction(
    async (writer) => {
      await writer.runAsync(
        `
          INSERT INTO local_transactions (
            user_id,
            id,
            account_id,
            category_id,
            type,
            amount_minor,
            currency_code,
            currency_minor_unit,
            transaction_date,
            merchant,
            description,
            notes,
            destination_account_id,
            destination_amount_minor,
            destination_currency_code,
            destination_currency_minor_unit,
            version,
            server_revision,
            sync_status,
            deleted_at,
            created_at,
            updated_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            NULL, NULL, NULL, NULL,
            1,
            '0',
            'pending',
            NULL,
            ?,
            ?
          )
        `,
        userId,
        transactionId,
        payload.accountId,
        payload.categoryId,
        payload.type,
        payload.amountMinor,
        account.currency_code,
        account.currency_minor_unit,
        payload.transactionDate,
        payload.merchant,
        payload.description,
        payload.notes,
        now,
        now,
      );


      await writer.runAsync(
        `
          INSERT INTO sync_queue (
            operation_id,
            user_id,
            entity_type,
            mutation_kind,
            entity_id,
            payload_json,
            status,
            attempt_count,
            next_attempt_at,
            last_error,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            'transaction',
            'create',
            ?,
            ?,
            'pending',
            0,
            NULL,
            NULL,
            ?,
            ?
          )
        `,
        operationId,
        userId,
        transactionId,
        JSON.stringify(
          payload,
        ),
        now,
        now,
      );
    },
  );


  return {
    transactionId,
    operationId,
  };
}