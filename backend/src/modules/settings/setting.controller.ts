import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  correlativeDocumentTypeSchema,
  createSettingSchema,
  listCorrelativesQuerySchema,
  listSettingsQuerySchema,
  settingIdSchema,
  settingOptionsQuerySchema,
  updateCorrelativeSchema,
  updateSettingEditabilitySchema,
  updateSettingSchema,
} from "./setting.schema.js";

import {
  createSetting,
  getSettingById,
  getSettingOptions,
  listCorrelatives,
  listSettings,
  updateCorrelative,
  updateSetting,
  updateSettingEditability,
} from "./setting.service.js";

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

export async function getSettingOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      settingOptionsQuerySchema
        .parse(
          request.query,
        );

    const options =
      await getSettingOptions(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de configuración obtenidas correctamente.",
      data:
        options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listSettingsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listSettingsQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listSettings(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Configuraciones obtenidas correctamente.",
      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getSettingByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      settingIdSchema.parse(
        request.params,
      );

    const setting =
      await getSettingById(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Configuración obtenida correctamente.",

      data: {
        configuracion:
          setting,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function createSettingController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      createSettingSchema.parse(
        request.body,
      );

    const setting =
      await createSetting(
        getRequestAuth(request),
        input,
      );

    response.status(201).json({
      success: true,
      message:
        "Configuración creada correctamente.",

      data: {
        configuracion:
          setting,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateSettingController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      settingIdSchema.parse(
        request.params,
      );

    const input =
      updateSettingSchema.parse(
        request.body,
      );

    const setting =
      await updateSetting(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Configuración actualizada correctamente.",

      data: {
        configuracion:
          setting,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateSettingEditabilityController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      settingIdSchema.parse(
        request.params,
      );

    const input =
      updateSettingEditabilitySchema
        .parse(
          request.body,
        );

    const setting =
      await updateSettingEditability(
        getRequestAuth(request),
        id,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Editabilidad actualizada correctamente.",

      data: {
        configuracion:
          setting,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listCorrelativesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listCorrelativesQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listCorrelatives(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Correlativos obtenidos correctamente.",
      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateCorrelativeController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      tipoDocumento,
    } =
      correlativeDocumentTypeSchema
        .parse(
          request.params,
        );

    const input =
      updateCorrelativeSchema
        .parse(
          request.body,
        );

    const result =
      await updateCorrelative(
        getRequestAuth(request),
        tipoDocumento,
        input,
      );

    response.status(200).json({
      success: true,
      message:
        "Correlativo actualizado correctamente.",
      data:
        result,
    });
  } catch (error: unknown) {
    next(error);
  }
}