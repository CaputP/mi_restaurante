import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";

type PromotionCalculationAuth = {
  usuarioId: string;
  rol: string;
};

type PromotionDetail = {
  productoId: string;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  subtotal: Prisma.Decimal;
};

type PromotionCandidate = {
  promocionId: string;
  nombre: string;

  tipo:
    | "DESCUENTO_FIJO"
    | "DESCUENTO_PORCENTAJE"
    | "PRODUCTO_GRATIS"
    | "COMBO";

  acumulable: boolean;

  descripcion: string;

  montoDescuento:
    Prisma.Decimal;
};

export type CalculatedPromotion = {
  promocionId: string;
  nombre: string;

  tipo:
    | "DESCUENTO_FIJO"
    | "DESCUENTO_PORCENTAJE"
    | "PRODUCTO_GRATIS"
    | "COMBO";

  acumulable: boolean;
  descripcion: string;
  montoDescuento: string;
};

export type PromotionCalculationResult = {
  pedidoId: string;
  sucursalId: string;

  subtotal: string;
  descuentoTotal: string;
  totalFinal: string;

  promociones:
    CalculatedPromotion[];
};

function roundMoney(
  value: Prisma.Decimal,
): Prisma.Decimal {
  return value.toDecimalPlaces(
    2,
  );
}

function minimumDecimal(
  first: Prisma.Decimal,
  second: Prisma.Decimal,
): Prisma.Decimal {
  return first.lessThan(
    second,
  )
    ? first
    : second;
}

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

