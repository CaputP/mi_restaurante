import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  ApproveReservationInput,
  CancelReservationInput,
  ConfirmReservationPaymentInput,
  CreateReservationInput,
  ListReservationsQuery,
  RegisterReservationPaymentInput,
  RejectReservationInput,
  ReservationAvailabilityQuery,
  ReservationOptionsQuery,
  ReviewReservationInput,
} from "./reservation.schema.js";

type ReservationAuth = {
  usuarioId: string;
  rol: string;
};

const OCCUPIED_RESERVATION_STATES = [
  "SOLICITADA",
  "EN_REVISION",
  "ESPERANDO_ADELANTO",
  "CONFIRMADA",
] as const;

const DAY_CODES = [
  "DOMINGO",
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
] as const;

function parseDateOnly(
  dateText: string,
): Date {
  return new Date(
    `${dateText}T00:00:00.000Z`,
  );
}

function parseTimeOnly(
  timeText: string,
): Date {
  return new Date(
    `1970-01-01T${timeText}:00.000Z`,
  );
}

function createLimaDateTime(
  dateText: string,
  timeText: string,
): Date {
  return new Date(
    `${dateText}T${timeText}:00-05:00`,
  );
}

function formatDateOnly(
  date: Date,
): string {
  return date
    .toISOString()
    .slice(0, 10);
}

function formatTimeOnly(
  date: Date,
): string {
  const hour = String(
    date.getUTCHours(),
  ).padStart(2, "0");

  const minute = String(
    date.getUTCMinutes(),
  ).padStart(2, "0");

  return `${hour}:${minute}`;
}

function timeToMinutes(
  time: Date,
): number {
  return (
    time.getUTCHours() * 60 +
    time.getUTCMinutes()
  );
}

function stringTimeToMinutes(
  time: string,
): number {
  const parts =
    time.split(":");
  const hours =
    Number(parts[0] ?? 0);
  const minutes =
    Number(parts[1] ?? 0);
  return (
    hours * 60 +
    minutes
  );
}

function getOperationalDate(): Date {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Lima",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const year = parts.find(
    (part) =>
      part.type === "year",
  )?.value;

  const month = parts.find(
    (part) =>
      part.type === "month",
  )?.value;

  const day = parts.find(
    (part) =>
      part.type === "day",
  )?.value;

  if (!year || !month || !day) {
    throw new AppError(
      500,
      "No se pudo determinar la fecha operativa.",
      "FECHA_OPERATIVA_INVALIDA",
    );
  }

  return parseDateOnly(
    `${year}-${month}-${day}`,
  );
}

async function getAuthorizedBranches(
  auth: ReservationAuth,
) {
  const operationalDate =
    getOperationalDate();

  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return prisma.sucursal.findMany({
      where: {
        estado: "ACTIVO",
        deletedAt: null,
      },

      select: {
        id: true,
        codigo: true,
        nombre: true,
        direccion: true,
        zonaHoraria: true,
      },

      orderBy: {
        nombre: "asc",
      },
    });
  }

  const assignments =
    await prisma
      .usuarioSucursal
      .findMany({
        where: {
          usuarioId:
            auth.usuarioId,

          activo: true,

          fechaInicio: {
            lte:
              operationalDate,
          },

          OR: [
            {
              fechaFin: null,
            },
            {
              fechaFin: {
                gte:
                  operationalDate,
              },
            },
          ],

          sucursal: {
            estado: "ACTIVO",
            deletedAt: null,
          },
        },

        select: {
          sucursal: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              direccion: true,
              zonaHoraria: true,
            },
          },
        },

        orderBy: {
          sucursal: {
            nombre: "asc",
          },
        },
      });

  return assignments.map(
    (assignment) =>
      assignment.sucursal,
  );
}

function assertAuthorizedBranch(
  branches: Array<{
    id: string;
  }>,
  branchId: string,
): void {
  if (
    !branches.some(
      (branch) =>
        branch.id === branchId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes autorización para administrar la sucursal seleccionada.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

export async function getReservationOptions(
  auth: ReservationAuth,
  query: ReservationOptionsQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  if (
    query.sucursalId
  ) {
    assertAuthorizedBranch(
      branches,
      query.sucursalId,
    );
  }

  const selectedBranchId =
    query.sucursalId ??
    (
      branches.length === 1
        ? branches[0]?.id
        : undefined
    );

  const [
    clients,
    zones,
    products,
    schedules,
  ] = await Promise.all([
    prisma.usuario.findMany({
      where: {
        estado: "ACTIVO",
        deletedAt: null,

        rol: {
          codigo: "CLIENTE",
          activo: true,
        },
      },

      take: 500,

      select: {
        id: true,
        nombres: true,
        apellidos: true,
        correo: true,
        telefono: true,
      },

      orderBy: [
        {
          apellidos: "asc",
        },
        {
          nombres: "asc",
        },
      ],
    }),

    selectedBranchId
      ? prisma.zona.findMany({
          where: {
            sucursalId:
              selectedBranchId,

            estado: "ACTIVO",
            deletedAt: null,
          },

          select: {
            id: true,
            nombre: true,
            descripcion: true,
            capacidadReferencial:
              true,
          },

          orderBy: {
            nombre: "asc",
          },
        })
      : Promise.resolve([]),

    selectedBranchId
      ? prisma
          .productoSucursal
          .findMany({
            where: {
              sucursalId:
                selectedBranchId,

              estado: "ACTIVO",

              disponibleVenta:
                true,

              producto: {
                estado: "ACTIVO",
                deletedAt: null,
              },
            },

            select: {
              id: true,
              precioVenta: true,

              producto: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  descripcion: true,
                  tipoStock: true,

                  categoria: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },

                  unidadMedida: {
                    select: {
                      codigo: true,
                      nombre: true,
                      abreviatura:
                        true,
                      decimales:
                        true,
                    },
                  },
                },
              },
            },

            orderBy: {
              producto: {
                nombre: "asc",
              },
            },
          })
      : Promise.resolve([]),

    selectedBranchId
      ? prisma
          .horarioAtencion
          .findMany({
            where: {
              sucursalId:
                selectedBranchId,

              activo: true,
            },

            select: {
              diaSemana: true,
              horaInicio: true,
              horaFin: true,
            },

            orderBy: [
              {
                diaSemana: "asc",
              },
              {
                horaInicio: "asc",
              },
            ],
          })
      : Promise.resolve([]),
  ]);

  return {
    sucursales: branches,

    sucursalSeleccionadaId:
      selectedBranchId ??
      null,

    clientes:
      clients.map(
        (client) => ({
          ...client,

          nombreCompleto:
            `${client.nombres} ${client.apellidos}`.trim(),
        }),
      ),

    zonas: zones,

    productos:
      products.map(
        (productBranch) => ({
          productoSucursalId:
            productBranch.id,

          precioVenta:
            Number(
              productBranch
                .precioVenta,
            ),

          ...productBranch.producto,
        }),
      ),

    horarios:
      schedules.map(
        (schedule) => ({
          diaSemana:
            schedule.diaSemana,

          horaInicio:
            formatTimeOnly(
              schedule.horaInicio,
            ),

          horaFin:
            formatTimeOnly(
              schedule.horaFin,
            ),
        }),
      ),

    tiposReserva: [
      {
        codigo: "NORMAL",
        nombre:
          "Reserva normal",
      },
      {
        codigo: "EVENTO",
        nombre: "Evento",
      },
      {
        codigo: "SOLO_ZONA",
        nombre:
          "Solo zona",
      },
    ],

    duraciones: [
      60,
      90,
      120,
      180,
      240,
      300,
      360,
    ],
  };
}

