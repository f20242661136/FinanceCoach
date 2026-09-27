import {
  supabase,
} from '../../lib/supabase';

import {
  loanPaymentListSchema,
  loanSummaryListSchema,
  type AddLoanPaymentInput,
  type CreateLoanInput,
  type LoanPayment,
  type LoanSummary,
} from './loan-contract';


type RpcResult = {
  data: unknown;

  error: {
    message: string;
    code?: string;
  } | null;
};


const callRpc =
  supabase.rpc.bind(
    supabase,
  ) as unknown as (
    functionName: string,
    args?: Record<
      string,
      unknown
    >,
  ) => Promise<RpcResult>;


export async function
createLoan(
  input:
    CreateLoanInput,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'create_loan',
      {
        p_loan_id:
          input.loanId,

        p_direction:
          input.direction,

        p_counterparty_name:
          input.counterpartyName,

        p_currency_code:
          input.currencyCode,

        p_principal_minor:
          input.principalMinor,

        p_start_date:
          input.startDate,

        p_due_date:
          input.dueDate
          ?? undefined,

        p_interest_rate_basis_points:
          input.interestRateBasisPoints
          ?? undefined,

        p_payment_frequency:
          input.paymentFrequency,

        p_scheduled_payment_minor:
          input.scheduledPaymentMinor
          ?? undefined,

        p_notes:
          input.notes
          ?? undefined,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  if (
    typeof data !== 'string'
  ) {
    throw new Error(
      'Loan creation returned an invalid response.',
    );
  }


  return data;
}


export async function
addLoanPayment(
  input:
    AddLoanPaymentInput,
): Promise<string> {
  const {
    data,
    error,
  } =
    await callRpc(
      'add_loan_payment',
      {
        p_payment_id:
          input.paymentId,

        p_loan_id:
          input.loanId,

        p_amount_minor:
          input.amountMinor,

        p_payment_date:
          input.paymentDate,

        p_note:
          input.note
          ?? undefined,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  if (
    typeof data !== 'string'
  ) {
    throw new Error(
      'Loan payment returned an invalid response.',
    );
  }


  return data;
}


export async function
getLoanStatus():
  Promise<
    LoanSummary[]
  > {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_loan_status',
      {},
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return loanSummaryListSchema
    .parse(
      data,
    );
}


export async function
getLoanPaymentHistory(
  loanId: string,
  limit = 100,
): Promise<
  LoanPayment[]
> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Math.trunc(
          limit,
        ),
        500,
      ),
    );


  const {
    data,
    error,
  } =
    await callRpc(
      'get_loan_payment_history',
      {
        p_loan_id:
          loanId,

        p_limit:
          safeLimit,
      },
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return loanPaymentListSchema
    .parse(
      data,
    );
}