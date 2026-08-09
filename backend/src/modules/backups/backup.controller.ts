import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";
import {
  listBackupsQuerySchema,
  requestBackupSchema,
} from "./backup.schema.js";
import {
  listBackups,
  requestManualBackup,
} from "./backup.service.js";

function getUserId(
  request: Request,
): string {
  if (!request.auth) {
    throw new AppError(
      401,
      "Debes iniciar sesión.",
      "TOKEN_REQUERIDO",
    );
  }

  return request.auth.usuarioId;
}

export async function listBackupsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listBackupsQuerySchema.parse(
        request.query,
      );
    const result =
      await listBackups(query);

    response.status(200).json({
      success: true,
      message:
        "Respaldos obtenidos correctamente.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function requestManualBackupController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      requestBackupSchema.parse(
        request.body,
      );
    const backup =
      await requestManualBackup(
        getUserId(request),
        input.password,
      );

    response.status(202).json({
      success: true,
      message:
        "El respaldo fue encolado. Su estado se actualizará al finalizar.",
      data: {
        respaldoId: backup.id,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}