export async function checkReservationAvailability(
  auth: ReservationAuth,
  input: ReservationAvailabilityQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  assertAuthorizedBranch(
    branches,
    input.sucursalId,
  );

  const dateOnly =
    parseDateOnly(
      input.fechaReserva,
    );

  const zone =
    await prisma.zona.findFirst({
      where: {
        id: input.zonaId,

        sucursalId:
          input.sucursalId,

        estado: "ACTIVO",
        deletedAt: null,
      },

      select: {
        id: true,
        nombre: true,
        capacidadReferencial:
          true,
      },
    });

  if (!zone) {
    throw new AppError(
      404,
      "La zona seleccionada no existe o no se encuentra activa.",
      "ZONA_NO_ENCONTRADA",
    );
  }

  const startInstant =
    createLimaDateTime(
      input.fechaReserva,
      input.horaReserva,
    );

  const endInstant =
    new Date(
      startInstant.getTime() +
        input.duracionMinutos *
          60_000,
    );

  const requestStartMinutes =
    stringTimeToMinutes(
      input.horaReserva,
    );

  const requestEndMinutes =
    requestStartMinutes +
    input.duracionMinutos;

    const dayCode =
    DAY_CODES[
        dateOnly.getUTCDay()
    ];

    if (!dayCode) {
    throw new AppError(
        500,
        "No se pudo determinar el día de la semana.",
        "DIA_SEMANA_INVALIDO",
    );
    }

  const [
    schedules,
    reservations,
    blocks,
  ] = await Promise.all([
    prisma.horarioAtencion.findMany({
      where: {
        sucursalId:
          input.sucursalId,

        diaSemana: dayCode,
        activo: true,
      },

      select: {
        horaInicio: true,
        horaFin: true,
      },
    }),

    prisma.reserva.findMany({
      where: {
        sucursalId:
          input.sucursalId,

        zonaId:
          input.zonaId,

        fechaReserva:
          dateOnly,

        estado: {
          in: [
            ...OCCUPIED_RESERVATION_STATES,
          ],
        },
      },

      select: {
        id: true,
        codigo: true,
        horaReserva: true,
        duracionMinutos:
          true,
        estado: true,
      },
    }),

    prisma
      .bloqueoDisponibilidad
      .findMany({
        where: {
          sucursalId:
            input.sucursalId,

          estado: "ACTIVO",

          fechaInicio: {
            lt: endInstant,
          },

          fechaFin: {
            gt: startInstant,
          },

          OR: [
            {
              zonaId: null,
            },
            {
              zonaId:
                input.zonaId,
            },
          ],
        },

        select: {
          id: true,
          motivo: true,
          fechaInicio: true,
          fechaFin: true,
        },
      }),
  ]);

  const reasons: string[] = [];

  if (
    Number.isNaN(
      startInstant.getTime(),
    )
  ) {
    reasons.push(
      "La fecha y hora seleccionadas no son válidas.",
    );
  }

  if (
    startInstant.getTime() <=
    Date.now()
  ) {
    reasons.push(
      "La reserva debe programarse para una fecha y hora futuras.",
    );
  }

  if (
    requestEndMinutes >
    24 * 60
  ) {
    reasons.push(
      "La reserva no puede finalizar al día siguiente.",
    );
  }

  if (
    zone.capacidadReferencial !==
      null &&
    input.cantidadPersonas >
      zone.capacidadReferencial
  ) {
    reasons.push(
      `La capacidad referencial de la zona es de ${zone.capacidadReferencial} personas.`,
    );
  }

  /*
   * Mientras no existan horarios configurados para ese día,
   * no se bloquea la reserva por horario.
   */
  if (
    schedules.length > 0
  ) {
    const insideSchedule =
      schedules.some(
        (schedule) => {
          const opening =
            timeToMinutes(
              schedule.horaInicio,
            );

          const closing =
            timeToMinutes(
              schedule.horaFin,
            );

          return (
            requestStartMinutes >=
              opening &&
            requestEndMinutes <=
              closing
          );
        },
      );

    if (!insideSchedule) {
      reasons.push(
        "El horario solicitado se encuentra fuera del horario de atención.",
      );
    }
  }

  const conflictingReservations =
    reservations.filter(
      (reservation) => {
        const existingStart =
          timeToMinutes(
            reservation.horaReserva,
          );

        const existingEnd =
          existingStart +
          reservation
            .duracionMinutos;

        return (
          requestStartMinutes <
            existingEnd &&
          requestEndMinutes >
            existingStart
        );
      },
    );

  if (
    conflictingReservations.length >
    0
  ) {
    reasons.push(
      "La zona ya tiene una reserva que se cruza con el horario solicitado.",
    );
  }

  if (blocks.length > 0) {
    reasons.push(
      "Existe un bloqueo de disponibilidad para la zona o la sucursal.",
    );
  }

  return {
    disponible:
      reasons.length === 0,

    motivos: reasons,

    inicio:
      startInstant.toISOString(),

    fin:
      endInstant.toISOString(),

    zona: zone,

    conflictos:
      conflictingReservations.map(
        (reservation) => ({
          id: reservation.id,
          codigo:
            reservation.codigo,

          estado:
            reservation.estado,

          horaReserva:
            formatTimeOnly(
              reservation
                .horaReserva,
            ),

          duracionMinutos:
            reservation
              .duracionMinutos,
        }),
      ),

    bloqueos:
      blocks.map(
        (block) => ({
          id: block.id,
          motivo: block.motivo,

          fechaInicio:
            block.fechaInicio
              .toISOString(),

          fechaFin:
            block.fechaFin
              .toISOString(),
        }),
      ),
  };
}

