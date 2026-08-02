import { z } from "zod";

export const voidSaleParamsSchema =
  z.object({
    id: z
      .string()
      .uuid(
        "El identificador de la venta no es válido.",
      ),
  });

export const voidSaleSchema =
  z.object({
    motivo: z
      .string()
      .trim()
      .min(
        5,
        "El motivo debe contener al menos 5 caracteres.",
      )
      .max(
        500,
        "El motivo no puede superar los 500 caracteres.",
      ),
  });

export type VoidSaleInput =
  z.infer<
    typeof voidSaleSchema
  >;