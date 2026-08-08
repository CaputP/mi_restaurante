import { z } from "zod";

const uuidSchema =
  z.string().uuid(
    "El identificador no es válido.",
  );

export const loyaltyRedemptionOptionsQuerySchema =
  z.object({
    pedidoId:
      uuidSchema,
  });

export const loyaltyRedemptionPreviewSchema =
  z.object({
    pedidoId:
      uuidSchema,

    premioIds: z
      .array(
        uuidSchema,
      )
      .max(
        10,
        "No pueden canjearse más de 10 premios en una venta.",
      )
      .default([])
      .transform(
        (values) =>
          [
            ...new Set(
              values,
            ),
          ],
      ),
  });

export type LoyaltyRedemptionPreviewInput =
  z.infer<
    typeof loyaltyRedemptionPreviewSchema
  >;