import {
  z,
} from 'zod';


const uuid =
  z.string().uuid();


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


export const roscaFrequencySchema =
  z.enum([
    'weekly',
    'monthly',
  ]);


export type RoscaFrequency =
  z.infer<
    typeof roscaFrequencySchema
  >;


export const roscaGroupStatusSchema =
  z.enum([
    'forming',
    'active',
    'completed',
    'archived',
  ]);


export const roscaContributionStatusSchema =
  z.enum([
    'planned',
    'paid',
    'missed',
  ]);


export const roscaPayoutStatusSchema =
  z.enum([
    'planned',
    'paid',
  ]);


export const roscaGroupSummarySchema =
  z.object({
    id:
      uuid,

    name:
      z.string().min(1),

    currency_code:
      z.string()
        .regex(
          /^[A-Z]{3}$/,
        ),

    contribution_amount_minor:
      positiveIntegerString,

    contribution_frequency:
      roscaFrequencySchema,

    cycle_count:
      z.number()
        .int()
        .min(2),

    start_date:
      dateString,

    join_code:
      z.string().min(4),

    status:
      roscaGroupStatusSchema,

    member_count:
      nonNegativeIntegerString,

    my_member_order:
      z.number()
        .int()
        .positive(),

    my_role:
      z.enum([
        'owner',
        'member',
      ]),

    next_due_date:
      dateString
        .nullable(),
  });


export const roscaGroupSummaryListSchema =
  z.array(
    roscaGroupSummarySchema,
  );


export type RoscaGroupSummary =
  z.infer<
    typeof roscaGroupSummarySchema
  >;


export const roscaMemberSchema =
  z.object({
    id:
      uuid,

    display_name:
      z.string().min(1),

    member_order:
      z.number()
        .int()
        .positive(),

    role:
      z.enum([
        'owner',
        'member',
      ]),

    is_me:
      z.boolean(),
  });


export const roscaContributionSchema =
  z.object({
    id:
      uuid,

    member_id:
      uuid,

    display_name:
      z.string().min(1),

    planned_amount_minor:
      positiveIntegerString,

    paid_amount_minor:
      positiveIntegerString
        .nullable(),

    status:
      roscaContributionStatusSchema,

    paid_date:
      dateString
        .nullable(),

    is_mine:
      z.boolean(),
  });


export const roscaPayoutSchema =
  z.object({
    id:
      uuid,

    recipient_member_id:
      uuid,

    recipient_display_name:
      z.string().min(1),

    planned_amount_minor:
      positiveIntegerString,

    paid_amount_minor:
      positiveIntegerString
        .nullable(),

    status:
      roscaPayoutStatusSchema,

    paid_date:
      dateString
        .nullable(),
  });


export const roscaCycleSchema =
  z.object({
    id:
      uuid,

    cycle_number:
      z.number()
        .int()
        .positive(),

    due_date:
      dateString,

    status:
      z.enum([
        'scheduled',
        'open',
        'closed',
      ]),

    payout_member_id:
      uuid,

    contributions:
      z.array(
        roscaContributionSchema,
      ),

    payout:
      roscaPayoutSchema
        .nullable(),
  });


export const roscaGroupDetailSchema =
  z.object({
    id:
      uuid,

    name:
      z.string().min(1),

    currency_code:
      z.string()
        .regex(
          /^[A-Z]{3}$/,
        ),

    contribution_amount_minor:
      positiveIntegerString,

    contribution_frequency:
      roscaFrequencySchema,

    cycle_count:
      z.number()
        .int()
        .min(2),

    start_date:
      dateString,

    join_code:
      z.string().min(4),

    status:
      roscaGroupStatusSchema,

    my_role:
      z.enum([
        'owner',
        'member',
      ]),

    members:
      z.array(
        roscaMemberSchema,
      ),

    cycles:
      z.array(
        roscaCycleSchema,
      ),
  });


export type RoscaGroupDetail =
  z.infer<
    typeof roscaGroupDetailSchema
  >;


export const createRoscaGroupResultSchema =
  z.object({
    group_id:
      uuid,

    join_code:
      z.string().min(4),
  });


export type CreateRoscaGroupInput = {
  groupId: string;
  memberId: string;
  name: string;
  currencyCode: string;
  contributionAmountMinor: string;
  contributionFrequency: RoscaFrequency;
  cycleCount: number;
  startDate: string;
  creatorDisplayName: string;
};


export type JoinRoscaGroupInput = {
  memberId: string;
  joinCode: string;
  displayName: string;
};


export type MarkRoscaContributionPaidInput = {
  contributionId: string;
  paidDate: string;
  note: string | null;
};


export type MarkRoscaPayoutPaidInput = {
  payoutId: string;
  paidDate: string;
  note: string | null;
};