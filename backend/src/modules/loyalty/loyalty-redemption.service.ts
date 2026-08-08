import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import {
  calculateAutomaticPromotions,
} from "../promotions/promotions-calculation.service.js";

type RedemptionAuth = {
  usuarioId: string;
  rol: string;
};

type OrderDetail = {
  productoId: string;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  subtotal: Prisma.Decimal;
};

type RewardRecord = {
  id: string;
  descripcion: string;

  tipoRecompensaSnapshot:
  | "PRODUCTO_GRATIS"
  | "DESCUENTO_FIJO"
  | "DESCUENTO_PORCENTAJE"
  | "BENEFICIO"
  | null;

  productoPremioId:
  string | null;

  cantidadProducto:
  Prisma.Decimal | null;

  valorReferencia:
  Prisma.Decimal | null;

  fechaObtencion:
  Date;

  fechaVencimiento:
  Date;

  programa: {
    id: string;
    nombre: string;

    tipoRecompensa:
    | "PRODUCTO_GRATIS"
    | "DESCUENTO_FIJO"
    | "DESCUENTO_PORCENTAJE"
    | "BENEFICIO";

    sucursalId:
    string | null;
  };

  productoPremio: {
    id: string;
    codigo: string;
    nombre: string;
  } | null;
};

export type LoyaltyRedemptionCalculation = {
  pedidoId: string;

  cliente: {
    id: string;
    nombreCompleto: string;
  } | null;

  subtotal: string;

  descuentoPromocional:
  string;

  baseDespuesPromociones:
  string;

  descuentoPremios:
  string;

  totalDespuesPremios:
  string;

  premios: Array<{
    premioId: string;
    programaId: string;
    programaNombre: string;

    tipoRecompensa:
    | "PRODUCTO_GRATIS"
    | "DESCUENTO_FIJO"
    | "DESCUENTO_PORCENTAJE"
    | "BENEFICIO";

    descripcion: string;

    montoAplicado: string;

    fechaVencimiento:
    string;

    productoPremio: {
      id: string;
      codigo: string;
      nombre: string;
    } | null;
  }>;
};

function roundMoney(
  value: Prisma.Decimal,
) {
  return value
    .toDecimalPlaces(
      2,
    );
}

function minimumDecimal(
  first: Prisma.Decimal,
  second: Prisma.Decimal,
) {
  return first.lessThan(
    second,
  )
    ? first
    : second;
}

function fullName(
  user: {
    nombres: string;
    apellidos: string;
  },
) {
  return [
    user.nombres,
    user.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

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

async function assertBranchAccess(
  transaction:
    Prisma.TransactionClient,
  auth:
    RedemptionAuth,
  branchId:
    string,
) {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return;
  }

  const assignment =
    await transaction
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
              getOperationalDate(),
          },

          OR: [
            {
              fechaFin:
                null,
            },
            {
              fechaFin: {
                gte:
                  getOperationalDate(),
              },
            },
          ],
        },

        select: {
          id: true,
        },
      });

  if (!assignment) {
    throw new AppError(
      403,
      "No tienes acceso a la sucursal del pedido.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

async function getOrder(
  transaction:
    Prisma.TransactionClient,
  pedidoId:
    string,
) {
  const order =
    await transaction.pedido
      .findUnique({
        where: {
          id:
            pedidoId,
        },

        select: {
          id:
            true,

          codigo:
            true,

          sucursalId:
            true,

          clienteId:
            true,

          estado:
            true,

          venta: {
            select: {
              id: true,
              estado: true,
            },
          },

          cliente: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
            },
          },

          detalles: {
            where: {
              estado: {
                not:
                  "CANCELADO",
              },
            },

            select: {
              cantidad:
                true,

              precioUnitario:
                true,

              subtotal:
                true,

              productoSucursal: {
                select: {
                  productoId:
                    true,
                },
              },
            },
          },
        },
      });

  if (!order) {
    throw new AppError(
      404,
      "El pedido no existe.",
      "PEDIDO_NO_ENCONTRADO",
    );
  }

  if (
    order.estado !==
    "ENTREGADO"
  ) {
    throw new AppError(
      409,
      "Solo pueden canjearse premios en pedidos entregados.",
      "PEDIDO_NO_ENTREGADO",
    );
  }

  if (
    order.venta &&
    order.venta.estado ===
    "CONFIRMADA"
  ) {
    throw new AppError(
      409,
      "El pedido ya tiene una venta confirmada.",
      "PEDIDO_YA_VENDIDO",
    );
  }

  return order;
}

