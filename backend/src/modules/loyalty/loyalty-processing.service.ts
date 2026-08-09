import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  getLoyaltyOperationalDay,
  resolveDailyVisitIncrement,
} from "./loyalty-visit-policy.js";
import {
  createUserNotification,
} from "../notifications/notification-generator.service.js";

type LoyaltyProgramForProcessing = {
  id: string;

  tipo:
  | "VISITAS"
  | "MONTO_CONSUMIDO"
  | "AMBOS";

  visitasRequeridas:
  number | null;

  montoRequerido:
  Prisma.Decimal | null;

  tipoRecompensa:
  | "PRODUCTO_GRATIS"
  | "DESCUENTO_FIJO"
  | "DESCUENTO_PORCENTAJE"
  | "BENEFICIO";

  productoPremioId:
  string | null;

  cantidadPremio:
  Prisma.Decimal | null;

  montoDescuento:
  Prisma.Decimal | null;

  porcentajeDescuento:
  Prisma.Decimal | null;

  descripcionBeneficio:
  string | null;

  vigenciaDiasPremio:
  number;

  automatico:
  boolean;

  productoPremio: {
    nombre: string;
  } | null;
};

function addDays(
  date: Date,
  days: number,
): Date {
  const result =
    new Date(date);

  result.setUTCDate(
    result.getUTCDate() +
    days,
  );

  return result;
}

function calculateEligibleCycles(
  program:
    LoyaltyProgramForProcessing,
  visits:
    number,
  amount:
    Prisma.Decimal,
): number {
  const visitCycles =
    program.visitasRequeridas
      ? Math.floor(
        visits /
        program
          .visitasRequeridas,
      )
      : 0;

  const amountCycles =
    program.montoRequerido
      ? amount
        .dividedBy(
          program
            .montoRequerido,
        )
        .floor()
        .toNumber()
      : 0;

  switch (
  program.tipo
  ) {
    case "VISITAS":
      return visitCycles;

    case "MONTO_CONSUMIDO":
      return amountCycles;

    case "AMBOS":
      return Math.min(
        visitCycles,
        amountCycles,
      );

    default:
      return 0;
  }
}

function buildRewardSnapshot(
  program:
    LoyaltyProgramForProcessing,
) {
  switch (
  program.tipoRecompensa
  ) {
    case "PRODUCTO_GRATIS": {
      const quantity =
        program.cantidadPremio
          ?.toString() ??
        "1";

      const productName =
        program.productoPremio
          ?.nombre ??
        "Producto";

      return {
        productoPremioId:
          program.productoPremioId,

        descripcion:
          `${quantity} ${productName}`,

        cantidadProducto:
          program.cantidadPremio,

        valorReferencia:
          null,
      };
    }

    case "DESCUENTO_FIJO":
      return {
        productoPremioId:
          null,

        descripcion:
          `Descuento de S/ ${program.montoDescuento?.toFixed(2) ?? "0.00"}`,

        cantidadProducto:
          null,

        valorReferencia:
          program.montoDescuento,
      };

    case "DESCUENTO_PORCENTAJE":
      return {
        productoPremioId:
          null,

        descripcion:
          `${program.porcentajeDescuento?.toString() ?? "0"} % de descuento`,

        cantidadProducto:
          null,

        valorReferencia:
          program
            .porcentajeDescuento,
      };

    case "BENEFICIO":
      return {
        productoPremioId:
          null,

        descripcion:
          program
            .descripcionBeneficio ??
          "Beneficio especial",

        cantidadProducto:
          null,

        valorReferencia:
          null,
      };
  }
}