export async function listReservations(
  auth: ReservationAuth,
  query: ListReservationsQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  const branchIds =
    branches.map(
      (branch) => branch.id,
    );

  if (
    query.sucursalId
  ) {
    assertAuthorizedBranch(
      branches,
      query.sucursalId,
    );
  }

  const selectedBranchIds =
    query.sucursalId
      ? [query.sucursalId]
      : branchIds;

  if (
    selectedBranchIds.length === 0
  ) {
    return {
      reservas: [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 1,
      },
    };
  }

  const where:
    Prisma.ReservaWhereInput = {
      sucursalId: {
        in:
          selectedBranchIds,
      },

      ...(query.estado !==
      "TODOS"
        ? {
            estado:
              query.estado,
          }
        : {}),

      ...(query.tipoReserva !==
      "TODOS"
        ? {
            tipoReserva:
              query.tipoReserva,
          }
        : {}),

      ...(
        query.fechaDesde ||
        query.fechaHasta
          ? {
              fechaReserva: {
                ...(query.fechaDesde
                  ? {
                      gte:
                        parseDateOnly(
                          query
                            .fechaDesde,
                        ),
                    }
                  : {}),

                ...(query.fechaHasta
                  ? {
                      lte:
                        parseDateOnly(
                          query
                            .fechaHasta,
                        ),
                    }
                  : {}),
              },
            }
          : {}
      ),

      ...(query.search
        ? {
            OR: [
              {
                codigo: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                nombreEvento: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                cliente: {
                  nombres: {
                    contains:
                      query.search,

                    mode:
                      "insensitive",
                  },
                },
              },
              {
                cliente: {
                  apellidos: {
                    contains:
                      query.search,

                    mode:
                      "insensitive",
                  },
                },
              },
              {
                cliente: {
                  correo: {
                    contains:
                      query.search,

                    mode:
                      "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    total,
    reservations,
  ] = await prisma.$transaction([
    prisma.reserva.count({
      where,
    }),

    prisma.reserva.findMany({
      where,

      skip,
      take: query.limit,

      orderBy: [
        {
          fechaReserva: "desc",
        },
        {
          horaReserva: "desc",
        },
      ],

      select: {
        id: true,
        codigo: true,
        tipoReserva: true,
        fechaReserva: true,
        horaReserva: true,
        duracionMinutos:
          true,
        cantidadPersonas:
          true,
        nombreEvento: true,
        totalEstimado: true,
        adelantoRequerido:
          true,
        adelantoPagado: true,
        saldoEstimado: true,
        estado: true,
        createdAt: true,

        cliente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true,
            telefono: true,
          },
        },

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },

        zona: {
          select: {
            id: true,
            nombre: true,
          },
        },

        _count: {
          select: {
            detalles: true,
            pagos: true,
          },
        },
      },
    }),
  ]);

  return {
    reservas:
      reservations.map(
        (reservation) => ({
          ...reservation,

          fechaReserva:
            formatDateOnly(
              reservation
                .fechaReserva,
            ),

          horaReserva:
            formatTimeOnly(
              reservation
                .horaReserva,
            ),

          totalEstimado:
            Number(
              reservation
                .totalEstimado,
            ),

          adelantoRequerido:
            Number(
              reservation
                .adelantoRequerido,
            ),

          adelantoPagado:
            Number(
              reservation
                .adelantoPagado,
            ),

          saldoEstimado:
            Number(
              reservation
                .saldoEstimado,
            ),

          createdAt:
            reservation.createdAt
              .toISOString(),

          cliente: {
            ...reservation.cliente,

            nombreCompleto:
              `${reservation.cliente.nombres} ${reservation.cliente.apellidos}`.trim(),
          },

          cantidadProductos:
            reservation._count
              .detalles,

          cantidadPagos:
            reservation._count
              .pagos,

          _count: undefined,
        }),
      ),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,

      totalPages:
        Math.max(
          1,
          Math.ceil(
            total /
              query.limit,
          ),
        ),
    },
  };
}

export async function getReservationById(
  auth: ReservationAuth,
  reservationId: string,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  const branchIds =
    branches.map(
      (branch) => branch.id,
    );

  const reservation =
    await prisma.reserva.findFirst({
      where: {
        id: reservationId,

        sucursalId: {
          in: branchIds,
        },
      },

      select: {
        id: true,
        codigo: true,
        tipoReserva: true,
        fechaReserva: true,
        horaReserva: true,
        duracionMinutos:
          true,
        cantidadPersonas:
          true,
        nombreEvento: true,
        observaciones: true,
        totalEstimado: true,
        adelantoRequerido:
          true,
        adelantoPagado: true,
        saldoEstimado: true,
        estado: true,
        fechaAprobacion:
          true,
        fechaCancelacion:
          true,
        motivoCancelacion:
          true,
        penalidadCancelacion:
          true,
        montoDevuelto: true,
        createdAt: true,
        updatedAt: true,

        cliente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true,
            telefono: true,
          },
        },

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            direccion: true,
          },
        },

        zona: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            capacidadReferencial:
              true,
          },
        },

        detalles: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            nombreProducto: true,
            cantidadSolicitada:
              true,
            cantidadAprobada:
              true,
            cantidadComprometida:
              true,
            precioReservado:
              true,
            subtotal: true,
            observaciones: true,
            estado: true,

            productoSucursal: {
              select: {
                id: true,

                producto: {
                  select: {
                    id: true,
                    codigo: true,
                    nombre: true,

                    unidadMedida: {
                      select: {
                        abreviatura:
                          true,
                      },
                    },
                  },
                },
              },
            },
          },
        },

        pagos: {
          orderBy: {
            fechaPago: "desc",
          },

          select: {
            id: true,
            metodoPago: true,
            monto: true,
            numeroOperacion:
              true,
            estado: true,
            fechaPago: true,
            fechaConfirmacion:
              true,
            observaciones: true,

            registradoPor: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
              },
            },

            confirmadoPor: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
              },
            },
          },
        },

        historial: {
          orderBy: {
            createdAt: "desc",
          },

          select: {
            id: true,
            estadoAnterior: true,
            estadoNuevo: true,
            observacion: true,
            createdAt: true,

            usuario: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
              },
            },
          },
        },
      },
    });

  if (!reservation) {
    throw new AppError(
      404,
      "La reserva no existe o no puedes consultarla.",
      "RESERVA_NO_ENCONTRADA",
    );
  }

  return {
    ...reservation,

    fechaReserva:
      formatDateOnly(
        reservation
          .fechaReserva,
      ),

    horaReserva:
      formatTimeOnly(
        reservation
          .horaReserva,
      ),

    totalEstimado:
      Number(
        reservation
          .totalEstimado,
      ),

    adelantoRequerido:
      Number(
        reservation
          .adelantoRequerido,
      ),

    adelantoPagado:
      Number(
        reservation
          .adelantoPagado,
      ),

    saldoEstimado:
      Number(
        reservation
          .saldoEstimado,
      ),

    penalidadCancelacion:
      Number(
        reservation
          .penalidadCancelacion,
      ),

    montoDevuelto:
      Number(
        reservation
          .montoDevuelto,
      ),

    createdAt:
      reservation.createdAt
        .toISOString(),

    updatedAt:
      reservation.updatedAt
        .toISOString(),

    fechaAprobacion:
      reservation
        .fechaAprobacion
        ?.toISOString() ??
      null,

    fechaCancelacion:
      reservation
        .fechaCancelacion
        ?.toISOString() ??
      null,

    cliente: {
      ...reservation.cliente,

      nombreCompleto:
        `${reservation.cliente.nombres} ${reservation.cliente.apellidos}`.trim(),
    },

    detalles:
      reservation.detalles.map(
        (detail) => ({
          ...detail,

          cantidadSolicitada:
            Number(
              detail
                .cantidadSolicitada,
            ),

          cantidadAprobada:
            Number(
              detail
                .cantidadAprobada,
            ),

          cantidadComprometida:
            Number(
              detail
                .cantidadComprometida,
            ),

          precioReservado:
            Number(
              detail
                .precioReservado,
            ),

          subtotal:
            Number(
              detail.subtotal,
            ),
        }),
      ),

    pagos:
      reservation.pagos.map(
        (payment) => ({
          ...payment,

          monto:
            Number(
              payment.monto,
            ),

          fechaPago:
            payment.fechaPago
              .toISOString(),

          fechaConfirmacion:
            payment
              .fechaConfirmacion
              ?.toISOString() ??
            null,

          registradoPor: {
            id:
              payment
                .registradoPor.id,

            nombreCompleto:
              `${payment.registradoPor.nombres} ${payment.registradoPor.apellidos}`.trim(),
          },

          confirmadoPor:
            payment.confirmadoPor
              ? {
                  id:
                    payment
                      .confirmadoPor
                      .id,

                  nombreCompleto:
                    `${payment.confirmadoPor.nombres} ${payment.confirmadoPor.apellidos}`.trim(),
                }
              : null,
        }),
      ),

    historial:
      reservation.historial.map(
        (history) => ({
          ...history,

          createdAt:
            history.createdAt
              .toISOString(),

          usuario: {
            id:
              history.usuario.id,

            nombreCompleto:
              `${history.usuario.nombres} ${history.usuario.apellidos}`.trim(),
          },
        }),
      ),
  };
}