async function getAvailableRewards(
  transaction:
    Prisma.TransactionClient,
  clienteId:
    string,
  sucursalId:
    string,
) {
  return transaction
    .premioCliente
    .findMany({
      where: {
        clienteId,

        estado:
          "DISPONIBLE",

        fechaVencimiento: {
          gte:
            new Date(),
        },

        OR: [
          {
            programa: {
              sucursalId:
                null,
            },
          },
          {
            programa: {
              sucursalId,
            },
          },
        ],
      },

      select: {
        id: true,

        descripcion:
          true,

        tipoRecompensaSnapshot:
          true,

        productoPremioId:
          true,

        cantidadProducto:
          true,

        valorReferencia:
          true,

        fechaObtencion:
          true,

        fechaVencimiento:
          true,

        programa: {
          select: {
            id: true,
            nombre: true,
            tipoRecompensa:
              true,
            sucursalId:
              true,
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

      orderBy: [
        {
          fechaVencimiento:
            "asc",
        },
        {
          fechaObtencion:
            "asc",
        },
      ],
    });
}

function getRewardType(
  reward:
    RewardRecord,
) {
  return (
    reward
      .tipoRecompensaSnapshot ??
    reward
      .programa
      .tipoRecompensa
  );
}

function calculateFreeProduct(
  reward:
    RewardRecord,
  details:
    OrderDetail[],
  availableBase:
    Prisma.Decimal,
) {
  if (
    !reward.productoPremioId
  ) {
    return {
      applicable:
        false,

      discount:
        new Prisma.Decimal(
          0,
        ),

      reason:
        "El premio no tiene un producto asociado.",
    };
  }

  const eligible =
    details
      .filter(
        (detail) =>
          detail.productoId ===
          reward.productoPremioId,
      )
      .sort(
        (
          first,
          second,
        ) =>
          first
            .precioUnitario
            .comparedTo(
              second
                .precioUnitario,
            ),
      );

  if (
    eligible.length ===
    0
  ) {
    return {
      applicable:
        false,

      discount:
        new Prisma.Decimal(
          0,
        ),

      reason:
        "El producto del premio no está incluido en el pedido.",
    };
  }

  let quantityRemaining =
    reward.cantidadProducto ??
    new Prisma.Decimal(
      1,
    );

  let discount =
    new Prisma.Decimal(
      0,
    );

  for (
    const detail
    of eligible
  ) {
    if (
      quantityRemaining
        .lessThanOrEqualTo(
          0,
        )
    ) {
      break;
    }

    const quantity =
      minimumDecimal(
        detail.cantidad,
        quantityRemaining,
      );

    discount =
      discount.plus(
        detail
          .precioUnitario
          .times(
            quantity,
          ),
      );

    quantityRemaining =
      quantityRemaining.minus(
        quantity,
      );
  }

  discount =
    minimumDecimal(
      roundMoney(
        discount,
      ),
      availableBase,
    );

  return {
    applicable:
      discount.greaterThan(
        0,
      ),

    discount,

    reason:
      discount.greaterThan(
        0,
      )
        ? null
        : "El premio no genera descuento en este pedido.",
  };
}

function calculateReward(
  reward:
    RewardRecord,
  details:
    OrderDetail[],
  availableBase:
    Prisma.Decimal,
) {
  const type =
    getRewardType(
      reward,
    );

  switch (type) {
    case "PRODUCTO_GRATIS":
      return {
        type,
        ...calculateFreeProduct(
          reward,
          details,
          availableBase,
        ),
      };

    case "DESCUENTO_FIJO": {
      const value =
        reward.valorReferencia ??
        new Prisma.Decimal(
          0,
        );

      const discount =
        minimumDecimal(
          value,
          availableBase,
        );

      return {
        type,

        applicable:
          value.greaterThan(
            0,
          ),

        discount:
          roundMoney(
            discount,
          ),

        reason:
          value.greaterThan(
            0,
          )
            ? null
            : "El premio no tiene un valor de descuento válido.",
      };
    }

    case "DESCUENTO_PORCENTAJE": {
      const percentage =
        reward.valorReferencia ??
        new Prisma.Decimal(
          0,
        );

      if (
        percentage.lessThanOrEqualTo(
          0,
        ) ||
        percentage.greaterThan(
          100,
        )
      ) {
        return {
          type,

          applicable:
            false,

          discount:
            new Prisma.Decimal(
              0,
            ),

          reason:
            "El porcentaje del premio no es válido.",
        };
      }

      const discount =
        availableBase
          .times(
            percentage,
          )
          .dividedBy(
            100,
          );

      return {
        type,

        applicable:
          true,

        discount:
          roundMoney(
            minimumDecimal(
              discount,
              availableBase,
            ),
          ),

        reason:
          null,
      };
    }

    case "BENEFICIO":
      return {
        type,

        applicable:
          true,

        discount:
          new Prisma.Decimal(
            0,
          ),

        reason:
          null,
      };
  }
}

function mapReward(
  reward:
    RewardRecord,
  result: {
    type:
    | "PRODUCTO_GRATIS"
    | "DESCUENTO_FIJO"
    | "DESCUENTO_PORCENTAJE"
    | "BENEFICIO";

    applicable:
    boolean;

    discount:
    Prisma.Decimal;

    reason:
    string | null;
  },
) {
  return {
    id:
      reward.id,

    descripcion:
      reward.descripcion,

    tipoRecompensa:
      result.type,

    aplicable:
      result.applicable,

    motivoNoAplicable:
      result.reason,

    montoEstimado:
      result.discount
        .toFixed(
          2,
        ),

    cantidadProducto:
      reward
        .cantidadProducto
        ?.toString() ??
      null,

    valorReferencia:
      reward
        .valorReferencia
        ?.toString() ??
      null,

    fechaObtencion:
      reward
        .fechaObtencion
        .toISOString(),

    fechaVencimiento:
      reward
        .fechaVencimiento
        .toISOString(),

    programa: {
      id:
        reward.programa.id,

      nombre:
        reward.programa
          .nombre,
    },

    productoPremio:
      reward.productoPremio,
  };
}

export async function getLoyaltyRedemptionOptions(
  auth:
    RedemptionAuth,
  pedidoId:
    string,
) {
  return prisma.$transaction(
    async (
      transaction,
    ) => {
      const order =
        await getOrder(
          transaction,
          pedidoId,
        );

      await assertBranchAccess(
        transaction,
        auth,
        order.sucursalId,
      );

      if (
        !order.clienteId ||
        !order.cliente
      ) {
        return {
          pedidoId:
            order.id,

          cliente:
            null,

          premios:
            [],
        };
      }

      const promotionCalculation =
        await calculateAutomaticPromotions(
          transaction,
          {
            pedidoId:
              order.id,
          },
        );

      const base =
        new Prisma.Decimal(
          promotionCalculation
            .totalFinal,
        );

      const details:
        OrderDetail[] =
        order.detalles.map(
          (detail) => ({
            productoId:
              detail
                .productoSucursal
                .productoId,

            cantidad:
              detail.cantidad,

            precioUnitario:
              detail
                .precioUnitario,

            subtotal:
              detail.subtotal,
          }),
        );

      const rewards =
        await getAvailableRewards(
          transaction,
          order.clienteId,
          order.sucursalId,
        );

      return {
        pedidoId:
          order.id,

        cliente: {
          id:
            order.cliente.id,

          nombreCompleto:
            fullName(
              order.cliente,
            ),
        },

        premios:
          rewards.map(
            (reward) => {
              const calculation =
                calculateReward(
                  reward,
                  details,
                  base,
                );

              return mapReward(
                reward,
                calculation,
              );
            },
          ),
      };
    },
  );
}

export async function calculateLoyaltyRedemption(
  transaction:
    Prisma.TransactionClient,
  input: {
    pedidoId: string;
    premioIds: string[];

    promotionCalculation?: {
      subtotal: string;
      descuentoTotal: string;
      totalFinal: string;
    };
  },
): Promise<LoyaltyRedemptionCalculation> {
  const order =
    await getOrder(
      transaction,
      input.pedidoId,
    );

  if (
    !order.clienteId ||
    !order.cliente
  ) {
    if (
      input.premioIds.length >
      0
    ) {
      throw new AppError(
        409,
        "El pedido no está asociado a un cliente registrado.",
        "PEDIDO_SIN_CLIENTE_FIDELIZACION",
      );
    }

    const promotions =
      input.promotionCalculation ??
      await calculateAutomaticPromotions(
        transaction,
        {
          pedidoId:
            order.id,
        },
      );

    return {
      pedidoId:
        order.id,

      cliente:
        null,

      subtotal:
        promotions.subtotal,

      descuentoPromocional:
        promotions
          .descuentoTotal,

      baseDespuesPromociones:
        promotions
          .totalFinal,

      descuentoPremios:
        "0.00",

      totalDespuesPremios:
        promotions.totalFinal,

      premios:
        [],
    };
  }

  const promotions =
    input.promotionCalculation ??
    await calculateAutomaticPromotions(
      transaction,
      {
        pedidoId:
          order.id,
      },
    );

  const details:
    OrderDetail[] =
    order.detalles.map(
      (detail) => ({
        productoId:
          detail
            .productoSucursal
            .productoId,

        cantidad:
          detail.cantidad,

        precioUnitario:
          detail
            .precioUnitario,

        subtotal:
          detail.subtotal,
      }),
    );

  const availableRewards =
    await getAvailableRewards(
      transaction,
      order.clienteId,
      order.sucursalId,
    );

  const rewardById =
    new Map(
      availableRewards.map(
        (reward) => [
          reward.id,
          reward,
        ],
      ),
    );

  for (
    const rewardId
    of input.premioIds
  ) {
    if (
      !rewardById.has(
        rewardId,
      )
    ) {
      throw new AppError(
        409,
        "Uno de los premios seleccionados ya no está disponible o no pertenece al cliente.",
        "PREMIO_NO_DISPONIBLE",
      );
    }
  }

  let availableBase =
    new Prisma.Decimal(
      promotions.totalFinal,
    );

  let totalRewardDiscount =
    new Prisma.Decimal(
      0,
    );

  const redeemedRewards:
    LoyaltyRedemptionCalculation["premios"] =
    [];

  /*
   * El orden de canje es estable:
   * los premios que vencen primero se procesan primero.
   */
  for (
    const reward
    of availableRewards
  ) {
    if (
      !input.premioIds.includes(
        reward.id,
      )
    ) {
      continue;
    }

    const calculation =
      calculateReward(
        reward,
        details,
        availableBase,
      );

    if (
      !calculation
        .applicable
    ) {
      throw new AppError(
        409,
        calculation.reason ??
        "El premio no puede aplicarse a este pedido.",
        "PREMIO_NO_APLICABLE",
      );
    }

    const discount =
      minimumDecimal(
        calculation.discount,
        availableBase,
      );

    availableBase =
      roundMoney(
        availableBase.minus(
          discount,
        ),
      );

    totalRewardDiscount =
      totalRewardDiscount.plus(
        discount,
      );

    redeemedRewards.push({
      premioId:
        reward.id,

      programaId:
        reward.programa.id,

      programaNombre:
        reward.programa
          .nombre,

      tipoRecompensa:
        calculation.type,

      descripcion:
        reward.descripcion,

      montoAplicado:
        discount.toFixed(
          2,
        ),

      fechaVencimiento:
        reward
          .fechaVencimiento
          .toISOString(),

      productoPremio:
        reward.productoPremio,
    });
  }

  return {
    pedidoId:
      order.id,

    cliente: {
      id:
        order.cliente.id,

      nombreCompleto:
        fullName(
          order.cliente,
        ),
    },

    subtotal:
      promotions.subtotal,

    descuentoPromocional:
      promotions
        .descuentoTotal,

    baseDespuesPromociones:
      promotions.totalFinal,

    descuentoPremios:
      roundMoney(
        totalRewardDiscount,
      ).toFixed(
        2,
      ),

    totalDespuesPremios:
      availableBase.toFixed(
        2,
      ),

    premios:
      redeemedRewards,
  };
}

export async function previewLoyaltyRedemption(
  auth:
    RedemptionAuth,
  input: {
    pedidoId: string;
    premioIds: string[];
  },
) {
  return prisma.$transaction(
    async (
      transaction,
    ) => {
      const order =
        await getOrder(
          transaction,
          input.pedidoId,
        );

      await assertBranchAccess(
        transaction,
        auth,
        order.sucursalId,
      );

      return calculateLoyaltyRedemption(
        transaction,
        input,
      );
    },
  );
}

export async function persistRedeemedRewards(
  transaction:
    Prisma.TransactionClient,
  input: {
    saleId: string;
    userId: string;

    calculation:
    LoyaltyRedemptionCalculation;
  },
) {
  if (
    input.calculation
      .premios.length === 0
  ) {
    return;
  }

  const customerId =
    input.calculation
      .cliente?.id;

  if (!customerId) {
    throw new AppError(
      409,
      "No existe un cliente asociado al canje.",
      "CLIENTE_CANJE_NO_ENCONTRADO",
    );
  }

  const now =
    new Date();

  for (
    const reward
    of input.calculation
      .premios
  ) {
    const claimed =
      await transaction
        .premioCliente
        .updateMany({
          where: {
            id:
              reward.premioId,

            clienteId:
              customerId,

            estado:
              "DISPONIBLE",

            ventaCanjeId:
              null,

            fechaVencimiento: {
              gte:
                now,
            },
          },

          data: {
            estado:
              "CANJEADO",

            ventaCanjeId:
              input.saleId,

            canjeadoPorId:
              input.userId,

            fechaCanje:
              now,

            montoAplicado:
              new Prisma.Decimal(
                reward.montoAplicado,
              ),
          },
        });

    if (
      claimed.count !==
      1
    ) {
      throw new AppError(
        409,
        `El premio "${reward.descripcion}" dejó de estar disponible.`,
        "PREMIO_NO_DISPONIBLE",
      );
    }

    /*
     * Historial inmutable del canje realizado.
     */
    await transaction
      .canjePremioCliente
      .create({
        data: {
          premioId:
            reward.premioId,

          ventaId:
            input.saleId,

          clienteId:
            customerId,

          canjeadoPorId:
            input.userId,

          tipoRecompensa:
            reward
              .tipoRecompensa,

          descripcion:
            reward.descripcion,

          montoAplicado:
            new Prisma.Decimal(
              reward.montoAplicado,
            ),

          productoPremioNombre:
            reward
              .productoPremio
              ?.nombre ??
            null,

          estado:
            "APLICADO",

          fechaCanje:
            now,
        },
      });
  }
}

export async function revertRedeemedRewardsForSale(
  transaction:
    Prisma.TransactionClient,
  input: {
    saleId: string;
    userId: string;
    reason: string;
  },
) {
  const redemptions =
    await transaction
      .canjePremioCliente
      .findMany({
        where: {
          ventaId:
            input.saleId,

          estado:
            "APLICADO",
        },

        select: {
          id: true,
          premioId: true,
        },
      });

  const now =
    new Date();

  for (
    const redemption
    of redemptions
  ) {
    const reward =
      await transaction
        .premioCliente
        .findUnique({
          where: {
            id:
              redemption
                .premioId,
          },

          select: {
            id: true,

            estado:
              true,

            ventaCanjeId:
              true,

            fechaVencimiento:
              true,
          },
        });

    if (!reward) {
      throw new AppError(
        409,
        "No se encontró el premio relacionado con el canje.",
        "PREMIO_CANJE_NO_ENCONTRADO",
      );
    }

    const nextState =
      reward.fechaVencimiento >=
        now
        ? "DISPONIBLE"
        : "VENCIDO";

    const restored =
      await transaction
        .premioCliente
        .updateMany({
          where: {
            id:
              reward.id,

            estado:
              "CANJEADO",

            ventaCanjeId:
              input.saleId,
          },

          data: {
            estado:
              nextState,

            ventaCanjeId:
              null,

            canjeadoPorId:
              null,

            fechaCanje:
              null,

            montoAplicado:
              null,
          },
        });

    if (
      restored.count !==
      1
    ) {
      throw new AppError(
        409,
        "El premio canjeado fue modificado y no puede restaurarse automáticamente.",
        "PREMIO_CANJE_INCONSISTENTE",
      );
    }

    /*
     * El premio vuelve a estar disponible,
     * pero el historial del canje permanece.
     */
    await transaction
      .canjePremioCliente
      .update({
        where: {
          id:
            redemption.id,
        },

        data: {
          estado:
            "REVERTIDO",

          revertidoAt:
            now,

          revertidoPorId:
            input.userId,

          motivoReversion:
            input.reason,
        },
      });
  }

  return {
    premiosRestaurados:
      redemptions.length,
  };
}