import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  loyaltyCustomerListQuerySchema,
  loyaltyCustomerParamsSchema,
} from "./loyalty-customer.schema.js";

import {
  getLoyaltyCustomerById,
  listLoyaltyCustomers,
} from "./loyalty-customer.service.js";

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

export async function listLoyaltyCustomersController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      loyaltyCustomerListQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listLoyaltyCustomers(
        getRequestAuth(
          request,
        ),
        query,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Clientes obtenidos correctamente.",

      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getLoyaltyCustomerByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
    } =
      loyaltyCustomerParamsSchema
        .parse(
          request.params,
        );

    const query =
      loyaltyCustomerListQuerySchema
        .pick({
          sucursalId:
            true,
        })
        .parse(
          request.query,
        );

    const customer =
      await getLoyaltyCustomerById(
        getRequestAuth(
          request,
        ),
        id,
        query.sucursalId,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Cliente obtenido correctamente.",

      data: {
        cliente:
          customer,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}