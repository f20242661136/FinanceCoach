import {
  z,
} from 'zod';


const uuid =
  z.string().uuid();

const minor =
  z.string().regex(
    /^(0|[1-9]\d*)$/,
  );


export const accountCreatePayloadSchema =
  z.object({
    accountId:
      uuid,

    name:
      z.string()
        .trim()
        .min(1),

    accountTypeCode:
      z.string()
        .min(1),

    currencyCode:
      z.string()
        .regex(
          /^[A-Z]{3}$/,
        ),

    openingBalanceMinor:
      minor,
  });


export const transactionCreatePayloadSchema =
  z.object({
    transactionId:
      uuid,

    clientOperationId:
      uuid,

    accountId:
      uuid,

    categoryId:
      uuid,

    type:
      z.enum([
        'income',
        'expense',
      ]),

    amountMinor:
      minor,

    transactionDate:
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
  });


export type AccountCreatePayload =
  z.infer<
    typeof accountCreatePayloadSchema
  >;

export type TransactionCreatePayload =
  z.infer<
    typeof transactionCreatePayloadSchema
  >;