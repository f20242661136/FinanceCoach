import {
  z,
} from 'zod';


const integerString =
  z.string()
    .regex(
      /^-?(0|[1-9]\d*)$/,
    );


const nonNegativeIntegerString =
  z.string()
    .regex(
      /^(0|[1-9]\d*)$/,
    );


const positiveIntegerString =
  z.string()
    .regex(
      /^[1-9]\d*$/,
    );


export const savingsGoalTypeSchema =
  z.enum([
    'general',
    'emergency_fund',
    'retirement',
    'education',
    'vehicle',
    'home',
    'travel',
    'custom',
  ]);


export type SavingsGoalType =
  z.infer<
    typeof savingsGoalTypeSchema
  >;


export const savingsGoalStatusSchema =
  z.enum([
    'active',
    'paused',
    'completed',
    'archived',
  ]);


export const savingsGoalSummarySchema =
  z.object({
    id:
      z.string().uuid(),

    name:
      z.string().min(1),

    goal_type:
      savingsGoalTypeSchema,

    currency_code:
      z.string()
        .regex(
          /^[A-Z]{3}$/,
        ),

    target_amount_minor:
      positiveIntegerString,

    contributed_minor:
      nonNegativeIntegerString,

    remaining_minor:
      nonNegativeIntegerString,

    progress_basis_points:
      nonNegativeIntegerString,

    target_date:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        )
        .nullable(),

    status:
      savingsGoalStatusSchema,

    notes:
      z.string()
        .nullable(),

    is_target_reached:
      z.boolean(),

    contribution_count:
      nonNegativeIntegerString,

    last_contribution_date:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        )
        .nullable(),

    days_to_target:
      z.number()
        .int()
        .nullable(),
  });


export const savingsGoalSummaryListSchema =
  z.array(
    savingsGoalSummarySchema,
  );


export type SavingsGoalSummary =
  z.infer<
    typeof savingsGoalSummarySchema
  >;


export const savingsContributionSchema =
  z.object({
    id:
      z.string().uuid(),

    amount_minor:
      positiveIntegerString,

    contribution_date:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        ),

    note:
      z.string()
        .nullable(),

    created_at:
      z.string().min(1),
  });


export const savingsContributionListSchema =
  z.array(
    savingsContributionSchema,
  );


export type SavingsContribution =
  z.infer<
    typeof savingsContributionSchema
  >;


export type CreateSavingsGoalInput = {
  goalId: string;
  name: string;

  goalType:
    SavingsGoalType;

  currencyCode: string;

  targetAmountMinor: string;

  targetDate:
    string | null;

  notes:
    string | null;
};


export type AddSavingsContributionInput = {
  contributionId: string;
  goalId: string;

  amountMinor: string;

  contributionDate: string;

  note:
    string | null;
};


/*
 * Keep this export used so the module makes the
 * signed-string contract explicit for future
 * withdrawal/reversal support.
 */
export const signedMinorStringSchema =
  integerString;