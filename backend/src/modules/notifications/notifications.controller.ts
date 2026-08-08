import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  notificationIdParamSchema,
  notificationListQuerySchema,
} from "./notifications.schema.js";

import {
  getUnreadNotificationCount,
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
} from "./notifications.service.js";

function getAuth(
  request:
    Request,
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

export async function listMyNotificationsController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const query =
      notificationListQuerySchema
        .parse(
          request.query,
        );

    const result =
      await listMyNotifications(
        getAuth(
          request,
        ),
        query,
      );

    response
      .status(200)
      .json({
        success:
          true,

        data:
          result,
      });
  } catch (
    error: unknown
  ) {
    next(error);
  }
}

export async function getUnreadNotificationCountController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const result =
      await getUnreadNotificationCount(
        getAuth(
          request,
        ),
      );

    response
      .status(200)
      .json({
        success:
          true,

        data:
          result,
      });
  } catch (
    error: unknown
  ) {
    next(error);
  }
}

export async function markNotificationAsReadController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const {
      id,
    } =
      notificationIdParamSchema
        .parse(
          request.params,
        );

    const notification =
      await markNotificationAsRead(
        getAuth(
          request,
        ),
        id,
      );

    response
      .status(200)
      .json({
        success:
          true,

        message:
          "Notificación marcada como leída.",

        data: {
          notificacion:
            notification,
        },
      });
  } catch (
    error: unknown
  ) {
    next(error);
  }
}

export async function markNotificationAsUnreadController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const {
      id,
    } =
      notificationIdParamSchema
        .parse(
          request.params,
        );

    const notification =
      await markNotificationAsUnread(
        getAuth(
          request,
        ),
        id,
      );

    response
      .status(200)
      .json({
        success:
          true,

        message:
          "Notificación marcada como no leída.",

        data: {
          notificacion:
            notification,
        },
      });
  } catch (
    error: unknown
  ) {
    next(error);
  }
}

export async function markAllNotificationsAsReadController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const result =
      await markAllNotificationsAsRead(
        getAuth(
          request,
        ),
      );

    response
      .status(200)
      .json({
        success:
          true,

        message:
          "Notificaciones actualizadas correctamente.",

        data:
          result,
      });
  } catch (
    error: unknown
  ) {
    next(error);
  }
}