export async function applySaleLoyalty(
  transaction:
    Prisma.TransactionClient,
  saleId: string,
) {
  const sale =
    await transaction.venta
      .findUnique({
        where: {
          id:
            saleId,
        },

        select: {
          id:
            true,

          clienteId:
            true,

          sucursalId:
            true,

          subtotal:
            true,

          descuento:
            true,

          estado:
            true,

          createdAt:
            true,
        },
      });

  if (!sale) {
    throw new AppError(
      404,
      "La venta no existe.",
      "VENTA_NO_ENCONTRADA",
    );
  }

  if (
    sale.estado !==
    "CONFIRMADA"
  ) {
    return {
      programasProcesados:
        0,

      premiosGenerados:
        0,
    };
  }

  /*
   * Las ventas sin cliente registrado no acumulan
   * visitas ni premios.
   */
  if (!sale.clienteId) {
    return {
      programasProcesados:
        0,

      premiosGenerados:
        0,
    };
  }

  const operationalDay =
    getLoyaltyOperationalDay(
      sale.createdAt,
    );

  const saleDate =
    operationalDay.dateOnly;

  let consumedAmount =
    sale.subtotal.minus(
      sale.descuento,
    );

  if (
    consumedAmount
      .isNegative()
  ) {
    consumedAmount =
      new Prisma.Decimal(0);
  }

  const programs =
    await transaction
      .programaFidelizacion
      .findMany({
        where: {
          activo:
            true,

          fechaInicio: {
            lte:
              saleDate,
          },

          AND: [
            {
              OR: [
                {
                  fechaFin:
                    null,
                },
                {
                  fechaFin: {
                    gte:
                      saleDate,
                  },
                },
              ],
            },
            {
              OR: [
                {
                  sucursalId:
                    null,
                },
                {
                  sucursalId:
                    sale.sucursalId,
                },
              ],
            },
          ],
        },

        select: {
          id:
            true,

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

          productoPremio: {
            select: {
              nombre:
                true,
            },
          },
        },

        orderBy: {
          createdAt:
            "asc",
        },
      });

  let processedPrograms =
    0;

  let generatedRewards =
    0;

  for (
    const program
    of programs
  ) {
    const existingMovement =
      await transaction
        .movimientoFidelizacion
        .findUnique({
          where: {
            ventaId_programaId: {
              ventaId:
                sale.id,

              programaId:
                program.id,
            },
          },

          select: {
            id:
              true,
          },
        });

    /*
     * Evita acumular dos veces la misma venta
     * ante reintentos o solicitudes duplicadas.
     */
    if (
      existingMovement
    ) {
      continue;
    }

    const visitIncrement =
      await resolveDailyVisitIncrement(
        transaction,
        {
          clientId:
            sale.clienteId,

          programId:
            program.id,

          operationalDay,
        },
      );

    const progress =
      await transaction
        .progresoFidelizacion
        .upsert({
          where: {
            clienteId_programaId: {
              clienteId:
                sale.clienteId,

              programaId:
                program.id,
            },
          },

          create: {
            clienteId:
              sale.clienteId,

            programaId:
              program.id,

            visitasAcumuladas:
              visitIncrement,

            montoAcumulado:
              consumedAmount,

            ciclosCompletados:
              0,
          },

          update: {
            visitasAcumuladas: {
              increment:
                visitIncrement,
            },

            montoAcumulado: {
              increment:
                consumedAmount,
            },
          },

          select: {
            id:
              true,

            visitasAcumuladas:
              true,

            montoAcumulado:
              true,

            ciclosCompletados:
              true,
          },
        });

    const eligibleCycles =
      calculateEligibleCycles(
        program,
        progress
          .visitasAcumuladas,
        progress
          .montoAcumulado,
      );

    /*
     * Los programas manuales acumulan progreso,
     * pero no emiten premios automáticamente.
     */
    const generatedCycles =
      program.automatico
        ? Math.max(
          0,
          eligibleCycles -
          progress
            .ciclosCompletados,
        )
        : 0;

    if (
      generatedCycles > 0
    ) {
      await transaction
        .progresoFidelizacion
        .update({
          where: {
            id:
              progress.id,
          },

          data: {
            ciclosCompletados:
              eligibleCycles,
          },
        });
    }

    const movement =
      await transaction
        .movimientoFidelizacion
        .create({
          data: {
            ventaId:
              sale.id,

            clienteId:
              sale.clienteId,

            programaId:
              program.id,

            progresoId:
              progress.id,

            visitasAplicadas:
              visitIncrement,

            montoAplicado:
              consumedAmount,

            ciclosGenerados:
              generatedCycles,

            estado:
              "ACTIVO",
          },

          select: {
            id:
              true,
          },
        });

    if (
      generatedCycles > 0
    ) {
      const reward =
        buildRewardSnapshot(
          program,
        );

      const expiryDate =
        addDays(
          sale.createdAt,
          program
            .vigenciaDiasPremio,
        );

      const rewards =
        Array.from(
          {
            length:
              generatedCycles,
          },
          () => ({
            clienteId:
              sale.clienteId!,

            programaId:
              program.id,

            productoPremioId:
              reward
                .productoPremioId,

            movimientoId:
              movement.id,

            tipoRecompensaSnapshot:
              program.tipoRecompensa,

            descripcion:
              reward.descripcion,

            cantidadProducto:
              reward
                .cantidadProducto,

            valorReferencia:
              reward
                .valorReferencia,

            estado:
              "DISPONIBLE" as const,

            fechaVencimiento:
              expiryDate,
          }),
        );

      await transaction
        .premioCliente
        .createMany({
          data:
            rewards,
        });

      generatedRewards +=
        generatedCycles;
    }

    processedPrograms +=
      1;
  }

  if (
    generatedRewards >
    0
  ) {
    const existingNotification =
      await transaction
        .notificacion
        .findFirst({
          where: {
            usuarioId:
              sale.clienteId,
            tipo:
              "PREMIO_DISPONIBLE",
            entidad:
              "Venta",
            entidadId:
              sale.id,
          },
          select: {
            id: true,
          },
        });

    if (!existingNotification) {
      await createUserNotification(
        transaction,
        {
          usuarioId:
            sale.clienteId,
          sucursalId:
            sale.sucursalId,
          tipo:
            "PREMIO_DISPONIBLE",
          prioridad:
            "NORMAL",
          titulo:
            generatedRewards === 1
              ? "Tienes un nuevo premio"
              : `Tienes ${generatedRewards} nuevos premios`,
          mensaje:
            "Tu compra completó un programa de fidelización. Revisa tus premios disponibles.",
          entidad:
            "Venta",
          entidadId:
            sale.id,
        },
      );
    }
  }

  return {
    programasProcesados:
      processedPrograms,

    premiosGenerados:
      generatedRewards,
  };
}