export async function createReservation(
  auth: ReservationAuth,
  input: CreateReservationInput,
) {
  const availability =
    await checkReservationAvailability(
      auth,
      {
        sucursalId:
          input.sucursalId,

        zonaId:
          input.zonaId,

        fechaReserva:
          input.fechaReserva,

        horaReserva:
          input.horaReserva,

        duracionMinutos:
          input.duracionMinutos,

        cantidadPersonas:
          input.cantidadPersonas,
      },
    );

  if (
    !availability.disponible
  ) {
    throw new AppError(
      409,
      availability.motivos[0] ??
        "El horario seleccionado no se encuentra disponible.",
      "HORARIO_NO_DISPONIBLE",
    );
  }

  const client =
    await prisma.usuario.findFirst({
      where: {
        id: input.clienteId,
        estado: "ACTIVO",
        deletedAt: null,

        rol: {
          codigo: "CLIENTE",
          activo: true,
        },
      },

      select: {
        id: true,
      },
    });

  if (!client) {
    throw new AppError(
      404,
      "El cliente no existe o no se encuentra activo.",
      "CLIENTE_NO_ENCONTRADO",
    );
  }

  const requestedProductIds =
    input.detalles.map(
      (detail) =>
        detail
          .productoSucursalId,
    );

  const products =
    requestedProductIds.length > 0
      ? await prisma
          .productoSucursal
          .findMany({
            where: {
              id: {
                in:
                  requestedProductIds,
              },

              sucursalId:
                input.sucursalId,

              estado: "ACTIVO",

              disponibleVenta:
                true,

              producto: {
                estado: "ACTIVO",
                deletedAt: null,
              },
            },

            select: {
              id: true,
              precioVenta: true,

              producto: {
                select: {
                  nombre: true,
                },
              },
            },
          })
      : [];

  if (
    products.length !==
    requestedProductIds.length
  ) {
    throw new AppError(
      400,
      "Uno o más productos no existen, están inactivos o no pertenecen a la sucursal.",
      "PRODUCTO_RESERVA_INVALIDO",
    );
  }

  const productMap =
    new Map(
      products.map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );

  const detailData =
    input.detalles.map(
      (detail) => {
        const product =
          productMap.get(
            detail
              .productoSucursalId,
          );

        if (!product) {
          throw new AppError(
            400,
            "No se pudo procesar uno de los productos.",
            "PRODUCTO_RESERVA_INVALIDO",
          );
        }

        const unitPrice =
          Number(
            product
              .precioVenta,
          );

        const subtotal =
          Number(
            (
              unitPrice *
              detail
                .cantidadSolicitada
            ).toFixed(2),
          );

        return {
          productoSucursalId:
            product.id,

          nombreProducto:
            product.producto
              .nombre,

          cantidadSolicitada:
            detail
              .cantidadSolicitada,

          cantidadAprobada: 0,
          cantidadComprometida:
            0,

          precioReservado:
            unitPrice,

          subtotal,

          observaciones:
            detail
              .observaciones,

          estado:
            "SOLICITADO" as const,
        };
      },
    );

  const productTotal =
    Number(
      detailData
        .reduce(
          (
            total,
            detail,
          ) =>
            total +
            detail.subtotal,
          0,
        )
        .toFixed(2),
    );

  const estimatedTotal =
    input.totalEstimado ??
    productTotal;

  if (
    estimatedTotal <
    productTotal
  ) {
    throw new AppError(
      400,
      "El total estimado no puede ser menor que el subtotal de los productos.",
      "TOTAL_ESTIMADO_INVALIDO",
    );
  }

  if (
    input.adelantoRequerido >
    estimatedTotal
  ) {
    throw new AppError(
      400,
      "El adelanto requerido no puede superar el total estimado.",
      "ADELANTO_INVALIDO",
    );
  }

  const createdReservation =
    await prisma.$transaction(
      async (transaction) => {
        const correlativo =
          await transaction
            .correlativo
            .upsert({
              where: {
                sucursalId_tipoDocumento:
                  {
                    sucursalId:
                      input.sucursalId,

                    tipoDocumento:
                      "RESERVA",
                  },
              },

              update: {
                ultimoNumero: {
                  increment: 1,
                },
              },

              create: {
                sucursalId:
                  input.sucursalId,

                tipoDocumento:
                  "RESERVA",

                prefijo: "R",
                ultimoNumero: 1n,
                longitudNumero: 6,
              },

              select: {
                prefijo: true,
                ultimoNumero: true,
                longitudNumero:
                  true,
              },
            });

        const numberText =
          correlativo
            .ultimoNumero
            .toString()
            .padStart(
              correlativo
                .longitudNumero,
              "0",
            );

        const code =
          `${correlativo.prefijo}-${numberText}`;

        return transaction
          .reserva
          .create({
            data: {
              codigo: code,

              clienteId:
                input.clienteId,

              sucursalId:
                input.sucursalId,

              zonaId:
                input.zonaId,

              tipoReserva:
                input.tipoReserva,

              fechaReserva:
                parseDateOnly(
                  input
                    .fechaReserva,
                ),

              horaReserva:
                parseTimeOnly(
                  input
                    .horaReserva,
                ),

              duracionMinutos:
                input
                  .duracionMinutos,

              cantidadPersonas:
                input
                  .cantidadPersonas,

              nombreEvento:
                input.tipoReserva ===
                "EVENTO"
                  ? input.nombreEvento
                  : null,

              observaciones:
                input.observaciones,

              totalEstimado:
                estimatedTotal,

              adelantoRequerido:
                input
                  .adelantoRequerido,

              adelantoPagado: 0,

              saldoEstimado:
                estimatedTotal,

              estado:
                "SOLICITADA",

              ...(detailData.length >
              0
                ? {
                    detalles: {
                      create:
                        detailData,
                    },
                  }
                : {}),

              historial: {
                create: {
                  usuarioId:
                    auth.usuarioId,

                  estadoAnterior:
                    null,

                  estadoNuevo:
                    "SOLICITADA",

                  observacion:
                    "Reserva registrada.",
                },
              },
            },

            select: {
              id: true,
            },
          });
      },
    );

  return getReservationById(
    auth,
    createdReservation.id,
  );
}

