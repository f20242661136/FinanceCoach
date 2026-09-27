import {
  z,
} from 'zod';


const uuid =
  z.string().uuid();


const isoTimestamp =
  z.string().min(1);


export const aiConversationSchema =
  z.object({
    id:
      uuid,

    title:
      z.string().min(1),

    status:
      z.enum([
        'active',
        'archived',
      ]),

    created_at:
      isoTimestamp,

    updated_at:
      isoTimestamp,

    last_message_preview:
      z.string()
        .nullable(),

    last_message_at:
      isoTimestamp
        .nullable(),
  });


export const aiConversationListSchema =
  z.array(
    aiConversationSchema,
  );


export type AiConversation =
  z.infer<
    typeof aiConversationSchema
  >;


export const aiResponseSectionSchema =
  z.object({
    kind:
      z.enum([
        'fact',
        'observation',
        'suggestion',
        'education',
        'caution',
      ]),

    text:
      z.string()
        .min(1)
        .max(2000),
  });


export type AiResponseSection =
  z.infer<
    typeof aiResponseSectionSchema
  >;


export const aiStructuredResponseSchema =
  z.object({
    summary:
      z.string()
        .min(1)
        .max(3000),

    sections:
      z.array(
        aiResponseSectionSchema,
      )
        .max(12),

    data_limitations:
      z.array(
        z.string()
          .min(1)
          .max(500),
      )
        .max(8),
  });


export type AiStructuredResponse =
  z.infer<
    typeof aiStructuredResponseSchema
  >;


export const aiMessageSchema =
  z.object({
    id:
      uuid,

    conversation_id:
      uuid,

    role:
      z.enum([
        'user',
        'assistant',
      ]),

    content:
      z.string().min(1),

    response_json:
      aiStructuredResponseSchema
        .nullable(),

    context_version:
      z.string()
        .nullable(),

    created_at:
      isoTimestamp,
  });


export const aiMessageListSchema =
  z.array(
    aiMessageSchema,
  );


export type AiMessage =
  z.infer<
    typeof aiMessageSchema
  >;


export const financialInsightSchema =
  z.object({
    id:
      uuid,

    insight_type:
      z.enum([
        'monthly_summary',
        'spending_pattern',
        'budget',
        'saving',
        'goal',
        'loan',
        'six_jar',
        'income_growth',
        'motivation',
      ]),

    title:
      z.string().min(1),

    body:
      z.string().min(1),

    status:
      z.enum([
        'unread',
        'read',
        'dismissed',
      ]),

    source_period_start:
      z.string()
        .nullable(),

    source_period_end:
      z.string()
        .nullable(),

    generated_at:
      isoTimestamp,
  });


export const financialInsightListSchema =
  z.array(
    financialInsightSchema,
  );


export type FinancialInsight =
  z.infer<
    typeof financialInsightSchema
  >;


const minorIntegerString =
  z.string()
    .regex(
      /^-?\d+$/,
    );


const nullableBasisPointsString =
  z.string()
    .regex(
      /^-?\d+$/,
    )
    .nullable();


export const aiCurrencySummarySchema =
  z.object({
    currency_code:
      z.string().min(1),

    monthly_income_minor:
      minorIntegerString,

    monthly_expenses_minor:
      minorIntegerString,

    monthly_net_minor:
      minorIntegerString,

    savings_rate_basis_points:
      nullableBasisPointsString,

    previous_month_income_minor:
      minorIntegerString,

    previous_month_expenses_minor:
      minorIntegerString,

    expense_change_basis_points:
      nullableBasisPointsString,
  });


export const aiFinancialContextSchema =
  z.object({
    context_version:
      z.literal(
        'ai-context-v1',
      ),

    as_of_date:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        ),

    timezone:
      z.string().min(1),

    period:
      z.object({
        current_month_start:
          z.string(),

        current_month_end:
          z.string(),

        previous_month_start:
          z.string(),

        previous_month_end:
          z.string(),
      }),

    currency_summaries:
      z.array(
        aiCurrencySummarySchema,
      ),

    category_breakdown:
      z.array(
        z.object({
          currency_code:
            z.string(),

          category_name:
            z.string(),

          current_month_expense_minor:
            minorIntegerString,

          previous_month_expense_minor:
            minorIntegerString,

          change_basis_points:
            nullableBasisPointsString,
        }),
      ),

    budget_status:
      z.array(
        z.object({
          budget_id:
            uuid,

          currency_code:
            z.string(),

          category_name:
            z.string(),

          period_start:
            z.string(),

          period_end:
            z.string(),

          limit_minor:
            minorIntegerString,

          spent_minor:
            minorIntegerString,

          remaining_minor:
            minorIntegerString,

          over_budget:
            z.boolean(),
        }),
      ),

    goal_progress:
      z.array(
        z.object({
          goal_id:
            uuid,

          name:
            z.string(),

          currency_code:
            z.string(),

          target_minor:
            minorIntegerString,

          contributed_minor:
            minorIntegerString,

          remaining_minor:
            minorIntegerString,

          progress_basis_points:
            nullableBasisPointsString,

          target_date:
            z.string()
              .nullable(),

          status:
            z.string(),
        }),
      ),

    loan_summary:
      z.array(
        z.object({
          currency_code:
            z.string(),

          direction:
            z.enum([
              'borrowed',
              'given',
            ]),

          loan_count:
            z.number()
              .int()
              .nonnegative(),

          remaining_minor:
            minorIntegerString,
        }),
      ),

    recent_behavior:
      z.object({
        transactions_last_7_days:
          z.number()
            .int()
            .nonnegative(),

        transactions_last_30_days:
          z.number()
            .int()
            .nonnegative(),

        budgets_created_last_30_days:
          z.number()
            .int()
            .nonnegative(),

        goals_created_last_30_days:
          z.number()
            .int()
            .nonnegative(),

        savings_contributions_last_30_days:
          z.number()
            .int()
            .nonnegative(),
      }),

    privacy:
      z.object({
        contains_raw_transactions:
          z.literal(false),

        contains_merchants:
          z.literal(false),

        contains_account_numbers:
          z.literal(false),

        contains_loan_counterparties:
          z.literal(false),

        currency_totals_combined:
          z.literal(false),
      }),
  });


export type AiFinancialContext =
  z.infer<
    typeof aiFinancialContextSchema
  >;


export const aiCoachSendResponseSchema =
  z.object({
    conversation_id:
      uuid,

    user_message_id:
      uuid,

    assistant_message_id:
      uuid,

    response:
      aiStructuredResponseSchema,
  });


export type AiCoachSendResponse =
  z.infer<
    typeof aiCoachSendResponseSchema
  >;


export const aiGeneratedInsightResponseSchema =
  z.object({
    insight:
      financialInsightSchema,

    reused:
      z.boolean(),
  });


export type AiGeneratedInsightResponse =
  z.infer<
    typeof aiGeneratedInsightResponseSchema
  >;