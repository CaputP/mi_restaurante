import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { withSerializableTransaction } from "../../lib/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { lockBranchAvailability } from "../../shared/availability/availability-lock.js";

import type {
  CreateBlockInput,
  ReplaceSchedulesInput,
  UpdateBlockInput,
  UpdateBlockStatusInput,
} from "./branch-availability.schema.js";

type AvailabilityAuth = {
  usuarioId: string;
  rol: string;
};

const DAY_ORDER:
  Record<string, number> = {
    LUNES: 1,
    MARTES: 2,
    MIERCOLES: 3,
    JUEVES: 4,
    VIERNES: 5,
    SABADO: 6,
    DOMINGO: 7,
  };

const blockSelect = {
  id: true,
  sucursalId: true,
  zonaId: true,
  fechaInicio: true,
  fechaFin: true,
  motivo: true,
  estado: true,
  createdAt: true,
  updatedAt: true,

  zona: {
    select: {
      id: true,
      nombre: true,
    },
  },

  creadoPor: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  },
} satisfies Prisma.BloqueoDisponibilidadSelect;

type BlockRecord =
  Prisma.BloqueoDisponibilidadGetPayload<{
    select:
      typeof blockSelect;
  }>;

function getOperationalDate(): Date {
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
    throw new AppError(
      500,
      "No se pudo determinar la fecha operativa.",
      "FECHA_OPERATIVA_INVALIDA",
    );
  }

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`,
  );
}

function timeToDate(
  time: string,
): Date {
  return new Date(
    `1970-01-01T${time}:00.000Z`,
  );
}

function dateToTime(
  date: Date,
): string {
  return date
    .toISOString()
    .slice(
      11,
      16,
    );
}

function fullName(
  user: {
    nombres: string;
    apellidos: string;
  },
): string {
  return `${user.nombres} ${user.apellidos}`.trim();
}

function mapBlock(
  block: BlockRecord,
) {
  return {
    id:
      block.id,

    sucursalId:
      block.sucursalId,

    zonaId:
      block.zonaId,

    fechaInicio:
      block.fechaInicio
        .toISOString(),

    fechaFin:
      block.fechaFin
        .toISOString(),

    motivo:
      block.motivo,

    estado:
      block.estado,

    zona:
      block.zona,

    creadoPor: {
      id:
        block.creadoPor.id,

      nombreCompleto:
        fullName(
          block.creadoPor,
        ),
    },

    createdAt:
      block.createdAt
        .toISOString(),

    updatedAt:
      block.updatedAt
        .toISOString(),
  };
}

async function getAuthorizedBranch(
  auth: AvailabilityAuth,
  branchId: string,
) {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    const branch =
      await prisma.sucursal
        .findFirst({
          where: {
            id:
              branchId,

            deletedAt:
              null,

            estado: {
              not:
                "ARCHIVADO",
            },
          },

          select: {
            id: true,
            codigo: true,
            nombre: true,
            direccion: true,
            zonaHoraria: true,
            estado: true,
          },
        });

    if (!branch) {
      throw new AppError(
        404,
        "La sucursal no existe.",
        "SUCURSAL_NO_ENCONTRADA",
      );
    }

    return branch;
  }

  const operationalDate =
    getOperationalDate();

  const assignment =
    await prisma
      .usuarioSucursal
      .findFirst({
        where: {
          usuarioId:
            auth.usuarioId,

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

          sucursal: {
            deletedAt:
              null,

            estado: {
              not:
                "ARCHIVADO",
            },
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
              estado: true,
            },
          },
        },
      });

  if (!assignment) {
    throw new AppError(
      403,
      "No tienes autorización para administrar esta sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }

  return assignment.sucursal;
}

async function assertZoneBelongsToBranch(
  branchId: string,
  zoneId: string | null,
): Promise<void> {
  if (!zoneId) {
    return;
  }

  const zone =
    await prisma.zona
      .findFirst({
        where: {
          id:
            zoneId,

          sucursalId:
            branchId,

          deletedAt:
            null,

          estado: {
            not:
              "ARCHIVADO",
          },
        },

        select: {
          id:
            true,
        },
      });

  if (!zone) {
    throw new AppError(
      400,
      "La zona no pertenece a la sucursal seleccionada.",
      "ZONA_INVALIDA",
    );
  }
}

function assertNoScheduleOverlaps(
  schedules:
    ReplaceSchedulesInput["horarios"],
): void {
  const schedulesByDay =
    new Map<
      string,
      ReplaceSchedulesInput["horarios"]
    >();

  for (
    const schedule
    of schedules
  ) {
    const current =
      schedulesByDay.get(
        schedule.diaSemana,
      ) ?? [];

    current.push(
      schedule,
    );

    schedulesByDay.set(
      schedule.diaSemana,
      current,
    );
  }

  for (
    const [
      day,
      daySchedules,
    ]
    of schedulesByDay
  ) {
    const ordered =
      [...daySchedules].sort(
        (
          scheduleA,
          scheduleB,
        ) =>
          scheduleA.horaInicio
            .localeCompare(
              scheduleB.horaInicio,
            ),
      );

    for (
      let index = 1;
      index <
      ordered.length;
      index += 1
    ) {
      const previous =
        ordered[index - 1];

      const current =
        ordered[index];

      if (
        previous &&
        current &&
        current.horaInicio <
          previous.horaFin
      ) {
        throw new AppError(
          400,
          `Existen horarios superpuestos para ${day}.`,
          "HORARIOS_SUPERPUESTOS",
        );
      }
    }
  }
}

async function assertNoBlockOverlap(
  branchId: string,
  zoneId: string | null,
  startDate: Date,
  endDate: Date,
  excludedBlockId?: string,
): Promise<void> {
  const conflictingBlock =
    await prisma
      .bloqueoDisponibilidad
      .findFirst({
        where: {
          sucursalId:
            branchId,

          estado:
            "ACTIVO",

          ...(excludedBlockId
            ? {
                id: {
                  not:
                    excludedBlockId,
                },
              }
            : {}),

          fechaInicio: {
            lt:
              endDate,
          },

          fechaFin: {
            gt:
              startDate,
          },

          ...(zoneId
            ? {
                OR: [
                  {
                    zonaId:
                      null,
                  },
                  {
                    zonaId:
                      zoneId,
                  },
                ],
              }
            : {}),
        },

        select: {
          id: true,
          motivo: true,

          zona: {
            select: {
              nombre: true,
            },
          },
        },
      });

  if (conflictingBlock) {
    throw new AppError(
      409,
      `El periodo coincide con otro bloqueo activo: ${conflictingBlock.motivo}.`,
      "BLOQUEO_SUPERPUESTO",
    );
  }
}

export async function getBranchAvailability(
  auth: AvailabilityAuth,
  branchId: string,
) {
  const branch =
    await getAuthorizedBranch(
      auth,
      branchId,
    );

  const [
    schedules,
    zones,
    blocks,
  ] =
    await Promise.all([
      prisma
        .horarioAtencion
        .findMany({
          where: {
            sucursalId:
              branchId,
          },

          select: {
            id: true,
            diaSemana: true,
            horaInicio: true,
            horaFin: true,
            activo: true,
          },
        }),

      prisma.zona.findMany({
        where: {
          sucursalId:
            branchId,

          deletedAt:
            null,

          estado: {
            not:
              "ARCHIVADO",
          },
        },

        select: {
          id: true,
          nombre: true,
          estado: true,
        },

        orderBy: {
          nombre:
            "asc",
        },
      }),

      prisma
        .bloqueoDisponibilidad
        .findMany({
          where: {
            sucursalId:
              branchId,
          },

          orderBy: {
            fechaInicio:
              "desc",
          },

          take:
            100,

          select:
            blockSelect,
        }),
    ]);

  return {
    sucursal:
      branch,

    zonas:
      zones,

    horarios:
      schedules
        .map(
          (schedule) => ({
            id:
              schedule.id,

            diaSemana:
              schedule.diaSemana,

            horaInicio:
              dateToTime(
                schedule.horaInicio,
              ),

            horaFin:
              dateToTime(
                schedule.horaFin,
              ),

            activo:
              schedule.activo,
          }),
        )
        .sort(
          (
            scheduleA,
            scheduleB,
          ) => {
            const dayAOrder =
            DAY_ORDER[
                scheduleA.diaSemana
            ] ?? 99;

            const dayBOrder =
            DAY_ORDER[
                scheduleB.diaSemana
            ] ?? 99;

            const dayDifference =
            dayAOrder -
            dayBOrder;

            if (
              dayDifference !==
              0
            ) {
              return dayDifference;
            }

            return scheduleA
              .horaInicio
              .localeCompare(
                scheduleB.horaInicio,
              );
          },
        ),

    bloqueos:
      blocks.map(
        mapBlock,
      ),
  };
}

export async function replaceBranchSchedules(
  auth: AvailabilityAuth,
  branchId: string,
  input: ReplaceSchedulesInput,
) {
  await getAuthorizedBranch(
    auth,
    branchId,
  );

  assertNoScheduleOverlaps(
    input.horarios,
  );

  await withSerializableTransaction(
    async (
      transaction,
    ) => {
      await lockBranchAvailability(
        transaction,
        branchId,
      );

      await transaction
        .horarioAtencion
        .deleteMany({
          where: {
            sucursalId:
              branchId,
          },
        });

      if (
        input.horarios.length >
        0
      ) {
        await transaction
          .horarioAtencion
          .createMany({
            data:
              input.horarios.map(
                (schedule) => ({
                  sucursalId:
                    branchId,

                  diaSemana:
                    schedule.diaSemana,

                  horaInicio:
                    timeToDate(
                      schedule.horaInicio,
                    ),

                  horaFin:
                    timeToDate(
                      schedule.horaFin,
                    ),

                  activo:
                    schedule.activo,
                }),
              ),
          });
      }
    },
  );

  return getBranchAvailability(
    auth,
    branchId,
  );
}

export async function createAvailabilityBlock(
  auth: AvailabilityAuth,
  branchId: string,
  input: CreateBlockInput,
) {
  await getAuthorizedBranch(
    auth,
    branchId,
  );

  await assertZoneBelongsToBranch(
    branchId,
    input.zonaId,
  );

  const startDate =
    new Date(
      input.fechaInicio,
    );

  const endDate =
    new Date(
      input.fechaFin,
    );

  await withSerializableTransaction(
    async (transaction) => {
      await lockBranchAvailability(
        transaction,
        branchId,
      );

      if (input.estado === "ACTIVO") {
        await assertNoBlockOverlap(
          branchId,
          input.zonaId,
          startDate,
          endDate,
        );
      }

      await transaction.bloqueoDisponibilidad.create({
      data: {
        sucursalId:
          branchId,

        zonaId:
          input.zonaId,

        creadoPorId:
          auth.usuarioId,

        fechaInicio:
          startDate,

        fechaFin:
          endDate,

        motivo:
          input.motivo,

        estado:
          input.estado,
      },
      });
    },
  );

  return getBranchAvailability(
    auth,
    branchId,
  );
}

export async function updateAvailabilityBlock(
  auth: AvailabilityAuth,
  branchId: string,
  blockId: string,
  input: UpdateBlockInput,
) {
  await getAuthorizedBranch(
    auth,
    branchId,
  );

  const currentBlock =
    await prisma
      .bloqueoDisponibilidad
      .findFirst({
        where: {
          id:
            blockId,

          sucursalId:
            branchId,
        },

        select: {
          id: true,
          zonaId: true,
          fechaInicio: true,
          fechaFin: true,
          motivo: true,
          estado: true,
        },
      });

  if (!currentBlock) {
    throw new AppError(
      404,
      "El bloqueo no existe.",
      "BLOQUEO_NO_ENCONTRADO",
    );
  }

  if (
    currentBlock.estado ===
    "ARCHIVADO"
  ) {
    throw new AppError(
      409,
      "No se puede modificar un bloqueo archivado.",
      "BLOQUEO_ARCHIVADO",
    );
  }

  const zoneId =
    input.zonaId !==
    undefined
      ? input.zonaId
      : currentBlock.zonaId;

  const startDate =
    input.fechaInicio
      ? new Date(
          input.fechaInicio,
        )
      : currentBlock.fechaInicio;

  const endDate =
    input.fechaFin
      ? new Date(
          input.fechaFin,
        )
      : currentBlock.fechaFin;

  if (
    startDate.getTime() >=
    endDate.getTime()
  ) {
    throw new AppError(
      400,
      "La fecha inicial debe ser anterior a la fecha final.",
      "RANGO_FECHAS_INVALIDO",
    );
  }

  await assertZoneBelongsToBranch(
    branchId,
    zoneId,
  );

  if (
    currentBlock.estado ===
    "ACTIVO"
  ) {
    await assertNoBlockOverlap(
      branchId,
      zoneId,
      startDate,
      endDate,
      blockId,
    );
  }

  await withSerializableTransaction(
    async (transaction) => {
      await lockBranchAvailability(
        transaction,
        branchId,
      );

      const lockedBlock =
        await transaction.bloqueoDisponibilidad.findFirst({
          where: { id: blockId, sucursalId: branchId },
          select: {
            id: true,
            zonaId: true,
            fechaInicio: true,
            fechaFin: true,
            estado: true,
          },
        });

      if (!lockedBlock) {
        throw new AppError(
          404,
          "El bloqueo no existe.",
          "BLOQUEO_NO_ENCONTRADO",
        );
      }

      if (lockedBlock.estado === "ARCHIVADO") {
        throw new AppError(
          409,
          "No se puede modificar un bloqueo archivado.",
          "BLOQUEO_ARCHIVADO",
        );
      }

      const lockedZoneId =
        input.zonaId !== undefined
          ? input.zonaId
          : lockedBlock.zonaId;
      const lockedStartDate = input.fechaInicio
        ? new Date(input.fechaInicio)
        : lockedBlock.fechaInicio;
      const lockedEndDate = input.fechaFin
        ? new Date(input.fechaFin)
        : lockedBlock.fechaFin;

      if (lockedStartDate.getTime() >= lockedEndDate.getTime()) {
        throw new AppError(
          400,
          "La fecha inicial debe ser anterior a la fecha final.",
          "RANGO_FECHAS_INVALIDO",
        );
      }

      await assertZoneBelongsToBranch(
        branchId,
        lockedZoneId,
      );

      if (lockedBlock.estado === "ACTIVO") {
        await assertNoBlockOverlap(
          branchId,
          lockedZoneId,
          lockedStartDate,
          lockedEndDate,
          blockId,
        );
      }

      await transaction.bloqueoDisponibilidad.update({
        where: { id: blockId },
        data: {
          ...(input.zonaId !== undefined
            ? { zonaId: lockedZoneId }
            : {}),
          ...(input.fechaInicio
            ? { fechaInicio: lockedStartDate }
            : {}),
          ...(input.fechaFin
            ? { fechaFin: lockedEndDate }
            : {}),
          ...(input.motivo
            ? { motivo: input.motivo }
            : {}),
        },
      });
    },
  );

  return getBranchAvailability(
    auth,
    branchId,
  );
}

export async function updateAvailabilityBlockStatus(
  auth: AvailabilityAuth,
  branchId: string,
  blockId: string,
  input: UpdateBlockStatusInput,
) {
  await getAuthorizedBranch(
    auth,
    branchId,
  );

  const block =
    await prisma
      .bloqueoDisponibilidad
      .findFirst({
        where: {
          id:
            blockId,

          sucursalId:
            branchId,
        },

        select: {
          id: true,
          zonaId: true,
          fechaInicio: true,
          fechaFin: true,
          estado: true,
        },
      });

  if (!block) {
    throw new AppError(
      404,
      "El bloqueo no existe.",
      "BLOQUEO_NO_ENCONTRADO",
    );
  }

  if (
    block.estado ===
      "ARCHIVADO" &&
    input.estado !==
      "ARCHIVADO"
  ) {
    throw new AppError(
      409,
      "Un bloqueo archivado no puede ser reactivado.",
      "BLOQUEO_ARCHIVADO",
    );
  }

  if (
    input.estado ===
    "ACTIVO"
  ) {
    await assertNoBlockOverlap(
      branchId,
      block.zonaId,
      block.fechaInicio,
      block.fechaFin,
      blockId,
    );
  }

  await withSerializableTransaction(
    async (transaction) => {
      await lockBranchAvailability(
        transaction,
        branchId,
      );

      const lockedBlock =
        await transaction.bloqueoDisponibilidad.findFirst({
          where: { id: blockId, sucursalId: branchId },
          select: {
            id: true,
            zonaId: true,
            fechaInicio: true,
            fechaFin: true,
            estado: true,
          },
        });

      if (!lockedBlock) {
        throw new AppError(
          404,
          "El bloqueo no existe.",
          "BLOQUEO_NO_ENCONTRADO",
        );
      }

      if (
        lockedBlock.estado === "ARCHIVADO" &&
        input.estado !== "ARCHIVADO"
      ) {
        throw new AppError(
          409,
          "Un bloqueo archivado no puede ser reactivado.",
          "BLOQUEO_ARCHIVADO",
        );
      }

      if (input.estado === "ACTIVO") {
        await assertNoBlockOverlap(
          branchId,
          lockedBlock.zonaId,
          lockedBlock.fechaInicio,
          lockedBlock.fechaFin,
          blockId,
        );
      }

      await transaction.bloqueoDisponibilidad.update({
        where: { id: blockId },
        data: { estado: input.estado },
      });
    },
  );

  return getBranchAvailability(
    auth,
    branchId,
  );
}
