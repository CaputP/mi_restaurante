import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../../shared/errors/app-error.js";

import {
  commandIdSchema,
  commandOptionsQuerySchema,
  listCommandsQuerySchema,
} from "./command.schema.js";

import {
  completeCommand,
  getCommandById,
  getCommandOptions,
  listCommands,
  startCommand,
} from "./command.service.js";

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

export async function getCommandOptionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      commandOptionsQuerySchema
        .parse(
          request.query,
        );

    const options =
      await getCommandOptions(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Opciones de comandas obtenidas correctamente.",
      data: options,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listCommandsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      listCommandsQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listCommands(
        getRequestAuth(request),
        query,
      );

    response.status(200).json({
      success: true,
      message:
        "Comandas obtenidas correctamente.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getCommandByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      commandIdSchema.parse(
        request.params,
      );

    const command =
      await getCommandById(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Comanda obtenida correctamente.",
      data: {
        comanda: command,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function startCommandController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      commandIdSchema.parse(
        request.params,
      );

    const command =
      await startCommand(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Preparación de la comanda iniciada correctamente.",
      data: {
        comanda: command,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function completeCommandController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } =
      commandIdSchema.parse(
        request.params,
      );

    const command =
      await completeCommand(
        getRequestAuth(request),
        id,
      );

    response.status(200).json({
      success: true,
      message:
        "Comanda marcada como lista correctamente.",
      data: {
        comanda: command,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
}