async function getReservationForOperation(
  auth: ReservationAuth,
  reservationId: string,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  const branchIds =
    branches.map(
      (branch) => branch.id,
    );

  const reservation =
    await prisma.reserva.findFirst({
      where: {
        id: reservationId,

        sucursalId: {
          in: branchIds,
        },
      },

      select: {
        id: true,
        codigo: true,
        sucursalId: true,
        fechaReserva: true,
        estado: true,

        totalEstimado: true,
        adelantoRequerido: true,
        adelantoPagado: true,
        saldoEstimado: true,

        detalles: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            productoSucursalId:
              true,

            nombreProducto: true,

            cantidadSolicitada:
              true,

            cantidadAprobada:
              true,

            cantidadComprometida:
              true,

            precioReservado:
              true,

            estado: true,

            productoSucursal: {
              select: {
                id: true,
                sucursalId: true,

                producto: {
                  select: {
                    tipoStock:
                      true,
                  },
                },
              },
            },
          },
        },
      },
    });

  if (!reservation) {
    throw new AppError(
      404,
      "La reserva no existe o no puedes administrarla.",
      "RESERVA_NO_ENCONTRADA",
    );
  }

  return reservation;
}

export async function reviewReservation(
  auth: ReservationAuth,
  reservationId: string,
  input: ReviewReservationInput,
) {
  const reservation =
    await getReservationForOperation(
      auth,
      reservationId,
    );

  if (
    reservation.estado !==
    "SOLICITADA"
  ) {
    throw new AppError(
      409,
      "Solo una reserva solicitada puede pasar a revisión.",
      "ESTADO_RESERVA_INVALIDO",
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      await transaction
        .reserva
        .update({
          where: {
            id: reservation.id,
          },

          data: {
            estado:
              "EN_REVISION",
          },
        });

      await transaction
        .historialReserva
        .create({
          data: {
            reservaId:
              reservation.id,

            usuarioId:
              auth.usuarioId,

            estadoAnterior:
              reservation.estado,

            estadoNuevo:
              "EN_REVISION",

            observacion:
              input.observacion ??
              "La reserva pasó a revisión.",
          },
        });
    },
  );

  return getReservationById(
    auth,
    reservation.id,
  );
}

export async function rejectReservation(
  auth: ReservationAuth,
  reservationId: string,
  input: RejectReservationInput,
) {
  const reservation =
    await getReservationForOperation(
      auth,
      reservationId,
    );

  if (
    ![
      "SOLICITADA",
      "EN_REVISION",
    ].includes(
      reservation.estado,
    )
  ) {
    throw new AppError(
      409,
      "La reserva ya no puede ser rechazada desde su estado actual.",
      "ESTADO_RESERVA_INVALIDO",
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      await transaction
        .reserva
        .update({
          where: {
            id: reservation.id,
          },

          data: {
            estado:
              "RECHAZADA",
          },
        });

      await transaction
        .historialReserva
        .create({
          data: {
            reservaId:
              reservation.id,

            usuarioId:
              auth.usuarioId,

            estadoAnterior:
              reservation.estado,

            estadoNuevo:
              "RECHAZADA",

            observacion:
              input.motivo,
          },
        });
    },
  );

  return getReservationById(
    auth,
    reservation.id,
  );
}

