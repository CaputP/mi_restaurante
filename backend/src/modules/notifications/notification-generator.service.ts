import {
  Prisma,
} from "../../generated/prisma/client.js";

type NotificationTransaction =
  Prisma.TransactionClient;

type NotificationType =
  | "STOCK_BAJO"
  | "RESERVA_PENDIENTE"
  | "RESERVA_CONFIRMADA"
  | "PEDIDO_LISTO"
  | "CAJA_ABIERTA"
  | "CAJA_PENDIENTE_CIERRE"
  | "PREMIO_DISPONIBLE"
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
      .usuarioSucursal
      .findMany({
        where: {
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

          usuario: {
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
        },

        select: {
          usuarioId:
            true,

          usuario: {
            select: {
              rolId:
                true,
            },
          },
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

  await transaction
    .notificacion
    .createMany({
      data:
        recipients.map(
          (recipient) => ({
            usuarioId:
              recipient
                .usuarioId,

            sucursalId:
              input.sucursalId,

            rolId:
              recipient
                .usuario
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
      recipients.length,
  };
}