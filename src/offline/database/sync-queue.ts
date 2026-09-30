import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import {
  withEncryptedWriteTransaction,
} from '../database/encrypted-writer';


export type MutationEntity =
  | 'account'
  | 'transaction'
  | 'transfer';

export type MutationKind =
  | 'create'
  | 'update'
  | 'delete';

export type SyncQueueRow = {
  operation_id: string;
  user_id: string;
  entity_type: MutationEntity;
  mutation_kind: MutationKind;
  entity_id: string;
  payload_json: string;
  status:
    | 'pending'
    | 'processing'
    | 'failed';
  attempt_count: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};


export type EnqueueMutationInput = {
  operationId: string;
  userId: string;
  entityType: MutationEntity;
  mutationKind: MutationKind;
  entityId: string;
  payload: Record<
    string,
    unknown
  >;
};


export async function
enqueueMutation(
  input: EnqueueMutationInput,
): Promise<void> {
  const now =
    new Date().toISOString();

  await withEncryptedWriteTransaction(
    async (db) => {
      await db.runAsync(
        `
          INSERT OR IGNORE INTO sync_queue (
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
            ?, ?, ?, ?, ?, ?,
            'pending',
            0,
            NULL,
            NULL,
            ?,
            ?
          )
        `,
        input.operationId,
        input.userId,
        input.entityType,
        input.mutationKind,
        input.entityId,
        JSON.stringify(
          input.payload,
        ),
        now,
        now,
      );
    },
  );
}


export async function
listReadyMutations(
  db: SQLiteDatabase,
  userId: string,
  limit = 20,
): Promise<SyncQueueRow[]> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.trunc(limit),
        50,
      ),
    );

  const now =
    new Date().toISOString();

  return db.getAllAsync<
    SyncQueueRow
  >(
    `
      SELECT
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

      FROM sync_queue

      WHERE
        user_id = ?

        AND attempt_count < 8

        AND (
          status = 'pending'

          OR (
            status = 'failed'
            AND next_attempt_at IS NOT NULL
            AND next_attempt_at <= ?
          )
        )

      ORDER BY
        created_at ASC,

        CASE
          WHEN entity_type = 'account'
          THEN 0
          ELSE 1
        END ASC,

        operation_id ASC

      LIMIT ?
    `,
    userId,
    now,
    safeLimit,
  );
}


export async function markMutationProcessing(userId: string, operationId: string): Promise<boolean> {
  let claimed = false;
  await withEncryptedWriteTransaction(async db => {
    const now = new Date().toISOString();
    const result = await db.runAsync(`UPDATE sync_queue SET status='processing', attempt_count=attempt_count+1, updated_at=?
      WHERE user_id=? AND operation_id=? AND attempt_count < 8 AND
      (status='pending' OR (status='failed' AND next_attempt_at IS NOT NULL AND next_attempt_at <= ?))`, now,userId,operationId,now);
    claimed = result.changes === 1;
    if (claimed) await db.runAsync('UPDATE local_transaction_corrections SET attempted=1,updated_at=? WHERE user_id=? AND operation_id=?',now,userId,operationId);
  });
  return claimed;
}


export async function
completeMutation(
  userId: string,
  operationId: string,
): Promise<void> {
  await withEncryptedWriteTransaction(
    async (db) => {
      await db.runAsync(
        `
          DELETE FROM sync_queue

          WHERE
            user_id = ?
            AND operation_id = ?
        `,
        userId,
        operationId,
      );
    },
  );
}


export async function
failMutation(
  userId: string,
  operationId: string,
  errorMessage: string,
  retryAt: string | null,
): Promise<void> {
  await withEncryptedWriteTransaction(
    async (db) => {
      await db.runAsync(
        `
          UPDATE sync_queue

          SET
            status = 'failed',
            next_attempt_at = ?,
            last_error = ?,
            updated_at = ?

          WHERE
            user_id = ?
            AND operation_id = ?
        `,
        retryAt,
        errorMessage.slice(
          0,
          1000,
        ),
        new Date().toISOString(),
        userId,
        operationId,
      );
    },
  );
}
