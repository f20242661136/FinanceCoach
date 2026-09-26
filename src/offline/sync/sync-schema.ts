import { z } from 'zod';

const uuidSchema =
  z.string().uuid();

const revisionSchema =
  z.string().regex(
    /^(0|[1-9]\d*)$/,
    'Expected a non-negative integer string.',
  );

const signedMinorUnitSchema =
  z.string().regex(
    /^-?(0|[1-9]\d*)$/,
    'Expected an integer minor-unit string.',
  );

const unsignedMinorUnitSchema =
  z.string().regex(
    /^(0|[1-9]\d*)$/,
    'Expected a non-negative minor-unit string.',
  );

const timestampSchema =
  z.string().min(1);

const currencyCodeSchema =
  z.string().regex(
    /^[A-Z]{3}$/,
  );

export const syncAccountSchema =
  z.object({
    id: uuidSchema,

    name:
      z.string().min(1),

    account_type_code:
      z.string().min(1),

    balance_class:
      z.enum([
        'asset',
        'liability',
      ]),

    currency_code:
      currencyCodeSchema,

    currency_minor_unit:
      z.number()
        .int()
        .min(0)
        .max(9),

    opening_balance_minor:
      signedMinorUnitSchema,

    current_balance_minor:
      signedMinorUnitSchema,

    status:
      z.string().min(1),

    server_revision:
      revisionSchema,

    created_at:
      timestampSchema,

    updated_at:
      timestampSchema,
  });


export const syncCategorySchema =
  z.object({
    id:
      uuidSchema,

    kind:
      z.string().min(1),

    default_name:
      z.string().min(1),

    is_system:
      z.boolean(),

    sort_order:
      z.number().int(),

    deleted_at:
      timestampSchema.nullable(),

    server_revision:
      revisionSchema,

    created_at:
      timestampSchema,

    updated_at:
      timestampSchema,
  });


export const syncTransactionSchema =
  z.object({
    id:
      uuidSchema,

    account_id:
      uuidSchema,

    category_id:
      uuidSchema.nullable(),

    type:
      z.enum([
        'income',
        'expense',
        'transfer',
        'adjustment',
      ]),

    amount_minor:
      unsignedMinorUnitSchema,

    currency_code:
      currencyCodeSchema,

    currency_minor_unit:
      z.number()
        .int()
        .min(0)
        .max(9),

    transaction_date:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        ),

    merchant:
      z.string().nullable(),

    description:
      z.string().nullable(),

    notes:
      z.string().nullable(),

    destination_account_id:
      uuidSchema.nullable(),

    destination_amount_minor:
      unsignedMinorUnitSchema
        .nullable(),

    destination_currency_code:
      currencyCodeSchema.nullable(),

    destination_currency_minor_unit:
      z.number()
        .int()
        .min(0)
        .max(9)
        .nullable(),

    version:
      z.number()
        .int()
        .positive(),

    server_revision:
      revisionSchema,

    deleted_at:
      timestampSchema.nullable(),

    created_at:
      timestampSchema,

    updated_at:
      timestampSchema,
  });


export const syncCursorSchema =
  z.object({
    accounts:
      revisionSchema,

    categories:
      revisionSchema,

    transactions:
      revisionSchema,
  });


export const syncHasMoreSchema =
  z.object({
    accounts:
      z.boolean(),

    categories:
      z.boolean(),

    transactions:
      z.boolean(),
  });


export const syncDeltaSchema =
  z.object({
    accounts:
      z.array(
        syncAccountSchema,
      ),

    categories:
      z.array(
        syncCategorySchema,
      ),

    transactions:
      z.array(
        syncTransactionSchema,
      ),

    next:
      syncCursorSchema,

    has_more:
      syncHasMoreSchema,
  });


export type SyncDelta =
  z.infer<
    typeof syncDeltaSchema
  >;

export type SyncCursors =
  z.infer<
    typeof syncCursorSchema
  >;