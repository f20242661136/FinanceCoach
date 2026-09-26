export type LocalSyncStatus =
  | 'synced'
  | 'pending'
  | 'failed';

export type QueueStatus =
  | 'pending'
  | 'processing'
  | 'failed';

export type MutationEntity =
  | 'account'
  | 'transaction'
  | 'transfer';

export type MutationKind =
  | 'create'
  | 'update'
  | 'delete';

export type SyncMutationPayload =
  Record<string, unknown>;

export type EnqueueMutationInput = {
  operationId: string;
  userId: string;
  entityType: MutationEntity;
  mutationKind: MutationKind;
  entityId: string;
  payload: SyncMutationPayload;
};

export type SyncQueueRow = {
  operation_id: string;
  user_id: string;
  entity_type: MutationEntity;
  mutation_kind: MutationKind;
  entity_id: string;
  payload_json: string;
  status: QueueStatus;
  attempt_count: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type QueueSummary = {
  pending: number;
  processing: number;
  failed: number;
};