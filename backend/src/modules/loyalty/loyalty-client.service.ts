import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";

function roundMoney(
  value: Prisma.Decimal | number,
): number {
  return Number(
    Number(
      value,
    ).toFixed(
      2,
    ),
  );
}

function calculateProgress(
  input: {
    tipo:
      | "VISITAS"
      | "MONTO_CONSUMIDO"
      | "AMBOS";

    visitasAcumuladas:
      number;

    montoAcumulado:
      number;

    visitasRequeridas:
      number | null;

    montoRequerido:
      number | null;
  },
) {
  const visitProgress =
    input.visitasRequeridas &&
    input.visitasRequeridas > 0
      ? Math.min(
          100,
          (
            input.visitasAcumuladas /
            input.visitasRequeridas
          ) *
            100,
        )
      : null;

  const amountProgress =
    input.montoRequerido &&
    input.montoRequerido > 0
      ? Math.min(
          100,
          (
            input.montoAcumulado /
            input.montoRequerido
          ) *
            100,
        )
      : null;

  let percentage =
    0;

  switch (
    input.tipo
  ) {
    case "VISITAS":
      percentage =
        visitProgress ?? 0;
      break;

    case "MONTO_CONSUMIDO":
      percentage =
        amountProgress ?? 0;
      break;

    case "AMBOS":
      percentage =
        Math.min(
          visitProgress ?? 0,
          amountProgress ?? 0,
        );
      break;
  }

  return {
    porcentaje:
      roundMoney(
        percentage,
      ),

    porcentajeVisitas:
      visitProgress ===
      null
        ? null
        : roundMoney(
            visitProgress,
          ),

    porcentajeMonto:
      amountProgress ===
      null
        ? null
        : roundMoney(
            amountProgress,
          ),
  };
}

function rewardEffectiveState(
  reward: {
    estado:
      | "DISPONIBLE"
      | "CANJEADO"
      | "VENCIDO"
      | "ANULADO";

    fechaVencimiento:
      Date;
  },
) {
  if (
    reward.estado ===
      "DISPONIBLE" &&
    reward.fechaVencimiento <
      new Date()
  ) {
    return "VENCIDO";
  }

  return reward.estado;
}

