import {
  Prisma,
} from "../../generated/prisma/client.js";

type NotificationTransaction =
  Prisma.TransactionClient;

type NotificationType =
  | "STOCK_BAJO"
  | "RESERVA_PENDIENTE"
  | "RESERVA_CONFIRMADA"
  | "RESERVA_ACTUALIZADA"
  | "COMANDA_NUEVA"
  | "PEDIDO_LISTO"
  | "CAJA_ABIERTA"
  | "CAJA_CERRADA"
  | "CAJA_PENDIENTE_CIERRE"
  | "PREMIO_DISPONIBLE"
  | "RESENA_DISPONIBLE"
  | "RESENA_PENDIENTE"
  | "RESENA_MODERADA"
  | "RESPALDO"
  | "SISTEMA";

type NotificationPriority =
  | "BAJA"
  | "NORMAL"
  | "ALTA"
  | "CRITICA";

type CreateUserNotificationInput = {
  usuarioId: string;

  sucursalId?:
    string | null;

  rolId?:
    string | null;

  tipo:
    NotificationType;

  prioridad?:
    NotificationPriority;

  titulo:
    string;

  mensaje:
    string;

  entidad?:
    string | null;

  entidadId?:
    string | null;

  expiraAt?:
    Date | null;
};

export async function createUserNotification(
  transaction:
    NotificationTransaction,
  input:
    CreateUserNotificationInput,
) {
  return transaction
    .notificacion
    .create({
      data: {
        usuarioId:
          input.usuarioId,

        sucursalId:
          input.sucursalId ??
          null,

        rolId:
          input.rolId ??
          null,

        tipo:
          input.tipo,

        prioridad:
          input.prioridad ??
          "NORMAL",

        titulo:
          input.titulo,

        mensaje:
          input.mensaje,

        entidad:
          input.entidad ??
          null,

        entidadId:
          input.entidadId ??
          null,

        expiraAt:
          input.expiraAt ??
          null,
      },

      select: {
        id: true,
      },
    });
}

/*
 * Genera una notificación independiente para cada
 * usuario de uno o más roles en una sucursal.
 *
 * Esto es intencional: Notificacion tiene un campo
 * "leida" individual. No debemos crear una sola fila
 * compartida por todo un rol.
 */
export async function createBranchRoleNotifications(
  transaction:
    NotificationTransaction,
  input: {
    sucursalId: string;

    roles:
      string[];

    tipo:
      NotificationType;

    prioridad?:
      NotificationPriority;

    titulo:
      string;

    mensaje:
      string;

    entidad?:
      string | null;

    entidadId?:
      string | null;

    expiraAt?:
      Date | null;
  },
) {
  const now =
    new Date();

  const recipients =
    await transaction
      .usuario
      .findMany({
        where: {
          estado:
            "ACTIVO",

          rol: {
            codigo: {
              in:
                input.roles,
            },

            activo:
              true,
          },

          OR: [
            {
              rol: {
                codigo:
                  "ADMINISTRADOR_GENERAL",
              },
            },
            {
              sucursales: {
                some: {
                  sucursalId:
                    input.sucursalId,
                  activo:
                    true,
                  fechaInicio: {
                    lte:
                      now,
                  },
                  OR: [
                    {
                      fechaFin:
                        null,
                    },
                    {
                      fechaFin: {
                        gte:
                          now,
                      },
                    },
                  ],
                },
              },
            },
          ],
        },

        select: {
          id:
            true,
          rolId:
            true,
        },
      });

  if (
    recipients.length ===
    0
  ) {
    return {
      creadas:
        0,
    };
  }

  const existingRecipients =
    input.entidad &&
    input.entidadId
      ? await transaction
        .notificacion
        .findMany({
          where: {
            usuarioId: {
              in:
                recipients.map(
                  (recipient) =>
                    recipient.id,
                ),
            },
            tipo:
              input.tipo,
            entidad:
              input.entidad,
            entidadId:
              input.entidadId,
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
          select: {
            usuarioId:
              true,
          },
        })
      : [];

  const alreadyNotified =
    new Set(
      existingRecipients
        .map(
          (notification) =>
            notification.usuarioId,
        )
        .filter(
          (userId): userId is string =>
            Boolean(userId),
        ),
    );

  const missingRecipients =
    recipients.filter(
      (recipient) =>
        !alreadyNotified.has(
          recipient.id,
        ),
    );

  if (
    missingRecipients.length ===
    0
  ) {
    return {
      creadas:
        0,
    };
  }

  await transaction
    .notificacion
    .createMany({
      data:
        missingRecipients.map(
          (recipient) => ({
            usuarioId:
              recipient.id,

            sucursalId:
              input.sucursalId,

            rolId:
              recipient
                .rolId,

            tipo:
              input.tipo,

            prioridad:
              input.prioridad ??
              "NORMAL",

            titulo:
              input.titulo,

            mensaje:
              input.mensaje,

            entidad:
              input.entidad ??
              null,

            entidadId:
              input.entidadId ??
              null,

            expiraAt:
              input.expiraAt ??
              null,
          }),
        ),
    });

  return {
    creadas:
      missingRecipients.length,
  };
}

export async function createRoleNotifications(
  transaction:
    NotificationTransaction,
  input: {
    roles: string[];
    tipo: NotificationType;
    prioridad?: NotificationPriority;
    titulo: string;
    mensaje: string;
    entidad?: string | null;
    entidadId?: string | null;
    expiraAt?: Date | null;
  },
) {
  const recipients =
    await transaction
      .usuario
      .findMany({
        where: {
          estado:
            "ACTIVO",
          rol: {
            codigo: {
              in:
                input.roles,
            },
            activo:
              true,
          },
        },
        select: {
          id: true,
          rolId: true,
        },
      });

  if (
    recipients.length ===
    0
  ) {
    return {
      creadas:
        0,
    };
  }

  const existing =
    input.entidad &&
    input.entidadId
      ? await transaction
        .notificacion
        .findMany({
          where: {
            usuarioId: {
              in:
                recipients.map(
                  (recipient) =>
                    recipient.id,
                ),
            },
            tipo:
              input.tipo,
            entidad:
              input.entidad,
            entidadId:
              input.entidadId,
            OR: [
              {
                expiraAt:
                  null,
              },
              {
                expiraAt: {
                  gt:
                    new Date(),
                },
              },
            ],
          },
          select: {
            usuarioId:
              true,
          },
        })
      : [];

  const alreadyNotified =
    new Set(
      existing
        .map(
          (notification) =>
            notification.usuarioId,
        )
        .filter(
          (userId): userId is string =>
            Boolean(userId),
        ),
    );

  const missingRecipients =
    recipients.filter(
      (recipient) =>
        !alreadyNotified.has(
          recipient.id,
        ),
    );

  if (
    missingRecipients.length ===
    0
  ) {
    return {
      creadas:
        0,
    };
  }

  await transaction
    .notificacion
    .createMany({
      data:
        missingRecipients.map(
          (recipient) => ({
            usuarioId:
              recipient.id,
            rolId:
              recipient.rolId,
            tipo:
              input.tipo,
            prioridad:
              input.prioridad ??
              "NORMAL",
            titulo:
              input.titulo,
            mensaje:
              input.mensaje,
            entidad:
              input.entidad ??
              null,
            entidadId:
              input.entidadId ??
              null,
            expiraAt:
              input.expiraAt ??
              null,
          }),
        ),
    });

  return {
    creadas:
      missingRecipients.length,
  };
}
