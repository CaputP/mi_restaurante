import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  createUserNotification,
} from "./notification-generator.service.js";

type NotificationTransaction =
  Prisma.TransactionClient;

function getOperationalDate() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Lima",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const year =
    parts.find(
      (part) =>
        part.type ===
        "year",
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        "month",
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        "day",
    )?.value;

  if (
    !year ||
    !month ||
    !day
  ) {
    throw new Error(
      "No se pudo determinar la fecha operativa.",
    );
  }

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`,
  );
}

function formatReservationDate(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "es-PE",
    {
      timeZone:
        "UTC",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

function formatReservationTime(
  time: Date,
) {
  return `${String(
    time.getUTCHours(),
  ).padStart(
    2,
    "0",
  )}:${String(
    time.getUTCMinutes(),
  ).padStart(
    2,
    "0",
  )}`;
}

async function getReservationAdministrators(
  transaction:
    NotificationTransaction,
  branchId:
    string,
) {
  const operationalDate =
    getOperationalDate();

  const branchAdministrators =
    await transaction
      .usuarioSucursal
      .findMany({
        where: {
          sucursalId:
            branchId,

          activo:
            true,

          fechaInicio: {
            lte:
              operationalDate,
          },

          OR: [
            {
              fechaFin:
                null,
            },
            {
              fechaFin: {
                gte:
                  operationalDate,
              },
            },
          ],

          usuario: {
            estado:
              "ACTIVO",

            rol: {
              codigo:
                "ADMINISTRADOR_SUCURSAL",

              activo:
                true,
            },
          },
        },

        select: {
          usuario: {
            select: {
              id:
                true,

              rolId:
                true,
            },
          },
        },
      });

  const generalAdministrators =
    await transaction
      .usuario
      .findMany({
        where: {
          estado:
            "ACTIVO",

          rol: {
            codigo:
              "ADMINISTRADOR_GENERAL",

            activo:
              true,
          },
        },

        select: {
          id:
            true,

          rolId:
            true,
        },
      });

  const recipientMap =
    new Map<
      string,
      {
        id: string;
        rolId: string;
      }
    >();

  for (
    const assignment
    of branchAdministrators
  ) {
    recipientMap.set(
      assignment
        .usuario
        .id,
      assignment.usuario,
    );
  }

  for (
    const administrator
    of generalAdministrators
  ) {
    recipientMap.set(
      administrator.id,
      administrator,
    );
  }

  return [
    ...recipientMap.values(),
  ];
}

export async function createReservationPendingNotifications(
  transaction:
    NotificationTransaction,
  input: {
    reservationId:
      string;

    reservationCode:
      string;

    branchId:
      string;

    customerName:
      string;

    reservationDate:
      Date;

    reservationTime:
      Date;

    people:
      number;
  },
) {
  const recipients =
    await getReservationAdministrators(
      transaction,
      input.branchId,
    );

  if (
    recipients.length ===
    0
  ) {
    return {
      creadas:
        0,
    };
  }

  const now =
    new Date();

  /*
   * Evita duplicar una alerta activa para
   * la misma reserva y el mismo usuario.
   */
  const existing =
    await transaction
      .notificacion
      .findMany({
        where: {
          tipo:
            "RESERVA_PENDIENTE",

          entidad:
            "Reserva",

          entidadId:
            input
              .reservationId,

          usuarioId: {
            in:
              recipients.map(
                (
                  recipient,
                ) =>
                  recipient.id,
              ),
          },

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
      });

  const alreadyNotified =
    new Set(
      existing
        .map(
          (
            notification,
          ) =>
            notification
              .usuarioId,
        )
        .filter(
          (
            userId,
          ): userId is string =>
            Boolean(
              userId,
            ),
        ),
    );

  const missingRecipients =
    recipients.filter(
      (
        recipient,
      ) =>
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

  const dateText =
    formatReservationDate(
      input.reservationDate,
    );

  const timeText =
    formatReservationTime(
      input.reservationTime,
    );

  await transaction
    .notificacion
    .createMany({
      data:
        missingRecipients.map(
          (
            recipient,
          ) => ({
            usuarioId:
              recipient.id,

            rolId:
              recipient.rolId,

            sucursalId:
              input.branchId,

            tipo:
              "RESERVA_PENDIENTE",

            prioridad:
              "ALTA",

            titulo:
              `Nueva reserva ${input.reservationCode}`,

            mensaje:
              `${input.customerName} registró una reserva para el ${dateText} a las ${timeText}, para ${input.people} persona(s). Requiere revisión.`,

            entidad:
              "Reserva",

            entidadId:
              input.reservationId,

            leida:
              false,
          }),
        ),
    });

  return {
    creadas:
      missingRecipients.length,
  };
}

export async function createReservationPaymentPendingNotifications(
  transaction:
    NotificationTransaction,
  input: {
    reservationId:
      string;

    reservationCode:
      string;

    branchId:
      string;

    paymentMethod:
      string;

    amount:
      number;
  },
) {
  const recipients =
    await getReservationAdministrators(
      transaction,
      input.branchId,
    );

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
    await transaction
      .notificacion
      .findMany({
        where: {
          tipo:
            "RESERVA_PENDIENTE",

          entidad:
            "Reserva",

          entidadId:
            input.reservationId,

          titulo: {
            startsWith:
              "Pago por validar",
          },

          usuarioId: {
            in:
              recipients.map(
                (recipient) =>
                  recipient.id,
              ),
          },

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
      });

  const alreadyNotified =
    new Set(
      existing
        .map(
          (notification) =>
            notification.usuarioId,
        )
        .filter(
          (
            userId,
          ): userId is string =>
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

            sucursalId:
              input.branchId,

            tipo:
              "RESERVA_PENDIENTE",

            prioridad:
              "ALTA",

            titulo:
              `Pago por validar · ${input.reservationCode}`,

            mensaje:
              `Se informó un pago ${input.paymentMethod.toLowerCase()} de S/ ${input.amount.toFixed(2)}. Verifica la operación antes de confirmarlo.`,

            entidad:
              "Reserva",

            entidadId:
              input.reservationId,

            leida:
              false,
          }),
        ),
    });

  return {
    creadas:
      missingRecipients.length,
  };
}

export async function closeReservationPaymentPendingNotifications(
  transaction:
    NotificationTransaction,
  reservationId:
    string,
) {
  const result =
    await transaction
      .notificacion
      .updateMany({
        where: {
          tipo:
            "RESERVA_PENDIENTE",

          entidad:
            "Reserva",

          entidadId:
            reservationId,

          titulo: {
            startsWith:
              "Pago por validar",
          },

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

        data: {
          expiraAt:
            new Date(),
        },
      });

  return {
    cerradas:
      result.count,
  };
}

export async function closeReservationPendingNotifications(
  transaction:
    NotificationTransaction,
  reservationId:
    string,
) {
  const now =
    new Date();

  const result =
    await transaction
      .notificacion
      .updateMany({
        where: {
          tipo:
            "RESERVA_PENDIENTE",

          entidad:
            "Reserva",

          entidadId:
            reservationId,

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
          expiraAt:
            now,
        },
      });

  return {
    cerradas:
      result.count,
  };
}

function createReservationExpiration(
  reservationDate: Date,
  reservationTime: Date,
  durationMinutes: number,
) {
  const dateText =
    reservationDate
      .toISOString()
      .slice(0, 10);

  const hours =
    String(
      reservationTime
        .getUTCHours(),
    ).padStart(
      2,
      "0",
    );

  const minutes =
    String(
      reservationTime
        .getUTCMinutes(),
    ).padStart(
      2,
      "0",
    );

  const reservationStart =
    new Date(
      `${dateText}T${hours}:${minutes}:00-05:00`,
    );

  /*
   * La confirmación permanecerá visible hasta
   * 24 horas después de terminar la reserva.
   */
  return new Date(
    reservationStart.getTime() +
      durationMinutes *
        60_000 +
      24 *
        60 *
        60 *
        1000,
  );
}

export async function createReservationConfirmedNotification(
  transaction:
    NotificationTransaction,
  reservationId:
    string,
) {
  const reservation =
    await transaction
      .reserva
      .findUnique({
        where: {
          id:
            reservationId,
        },

        select: {
          id: true,

          codigo:
            true,

          clienteId:
            true,

          sucursalId:
            true,

          fechaReserva:
            true,

          horaReserva:
            true,

          duracionMinutos:
            true,

          cantidadPersonas:
            true,

          estado:
            true,

          sucursal: {
            select: {
              nombre:
                true,
            },
          },
        },
      });

  if (!reservation) {
    return {
      creada:
        false,

      motivo:
        "RESERVA_NO_ENCONTRADA",
    };
  }

  /*
   * Esta función solo debe generar una alerta
   * cuando la reserva realmente está confirmada.
   */
  if (
    reservation.estado !==
    "CONFIRMADA"
  ) {
    return {
      creada:
        false,

      motivo:
        "RESERVA_NO_CONFIRMADA",
    };
  }

  /*
   * Evitamos duplicados incluso si por algún
   * motivo esta función se ejecutara nuevamente.
   */
  const existingNotification =
    await transaction
      .notificacion
      .findFirst({
        where: {
          usuarioId:
            reservation
              .clienteId,

          tipo:
            "RESERVA_CONFIRMADA",

          entidad:
            "Reserva",

          entidadId:
            reservation.id,
        },

        select: {
          id:
            true,
        },
      });

  if (
    existingNotification
  ) {
    return {
      creada:
        false,

      motivo:
        "NOTIFICACION_YA_EXISTE",
    };
  }

  const dateText =
    formatReservationDate(
      reservation
        .fechaReserva,
    );

  const timeText =
    formatReservationTime(
      reservation
        .horaReserva,
    );

  await createUserNotification(
    transaction,
    {
      usuarioId:
        reservation
          .clienteId,

      sucursalId:
        reservation
          .sucursalId,

      tipo:
        "RESERVA_CONFIRMADA",

      prioridad:
        "NORMAL",

      titulo:
        `Reserva confirmada ${reservation.codigo}`,

      mensaje:
        `Tu reserva ${reservation.codigo} fue confirmada para el ${dateText} a las ${timeText} en ${reservation.sucursal.nombre}, para ${reservation.cantidadPersonas} persona(s).`,

      entidad:
        "Reserva",

      entidadId:
        reservation.id,

      expiraAt:
        createReservationExpiration(
          reservation
            .fechaReserva,

          reservation
            .horaReserva,

          reservation
            .duracionMinutos,
        ),
    },
  );

  return {
    creada:
      true,

    motivo:
      null,
  };
}

export async function closeReservationConfirmedNotifications(
  transaction:
    NotificationTransaction,
  reservationId:
    string,
) {
  const now =
    new Date();

  const result =
    await transaction
      .notificacion
      .updateMany({
        where: {
          tipo:
            "RESERVA_CONFIRMADA",

          entidad:
            "Reserva",

          entidadId:
            reservationId,

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
          expiraAt:
            now,
        },
      });

  return {
    cerradas:
      result.count,
  };
}
