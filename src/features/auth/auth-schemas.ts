import { z } from 'zod';

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.'),

  password: z
    .string()
    .min(1, 'Enter your password.')
    .max(128, 'Password is too long.'),
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your name.')
    .max(80, 'Name must be 80 characters or fewer.'),

  email: z
    .string()
    .trim()
    .email('Enter a valid email address.'),

  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(128, 'Password is too long.'),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
