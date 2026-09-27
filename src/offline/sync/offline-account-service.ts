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
  accountCreatePayloadSchema,
} from './mutation-payloads';

import {
  readFinanceReferenceData,
} from './reference-data';


export type OfflineAccountInput = {
  name: string;

  accountTypeCode: string;

  currencyCode: string;

  openingBalance: string;
};


function parseOpeningBalance(
  rawValue: string,
  minorUnit: number,
): string {
  const value =
    rawValue
      .trim()
      .replace(/,/g, '');


  if (!value) {
    return '0';
  }


  if (
    !/^\d+(?:\.\d+)?$/.test(
      value,
    )
  ) {
    throw new Error(
      'Enter a valid opening balance.',
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

  const result =
    BigInt(whole)
      * scale
      +
      (
        minorUnit === 0
          ? BigInt(0)
          : BigInt(
              fraction.padEnd(
                minorUnit,
                '0',
              ),
            )
      );


  return result.toString();
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
      error.message,
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
createOfflineAccount(
  db: SQLiteDatabase,
  input: OfflineAccountInput,
): Promise<string> {
  const userId =
    await requireUserId();

  const reference =
    await readFinanceReferenceData(
      db,
    );


  const accountType =
    reference.accountTypes.find(
      (value) =>
        value.code ===
        input.accountTypeCode,
    );


  if (!accountType) {
    throw new Error(
      'The selected account type is unavailable offline.',
    );
  }


  const currency =
    reference.currencies.find(
      (value) =>
        value.code ===
        input.currencyCode,
    );


  if (!currency) {
    throw new Error(
      'The selected currency is unavailable offline.',
    );
  }


  const name =
    input.name.trim();


  if (!name) {
    throw new Error(
      'Enter an account name.',
    );
  }


  const openingUnsigned =
    parseOpeningBalance(
      input.openingBalance,
      currency.minorUnit,
    );


  const openingSigned =
    accountType.balanceClass
      === 'liability'
      && openingUnsigned !== '0'
      ? `-${openingUnsigned}`
      : openingUnsigned;


  const accountId =
    Crypto.randomUUID();

  const operationId =
    Crypto.randomUUID();

  const now =
    new Date().toISOString();


  const payload =
    accountCreatePayloadSchema.parse({
      accountId,

      name,

      accountTypeCode:
        accountType.code,

      currencyCode:
        currency.code,

      openingBalanceMinor:
        openingUnsigned,
    });


  await withEncryptedWriteTransaction(
    async (writer) => {
      await writer.runAsync(
        `
          INSERT INTO local_accounts (
            user_id,
            id,
            name,
            account_type_code,
            balance_class,
            currency_code,
            currency_minor_unit,
            opening_balance_minor,
            current_balance_minor,
            status,
            sync_status,
            server_revision,
            server_updated_at,
            created_at,
            updated_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?,
            'active',
            'pending',
            '0',
            NULL,
            ?,
            ?
          )
        `,
        userId,
        accountId,
        payload.name,
        payload.accountTypeCode,
        accountType.balanceClass,
        payload.currencyCode,
        currency.minorUnit,
        openingSigned,
        openingSigned,
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
            'account',
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
        accountId,
        JSON.stringify(
          payload,
        ),
        now,
        now,
      );
    },
  );


  return accountId;
}