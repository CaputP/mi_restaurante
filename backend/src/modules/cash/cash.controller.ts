import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  cashOptionsQuerySchema,
  cashRegisterIdSchema,
  closeCashRegisterSchema,
  currentCashQuerySchema,
  listCashRegistersQuerySchema,
  openCashRegisterSchema,
  reopenCashRegisterSchema,
} from "./cash.schema.js";

import {
  closeCashRegister,
  getCashOptions,
  getCashRegisterById,
  getCurrentCashRegister,
  listCashRegisters,
  openCashRegister,
  reopenCashRegister,
} from "./cash.service.js";

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

export async function getCashOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      cashOptionsQuerySchema.parse(
        request.query,
      );

    const options =
      await getCashOptions(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de caja obtenidas correctamente.",
      data: options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getCurrentCashRegisterController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      currentCashQuerySchema.parse(
        request.query,
      );

    const cashRegister =
      await getCurrentCashRegister(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        cashRegister
          ? "Caja abierta obtenida correctamente."
          : "El usuario no tiene una caja abierta.",

      data: {
        caja:
          cashRegister,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listCashRegistersController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listCashRegistersQuerySchema.parse(
        request.query,
      );

    const result =
      await listCashRegisters(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Cajas obtenidas correctamente.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getCashRegisterByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      cashRegisterIdSchema.parse(
        request.params,
      );

    const cashRegister =
      await getCashRegisterById(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Caja obtenida correctamente.",

      data: {
        caja:
          cashRegister,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function openCashRegisterController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      openCashRegisterSchema.parse(
        request.body,
      );

    const cashRegister =
      await openCashRegister(
        getRequestAuth(request),
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Caja abierta correctamente.",

      data: {
        caja:
          cashRegister,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function closeCashRegisterController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      cashRegisterIdSchema.parse(
        request.params,
      );

    const input =
      closeCashRegisterSchema.parse(
        request.body,
      );

    const cashRegister =
      await closeCashRegister(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Caja cerrada correctamente.",

      data: {
        caja:
          cashRegister,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function reopenCashRegisterController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      cashRegisterIdSchema.parse(
        request.params,
      );
    const input =
      reopenCashRegisterSchema.parse(
        request.body,
      );
    const cashRegister =
      await reopenCashRegister(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Caja reabierta correctamente. La corrección quedó registrada en auditoría.",
      data: {
        caja: cashRegister,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}
