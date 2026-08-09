import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";
import { withSerializableTransaction } from "../../lib/transaction.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";
import { reauthenticateUser } from "../../shared/security/reauthentication.js";

import {
  revertSaleLoyalty,
} from "../loyalty/loyalty-processing.service.js";

import type {
  VoidSaleInput,
} from "./sale-void.schema.js";

import {
  revertSalePromotions,
} from "../promotions/promotions-calculation.service.js";

import {
  revertRedeemedRewardsForSale,
} from "../loyalty/loyalty-redemption.service.js";

import {
  evaluateStockNotification,
} from "../notifications/stock-notification.service.js";

type VoidSaleAuth = {
  usuarioId: string;
  rol: string;
};

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

function getLimaDateFromInstant(
  date: Date,
): Date {
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
      date,
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
      "No se pudo determinar la fecha de la venta.",
      "FECHA_VENTA_INVALIDA",
    );
  }

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`,
  );
}

async function assertBranchAccess(
  auth: VoidSaleAuth,
  branchId: string,
): Promise<void> {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return;
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
        },

        select: {
          id:
            true,
        },
      });

  if (!assignment) {
    throw new AppError(
      403,
      "No tienes autorización para anular ventas de esta sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

export async function voidSale(
  auth: VoidSaleAuth,
  saleId: string,
  input: VoidSaleInput,
) {
  await reauthenticateUser(
    auth.usuarioId,
    input.password,
  );

  const accessSale =
    await prisma.venta.findFirst({
      where: {
        id:
          saleId,
      },

      select: {
        id:
          true,

        sucursalId:
          true,
      },
    });

  if (!accessSale) {
    throw new AppError(
      404,
      "La venta no existe.",
      "VENTA_NO_ENCONTRADA",
    );
  }

  await assertBranchAccess(
    auth,
    accessSale.sucursalId,
  );

  return withSerializableTransaction(
    async (
      transaction,
    ) => {
      const sale =
        await transaction.venta
          .findFirst({
            where: {
              id:
                saleId,
            },

            select: {
              id:
                true,

              numeroTicket:
                true,

              sucursalId:
                true,

              cajaId:
                true,

              pedidoId:
                true,

              estado:
                true,

              total:
                true,

              adelantoAplicado:
                true,

              createdAt:
                true,

              caja: {
                select: {
                  id:
                    true,

                  codigo:
                    true,

                  estado:
                    true,
                },
              },

              pedido: {
                select: {
                  id:
                    true,

                  codigo:
                    true,

                  estado:
                    true,

                  reservaId:
                    true,
                },
              },

              pagos: {
                where: {
                  estado:
                    "CONFIRMADO",
                },

                select: {
                  id:
                    true,

                  metodoPago:
                    true,

                  monto:
                    true,
                },
              },

              detalles: {
                select: {
                  id:
                    true,

                  productoSucursalId:
                    true,

                  nombreProducto:
                    true,

                  cantidad:
                    true,

                  productoSucursal: {
                    select: {
                      id:
                        true,

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
        throw new AppError(
          409,
          "La venta ya fue anulada.",
          "VENTA_YA_ANULADA",
        );
      }

      if (
        sale.caja.estado !==
        "ABIERTA"
      ) {
        throw new AppError(
          409,
          "La venta no puede anularse porque su caja ya fue cerrada.",
          "CAJA_CERRADA",
        );
      }

      if (
        sale.adelantoAplicado
          .greaterThan(0)
      ) {
        throw new AppError(
          409,
          "Esta venta tiene un adelanto de reserva aplicado y requiere un proceso de devolución.",
          "VENTA_CON_ADELANTO",
        );
      }

      if (
        sale.pedido.estado !==
        "PAGADO"
      ) {
        throw new AppError(
          409,
          "El pedido relacionado no se encuentra pagado.",
          "PEDIDO_ESTADO_INVALIDO",
        );
      }

      const claimedSale =
        await transaction.venta
          .updateMany({
            where: {
              id:
                sale.id,

              estado:
                "CONFIRMADA",
            },

            data: {
              estado:
                "ANULADA",

              anuladaAt:
                new Date(),

              anuladaPorId:
                auth.usuarioId,

              motivoAnulacion:
                input.motivo,
            },
          });

      if (
        claimedSale.count !==
        1
      ) {
        throw new AppError(
          409,
          "La venta fue modificada por otro usuario.",
          "VENTA_MODIFICADA",
        );
      }

      await revertSaleLoyalty(
        transaction,
        {
          saleId:
            sale.id,

          userId:
            auth.usuarioId,

          reason:
            input.motivo,
        },
      );

      await revertRedeemedRewardsForSale(
        transaction,
        {
          saleId:
            sale.id,

          userId:
            auth.usuarioId,

          reason:
            input.motivo,
        },
      );

      await revertSalePromotions(
        transaction,
        sale.id,
      );

      let cashAmount =
        new Prisma.Decimal(0);

      let yapeAmount =
        new Prisma.Decimal(0);

      let plinAmount =
        new Prisma.Decimal(0);

      let cardAmount =
        new Prisma.Decimal(0);

      let transferAmount =
        new Prisma.Decimal(0);

      for (
        const payment
        of sale.pagos
      ) {
        switch (
        payment.metodoPago
        ) {
          case "EFECTIVO":
            cashAmount =
              cashAmount.plus(
                payment.monto,
              );
            break;

          case "YAPE":
            yapeAmount =
              yapeAmount.plus(
                payment.monto,
              );
            break;

          case "PLIN":
            plinAmount =
              plinAmount.plus(
                payment.monto,
              );
            break;

          case "TARJETA":
            cardAmount =
              cardAmount.plus(
                payment.monto,
              );
            break;

          case "TRANSFERENCIA":
            transferAmount =
              transferAmount.plus(
                payment.monto,
              );
            break;
        }
      }

      const updatedCash =
        await transaction.caja
          .updateMany({
            where: {
              id:
                sale.cajaId,

              estado:
                "ABIERTA",
            },

            data: {
              totalVentas: {
                decrement:
                  sale.total,
              },

              totalEfectivo: {
                decrement:
                  cashAmount,
              },

              totalYape: {
                decrement:
                  yapeAmount,
              },

              totalPlin: {
                decrement:
                  plinAmount,
              },

              totalTarjeta: {
                decrement:
                  cardAmount,
              },

              totalTransferencia: {
                decrement:
                  transferAmount,
              },

              efectivoEsperado: {
                decrement:
                  cashAmount,
              },
            },
          });

      if (
        updatedCash.count !==
        1
      ) {
        throw new AppError(
          409,
          "La caja fue cerrada durante la anulación.",
          "CAJA_NO_DISPONIBLE",
        );
      }

      await transaction
        .pagoVenta
        .updateMany({
          where: {
            ventaId:
              sale.id,

            estado:
              "CONFIRMADO",
          },

          data: {
            estado:
              "ANULADO",
          },
        });

      const saleOperationalDate =
        getLimaDateFromInstant(
          sale.createdAt,
        );

      const operationalDate =
        getOperationalDate();

      const saleIsOperationalToday =
        saleOperationalDate
          .getTime() ===
        operationalDate
          .getTime();

      const stockNotificationsToEvaluate =
        new Set<string>();

      for (
        const detail
        of sale.detalles
      ) {
        const stockType =
          detail
            .productoSucursal
            .producto
            .tipoStock;

        if (
          stockType ===
          "SIN_CONTROL"
        ) {
          continue;
        }

        if (
          stockType ===
          "PERMANENTE"
        ) {
          const currentStock =
            await transaction
              .stockPermanente
              .findUnique({
                where: {
                  productoSucursalId:
                    detail
                      .productoSucursalId,
                },

                select: {
                  id:
                    true,

                  cantidadActual:
                    true,
                },
              });

          if (!currentStock) {
            throw new AppError(
              409,
              `No existe stock permanente para ${detail.nombreProducto}.`,
              "STOCK_PERMANENTE_NO_ENCONTRADO",
            );
          }

          const resultingQuantity =
            currentStock
              .cantidadActual
              .plus(
                detail.cantidad,
              );

          await transaction
            .stockPermanente
            .update({
              where: {
                id:
                  currentStock.id,
              },

              data: {
                cantidadActual:
                  resultingQuantity,
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
                  "ANULACION_VENTA",

                cantidad:
                  detail.cantidad,

                cantidadAnterior:
                  currentStock
                    .cantidadActual,

                cantidadResultante:
                  resultingQuantity,

                motivo:
                  `Anulación de la venta ${sale.numeroTicket}: ${input.motivo}`,

                referenciaTipo:
                  "VENTA",

                referenciaId:
                  sale.id,
              },
            });

          stockNotificationsToEvaluate.add(
            detail.productoSucursalId,
          );

          continue;
        }

        const dailyStock =
          await transaction
            .stockDiario
            .findUnique({
              where: {
                productoSucursalId_fecha: {
                  productoSucursalId:
                    detail
                      .productoSucursalId,

                  fecha:
                    saleOperationalDate,
                },
              },

              select: {
                id:
                  true,

                cantidadActual:
                  true,
              },
            });

        if (!dailyStock) {
          throw new AppError(
            409,
            `No existe stock diario para ${detail.nombreProducto} en la fecha de la venta.`,
            "STOCK_DIARIO_NO_ENCONTRADO",
          );
        }

        const resultingQuantity =
          dailyStock
            .cantidadActual
            .plus(
              detail.cantidad,
            );

        await transaction
          .stockDiario
          .update({
            where: {
              id:
                dailyStock.id,
            },

            data: {
              cantidadActual:
                resultingQuantity,
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
                "ANULACION_VENTA",

              cantidad:
                detail.cantidad,

              cantidadAnterior:
                dailyStock
                  .cantidadActual,

              cantidadResultante:
                resultingQuantity,

              motivo:
                `Anulación de la venta ${sale.numeroTicket}: ${input.motivo}`,

              referenciaTipo:
                "VENTA",

              referenciaId:
                sale.id,
            },
          });

        if (
          saleIsOperationalToday
        ) {
          stockNotificationsToEvaluate.add(
            detail.productoSucursalId,
          );
        }
      }

      /*
 * Todas las cantidades de la venta ya fueron
 * restituidas. Evaluamos el resultado final.
 */
      for (
        const productoSucursalId
        of stockNotificationsToEvaluate
      ) {
        await evaluateStockNotification(
          transaction,
          productoSucursalId,
        );
      }

      await transaction.pedido.update({
        where: {
          id:
            sale.pedidoId,
        },

        data: {
          estado:
            "CANCELADO",

          canceladoAt:
            new Date(),

          canceladoPorId:
            auth.usuarioId,

          motivoCancelacion:
            `Venta anulada: ${input.motivo}`,
        },
      });

      return {
        id:
          sale.id,

        numeroTicket:
          sale.numeroTicket,

        estado:
          "ANULADA",

        motivoAnulacion:
          input.motivo,

        pedido: {
          id:
            sale.pedido.id,

          codigo:
            sale.pedido.codigo,

          estado:
            "CANCELADO",
        },

        caja: {
          id:
            sale.caja.id,

          codigo:
            sale.caja.codigo,
        },
      };
    },
  );
}
