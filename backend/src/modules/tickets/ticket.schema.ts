import { z } from "zod";

export const saleTicketParamsSchema =
  z.object({
    id: z
      .string()
      .uuid(
        "El identificador de la venta no es válido.",
      ),
  });