export async function approveReservation(
  auth: ReservationAuth,
  reservationId: string,
  input: ApproveReservationInput,
) {
  const reservation =
    await getReservationForOperation(
      auth,
      reservationId,
    );

  if (
    ![
      "SOLICITADA",
      "EN_REVISION",
    ].includes(
      reservation.estado,
    )
  ) {
    throw new AppError(
      409,
      "La reserva ya no puede aprobarse desde su estado actual.",
      "ESTADO_RESERVA_INVALIDO",
    );
  }

  const existingDetailIds =
    new Set(
      reservation.detalles.map(
        (detail) => detail.id,
      ),
    );

  const receivedDetailIds =
    new Set(
      input.detalles.map(
        (detail) =>
          detail.detalleId,
      ),
    );

  if (
    existingDetailIds.size !==
      receivedDetailIds.size ||
    Array.from(
      existingDetailIds,
    ).some(
      (detailId) =>
        !receivedDetailIds.has(
          detailId,
        ),
    )
  ) {
    throw new AppError(
      400,
      "Debe enviarse una decisión para cada producto de la reserva.",
      "DETALLES_RESERVA_INCOMPLETOS",
    );
  }

  const approvalMap =
    new Map(
      input.detalles.map(
        (detail) => [
          detail.detalleId,
          detail.cantidadAprobada,
        ],
      ),
    );

  let productTotal = 0;

  for (
    const detail
    of reservation.detalles
  ) {
    const approvedQuantity =
      approvalMap.get(
        detail.id,
      );

    if (
      approvedQuantity ===
      undefined
    ) {
      throw new AppError(
        400,
        "Falta la aprobación de uno de los productos.",
        "DETALLE_RESERVA_INCOMPLETO",
      );
    }

    const requestedQuantity =
      Number(
        detail
          .cantidadSolicitada,
      );

    if (
      approvedQuantity >
      requestedQuantity
    ) {
      throw new AppError(
        400,
        `La cantidad aprobada de "${detail.nombreProducto}" supera la cantidad solicitada.`,
        "CANTIDAD_APROBADA_INVALIDA",
      );
    }

    productTotal +=
      approvedQuantity *
      Number(
        detail.precioReservado,
      );
  }

  productTotal =
    Number(
      productTotal.toFixed(2),
    );

  if (
    input.totalEstimado <
    productTotal
  ) {
    throw new AppError(
      400,
      "El total estimado no puede ser menor que el subtotal de los productos aprobados.",
      "TOTAL_ESTIMADO_INVALIDO",
    );
  }

  const paidAdvance =
    Number(
      reservation
        .adelantoPagado,
    );

  const nextStatus =
    input.adelantoRequerido >
    paidAdvance
      ? "ESPERANDO_ADELANTO"
      : "CONFIRMADA";

  await prisma.$transaction(
    async (transaction) => {
      for (
        const detail
        of reservation.detalles
      ) {
        const approvedQuantity =
          approvalMap.get(
            detail.id,
          );

        if (
          approvedQuantity ===
          undefined
        ) {
          throw new AppError(
            400,
            "Falta la aprobación de uno de los productos.",
            "DETALLE_RESERVA_INCOMPLETO",
          );
        }

        const unitPrice =
          Number(
            detail
              .precioReservado,
          );

        const subtotal =
          Number(
            (
              approvedQuantity *
              unitPrice
            ).toFixed(2),
          );

        if (
          approvedQuantity === 0
        ) {
          await transaction
            .detalleReserva
            .update({
              where: {
                id: detail.id,
              },

              data: {
                cantidadAprobada:
                  0,

                cantidadComprometida:
                  0,

                subtotal: 0,

                estado:
                  "RECHAZADO",
              },
            });

          continue;
        }

        const stockType =
          detail
            .productoSucursal
            .producto
            .tipoStock;

        let committedQuantity =
          0;

        let detailStatus:
          | "APROBADO"
          | "COMPROMETIDO" =
          "APROBADO";

        if (
          stockType ===
          "PERMANENTE"
        ) {
          const stock =
            await transaction
              .stockPermanente
              .findUnique({
                where: {
                  productoSucursalId:
                    detail
                      .productoSucursalId,
                },
              });

          const currentQuantity =
            stock
              ? Number(
                  stock
                    .cantidadActual,
                )
              : 0;

          const currentlyCommitted =
            stock
              ? Number(
                  stock
                    .cantidadComprometida,
                )
              : 0;

          const availableQuantity =
            currentQuantity -
            currentlyCommitted;

          if (
            approvedQuantity >
            availableQuantity
          ) {
            throw new AppError(
              409,
              `No existe stock suficiente para "${detail.nombreProducto}". Disponible: ${availableQuantity}.`,
              "STOCK_INSUFICIENTE",
            );
          }

          if (!stock) {
            throw new AppError(
              409,
              `No existe stock permanente configurado para "${detail.nombreProducto}".`,
              "STOCK_NO_CONFIGURADO",
            );
          }

          await transaction
            .stockPermanente
            .update({
              where: {
                id: stock.id,
              },

              data: {
                cantidadComprometida:
                  {
                    increment:
                      approvedQuantity,
                  },
              },
            });

          await transaction
            .movimientoInventario
            .create({
              data: {
                productoSucursalId:
                  detail
                    .productoSucursalId,

                usuarioId:
                  auth.usuarioId,

                tipoMovimiento:
                  "COMPROMISO_RESERVA",

                cantidad:
                  approvedQuantity,

                cantidadAnterior:
                  currentQuantity,

                cantidadResultante:
                  currentQuantity,

                motivo:
                  `Compromiso por reserva ${reservation.codigo}.`,

                referenciaTipo:
                  "RESERVA",

                referenciaId:
                  reservation.id,
              },
            });

          committedQuantity =
            approvedQuantity;

          detailStatus =
            "COMPROMETIDO";
        }

        if (
          stockType ===
          "DIARIO"
        ) {
          const dailyStock =
            await transaction
              .stockDiario
              .findUnique({
                where: {
                  productoSucursalId_fecha:
                    {
                      productoSucursalId:
                        detail
                          .productoSucursalId,

                      fecha:
                        reservation
                          .fechaReserva,
                    },
                },
              });

          /*
           * Para reservas futuras puede no existir aún
           * la apertura de stock del día.
           */
          if (dailyStock) {
            const currentQuantity =
              Number(
                dailyStock
                  .cantidadActual,
              );

            const currentlyCommitted =
              Number(
                dailyStock
                  .cantidadComprometida,
              );

            const availableQuantity =
              currentQuantity -
              currentlyCommitted;

            if (
              approvedQuantity >
              availableQuantity
            ) {
              throw new AppError(
                409,
                `No existe stock diario suficiente para "${detail.nombreProducto}". Disponible: ${availableQuantity}.`,
                "STOCK_DIARIO_INSUFICIENTE",
              );
            }

            await transaction
              .stockDiario
              .update({
                where: {
                  id:
                    dailyStock.id,
                },

                data: {
                  cantidadComprometida:
                    {
                      increment:
                        approvedQuantity,
                    },
                },
              });

            await transaction
              .movimientoInventario
              .create({
                data: {
                  productoSucursalId:
                    detail
                      .productoSucursalId,

                  usuarioId:
                    auth.usuarioId,

                  tipoMovimiento:
                    "COMPROMISO_RESERVA",

                  cantidad:
                    approvedQuantity,

                  cantidadAnterior:
                    currentQuantity,

                  cantidadResultante:
                    currentQuantity,

                  motivo:
                    `Compromiso por reserva ${reservation.codigo}.`,

                  referenciaTipo:
                    "RESERVA",

                  referenciaId:
                    reservation.id,
                },
              });

            committedQuantity =
              approvedQuantity;

            detailStatus =
              "COMPROMETIDO";
          }
        }

        await transaction
          .detalleReserva
          .update({
            where: {
              id: detail.id,
            },

            data: {
              cantidadAprobada:
                approvedQuantity,

              cantidadComprometida:
                committedQuantity,

              subtotal,

              estado:
                detailStatus,
            },
          });
      }

      await transaction
        .reserva
        .update({
          where: {
            id:
              reservation.id,
          },

          data: {
            totalEstimado:
              input.totalEstimado,

            adelantoRequerido:
              input
                .adelantoRequerido,

            saldoEstimado:
              Math.max(
                0,
                input
                  .totalEstimado -
                  paidAdvance,
              ),

            estado:
              nextStatus,

            aprobadoPorId:
              auth.usuarioId,

            fechaAprobacion:
              new Date(),
          },
        });

      await transaction
        .historialReserva
        .create({
          data: {
            reservaId:
              reservation.id,

            usuarioId:
              auth.usuarioId,

            estadoAnterior:
              reservation.estado,

            estadoNuevo:
              nextStatus,

            observacion:
              input.observacion ??
              (
                nextStatus ===
                "ESPERANDO_ADELANTO"
                  ? "Reserva aprobada. Se encuentra esperando el adelanto."
                  : "Reserva aprobada y confirmada."
              ),
          },
        });
    },
  );

  return getReservationById(
    auth,
    reservation.id,
  );
}

