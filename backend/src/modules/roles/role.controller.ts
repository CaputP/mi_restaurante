import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";
import {
  roleIdSchema,
  updateRolePermissionsSchema,
} from "./role.schema.js";
import {
  listRolesAndPermissions,
  updateRolePermissions,
} from "./role.service.js";

export async function listRolesController(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data =
      await listRolesAndPermissions();

    response.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateRolePermissionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(
        401,
        "Debes iniciar sesión.",
        "TOKEN_REQUERIDO",
      );
    }

    const { id } = roleIdSchema.parse(
      request.params,
    );
    const input =
      updateRolePermissionsSchema.parse(
        request.body,
      );
    const role =
      await updateRolePermissions(
        request.auth.usuarioId,
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Permisos actualizados. Las sesiones afectadas deberán iniciar nuevamente.",
      data: {
        rol: role,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}
