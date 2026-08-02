import { z } from "zod";

const uuidSchema =
  z.string().uuid(
    "El identificador no es válido.",
  );

const nullableUuidSchema =
  z.union([
    uuidSchema,
    z.literal(""),
    z.null(),
  ]).transform((value) =>
    value === "" ? null : value,
  );

export const loyaltyCustomerParamsSchema =
  z.object({
    id:
      uuidSchema,
  });

export const loyaltyCustomerListQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .optional()
      .default(""),

    sucursalId:
      nullableUuidSchema
        .optional(),

    page: z.coerce
      .number()
      .int()
      .min(1)
      .optional()
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20),
  });

export type LoyaltyCustomerListQuery =
  z.infer<
    typeof loyaltyCustomerListQuerySchema
  >;