export async function revertSaleLoyalty(
  transaction:
    Prisma.TransactionClient,
  input: {
    saleId: string;
    userId: string;
    reason: string;
  },
) {
  const movements =
    await transaction
      .movimientoFidelizacion
      .findMany({
        where: {
          ventaId:
            input.saleId,

          estado:
            "ACTIVO",
        },

        select: {
          id:
            true,

          clienteId:
            true,

          programaId:
            true,

          progresoId:
            true,

          visitasAplicadas:
            true,

          montoAplicado:
            true,

          ciclosGenerados:
            true,

          createdAt:
            true,

          progreso: {
            select: {
              visitasAcumuladas:
                true,

              montoAcumulado:
                true,

              ciclosCompletados:
                true,
            },
          },

          premios: {
            select: {
              id:
                true,

              estado:
                true,
            },
          },
        },
      });

  if (
    movements.length ===
    0
  ) {
    return {
      movimientosRevertidos:
        0,

      premiosAnulados:
        0,
    };
  }

  let voidedRewards =
    0;

  for (
    const movement
    of movements
  ) {
    /*
     * La venta debe ser el último movimiento del
     * cliente en ese programa. Esto evita dejar
     * ciclos y premios posteriores inconsistentes.
     */
    const laterMovement =
      await transaction
        .movimientoFidelizacion
        .findFirst({
          where: {
            clienteId:
              movement.clienteId,

            programaId:
              movement.programaId,

            estado:
              "ACTIVO",

            createdAt: {
              gt:
                movement.createdAt,
            },
          },

          select: {
            id:
              true,
          },
        });

    if (
      laterMovement
    ) {
      throw new AppError(
        409,
        "La venta no puede anularse porque el cliente tiene movimientos de fidelización posteriores.",
        "FIDELIZACION_CON_MOVIMIENTOS_POSTERIORES",
      );
    }

    const redeemedReward =
      movement.premios
        .find(
          (reward) =>
            reward.estado ===
            "CANJEADO",
        );

    if (
      redeemedReward
    ) {
      throw new AppError(
        409,
        "La venta no puede anularse porque uno de sus premios ya fue canjeado.",
        "PREMIO_FIDELIZACION_CANJEADO",
      );
    }

    const newVisits =
      Math.max(
        0,
        movement.progreso
          .visitasAcumuladas -
        movement
          .visitasAplicadas,
      );

    let newAmount =
      movement.progreso
        .montoAcumulado
        .minus(
          movement
            .montoAplicado,
        );

    if (
      newAmount.isNegative()
    ) {
      newAmount =
        new Prisma.Decimal(
          0,
        );
    }

    const newCycles =
      Math.max(
        0,
        movement.progreso
          .ciclosCompletados -
        movement
          .ciclosGenerados,
      );

    await transaction
      .progresoFidelizacion
      .update({
        where: {
          id:
            movement
              .progresoId,
        },

        data: {
          visitasAcumuladas:
            newVisits,

          montoAcumulado:
            newAmount,

          ciclosCompletados:
            newCycles,
        },
      });

    const voided =
      await transaction
        .premioCliente
        .updateMany({
          where: {
            movimientoId:
              movement.id,

            estado: {
              in: [
                "DISPONIBLE",
                "VENCIDO",
              ],
            },
          },

          data: {
            estado:
              "ANULADO",

            motivoAnulacion:
              `Venta anulada: ${input.reason}`,
          },
        });

    voidedRewards +=
      voided.count;

    await transaction
      .movimientoFidelizacion
      .update({
        where: {
          id:
            movement.id,
        },

        data: {
          estado:
            "INACTIVO",

          revertidoAt:
            new Date(),

          revertidoPorId:
            input.userId,

          motivoReversion:
            input.reason,
        },
      });
  }

  return {
    movimientosRevertidos:
      movements.length,

    premiosAnulados:
      voidedRewards,
  };
}