export async function registerReservationPayment(
  auth: ReservationAuth,
  reservationId: string,
  input: RegisterReservationPaymentInput,
) {
  const reservation =
    await getReservationForOperation(
      auth,
      reservationId,
    );

  if (
    ![
      "ESPERANDO_ADELANTO",
      "CONFIRMADA",
    ].includes(
      reservation.estado,
    )
  ) {
    throw new AppError(
      409,
      "La reserva todavía no puede recibir pagos.",
      "ESTADO_RESERVA_INVALIDO",
    );
  }

  if (
    input.metodoPago !==
      "EFECTIVO" &&
    !input.numeroOperacion
  ) {
    throw new AppError(
      400,
      "El número de operación es obligatorio para pagos electrónicos.",
      "NUMERO_OPERACION_REQUERIDO",
    );
  }

  const remainingBalance =
    Number(
      reservation.saldoEstimado,
    );

  if (
    input.monto >
    remainingBalance
  ) {
    throw new AppError(
      400,
      `El pago no puede superar el saldo pendiente de S/ ${remainingBalance.toFixed(2)}.`,
      "PAGO_SUPERA_SALDO",
    );
  }

  if (
    input.numeroOperacion
  ) {
    const duplicatedPayment =
      await prisma
        .pagoReserva
        .findFirst({
          where: {
            metodoPago:
              input.metodoPago,

            numeroOperacion:
              input.numeroOperacion,

            estado: {
              not: "ANULADO",
            },
          },

          select: {
            id: true,
          },
        });

    if (duplicatedPayment) {
      throw new AppError(
        409,
        "Ya existe un pago registrado con ese número de operación.",
        "OPERACION_PAGO_DUPLICADA",
      );
    }
  }

  await prisma.pagoReserva.create({
    data: {
      reservaId:
        reservation.id,

      registradoPorId:
        auth.usuarioId,

      metodoPago:
        input.metodoPago,

      monto:
        input.monto,

      numeroOperacion:
        input.numeroOperacion,

      observaciones:
        input.observaciones,

      estado:
        "PENDIENTE",
    },
  });

  return getReservationById(
    auth,
    reservation.id,
  );
}

export async function confirmReservationPayment(
  auth: ReservationAuth,
  reservationId: string,
  paymentId: string,
  input: ConfirmReservationPaymentInput,
) {
  const reservation =
    await getReservationForOperation(
      auth,
      reservationId,
    );

  if (
    ![
      "ESPERANDO_ADELANTO",
      "CONFIRMADA",
    ].includes(
      reservation.estado,
    )
  ) {
    throw new AppError(
      409,
      "No se pueden confirmar pagos para la reserva desde su estado actual.",
      "ESTADO_RESERVA_INVALIDO",
    );
  }

  const payment =
    await prisma
      .pagoReserva
      .findFirst({
        where: {
          id: paymentId,

          reservaId:
            reservation.id,
        },

        select: {
          id: true,
          estado: true,
          monto: true,
        },
      });

  if (!payment) {
    throw new AppError(
      404,
      "El pago no existe o no pertenece a la reserva.",
      "PAGO_NO_ENCONTRADO",
    );
  }

  if (
    payment.estado !==
    "PENDIENTE"
  ) {
    throw new AppError(
      409,
      "El pago ya fue procesado anteriormente.",
      "PAGO_YA_PROCESADO",
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      await transaction
        .pagoReserva
        .update({
          where: {
            id: payment.id,
          },

          data: {
            estado:
              "CONFIRMADO",

            confirmadoPorId:
              auth.usuarioId,

            fechaConfirmacion:
              new Date(),

            ...(input.observacion
              ? {
                    observaciones:
                      input.observacion,
                 }
              : {}),
          },
        });

      const paymentTotal =
        await transaction
          .pagoReserva
          .aggregate({
            where: {
              reservaId:
                reservation.id,

              estado:
                "CONFIRMADO",
            },

            _sum: {
              monto: true,
            },
          });

      const confirmedAmount =
        Number(
          paymentTotal._sum
            .monto ?? 0,
        );

      const requiredAdvance =
        Number(
          reservation
            .adelantoRequerido,
        );

      const estimatedTotal =
        Number(
          reservation
            .totalEstimado,
        );

      const nextStatus =
        reservation.estado ===
          "ESPERANDO_ADELANTO" &&
        confirmedAmount >=
          requiredAdvance
          ? "CONFIRMADA"
          : reservation.estado;

      await transaction
        .reserva
        .update({
          where: {
            id: reservation.id,
          },

          data: {
            adelantoPagado:
              confirmedAmount,

            saldoEstimado:
              Math.max(
                0,
                estimatedTotal -
                  confirmedAmount,
              ),

            estado:
              nextStatus,
          },
        });

      if (
        nextStatus !==
        reservation.estado
      ) {
        await transaction
          .historialReserva
          .create({
            data: {
              reservaId:
                reservation.id,

              usuarioId:
                auth.usuarioId,

              estadoAnterior:
                reservation.estado,

              estadoNuevo:
                nextStatus,

              observacion:
                input.observacion ??
                "Adelanto confirmado. La reserva quedó confirmada.",
            },
          });
      }
    },
  );

  return getReservationById(
    auth,
    reservation.id,
  );
}

