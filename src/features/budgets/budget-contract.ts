import {
  z,
} from 'zod';

export const integerStringSchema =
  z.string()
    .regex(
      /^-?(0|[1-9]\d*)$/,
    );

export const positiveMinorStringSchema =
  z.string()
    .regex(
      /^[1-9]\d*$/,
    );

export const budgetPeriodTypeSchema =
  z.enum([
    'monthly',
    'annual',
    'custom',
  ]);

export type BudgetPeriodType =
  z.infer<
    typeof budgetPeriodTypeSchema
  >;

export const budgetStatusSchema =
  z.object({
    id:
      z.string().uuid(),

    name:
      z.string().min(1),

    currency_code:
      z.string()
        .regex(
          /^[A-Z]{3}$/,
        ),

    period_type:
      budgetPeriodTypeSchema,

    period_start:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        ),

    period_end:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        ),

    limit_minor:
      positiveMinorStringSchema,

    spent_minor:
      integerStringSchema,

    remaining_minor:
      integerStringSchema,

    usage_basis_points:
      z.string()
        .regex(
          /^(0|[1-9]\d*)$/,
        ),

    projected_spend_minor:
      z.string()
        .regex(
          /^(0|[1-9]\d*)$/,
        ),

    is_over_budget:
      z.boolean(),

    category_id:
      z.string()
        .uuid()
        .nullable(),

    category_name:
      z.string()
        .nullable(),
  });

export const budgetStatusListSchema =
  z.array(
    budgetStatusSchema,
  );

export type BudgetStatus =
  z.infer<
    typeof budgetStatusSchema
  >;

export type CreateBudgetInput = {
  budgetId: string;
  name: string;
  currencyCode: string;

  periodType:
    BudgetPeriodType;

  periodStart: string;
  periodEnd: string;
  limitMinor: string;

  categoryId:
    string | null;
};