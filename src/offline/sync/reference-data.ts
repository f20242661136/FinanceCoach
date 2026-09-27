import {
  z,
} from 'zod';

import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  supabase,
} from '../../lib/supabase';

import {
  withEncryptedWriteTransaction,
} from '../database/encrypted-writer';


const META_KEY =
  'reference.finance.v1';


const referenceDataSchema =
  z.object({
    currencies:
      z.array(
        z.object({
          code:
            z.string()
              .regex(
                /^[A-Z]{3}$/,
              ),

          minorUnit:
            z.number()
              .int()
              .min(0)
              .max(9),
        }),
      ),

    accountTypes:
      z.array(
        z.object({
          code:
            z.string()
              .min(1),

          balanceClass:
            z.enum([
              'asset',
              'liability',
            ]),
        }),
      ),
  });


export type FinanceReferenceData =
  z.infer<
    typeof referenceDataSchema
  >;


export async function
refreshFinanceReferenceData():
  Promise<void> {
  const [
    currenciesResult,
    accountTypesResult,
  ] =
    await Promise.all([
      supabase
        .from('currencies')
        .select(
          'code, minor_unit',
        ),

      supabase
        .from('account_types')
        .select(
          'code, balance_class',
        ),
    ]);


  if (currenciesResult.error) {
    throw new Error(
      currenciesResult.error.message,
    );
  }


  if (accountTypesResult.error) {
    throw new Error(
      accountTypesResult.error.message,
    );
  }


  const payload =
    referenceDataSchema.parse({
      currencies:
        currenciesResult.data.map(
          (row) => ({
            code:
              row.code,

            minorUnit:
              row.minor_unit,
          }),
        ),

      accountTypes:
        accountTypesResult.data.map(
          (row) => ({
            code:
              row.code,

            balanceClass:
              row.balance_class,
          }),
        ),
    });


  await withEncryptedWriteTransaction(
    async (db) => {
      await db.runAsync(
        `
          INSERT INTO local_meta (
            key,
            value,
            updated_at
          )
          VALUES (?, ?, ?)

          ON CONFLICT (key)
          DO UPDATE SET
            value =
              excluded.value,

            updated_at =
              excluded.updated_at
        `,
        META_KEY,
        JSON.stringify(
          payload,
        ),
        new Date().toISOString(),
      );
    },
  );
}


export async function
readFinanceReferenceData(
  db: SQLiteDatabase,
): Promise<FinanceReferenceData> {
  const row =
    await db.getFirstAsync<{
      value: string;
    }>(
      `
        SELECT value
        FROM local_meta
        WHERE key = ?
        LIMIT 1
      `,
      META_KEY,
    );


  if (!row) {
    return {
      currencies: [],
      accountTypes: [],
    };
  }


  return referenceDataSchema.parse(
    JSON.parse(
      row.value,
    ),
  );
}