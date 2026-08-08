import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import type {
  NotificationListQuery,
} from "./notifications.schema.js";

type NotificationAuth = {
  usuarioId: string;
  rol: string;
};

function mapNotification(
  notification: {
    id: string;

    sucursalId:
      string | null;

    usuarioId:
      string | null;

    rolId:
      string | null;

    tipo: string;
    prioridad: string;

    titulo: string;
    mensaje: string;

    entidad:
      string | null;

    entidadId:
      string | null;

    leida: boolean;

    fechaLectura:
      Date | null;

    expiraAt:
      Date | null;

    createdAt:
      Date;

    sucursal: {
      id: string;
      codigo: string;
      nombre: string;
    } | null;
  },
) {
  return {
    ...notification,

    fechaLectura:
      notification
        .fechaLectura
        ?.toISOString() ??
      null,

    expiraAt:
      notification
        .expiraAt
        ?.toISOString() ??
      null,

    createdAt:
      notification
        .createdAt
        .toISOString(),
  };
}

async function assertNotificationOwner(
  notificationId: string,
  userId: string,
) {
  const notification =
    await prisma.notificacion
      .findFirst({
        where: {
          id:
            notificationId,

          usuarioId:
            userId,
        },

        select: {
          id: true,
        },
      });

  if (!notification) {
    throw new AppError(
      404,
      "La notificación no existe o no pertenece al usuario.",
      "NOTIFICACION_NO_ENCONTRADA",
    );
  }
}

export async function listMyNotifications(
  auth:
    NotificationAuth,
  query:
    NotificationListQuery,
) {
  const {
    page,
    limit,
    leida,
    tipo,
    prioridad,
  } =
    query;

  const now =
    new Date();

  /*
   * Cada notificación de la aplicación tendrá
   * usuarioId. De esta forma la lectura es
   * individual y un usuario no marca como leída
   * la notificación de otro.
   */
  const where:
    Prisma.NotificacionWhereInput =
    {
      usuarioId:
        auth.usuarioId,

      OR: [
        {
          expiraAt:
            null,
        },
        {
          expiraAt: {
            gt:
              now,
          },
        },
      ],

      ...(leida !== undefined
        ? {
            leida,
          }
        : {}),

      ...(tipo
        ? {
            tipo,
          }
        : {}),

      ...(prioridad
        ? {
            prioridad,
          }
        : {}),
    };

  const [
    notifications,
    total,
    unread,
  ] =
    await prisma.$transaction([
      prisma.notificacion.findMany({
        where,

        orderBy: [
          {
            leida:
              "asc",
          },
          {
            createdAt:
              "desc",
          },
        ],

        skip:
          (page - 1) *
          limit,

        take:
          limit,

        select: {
          id: true,

          sucursalId:
            true,

          usuarioId:
            true,

          rolId:
            true,

          tipo:
            true,

          prioridad:
            true,

          titulo:
            true,

          mensaje:
            true,

          entidad:
            true,

          entidadId:
            true,

          leida:
            true,

          fechaLectura:
            true,

          expiraAt:
            true,

          createdAt:
            true,

          sucursal: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
        },
      }),

      prisma.notificacion.count({
        where,
      }),

      prisma.notificacion.count({
        where: {
          usuarioId:
            auth.usuarioId,

          leida:
            false,

          OR: [
            {
              expiraAt:
                null,
            },
            {
              expiraAt: {
                gt:
                  now,
              },
            },
          ],
        },
      }),
    ]);

  return {
    notificaciones:
      notifications.map(
        mapNotification,
      ),

    resumen: {
      total,
      noLeidas:
        unread,
    },

    paginacion: {
      page,
      limit,
      total,

      totalPages:
        Math.max(
          1,
          Math.ceil(
            total /
              limit,
          ),
        ),
    },
  };
}

export async function getUnreadNotificationCount(
  auth:
    NotificationAuth,
) {
  const now =
    new Date();

  const count =
    await prisma.notificacion
      .count({
        where: {
          usuarioId:
            auth.usuarioId,

          leida:
            false,

          OR: [
            {
              expiraAt:
                null,
            },
            {
              expiraAt: {
                gt:
                  now,
              },
            },
          ],
        },
      });

  return {
    noLeidas:
      count,
  };
}

export async function markNotificationAsRead(
  auth:
    NotificationAuth,
  notificationId:
    string,
) {
  await assertNotificationOwner(
    notificationId,
    auth.usuarioId,
  );

  const notification =
    await prisma.notificacion
      .update({
        where: {
          id:
            notificationId,
        },

        data: {
          leida:
            true,

          fechaLectura:
            new Date(),
        },

        select: {
          id: true,

          sucursalId:
            true,

          usuarioId:
            true,

          rolId:
            true,

          tipo:
            true,

          prioridad:
            true,

          titulo:
            true,

          mensaje:
            true,

          entidad:
            true,

          entidadId:
            true,

          leida:
            true,

          fechaLectura:
            true,

          expiraAt:
            true,

          createdAt:
            true,

          sucursal: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
        },
      });

  return mapNotification(
    notification,
  );
}

export async function markNotificationAsUnread(
  auth:
    NotificationAuth,
  notificationId:
    string,
) {
  await assertNotificationOwner(
    notificationId,
    auth.usuarioId,
  );

  const notification =
    await prisma.notificacion
      .update({
        where: {
          id:
            notificationId,
        },

        data: {
          leida:
            false,

          fechaLectura:
            null,
        },

        select: {
          id: true,

          sucursalId:
            true,

          usuarioId:
            true,

          rolId:
            true,

          tipo:
            true,

          prioridad:
            true,

          titulo:
            true,

          mensaje:
            true,

          entidad:
            true,

          entidadId:
            true,

          leida:
            true,

          fechaLectura:
            true,

          expiraAt:
            true,

          createdAt:
            true,

          sucursal: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
        },
      });

  return mapNotification(
    notification,
  );
}

export async function markAllNotificationsAsRead(
  auth:
    NotificationAuth,
) {
  const now =
    new Date();

  const result =
    await prisma.notificacion
      .updateMany({
        where: {
          usuarioId:
            auth.usuarioId,

          leida:
            false,

          OR: [
            {
              expiraAt:
                null,
            },
            {
              expiraAt: {
                gt:
                  now,
              },
            },
          ],
        },

        data: {
          leida:
            true,

          fechaLectura:
            now,
        },
      });

  return {
    actualizadas:
      result.count,
  };
}