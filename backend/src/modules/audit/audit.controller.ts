import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  auditIdSchema,
  auditOptionsQuerySchema,
  listAuditsQuerySchema,
} from "./audit.schema.js";

import {
  getAuditById,
  getAuditOptions,
  listAudits,
} from "./audit.service.js";

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

export async function getAuditOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      auditOptionsQuerySchema
        .parse(
          request.query,
        );

    const options =
      await getAuditOptions(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de auditoría obtenidas correctamente.",
      data:
        options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listAuditsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listAuditsQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listAudits(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Registros de auditoría obtenidos correctamente.",
      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getAuditByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      auditIdSchema.parse(
        request.params,
      );

    const audit =
      await getAuditById(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Registro de auditoría obtenido correctamente.",

      data: {
        auditoria:
          audit,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}