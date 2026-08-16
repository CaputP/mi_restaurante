import {
  prisma,
} from "../../lib/prisma.js";

import {
  getLoyaltyOperationalDay,
} from "./loyalty-visit-policy.js";

import {
  calculateLoyaltyProgress,
} from "./loyalty-progress.policy.js";

import {
  buildAvailableLoyaltyProgramWhere,
  getLoyaltyApplicableBranchNames,
  isLoyaltyProgramDeliverable,
} from "./loyalty-availability.policy.js";

function roundMoney(
  value: number,
): number {
  return Number(
    value.toFixed(2),
  );
}

function formatDateOnly(
  value: Date,
): string {
  return value
    .toISOString()
    .slice(0, 10);
}

/**
 * Catálogo seguro de programas que pueden acumularse en este momento.
 *
 * A diferencia de `/loyalty/me`, esta consulta parte de los programas
 * vigentes y agrega el progreso del cliente de forma opcional. Por ello un
 * cliente nuevo también puede conocer los programas antes de su primera
 * compra, mientras el historial personal permanece intacto en `/me`.
 */
export async function listAvailableLoyaltyPrograms(
  clientId: string,
  referenceDate = new Date(),
) {
  const operationalDate =
    getLoyaltyOperationalDay(
      referenceDate,
    ).dateOnly;

  const programs =
    await prisma
      .programaFidelizacion
      .findMany({
        where:
          buildAvailableLoyaltyProgramWhere(
            operationalDate,
          ),

        select: {
          id: true,
          sucursalId: true,
          nombre: true,
          descripcion: true,
          tipo: true,
          visitasRequeridas: true,
          montoRequerido: true,
          tipoRecompensa: true,
          cantidadPremio: true,
          montoDescuento: true,
          porcentajeDescuento: true,
          descripcionBeneficio: true,
          vigenciaDiasPremio: true,
          fechaInicio: true,
          fechaFin: true,

          sucursal: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },

          productoPremio: {
            select: {
              nombre: true,

              sucursales: {
                where: {
                  estado:
                    "ACTIVO",

                  disponibleVenta:
                    true,

                  sucursal: {
                    estado:
                      "ACTIVO",

                    deletedAt:
                      null,
                  },
                },

                select: {
                  sucursalId:
                    true,

                  sucursal: {
                    select: {
                      nombre:
                        true,
                    },
                  },
                },
              },
            },
          },

          progresos: {
            where: {
              clienteId:
                clientId,
            },

            select: {
              visitasAcumuladas:
                true,

              montoAcumulado:
                true,

              ciclosCompletados:
                true,

              updatedAt:
                true,
            },

            take:
              1,
          },
        },

        orderBy: [
          {
            sucursalId:
              "asc",
          },
          {
            nombre:
              "asc",
          },
        ],
      });

  const deliverablePrograms =
    programs.filter(
      isLoyaltyProgramDeliverable,
    );

  return {
    programas:
      deliverablePrograms
      .map(
        (program) => {
          const storedProgress =
            program
              .progresos[0] ??
            null;

          const visits =
            storedProgress
              ?.visitasAcumuladas ??
            0;

          const amount =
            storedProgress
              ? Number(
                  storedProgress
                    .montoAcumulado,
                )
              : 0;

          const requiredAmount =
            program
              .montoRequerido ===
            null
              ? null
              : Number(
                  program
                    .montoRequerido,
                );

          const calculatedProgress =
            calculateLoyaltyProgress({
              tipo:
                program.tipo,

              visitasAcumuladas:
                visits,

              montoAcumulado:
                amount,

              ciclosCompletados:
                storedProgress
                  ?.ciclosCompletados ??
                0,

              visitasRequeridas:
                program
                  .visitasRequeridas,

              montoRequerido:
                requiredAmount,
            });

          return {
            id:
              program.id,

            nombre:
              program.nombre,

            descripcion:
              program.descripcion,

            tipo:
              program.tipo,

            visitasRequeridas:
              program
                .visitasRequeridas,

            montoRequerido:
              requiredAmount,

            tipoRecompensa:
              program
                .tipoRecompensa,

            cantidadPremio:
              program
                .cantidadPremio ===
              null
                ? null
                : Number(
                    program
                      .cantidadPremio,
                  ),

            montoDescuento:
              program
                .montoDescuento ===
              null
                ? null
                : Number(
                    program
                      .montoDescuento,
                  ),

            porcentajeDescuento:
              program
                .porcentajeDescuento ===
              null
                ? null
                : Number(
                    program
                      .porcentajeDescuento,
                  ),

            descripcionBeneficio:
              program
                .descripcionBeneficio,

            vigenciaDiasPremio:
              program
                .vigenciaDiasPremio,

            fechaInicio:
              formatDateOnly(
                program
                  .fechaInicio,
              ),

            fechaFin:
              program.fechaFin
                ? formatDateOnly(
                    program.fechaFin,
                  )
                : null,

            sucursal:
              program.sucursal
                ? {
                    nombre:
                      program
                        .sucursal
                        .nombre,
                  }
                : null,

            sucursalesAplicables:
              getLoyaltyApplicableBranchNames(
                program,
              ),

            productoPremio:
              program
                .productoPremio
                ? {
                    nombre:
                      program
                        .productoPremio
                        .nombre,
                  }
                : null,

            progreso: {
              iniciado:
                storedProgress !==
                null,

              visitasAcumuladas:
                visits,

              montoAcumulado:
                roundMoney(
                  amount,
                ),

              ciclosCompletados:
                storedProgress
                  ?.ciclosCompletados ??
                0,

              ...calculatedProgress,

              updatedAt:
                storedProgress
                  ?.updatedAt
                  .toISOString() ??
                null,
            },
          };
        },
      ),

    total:
      deliverablePrograms
        .length,
  };
}
