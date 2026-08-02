import { z } from "zod";

export const promotionPreviewSchema =
  z.object({
    pedidoId: z
      .string()
      .uuid(
        "El identificador del pedido no es válido.",
      ),
  });

export type PromotionPreviewInput =
  z.infer<
    typeof promotionPreviewSchema
  >;