async function assertBranchAccess(
  transaction:
    Prisma.TransactionClient,
  auth:
    PromotionCalculationAuth,
  branchId:
    string,
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
      "No tienes acceso a la sucursal del pedido.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

function calculateApplicableBase(
  subtotal:
    Prisma.Decimal,
  details:
    PromotionDetail[],
  productIds:
    string[],
): Prisma.Decimal {
  if (
    productIds.length ===
    0
  ) {
    return subtotal;
  }

  const allowedProducts =
    new Set(
      productIds,
    );

  return details.reduce(
    (
      total,
      detail,
    ) => {
      if (
        !allowedProducts.has(
          detail.productoId,
        )
      ) {
        return total;
      }

      return total.plus(
        detail.subtotal,
      );
    },
    new Prisma.Decimal(
      0,
    ),
  );
}

function calculateFixedDiscount(
  promotion: {
    valor:
      Prisma.Decimal;

    nombre:
      string;
  },
  applicableBase:
    Prisma.Decimal,
): {
  discount:
    Prisma.Decimal;

  description:
    string;
} {
  const discount =
    minimumDecimal(
      promotion.valor,
      applicableBase,
    );

  return {
    discount:
      roundMoney(
        discount,
      ),

    description:
      `${promotion.nombre}: descuento fijo de S/ ${discount.toFixed(2)}`,
  };
}

function calculatePercentageDiscount(
  promotion: {
    valor:
      Prisma.Decimal;

    nombre:
      string;
  },
  applicableBase:
    Prisma.Decimal,
): {
  discount:
    Prisma.Decimal;

  description:
    string;
} {
  const percentage =
    promotion.valor.dividedBy(
      100,
    );

  const calculatedDiscount =
    applicableBase.times(
      percentage,
    );

  const discount =
    minimumDecimal(
      calculatedDiscount,
      applicableBase,
    );

  return {
    discount:
      roundMoney(
        discount,
      ),

    description:
      `${promotion.nombre}: ${promotion.valor.toString()} % de descuento`,
  };
}

function calculateFreeProductDiscount(
  promotion: {
    valor:
      Prisma.Decimal;

    nombre:
      string;
  },
  details:
    PromotionDetail[],
  productIds:
    string[],
): {
  discount:
    Prisma.Decimal;

  description:
    string;
} {
  const allowedProducts =
    new Set(
      productIds,
    );

  const eligibleDetails =
    details
      .filter(
        (detail) =>
          allowedProducts.has(
            detail.productoId,
          ),
      )
      .sort(
        (
          first,
          second,
        ) =>
          first.precioUnitario
            .comparedTo(
              second
                .precioUnitario,
            ),
      );

  let remainingUnits =
    Math.max(
      0,
      promotion.valor
        .floor()
        .toNumber(),
    );

  let discount =
    new Prisma.Decimal(
      0,
    );

  for (
    const detail
    of eligibleDetails
  ) {
    if (
      remainingUnits <= 0
    ) {
      break;
    }

    const availableUnits =
      Math.max(
        0,
        detail.cantidad
          .floor()
          .toNumber(),
      );

    const unitsToDiscount =
      Math.min(
        availableUnits,
        remainingUnits,
      );

    if (
      unitsToDiscount <= 0
    ) {
      continue;
    }

    discount =
      discount.plus(
        detail.precioUnitario
          .times(
            unitsToDiscount,
          ),
      );

    remainingUnits -=
      unitsToDiscount;
  }

  return {
    discount:
      roundMoney(
        discount,
      ),

    description:
      `${promotion.nombre}: ${promotion.valor.floor().toString()} producto(s) gratis`,
  };
}

function calculateComboDiscount(
  promotion: {
    valor:
      Prisma.Decimal;

    nombre:
      string;
  },
  details:
    PromotionDetail[],
  productIds:
    string[],
): {
  discount:
    Prisma.Decimal;

  description:
    string;
} {
  if (
    productIds.length ===
    0
  ) {
    return {
      discount:
        new Prisma.Decimal(
          0,
        ),

      description:
        `${promotion.nombre}: combo sin productos configurados`,
    };
  }

  let regularComboPrice =
    new Prisma.Decimal(
      0,
    );

  for (
    const productId
    of productIds
  ) {
    const productDetails =
      details
        .filter(
          (detail) =>
            detail.productoId ===
              productId &&
            detail.cantidad
              .greaterThanOrEqualTo(
                1,
              ),
        )
        .sort(
          (
            first,
            second,
          ) =>
            first.precioUnitario
              .comparedTo(
                second
                  .precioUnitario,
              ),
        );

    const cheapestDetail =
      productDetails[0];

    if (!cheapestDetail) {
      return {
        discount:
          new Prisma.Decimal(
            0,
          ),

        description:
          `${promotion.nombre}: el pedido no contiene el combo completo`,
      };
    }

    regularComboPrice =
      regularComboPrice.plus(
        cheapestDetail
          .precioUnitario,
      );
  }

  if (
    promotion.valor
      .greaterThanOrEqualTo(
        regularComboPrice,
      )
  ) {
    return {
      discount:
        new Prisma.Decimal(
          0,
        ),

      description:
        `${promotion.nombre}: el precio promocional no genera descuento`,
    };
  }

  const discount =
    regularComboPrice.minus(
      promotion.valor,
    );

  return {
    discount:
      roundMoney(
        discount,
      ),

    description:
      `${promotion.nombre}: combo a S/ ${promotion.valor.toFixed(2)}`,
  };
}

function sumDiscounts(
  candidates:
    PromotionCandidate[],
): Prisma.Decimal {
  return candidates.reduce(
    (
      total,
      candidate,
    ) =>
      total.plus(
        candidate
          .montoDescuento,
      ),
    new Prisma.Decimal(
      0,
    ),
  );
}

function selectBestPromotions(
  candidates:
    PromotionCandidate[],
  subtotal:
    Prisma.Decimal,
): PromotionCandidate[] {
  const accumulableCandidates =
    candidates.filter(
      (candidate) =>
        candidate.acumulable,
    );

  const nonAccumulatedCandidates =
    candidates.filter(
      (candidate) =>
        !candidate.acumulable,
    );

  const accumulatedTotal =
    sumDiscounts(
      accumulableCandidates,
    );

  const bestNonAccumulated =
    nonAccumulatedCandidates
      .sort(
        (
          first,
          second,
        ) =>
          second.montoDescuento
            .comparedTo(
              first
                .montoDescuento,
            ),
      )[0];

  const useAccumulated =
    !bestNonAccumulated ||
    accumulatedTotal
      .greaterThanOrEqualTo(
        bestNonAccumulated
          .montoDescuento,
      );

  const selected =
    useAccumulated
      ? accumulableCandidates
      : [
          bestNonAccumulated,
        ];

  /*
   * Se ajusta el último descuento para impedir
   * que el total promocional supere el subtotal.
   */
  let remainingSubtotal =
    subtotal;

  const adjusted:
    PromotionCandidate[] = [];

  for (
    const candidate
    of selected
  ) {
    if (
      remainingSubtotal
        .lessThanOrEqualTo(
          0,
        )
    ) {
      break;
    }

    const adjustedDiscount =
      minimumDecimal(
        candidate
          .montoDescuento,
        remainingSubtotal,
      );

    if (
      adjustedDiscount
        .lessThanOrEqualTo(
          0,
        )
    ) {
      continue;
    }

    adjusted.push({
      ...candidate,

      montoDescuento:
        roundMoney(
          adjustedDiscount,
        ),
    });

    remainingSubtotal =
      remainingSubtotal.minus(
        adjustedDiscount,
      );
  }

  return adjusted;
}

export async function calculateAutomaticPromotions(
  transaction:
    Prisma.TransactionClient,
  input: {
    pedidoId: string;
  },
): Promise<PromotionCalculationResult> {
  const order =
    await transaction.pedido
      .findUnique({
        where: {
          id:
            input.pedidoId,
        },

        select: {
          id:
            true,

          sucursalId:
            true,

          estado:
            true,

          venta: {
            select: {
              id:
                true,

              estado:
                true,
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
      "Solo se pueden calcular promociones para pedidos entregados.",
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

  const details:
    PromotionDetail[] =
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

  const subtotal =
    roundMoney(
      details.reduce(
        (
          total,
          detail,
        ) =>
          total.plus(
            detail.subtotal,
          ),
        new Prisma.Decimal(
          0,
        ),
      ),
    );

  if (
    subtotal
      .lessThanOrEqualTo(
        0,
      )
  ) {
    return {
      pedidoId:
        order.id,

      sucursalId:
        order.sucursalId,

      subtotal:
        "0.00",

      descuentoTotal:
        "0.00",

      totalFinal:
        "0.00",

      promociones:
        [],
    };
  }

  const now =
    new Date();

  const promotions =
    await transaction
      .promocion
      .findMany({
        where: {
          estado:
            "ACTIVA",

          automatica:
            true,

          fechaInicio: {
            lte:
              now,
          },

          fechaFin: {
            gte:
              now,
          },

          OR: [
            {
              sucursalId:
                null,
            },
            {
              sucursalId:
                order.sucursalId,
            },
          ],
        },

        select: {
          id:
            true,

          nombre:
            true,

          tipo:
            true,

          valor:
            true,

          consumoMinimo:
            true,

          acumulable:
            true,

          maximoUsos:
            true,

          usosActuales:
            true,

          productos: {
            select: {
              productoId:
                true,
            },
          },
        },

        orderBy: [
          {
            acumulable:
              "desc",
          },
          {
            createdAt:
              "asc",
          },
        ],
      });

  const candidates:
    PromotionCandidate[] =
    [];

  for (
    const promotion
    of promotions
  ) {
    if (
      promotion.maximoUsos !==
        null &&
      promotion.usosActuales >=
        promotion.maximoUsos
    ) {
      continue;
    }

    if (
      subtotal.lessThan(
        promotion
          .consumoMinimo,
      )
    ) {
      continue;
    }

    const productIds =
      promotion.productos
        .map(
          (relation) =>
            relation.productoId,
        );

    const applicableBase =
      calculateApplicableBase(
        subtotal,
        details,
        productIds,
      );

    if (
      applicableBase
        .lessThanOrEqualTo(
          0,
        )
    ) {
      continue;
    }

    let calculation: {
      discount:
        Prisma.Decimal;

      description:
        string;
    };

    switch (
      promotion.tipo
    ) {
      case "DESCUENTO_FIJO":
        calculation =
          calculateFixedDiscount(
            promotion,
            applicableBase,
          );
        break;

      case "DESCUENTO_PORCENTAJE":
        calculation =
          calculatePercentageDiscount(
            promotion,
            applicableBase,
          );
        break;

      case "PRODUCTO_GRATIS":
        calculation =
          calculateFreeProductDiscount(
            promotion,
            details,
            productIds,
          );
        break;

      case "COMBO":
        calculation =
          calculateComboDiscount(
            promotion,
            details,
            productIds,
          );
        break;
    }

    if (
      calculation.discount
        .lessThanOrEqualTo(
          0,
        )
    ) {
      continue;
    }

    candidates.push({
      promocionId:
        promotion.id,

      nombre:
        promotion.nombre,

      tipo:
        promotion.tipo,

      acumulable:
        promotion.acumulable,

      descripcion:
        calculation.description,

      montoDescuento:
        calculation.discount,
    });
  }

  const selectedPromotions =
    selectBestPromotions(
      candidates,
      subtotal,
    );

  const totalDiscount =
    roundMoney(
      sumDiscounts(
        selectedPromotions,
      ),
    );

  const finalTotal =
    roundMoney(
      subtotal.minus(
        totalDiscount,
      ),
    );

  return {
    pedidoId:
      order.id,

    sucursalId:
      order.sucursalId,

    subtotal:
      subtotal.toFixed(
        2,
      ),

    descuentoTotal:
      totalDiscount.toFixed(
        2,
      ),

    totalFinal:
      finalTotal.toFixed(
        2,
      ),

    promociones:
      selectedPromotions.map(
        (promotion) => ({
          promocionId:
            promotion
              .promocionId,

          nombre:
            promotion.nombre,

          tipo:
            promotion.tipo,

          acumulable:
            promotion.acumulable,

          descripcion:
            promotion
              .descripcion,

          montoDescuento:
            promotion
              .montoDescuento
              .toFixed(
                2,
              ),
        }),
      ),
  };
}

export async function previewAutomaticPromotions(
  auth:
    PromotionCalculationAuth,
  pedidoId:
    string,
): Promise<PromotionCalculationResult> {
  return prisma.$transaction(
    async (
      transaction,
    ) => {
      const order =
        await transaction
          .pedido
          .findUnique({
            where: {
              id:
                pedidoId,
            },

            select: {
              id:
                true,

              sucursalId:
                true,
            },
          });

      if (!order) {
        throw new AppError(
          404,
          "El pedido no existe.",
          "PEDIDO_NO_ENCONTRADO",
        );
      }

      await assertBranchAccess(
        transaction,
        auth,
        order.sucursalId,
      );

      return calculateAutomaticPromotions(
        transaction,
        {
          pedidoId:
            order.id,
        },
      );
    },
  );
}