import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  branchAvailabilityParamsSchema,
  branchBlockParamsSchema,
  createBlockSchema,
  replaceSchedulesSchema,
  updateBlockSchema,
  updateBlockStatusSchema,
} from "./branch-availability.schema.js";

import {
  createAvailabilityBlock,
  getBranchAvailability,
  replaceBranchSchedules,
  updateAvailabilityBlock,
  updateAvailabilityBlockStatus,
} from "./branch-availability.service.js";

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

export async function getBranchAvailabilityController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      branchAvailabilityParamsSchema
        .parse(
          request.params,
        );

    const availability =
      await getBranchAvailability(
        getRequestAuth(
          request,
        ),
        id,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Disponibilidad obtenida correctamente.",

      data:
        availability,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function replaceBranchSchedulesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      branchAvailabilityParamsSchema
        .parse(
          request.params,
        );

    const input =
      replaceSchedulesSchema
        .parse(
          request.body,
        );

    const availability =
      await replaceBranchSchedules(
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
        "Horarios actualizados correctamente.",

      data:
        availability,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createAvailabilityBlockController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      branchAvailabilityParamsSchema
        .parse(
          request.params,
        );

    const input =
      createBlockSchema.parse(
        request.body,
      );

    const availability =
      await createAvailabilityBlock(
        getRequestAuth(
          request,
        ),
        id,
        input,
      );

    response.status(201).json({
      success:
        true,

      message:
        "Bloqueo registrado correctamente.",

      data:
        availability,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateAvailabilityBlockController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
      blockId,
    } =
      branchBlockParamsSchema
        .parse(
          request.params,
        );

    const input =
      updateBlockSchema.parse(
        request.body,
      );

    const availability =
      await updateAvailabilityBlock(
        getRequestAuth(
          request,
        ),
        id,
        blockId,
        input,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Bloqueo actualizado correctamente.",

      data:
        availability,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateAvailabilityBlockStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      id,
      blockId,
    } =
      branchBlockParamsSchema
        .parse(
          request.params,
        );

    const input =
      updateBlockStatusSchema
        .parse(
          request.body,
        );

    const availability =
      await updateAvailabilityBlockStatus(
        getRequestAuth(
          request,
        ),
        id,
        blockId,
        input,
      );

    response.status(200).json({
      success:
        true,

      message:
        "Estado del bloqueo actualizado correctamente.",

      data:
        availability,
    });
  } catch (error: unknown) {
    next(error);
  }
}