export async function cancelReservation(
  auth: ReservationAuth,
  reservationId: string,
  input: CancelReservationInput,
) {
  const reservation =
    await getReservationForOperation(
      auth,
      reservationId,
    );

  if (
    ![
      "SOLICITADA",
      "EN_REVISION",
      "ESPERANDO_ADELANTO",
      "CONFIRMADA",
    ].includes(
      reservation.estado,
    )
  ) {
    throw new AppError(
      409,
      "La reserva ya no puede cancelarse desde su estado actual.",
      "ESTADO_RESERVA_INVALIDO",
    );
  }

  const paidAmount =
    Number(
      reservation
        .adelantoPagado,
    );

  if (
    input.penalidadCancelacion >
    paidAmount
  ) {
    throw new AppError(
      400,
      "La penalidad no puede superar el monto pagado.",
      "PENALIDAD_INVALIDA",
    );
  }

  const refundAmount =
    Number(
      Math.max(
        0,
        paidAmount -
          input
            .penalidadCancelacion,
      ).toFixed(2),
    );

  await prisma.$transaction(
    async (transaction) => {
      for (
        const detail
        of reservation.detalles
      ) {
        const committedQuantity =
          Number(
            detail
              .cantidadComprometida,
          );

        const stockType =
          detail
            .productoSucursal
            .producto
            .tipoStock;

        if (
          committedQuantity > 0 &&
          stockType ===
            "PERMANENTE"
        ) {
          const stock =
            await transaction
              .stockPermanente
              .findUnique({
                where: {
                  productoSucursalId:
                    detail
                      .productoSucursalId,
                },
              });

          if (!stock) {
            throw new AppError(
              409,
              `No se encontró el stock permanente de "${detail.nombreProducto}".`,
              "STOCK_NO_CONFIGURADO",
            );
          }

          const currentStock =
            Number(
              stock
                .cantidadActual,
            );

          const currentCommitted =
            Number(
              stock
                .cantidadComprometida,
            );

          if (
            currentCommitted <
            committedQuantity
          ) {
            throw new AppError(
              409,
              `El stock comprometido de "${detail.nombreProducto}" es inconsistente.`,
              "STOCK_COMPROMETIDO_INCONSISTENTE",
            );
          }

          await transaction
            .stockPermanente
            .update({
              where: {
                id: stock.id,
              },

              data: {
                cantidadComprometida:
                  {
                    decrement:
                      committedQuantity,
                  },
              },
            });

          await transaction
            .movimientoInventario
            .create({
              data: {
                productoSucursalId:
                  detail
                    .productoSucursalId,

                usuarioId:
                  auth.usuarioId,

                tipoMovimiento:
                  "LIBERACION_RESERVA",

                cantidad:
                  committedQuantity,

                cantidadAnterior:
                  currentStock,

                cantidadResultante:
                  currentStock,

                motivo:
                  `Liberación por cancelación de la reserva ${reservation.codigo}.`,

                referenciaTipo:
                  "RESERVA",

                referenciaId:
                  reservation.id,
              },
            });
        }

        if (
          committedQuantity > 0 &&
          stockType === "DIARIO"
        ) {
          const dailyStock =
            await transaction
              .stockDiario
              .findUnique({
                where: {
                  productoSucursalId_fecha:
                    {
                      productoSucursalId:
                        detail
                          .productoSucursalId,

                      fecha:
                        reservation
                          .fechaReserva,
                    },
                },
              });

          if (!dailyStock) {
            throw new AppError(
              409,
              `No se encontró el stock diario comprometido de "${detail.nombreProducto}".`,
              "STOCK_DIARIO_NO_ENCONTRADO",
            );
          }

          const currentStock =
            Number(
              dailyStock
                .cantidadActual,
            );

          const currentCommitted =
            Number(
              dailyStock
                .cantidadComprometida,
            );

          if (
            currentCommitted <
            committedQuantity
          ) {
            throw new AppError(
              409,
              `El stock diario comprometido de "${detail.nombreProducto}" es inconsistente.`,
              "STOCK_COMPROMETIDO_INCONSISTENTE",
            );
          }

          await transaction
            .stockDiario
            .update({
              where: {
                id:
                  dailyStock.id,
              },

              data: {
                cantidadComprometida:
                  {
                    decrement:
                      committedQuantity,
                  },
              },
            });

          await transaction
            .movimientoInventario
            .create({
              data: {
                productoSucursalId:
                  detail
                    .productoSucursalId,

                usuarioId:
                  auth.usuarioId,

                tipoMovimiento:
                  "LIBERACION_RESERVA",

                cantidad:
                  committedQuantity,

                cantidadAnterior:
                  currentStock,

                cantidadResultante:
                  currentStock,

                motivo:
                  `Liberación por cancelación de la reserva ${reservation.codigo}.`,

                referenciaTipo:
                  "RESERVA",

                referenciaId:
                  reservation.id,
              },
            });
        }

        await transaction
          .detalleReserva
          .update({
            where: {
              id: detail.id,
            },

            data: {
              cantidadComprometida:
                0,

              estado:
                detail.estado ===
                "RECHAZADO"
                  ? "RECHAZADO"
                  : "LIBERADO",
            },
          });
      }

      /*
       * Los pagos pendientes dejan de tener validez.
       * Los confirmados se conservan como evidencia.
       */
      await transaction
        .pagoReserva
        .updateMany({
          where: {
            reservaId:
              reservation.id,

            estado:
              "PENDIENTE",
          },

          data: {
            estado:
              "ANULADO",
          },
        });

      await transaction
        .reserva
        .update({
          where: {
            id:
              reservation.id,
          },

          data: {
            estado:
              "CANCELADA",

            canceladoPorId:
              auth.usuarioId,

            fechaCancelacion:
              new Date(),

            motivoCancelacion:
              input.motivo,

            penalidadCancelacion:
              input
                .penalidadCancelacion,

            montoDevuelto:
              refundAmount,
          },
        });

      await transaction
        .historialReserva
        .create({
          data: {
            reservaId:
              reservation.id,

            usuarioId:
              auth.usuarioId,

            estadoAnterior:
              reservation.estado,

            estadoNuevo:
              "CANCELADA",

            observacion:
              input.motivo,
          },
        });
    },
  );

  return getReservationById(
    auth,
    reservation.id,
  );
}