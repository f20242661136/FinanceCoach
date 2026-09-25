import { z } from 'zod';

export const onboardingPreferencesSchema =
  z.object({
    baseCurrencyCode: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),

    locale: z
      .string()
      .trim()
      .min(2)
      .max(40),

    timezone: z
      .string()
      .trim()
      .min(1)
      .max(100),
  });

export type OnboardingPreferencesInput =
  z.infer<
    typeof onboardingPreferencesSchema
  >;