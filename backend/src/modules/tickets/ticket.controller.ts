import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  saleTicketParamsSchema,
} from "./ticket.schema.js";

import {
  getSaleTicket,
} from "./ticket.service.js";

function getRequestAuth(
  request: Request,
) {
  if (!request.auth) {
    throw new AppError(
      401,
      "Debes iniciar sesión.",
      "TOKEN_REQUERIDO",
    );
  }

  return {
    usuarioId:
      request.auth.usuarioId,

    rol:
      request.auth.rol,
  };
}

export async function getSaleTicketController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
    } =
      saleTicketParamsSchema
        .parse(
          request.params,
        );

    const ticket =
      await getSaleTicket(
        getRequestAuth(
          request,
        ),
        id,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Ticket obtenido correctamente.",

      data: {
        ticket,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}