export async function getClientLoyaltyProfile(
  userId: string,
) {
  const customer =
    await prisma.usuario
      .findUnique({
        where: {
          id:
            userId,
        },

        select: {
          id: true,
          nombres: true,
          apellidos: true,
          correo: true,
          telefono: true,

          rol: {
            select: {
              codigo:
                true,
              nombre:
                true,
            },
          },

          progresosFidelizacion: {
            orderBy: {
              updatedAt:
                "desc",
            },

            select: {
              id: true,

              visitasAcumuladas:
                true,

              montoAcumulado:
                true,

              ciclosCompletados:
                true,

              createdAt:
                true,

              updatedAt:
                true,

              programa: {
                select: {
                  id: true,
                  nombre: true,
                  descripcion: true,

                  tipo:
                    true,

                  visitasRequeridas:
                    true,

                  montoRequerido:
                    true,

                  tipoRecompensa:
                    true,

                  productoPremioId:
                    true,

                  cantidadPremio:
                    true,

                  montoDescuento:
                    true,

                  porcentajeDescuento:
                    true,

                  descripcionBeneficio:
                    true,

                  vigenciaDiasPremio:
                    true,

                  automatico:
                    true,

                  activo:
                    true,

                  fechaInicio:
                    true,

                  fechaFin:
                    true,

                  sucursal: {
                    select: {
                      id: true,
                      codigo: true,
                      nombre: true,
                    },
                  },

                  productoPremio: {
                    select: {
                      id: true,
                      codigo: true,
                      nombre: true,
                    },
                  },
                },
              },
            },
          },

          premiosObtenidos: {
            orderBy: [
              {
                estado:
                  "asc",
              },
              {
                fechaVencimiento:
                  "asc",
              },
            ],

            select: {
              id: true,

              descripcion:
                true,

              tipoRecompensaSnapshot:
                true,

              cantidadProducto:
                true,

              valorReferencia:
                true,

              montoAplicado:
                true,

              estado:
                true,

              fechaObtencion:
                true,

              fechaVencimiento:
                true,

              fechaCanje:
                true,

              motivoAnulacion:
                true,

              productoPremio: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                },
              },

              programa: {
                select: {
                  id: true,
                  nombre: true,
                  tipoRecompensa:
                    true,

                  sucursal: {
                    select: {
                      id: true,
                      codigo: true,
                      nombre: true,
                    },
                  },
                },
              },

              ventaCanje: {
                select: {
                  id: true,
                  numeroTicket:
                    true,
                  createdAt:
                    true,
                  estado:
                    true,
                },
              },
            },
          },

          canjesPremioCliente: {
            orderBy: {
              fechaCanje:
                "desc",
            },

            take:
              100,

            select: {
              id: true,

              descripcion:
                true,

              tipoRecompensa:
                true,

              montoAplicado:
                true,

              productoPremioNombre:
                true,

              estado:
                true,

              fechaCanje:
                true,

              revertidoAt:
                true,

              motivoReversion:
                true,

              venta: {
                select: {
                  id: true,
                  numeroTicket:
                    true,
                  estado:
                    true,
                  total:
                    true,
                  createdAt:
                    true,
                },
              },

              premio: {
                select: {
                  id: true,

                  programa: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

  if (!customer) {
    throw new AppError(
      404,
      "No se encontró el perfil del cliente.",
      "CLIENTE_NO_ENCONTRADO",
    );
  }

  if (
    ![
      "CLIENTE",
      "USUARIO",
    ].includes(
      customer
        .rol
        .codigo,
    )
  ) {
    throw new AppError(
      403,
      "El usuario no corresponde a un cliente.",
      "USUARIO_NO_CLIENTE",
    );
  }

  const progresses =
    customer
      .progresosFidelizacion
      .map(
        (
          progress,
        ) => {
          const visits =
            progress
              .visitasAcumuladas;

          const amount =
            Number(
              progress
                .montoAcumulado,
            );

          const requiredVisits =
            progress
              .programa
              .visitasRequeridas;

          const requiredAmount =
            progress
              .programa
              .montoRequerido ===
            null
              ? null
              : Number(
                  progress
                    .programa
                    .montoRequerido,
                );

          const progressCalculation =
            calculateProgress({
              tipo:
                progress
                  .programa
                  .tipo,

              visitasAcumuladas:
                visits,

              montoAcumulado:
                amount,

              visitasRequeridas:
                requiredVisits,

              montoRequerido:
                requiredAmount,
            });

          return {
            id:
              progress.id,

            visitasAcumuladas:
              visits,

            montoAcumulado:
              roundMoney(
                amount,
              ),

            ciclosCompletados:
              progress
                .ciclosCompletados,

            porcentaje:
              progressCalculation
                .porcentaje,

            porcentajeVisitas:
              progressCalculation
                .porcentajeVisitas,

            porcentajeMonto:
              progressCalculation
                .porcentajeMonto,

            updatedAt:
              progress
                .updatedAt
                .toISOString(),

            programa: {
              id:
                progress
                  .programa
                  .id,

              nombre:
                progress
                  .programa
                  .nombre,

              descripcion:
                progress
                  .programa
                  .descripcion,

              tipo:
                progress
                  .programa
                  .tipo,

              visitasRequeridas:
                requiredVisits,

              montoRequerido:
                requiredAmount,

              tipoRecompensa:
                progress
                  .programa
                  .tipoRecompensa,

              cantidadPremio:
                progress
                  .programa
                  .cantidadPremio ===
                null
                  ? null
                  : Number(
                      progress
                        .programa
                        .cantidadPremio,
                    ),

              montoDescuento:
                progress
                  .programa
                  .montoDescuento ===
                null
                  ? null
                  : Number(
                      progress
                        .programa
                        .montoDescuento,
                    ),

              porcentajeDescuento:
                progress
                  .programa
                  .porcentajeDescuento ===
                null
                  ? null
                  : Number(
                      progress
                        .programa
                        .porcentajeDescuento,
                    ),

              descripcionBeneficio:
                progress
                  .programa
                  .descripcionBeneficio,

              vigenciaDiasPremio:
                progress
                  .programa
                  .vigenciaDiasPremio,

              automatico:
                progress
                  .programa
                  .automatico,

              activo:
                progress
                  .programa
                  .activo,

              fechaInicio:
                progress
                  .programa
                  .fechaInicio
                  .toISOString(),

              fechaFin:
                progress
                  .programa
                  .fechaFin
                  ?.toISOString() ??
                null,

              sucursal:
                progress
                  .programa
                  .sucursal,

              productoPremio:
                progress
                  .programa
                  .productoPremio,
            },
          };
        },
      );

  const rewards =
    customer
      .premiosObtenidos
      .map(
        (
          reward,
        ) => ({
          id:
            reward.id,

          descripcion:
            reward.descripcion,

          tipoRecompensa:
            reward
              .tipoRecompensaSnapshot ??
            reward
              .programa
              .tipoRecompensa,

          cantidadProducto:
            reward
              .cantidadProducto ===
            null
              ? null
              : Number(
                  reward
                    .cantidadProducto,
                ),

          valorReferencia:
            reward
              .valorReferencia ===
            null
              ? null
              : Number(
                  reward
                    .valorReferencia,
                ),

          montoAplicado:
            reward
              .montoAplicado ===
            null
              ? null
              : Number(
                  reward
                    .montoAplicado,
                ),

          estado:
            rewardEffectiveState(
              reward,
            ),

          estadoRegistrado:
            reward.estado,

          fechaObtencion:
            reward
              .fechaObtencion
              .toISOString(),

          fechaVencimiento:
            reward
              .fechaVencimiento
              .toISOString(),

          fechaCanje:
            reward
              .fechaCanje
              ?.toISOString() ??
            null,

          motivoAnulacion:
            reward
              .motivoAnulacion,

          productoPremio:
            reward
              .productoPremio,

          programa: {
            id:
              reward
                .programa
                .id,

            nombre:
              reward
                .programa
                .nombre,

            sucursal:
              reward
                .programa
                .sucursal,
          },

          ventaCanje:
            reward
              .ventaCanje
              ? {
                  ...reward
                    .ventaCanje,

                  createdAt:
                    reward
                      .ventaCanje
                      .createdAt
                      .toISOString(),
                }
              : null,
        }),
      );

  const redemptions =
    customer
      .canjesPremioCliente
      .map(
        (
          redemption,
        ) => ({
          id:
            redemption.id,

          descripcion:
            redemption
              .descripcion,

          tipoRecompensa:
            redemption
              .tipoRecompensa,

          montoAplicado:
            Number(
              redemption
                .montoAplicado,
            ),

          productoPremioNombre:
            redemption
              .productoPremioNombre,

          estado:
            redemption.estado,

          fechaCanje:
            redemption
              .fechaCanje
              .toISOString(),

          revertidoAt:
            redemption
              .revertidoAt
              ?.toISOString() ??
            null,

          motivoReversion:
            redemption
              .motivoReversion,

          programa: {
            id:
              redemption
                .premio
                .programa
                .id,

            nombre:
              redemption
                .premio
                .programa
                .nombre,
          },

          venta: {
            id:
              redemption
                .venta
                .id,

            numeroTicket:
              redemption
                .venta
                .numeroTicket,

            estado:
              redemption
                .venta
                .estado,

            total:
              Number(
                redemption
                  .venta
                  .total,
              ),

            createdAt:
              redemption
                .venta
                .createdAt
                .toISOString(),
          },
        }),
      );

  const availableRewards =
    rewards.filter(
      (reward) =>
        reward.estado ===
        "DISPONIBLE",
    );

  const totalVisits =
    progresses.reduce(
      (
        total,
        progress,
      ) =>
        total +
        progress
          .visitasAcumuladas,
      0,
    );

  const totalAccumulatedAmount =
    progresses.reduce(
      (
        total,
        progress,
      ) =>
        total +
        progress
          .montoAcumulado,
      0,
    );

  const totalRewardSavings =
    redemptions
      .filter(
        (redemption) =>
          redemption.estado ===
          "APLICADO",
      )
      .reduce(
        (
          total,
          redemption,
        ) =>
          total +
          redemption
            .montoAplicado,
        0,
      );

  return {
    cliente: {
      id:
        customer.id,

      nombres:
        customer.nombres,

      apellidos:
        customer.apellidos,

      nombreCompleto:
        `${customer.nombres} ${customer.apellidos}`
          .trim(),

      correo:
        customer.correo,

      telefono:
        customer.telefono,
    },

    resumen: {
      programas:
        progresses.length,

      visitasAcumuladas:
        totalVisits,

      montoAcumulado:
        roundMoney(
          totalAccumulatedAmount,
        ),

      premiosDisponibles:
        availableRewards.length,

      premiosTotales:
        rewards.length,

      canjesRealizados:
        redemptions.filter(
          (redemption) =>
            redemption.estado ===
            "APLICADO",
        ).length,

      ahorroPorPremios:
        roundMoney(
          totalRewardSavings,
        ),
    },

    progresos:
      progresses,

    premios:
      rewards,

    premiosDisponibles:
      availableRewards,

    historialCanjes:
      redemptions,
  };
}