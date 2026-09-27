import {
  z,
} from 'zod';


const positiveIntegerString =
  z.string()
    .regex(
      /^[1-9]\d*$/,
    );


const nonNegativeIntegerString =
  z.string()
    .regex(
      /^(0|[1-9]\d*)$/,
    );


const dateString =
  z.string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
    );


export const loanDirectionSchema =
  z.enum([
    'borrowed',
    'given',
  ]);


export type LoanDirection =
  z.infer<
    typeof loanDirectionSchema
  >;


export const loanPaymentFrequencySchema =
  z.enum([
    'none',
    'weekly',
    'monthly',
    'custom',
  ]);


export type LoanPaymentFrequency =
  z.infer<
    typeof loanPaymentFrequencySchema
  >;


export const loanStatusValueSchema =
  z.enum([
    'active',
    'settled',
    'defaulted',
    'archived',
  ]);


export const loanSummarySchema =
  z.object({
    id:
      z.string().uuid(),

    direction:
      loanDirectionSchema,

    counterparty_name:
      z.string().min(1),

    currency_code:
      z.string()
        .regex(
          /^[A-Z]{3}$/,
        ),

    principal_minor:
      positiveIntegerString,

    paid_minor:
      nonNegativeIntegerString,

    remaining_minor:
      nonNegativeIntegerString,

    interest_rate_basis_points:
      z.number()
        .int()
        .nonnegative()
        .nullable(),

    start_date:
      dateString,

    due_date:
      dateString
        .nullable(),

    payment_frequency:
      loanPaymentFrequencySchema,

    scheduled_payment_minor:
      positiveIntegerString
        .nullable(),

    status:
      loanStatusValueSchema,

    notes:
      z.string()
        .nullable(),

    payment_count:
      nonNegativeIntegerString,

    last_payment_date:
      dateString
        .nullable(),

    days_to_due:
      z.number()
        .int()
        .nullable(),

    is_overdue:
      z.boolean(),
  });


export const loanSummaryListSchema =
  z.array(
    loanSummarySchema,
  );


export type LoanSummary =
  z.infer<
    typeof loanSummarySchema
  >;


export const loanPaymentSchema =
  z.object({
    id:
      z.string().uuid(),

    amount_minor:
      positiveIntegerString,

    payment_date:
      dateString,

    note:
      z.string()
        .nullable(),

    created_at:
      z.string().min(1),
  });


export const loanPaymentListSchema =
  z.array(
    loanPaymentSchema,
  );


export type LoanPayment =
  z.infer<
    typeof loanPaymentSchema
  >;


export type CreateLoanInput = {
  loanId: string;

  direction:
    LoanDirection;

  counterpartyName: string;

  currencyCode: string;

  principalMinor: string;

  startDate: string;

  dueDate:
    string | null;

  interestRateBasisPoints:
    number | null;

  paymentFrequency:
    LoanPaymentFrequency;

  scheduledPaymentMinor:
    string | null;

  notes:
    string | null;
};


export type AddLoanPaymentInput = {
  paymentId: string;

  loanId: string;

  amountMinor: string;

  paymentDate: string;

  note:
    string | null;
};