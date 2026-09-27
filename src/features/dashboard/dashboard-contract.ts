import {
  z,
} from 'zod';


const nonNegativeIntegerString =
  z.string()
    .regex(
      /^(0|[1-9]\d*)$/,
    );


const signedIntegerString =
  z.string()
    .regex(
      /^-?(0|[1-9]\d*)$/,
    );


const currencyCode =
  z.string()
    .regex(
      /^[A-Z]{3}$/,
    );


export const dashboardCashFlowSchema =
  z.object({
    currency_code:
      currencyCode,

    income_minor:
      nonNegativeIntegerString,

    expense_minor:
      nonNegativeIntegerString,

    net_minor:
      signedIntegerString,

    savings_rate_basis_points:
      z.number()
        .int()
        .nullable(),
  });


export const dashboardAccountBalanceSchema =
  z.object({
    currency_code:
      currencyCode,

    account_count:
      nonNegativeIntegerString,

    total_balance_minor:
      signedIntegerString,
  });


export const dashboardSummarySchema =
  z.object({
    as_of:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        ),

    month_start:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        ),

    month_end:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        ),

    cash_flow_by_currency:
      z.array(
        dashboardCashFlowSchema,
      ),

    account_balances_by_currency:
      z.array(
        dashboardAccountBalanceSchema,
      ),

    budgets:
      z.object({
        active_count:
          nonNegativeIntegerString,

        over_budget_count:
          nonNegativeIntegerString,

        near_limit_count:
          nonNegativeIntegerString,
      }),

    goals:
      z.object({
        active_count:
          nonNegativeIntegerString,

        target_reached_count:
          nonNegativeIntegerString,
      }),

    activity:
      z.object({
        transaction_count_this_month:
          nonNegativeIntegerString,

        last_transaction_date:
          z.string()
            .regex(
              /^\d{4}-\d{2}-\d{2}$/,
            )
            .nullable(),
      }),
  });


export type DashboardSummary =
  z.infer<
    typeof dashboardSummarySchema
  >;


export type DashboardCashFlow =
  z.infer<
    typeof dashboardCashFlowSchema
  >;


export type DashboardAccountBalance =
  z.infer<
    typeof dashboardAccountBalanceSchema
  >;