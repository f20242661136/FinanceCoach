import {
  z,
} from 'zod';


const integerString =
  z.string()
    .regex(
      /^(0|[1-9]\d*)$/,
    );


const dateString =
  z.string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
    );


export const gamificationStreakSchema =
  z.object({
    streak_type:
      z.enum([
        'daily_logging',
        'saving',
        'challenge',
      ]),

    current_count:
      z.number()
        .int()
        .nonnegative(),

    best_count:
      z.number()
        .int()
        .nonnegative(),

    last_activity_date:
      dateString
        .nullable(),

    timezone:
      z.string().min(1),
  });


export const gamificationBadgeSchema =
  z.object({
    id:
      z.string().uuid(),

    code:
      z.string().min(1),

    name:
      z.string().min(1),

    description:
      z.string().min(1),

    awarded_at:
      z.string().min(1),
  });


export const gamificationAvailableChallengeSchema =
  z.object({
    id:
      z.string().uuid(),

    code:
      z.string().min(1),

    title:
      z.string().min(1),

    description:
      z.string().min(1),

    cadence:
      z.enum([
        'daily',
        'weekly',
      ]),

    target_count:
      z.number()
        .int()
        .positive(),

    points_reward:
      z.number()
        .int()
        .positive(),

    is_premium:
      z.boolean(),
  });


export const gamificationUserChallengeSchema =
  z.object({
    id:
      z.string().uuid(),

    challenge_id:
      z.string().uuid(),

    title:
      z.string().min(1),

    description:
      z.string().min(1),

    cadence:
      z.enum([
        'daily',
        'weekly',
      ]),

    status:
      z.enum([
        'active',
        'completed',
        'expired',
      ]),

    progress_count:
      z.number()
        .int()
        .nonnegative(),

    target_count:
      z.number()
        .int()
        .positive(),

    points_reward:
      z.number()
        .int()
        .positive(),

    period_start:
      dateString,

    period_end:
      dateString,

    completed_at:
      z.string()
        .nullable(),
  });


export const gamificationPointEventSchema =
  z.object({
    id:
      z.string().uuid(),

    event_type:
      z.string().min(1),

    points:
      z.number()
        .int()
        .positive(),

    source_type:
      z.string().min(1),

    created_at:
      z.string().min(1),
  });


export const gamificationSummarySchema =
  z.object({
    total_points:
      integerString,

    level:
      z.number()
        .int()
        .positive(),

    level_name:
      z.string().min(1),

    level_minimum_points:
      integerString,

    next_level:
      z.number()
        .int()
        .positive()
        .nullable(),

    next_level_name:
      z.string()
        .nullable(),

    next_level_minimum_points:
      integerString
        .nullable(),

    streaks:
      z.array(
        gamificationStreakSchema,
      ),

    badges:
      z.array(
        gamificationBadgeSchema,
      ),

    available_challenges:
      z.array(
        gamificationAvailableChallengeSchema,
      ),

    my_challenges:
      z.array(
        gamificationUserChallengeSchema,
      ),

    recent_point_events:
      z.array(
        gamificationPointEventSchema,
      ),
  });


export type GamificationSummary =
  z.infer<
    typeof gamificationSummarySchema
  >;


export const challengeRefreshResultSchema =
  z.object({
    id:
      z.string().uuid(),

    challenge_id:
      z.string().uuid(),

    status:
      z.enum([
        'active',
        'completed',
        'expired',
      ]),

    progress_count:
      z.number()
        .int()
        .nonnegative(),

    target_count:
      z.number()
        .int()
        .positive(),

    period_start:
      dateString,

    period_end:
      dateString,

    completed_at:
      z.string()
        .nullable(),
  });