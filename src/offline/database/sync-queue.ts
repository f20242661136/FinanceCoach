import type {
  SQLiteDatabase,
} from 'expo-sqlite';

import type {
  EnqueueMutationInput,
  QueueSummary,
  SyncQueueRow,
} from './types';

function nowIso(): string {
  return new Date().toISOString();
}

export async function enqueueMutation(
  db: SQLiteDatabase,
  input: EnqueueMutationInput,
): Promise<void> {
  const now =
    nowIso();

  const payloadJson =
    JSON.stringify(
      input.payload,
    );

  /*
   * operation_id is the durable
   * idempotency boundary.
   *
   * Re-enqueuing the same operation ID
   * must not duplicate the mutation.
   */
  await db.runAsync(
    `
      INSERT OR IGNORE
      INTO sync_queue (
        operation_id,
        user_id,
        entity_type,
        mutation_kind,
        entity_id,
        payload_json,
        status,
        attempt_count,
        created_at,
        updated_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'pending',
        0,
        ?,
        ?
      )
    `,
    input.operationId,
    input.userId,
    input.entityType,
    input.mutationKind,
    input.entityId,
    payloadJson,
    now,
    now,
  );
}

export async function listReadyMutations(
  db: SQLiteDatabase,
  userId: string,
  limit = 20,
): Promise<SyncQueueRow[]> {
  const safeLimit =
    Math.max(
      1,
      Math.min(limit, 100),
    );

  const now =
    nowIso();

  return db.getAllAsync<SyncQueueRow>(
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
        AND (
          status = 'pending'
          OR status = 'failed'
        )
        AND (
          next_attempt_at IS NULL
          OR next_attempt_at <= ?
        )

      ORDER BY
        created_at ASC

      LIMIT ?
    `,
    userId,
    now,
    safeLimit,
  );
}

export async function markMutationProcessing(
  db: SQLiteDatabase,
  operationId: string,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE sync_queue
      SET
        status = 'processing',
        updated_at = ?
      WHERE operation_id = ?
    `,
    nowIso(),
    operationId,
  );
}

export async function completeMutation(
  db: SQLiteDatabase,
  operationId: string,
): Promise<void> {
  await db.runAsync(
    `
      DELETE FROM sync_queue
      WHERE operation_id = ?
    `,
    operationId,
  );
}

export async function failMutation(
  db: SQLiteDatabase,
  operationId: string,
  errorMessage: string,
  nextAttemptAt: string | null,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE sync_queue
      SET
        status = 'failed',
        attempt_count =
          attempt_count + 1,
        last_error = ?,
        next_attempt_at = ?,
        updated_at = ?
      WHERE operation_id = ?
    `,
    errorMessage.slice(
      0,
      1000,
    ),
    nextAttemptAt,
    nowIso(),
    operationId,
  );
}

export async function getQueueSummary(
  db: SQLiteDatabase,
  userId: string,
): Promise<QueueSummary> {
  const rows =
    await db.getAllAsync<{
      status:
        | 'pending'
        | 'processing'
        | 'failed';

      count: number;
    }>(
      `
        SELECT
          status,
          COUNT(*) AS count
        FROM sync_queue
        WHERE user_id = ?
        GROUP BY status
      `,
      userId,
    );

  const summary: QueueSummary = {
    pending: 0,
    processing: 0,
    failed: 0,
  };

  for (const row of rows) {
    summary[row.status] =
      Number(row.count);
  }

  return summary;
}

export async function deleteUserLocalData(
  db: SQLiteDatabase,
  userId: string,
): Promise<void> {
  await db.withExclusiveTransactionAsync(
    async (transaction) => {
      await transaction.runAsync(
        `
          DELETE FROM
            local_transactions
          WHERE user_id = ?
        `,
        userId,
      );

      await transaction.runAsync(
        `
          DELETE FROM
            local_categories
          WHERE user_id = ?
        `,
        userId,
      );

      await transaction.runAsync(
        `
          DELETE FROM
            local_accounts
          WHERE user_id = ?
        `,
        userId,
      );

      await transaction.runAsync(
        `
          DELETE FROM
            sync_cursors
          WHERE user_id = ?
        `,
        userId,
      );

      await transaction.runAsync(
        `
          DELETE FROM
            sync_queue
          WHERE user_id = ?
        `,
        userId,
      );
    },
  );
}