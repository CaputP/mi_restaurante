import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  createLoyaltyProgramSchema,
  loyaltyOptionsQuerySchema,
  loyaltyProgramListQuerySchema,
  loyaltyProgramParamsSchema,
  updateLoyaltyProgramSchema,
  updateLoyaltyProgramStatusSchema,
} from "./loyalty.schema.js";

import {
  createLoyaltyProgram,
  getLoyaltyOptions,
  getLoyaltyProgramById,
  listLoyaltyPrograms,
  updateLoyaltyProgram,
  updateLoyaltyProgramStatus,
} from "./loyalty.service.js";

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

export async function getLoyaltyOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      loyaltyOptionsQuerySchema
        .parse(
          request.query,
        );

    const options =
      await getLoyaltyOptions(
        getRequestAuth(
          request,
        ),
        query.sucursalId,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Opciones obtenidas correctamente.",

      data:
        options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listLoyaltyProgramsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      loyaltyProgramListQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listLoyaltyPrograms(
        getRequestAuth(
          request,
        ),
        query,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Programas obtenidos correctamente.",

      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getLoyaltyProgramByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
    } =
      loyaltyProgramParamsSchema
        .parse(
          request.params,
        );

    const program =
      await getLoyaltyProgramById(
        getRequestAuth(
          request,
        ),
        id,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Programa obtenido correctamente.",

      data: {
        programa:
          program,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createLoyaltyProgramController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createLoyaltyProgramSchema
        .parse(
          request.body,
        );

    const program =
      await createLoyaltyProgram(
        getRequestAuth(
          request,
        ),
        input,
      );

    response.status(201).json({
      success:
        true,

      message:
        "Programa creado correctamente.",

      data: {
        programa:
          program,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateLoyaltyProgramController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
    } =
      loyaltyProgramParamsSchema
        .parse(
          request.params,
        );

    const input =
      updateLoyaltyProgramSchema
        .parse(
          request.body,
        );

    const program =
      await updateLoyaltyProgram(
        getRequestAuth(
          request,
        ),
        id,
        input,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Programa actualizado correctamente.",

      data: {
        programa:
          program,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateLoyaltyProgramStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
    } =
      loyaltyProgramParamsSchema
        .parse(
          request.params,
        );

    const {
      activo,
    } =
      updateLoyaltyProgramStatusSchema
        .parse(
          request.body,
        );

    const program =
      await updateLoyaltyProgramStatus(
        getRequestAuth(
          request,
        ),
        id,
        activo,
      );

    response.status(200).json({
      success:
        true,

      message:
        activo
          ? "Programa activado correctamente."
          : "Programa desactivado correctamente.",

      data: {
        programa:
          program,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}