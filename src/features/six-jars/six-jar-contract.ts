import {
  z,
} from 'zod';


const uuid =
  z.string().uuid();


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


export const sixJarDefinitionSchema =
  z.object({
    id:
      uuid,

    name:
      z.string()
        .trim()
        .min(1),

    code:
      z.string()
        .regex(
          /^[a-z0-9_]+$/,
        ),

    percentage_basis_points:
      positiveIntegerString,

    sort_order:
      z.number()
        .int(),
  });


export const sixJarProfileSchema =
  z.object({
    id:
      uuid,

    name:
      z.string()
        .min(1),

    currency_code:
      z.string()
        .regex(
          /^[A-Z]{3}$/,
        ),

    jars:
      z.array(
        sixJarDefinitionSchema,
      ),
  });


export const nullableSixJarProfileSchema =
  sixJarProfileSchema
    .nullable();


export type SixJarProfile =
  z.infer<
    typeof sixJarProfileSchema
  >;


export type SixJarDefinition =
  z.infer<
    typeof sixJarDefinitionSchema
  >;


export const sixJarAllocationItemSchema =
  sixJarDefinitionSchema.extend({
    suggested_amount_minor:
      nonNegativeIntegerString,
  });


export const sixJarAllocationSchema =
  z.object({
    profile_id:
      uuid,

    currency_code:
      z.string()
        .regex(
          /^[A-Z]{3}$/,
        ),

    income_minor:
      positiveIntegerString,

    jars:
      z.array(
        sixJarAllocationItemSchema,
      ),
  });


export type SixJarAllocation =
  z.infer<
    typeof sixJarAllocationSchema
  >;


export type SaveSixJarProfileInput = {
  profileId: string;
  name: string;
  currencyCode: string;

  jars: ({
    id: string;
    name: string;
    code: string;
    percentageBasisPoints: string;
    sortOrder: number;
  })[];
};