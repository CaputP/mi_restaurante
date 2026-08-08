import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  CreateSaleInput,
  ListSalesQuery,
  SaleOptionsQuery,
} from "./sale.schema.js";

import {
  applySaleLoyalty,
} from "../loyalty/loyalty-processing.service.js";

import {
  calculateAutomaticPromotions,
  persistAutomaticPromotions,
} from "../promotions/promotions-calculation.service.js";

import {
  calculateLoyaltyRedemption,
  persistRedeemedRewards,
} from "../loyalty/loyalty-redemption.service.js";

import {
  evaluateStockNotification,
} from "../notifications/stock-notification.service.js";

type SaleAuth = {
  usuarioId: string;
  rol: string;
};

const EPSILON = 0.01;

function roundMoney(
  value: number,
): number {
  return Number(
    value.toFixed(2),
  );
}

function userFullName(
  user: {
    nombres: string;
    apellidos: string;
  },
): string {
  return `${user.nombres} ${user.apellidos}`.trim();
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

  const year =
    parts.find(
      (part) =>
        part.type === "year",
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month",
    )?.value;

  const day =
    parts.find(
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

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`,
  );
}

function createLimaDateStart(
  dateText: string,
): Date {
  return new Date(
    `${dateText}T00:00:00-05:00`,
  );
}

function createNextLimaDate(
  dateText: string,
): Date {
  const date =
    createLimaDateStart(
      dateText,
    );

  return new Date(
    date.getTime() +
    24 * 60 * 60 * 1000,
  );
}

async function getAuthorizedBranches(
  auth: SaleAuth,
) {
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
      },

      orderBy: {
        nombre: "asc",
      },
    });
  }

  const operationalDate =
    getOperationalDate();

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
        branch.id ===
        branchId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes autorización para administrar esa sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

function createSaleAccessWhere(
  auth: SaleAuth,
): Prisma.VentaWhereInput {
  if (
    auth.rol === "VENDEDOR"
  ) {
    return {
      vendedorId:
        auth.usuarioId,
    };
  }

  return {};
}

export async function getSaleOptions(
  auth: SaleAuth,
  query: SaleOptionsQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  if (query.sucursalId) {
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
    cashRegisters,
    orders,
  ] = selectedBranchId
      ? await Promise.all([
        prisma.caja.findMany({
          where: {
            sucursalId:
              selectedBranchId,

            estado:
              "ABIERTA",

            ...(auth.rol ===
              "VENDEDOR"
              ? {
                vendedorId:
                  auth.usuarioId,
              }
              : {}),
          },

          select: {
            id: true,
            codigo: true,
            montoInicial: true,
            totalVentas: true,
            efectivoEsperado:
              true,
            fechaApertura: true,

            vendedor: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
              },
            },
          },

          orderBy: {
            fechaApertura:
              "desc",
          },
        }),

        prisma.pedido.findMany({
          where: {
            sucursalId:
              selectedBranchId,

            estado:
              "ENTREGADO",

            venta: {
              is: null,
            },
          },

          take: 100,

          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            codigo: true,
            tipoPedido: true,
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

            zona: {
              select: {
                id: true,
                nombre: true,
              },
            },

            vendedor: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
              },
            },

            reserva: {
              select: {
                id: true,
                codigo: true,
                adelantoPagado:
                  true,
                estado: true,
              },
            },

            detalles: {
              select: {
                id: true,
                nombreProducto:
                  true,
                cantidad: true,
                precioUnitario:
                  true,
                subtotal: true,
              },
            },
          },
        }),
      ])
      : [
        [],
        [],
      ];

  return {
    sucursales:
      branches,

    sucursalSeleccionadaId:
      selectedBranchId ??
      null,

    cajas:
      cashRegisters.map(
        (cash) => ({
          id:
            cash.id,

          codigo:
            cash.codigo,

          montoInicial:
            Number(
              cash.montoInicial,
            ),

          totalVentas:
            Number(
              cash.totalVentas,
            ),

          efectivoEsperado:
            Number(
              cash.efectivoEsperado,
            ),

          fechaApertura:
            cash.fechaApertura
              .toISOString(),

          vendedor: {
            id:
              cash.vendedor.id,

            nombreCompleto:
              userFullName(
                cash.vendedor,
              ),
          },
        }),
      ),

    pedidos:
      orders.map(
        (order) => ({
          ...order,

          createdAt:
            order.createdAt
              .toISOString(),

          subtotal:
            roundMoney(
              order.detalles.reduce(
                (
                  total,
                  detail,
                ) =>
                  total +
                  Number(
                    detail.subtotal,
                  ),
                0,
              ),
            ),

          cliente:
            order.cliente
              ? {
                ...order.cliente,

                nombreCompleto:
                  userFullName(
                    order.cliente,
                  ),
              }
              : null,

          vendedor: {
            id:
              order.vendedor.id,

            nombreCompleto:
              userFullName(
                order.vendedor,
              ),
          },

          reserva:
            order.reserva
              ? {
                ...order.reserva,

                adelantoPagado:
                  Number(
                    order
                      .reserva
                      .adelantoPagado,
                  ),
              }
              : null,

          detalles:
            order.detalles.map(
              (detail) => ({
                ...detail,

                cantidad:
                  Number(
                    detail.cantidad,
                  ),

                precioUnitario:
                  Number(
                    detail
                      .precioUnitario,
                  ),

                subtotal:
                  Number(
                    detail.subtotal,
                  ),
              }),
            ),
        }),
      ),

    metodosPago: [
      {
        codigo:
          "EFECTIVO",
        nombre:
          "Efectivo",
      },
      {
        codigo:
          "YAPE",
        nombre:
          "Yape",
      },
      {
        codigo:
          "PLIN",
        nombre:
          "Plin",
      },
      {
        codigo:
          "TARJETA",
        nombre:
          "Tarjeta",
      },
      {
        codigo:
          "TRANSFERENCIA",
        nombre:
          "Transferencia",
      },
    ],
  };
}

function mapSale(
  sale: {
    id: string;
    numeroTicket: string;
    nombreCliente: string | null;
    subtotal: Prisma.Decimal;
    descuento: Prisma.Decimal;
    propina: Prisma.Decimal;
    total: Prisma.Decimal;
    adelantoAplicado: Prisma.Decimal;
    saldoCobrar: Prisma.Decimal;
    estado: string;
    observaciones: string | null;
    createdAt: Date;
    updatedAt: Date;

    pedido: {
      id: string;
      codigo: string;
      tipoPedido: string;
      estado: string;
    };

    sucursal: {
      id: string;
      codigo: string;
      nombre: string;
      direccion: string;
    };

    vendedor: {
      id: string;
      nombres: string;
      apellidos: string;
    };

    cliente: {
      id: string;
      nombres: string;
      apellidos: string;
      correo: string;
      telefono: string | null;
    } | null;

    caja: {
      id: string;
      codigo: string;
      estado: string;
    };

    detalles: Array<{
      id: string;
      nombreProducto: string;
      cantidad: Prisma.Decimal;
      precioUnitario: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      createdAt: Date;
    }>;

    pagos: Array<{
      id: string;
      metodoPago: string;
      monto: Prisma.Decimal;
      numeroOperacion: string | null;
      montoRecibido: Prisma.Decimal | null;
      vuelto: Prisma.Decimal | null;
      estado: string;
      createdAt: Date;
    }>;

    promocionesAplicadas: Array<{
      id: string;
      descripcion: string;
      montoDescuento: Prisma.Decimal;
      createdAt: Date;

      promocion: {
        id: string;
        nombre: string;
        tipo: string;
      };
    }>;

    canjesPremios: Array<{
      id: string;

      descripcion: string;

      tipoRecompensa:
      string;

      montoAplicado:
      Prisma.Decimal;

      productoPremioNombre:
      string | null;

      estado:
      string;

      fechaCanje:
      Date;

      revertidoAt:
      Date | null;

      motivoReversion:
      string | null;

      premio: {
        id: string;

        programa: {
          id: string;
          nombre: string;
        };
      };
    }>;

  },
) {
  return {
    ...sale,

    subtotal:
      Number(
        sale.subtotal,
      ),

    descuento:
      Number(
        sale.descuento,
      ),

    propina:
      Number(
        sale.propina,
      ),

    total:
      Number(
        sale.total,
      ),

    adelantoAplicado:
      Number(
        sale.adelantoAplicado,
      ),

    saldoCobrar:
      Number(
        sale.saldoCobrar,
      ),

    createdAt:
      sale.createdAt
        .toISOString(),

    updatedAt:
      sale.updatedAt
        .toISOString(),

    vendedor: {
      id:
        sale.vendedor.id,

      nombreCompleto:
        userFullName(
          sale.vendedor,
        ),
    },

    cliente:
      sale.cliente
        ? {
          ...sale.cliente,

          nombreCompleto:
            userFullName(
              sale.cliente,
            ),
        }
        : null,

    detalles:
      sale.detalles.map(
        (detail) => ({
          ...detail,

          cantidad:
            Number(
              detail.cantidad,
            ),

          precioUnitario:
            Number(
              detail
                .precioUnitario,
            ),

          subtotal:
            Number(
              detail.subtotal,
            ),

          createdAt:
            detail.createdAt
              .toISOString(),
        }),
      ),

    pagos:
      sale.pagos.map(
        (payment) => ({
          ...payment,

          monto:
            Number(
              payment.monto,
            ),

          montoRecibido:
            payment
              .montoRecibido ===
              null
              ? null
              : Number(
                payment
                  .montoRecibido,
              ),

          vuelto:
            payment.vuelto ===
              null
              ? null
              : Number(
                payment.vuelto,
              ),

          createdAt:
            payment.createdAt
              .toISOString(),
        }),
      ),

    promocionesAplicadas:
      sale.promocionesAplicadas
        .map(
          (
            appliedPromotion,
          ) => ({
            ...appliedPromotion,

            montoDescuento:
              Number(
                appliedPromotion
                  .montoDescuento,
              ),

            createdAt:
              appliedPromotion
                .createdAt
                .toISOString(),
          }),
        ),

    canjesPremios:
      sale.canjesPremios.map(
        (redemption) => ({
          ...redemption,

          montoAplicado:
            Number(
              redemption
                .montoAplicado,
            ),

          fechaCanje:
            redemption
              .fechaCanje
              .toISOString(),

          revertidoAt:
            redemption
              .revertidoAt
              ?.toISOString() ??
            null,
        }),
      ),

  };
}

export async function listSales(
  auth: SaleAuth,
  query: ListSalesQuery,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  if (query.sucursalId) {
    assertAuthorizedBranch(
      branches,
      query.sucursalId,
    );
  }

  const branchIds =
    query.sucursalId
      ? [query.sucursalId]
      : branches.map(
        (branch) =>
          branch.id,
      );

  if (
    branchIds.length === 0
  ) {
    return {
      ventas: [],

      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 1,
      },
    };
  }

  const where:
    Prisma.VentaWhereInput = {
    sucursalId: {
      in: branchIds,
    },

    ...createSaleAccessWhere(
      auth,
    ),

    ...(query.cajaId
      ? {
        cajaId:
          query.cajaId,
      }
      : {}),

    ...(query.estado !==
      "TODOS"
      ? {
        estado:
          query.estado,
      }
      : {}),

    ...(
      query.fechaDesde ||
        query.fechaHasta
        ? {
          createdAt: {
            ...(query.fechaDesde
              ? {
                gte:
                  createLimaDateStart(
                    query
                      .fechaDesde,
                  ),
              }
              : {}),

            ...(query.fechaHasta
              ? {
                lt:
                  createNextLimaDate(
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
            numeroTicket: {
              contains:
                query.search,

              mode:
                "insensitive",
            },
          },
          {
            nombreCliente: {
              contains:
                query.search,

              mode:
                "insensitive",
            },
          },
          {
            pedido: {
              codigo: {
                contains:
                  query.search,

                mode:
                  "insensitive",
              },
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
        ],
      }
      : {}),
  };

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    total,
    sales,
  ] = await prisma.$transaction([
    prisma.venta.count({
      where,
    }),

    prisma.venta.findMany({
      where,

      skip,
      take:
        query.limit,

      orderBy: {
        createdAt:
          "desc",
      },

      select: {
        id: true,
        numeroTicket: true,
        nombreCliente: true,
        subtotal: true,
        descuento: true,
        propina: true,
        total: true,
        adelantoAplicado:
          true,
        saldoCobrar: true,
        estado: true,
        createdAt: true,

        pedido: {
          select: {
            id: true,
            codigo: true,
            tipoPedido: true,
            estado: true,
          },
        },

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },

        vendedor: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        cliente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        caja: {
          select: {
            id: true,
            codigo: true,
            estado: true,
          },
        },

        pagos: {
          where: {
            estado:
              "CONFIRMADO",
          },

          select: {
            metodoPago: true,
            monto: true,
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
    ventas:
      sales.map(
        (sale) => ({
          ...sale,

          subtotal:
            Number(
              sale.subtotal,
            ),

          descuento:
            Number(
              sale.descuento,
            ),

          propina:
            Number(
              sale.propina,
            ),

          total:
            Number(
              sale.total,
            ),

          adelantoAplicado:
            Number(
              sale
                .adelantoAplicado,
            ),

          saldoCobrar:
            Number(
              sale.saldoCobrar,
            ),

          createdAt:
            sale.createdAt
              .toISOString(),

          vendedor: {
            id:
              sale.vendedor.id,

            nombreCompleto:
              userFullName(
                sale.vendedor,
              ),
          },

          cliente:
            sale.cliente
              ? {
                id:
                  sale.cliente.id,

                nombreCompleto:
                  userFullName(
                    sale.cliente,
                  ),
              }
              : null,

          pagos:
            sale.pagos.map(
              (payment) => ({
                metodoPago:
                  payment
                    .metodoPago,

                monto:
                  Number(
                    payment.monto,
                  ),
              }),
            ),

          metodosPago: [
            ...new Set(
              sale.pagos.map(
                (payment) =>
                  payment
                    .metodoPago,
              ),
            ),
          ],

          cantidadProductos:
            sale._count.detalles,

          cantidadPagos:
            sale._count.pagos,
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

export async function getSaleById(
  auth: SaleAuth,
  saleId: string,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  const branchIds =
    branches.map(
      (branch) =>
        branch.id,
    );

  const sale =
    await prisma.venta.findFirst({
      where: {
        id:
          saleId,

        sucursalId: {
          in:
            branchIds,
        },

        ...createSaleAccessWhere(
          auth,
        ),
      },

      select: {
        id: true,
        numeroTicket: true,
        nombreCliente: true,
        subtotal: true,
        descuento: true,
        propina: true,
        total: true,
        adelantoAplicado:
          true,
        saldoCobrar: true,
        estado: true,
        observaciones: true,
        createdAt: true,
        updatedAt: true,

        pedido: {
          select: {
            id: true,
            codigo: true,
            tipoPedido: true,
            estado: true,
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

        vendedor: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        cliente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true,
            telefono: true,
          },
        },

        caja: {
          select: {
            id: true,
            codigo: true,
            estado: true,
          },
        },

        detalles: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            nombreProducto: true,
            cantidad: true,
            precioUnitario:
              true,
            subtotal: true,
            createdAt: true,
          },
        },

        pagos: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            metodoPago: true,
            monto: true,
            numeroOperacion:
              true,
            montoRecibido: true,
            vuelto: true,
            estado: true,
            createdAt: true,
          },
        },

        promocionesAplicadas: {
          orderBy: {
            createdAt:
              "asc",
          },

          select: {
            id:
              true,

            descripcion:
              true,

            montoDescuento:
              true,

            createdAt:
              true,

            promocion: {
              select: {
                id:
                  true,

                nombre:
                  true,

                tipo:
                  true,
              },
            },
          },
        },

        canjesPremios: {
          orderBy: {
            fechaCanje:
              "asc",
          },

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

  if (!sale) {
    throw new AppError(
      404,
      "La venta no existe o no puedes consultarla.",
      "VENTA_NO_ENCONTRADA",
    );
  }

  return mapSale(
    sale,
  );
}

async function ensureUniqueOperations(
  transaction:
    Prisma.TransactionClient,

  input: CreateSaleInput,
) {
  const operationNumbers =
    input.pagos
      .map(
        (payment) =>
          payment
            .numeroOperacion,
      )
      .filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      );

  if (
    operationNumbers.length ===
    0
  ) {
    return;
  }

  const [
    salePayment,
    reservationPayment,
  ] = await Promise.all([
    transaction
      .pagoVenta
      .findFirst({
        where: {
          numeroOperacion: {
            in:
              operationNumbers,
          },

          estado: {
            not:
              "ANULADO",
          },
        },

        select: {
          id: true,
          numeroOperacion:
            true,
        },
      }),

    transaction
      .pagoReserva
      .findFirst({
        where: {
          numeroOperacion: {
            in:
              operationNumbers,
          },

          estado: {
            not:
              "ANULADO",
          },
        },

        select: {
          id: true,
          numeroOperacion:
            true,
        },
      }),
  ]);

  const duplicated =
    salePayment
      ?.numeroOperacion ??
    reservationPayment
      ?.numeroOperacion;

  if (duplicated) {
    throw new AppError(
      409,
      `El número de operación "${duplicated}" ya fue registrado.`,
      "OPERACION_PAGO_DUPLICADA",
    );
  }
}

export async function createSale(
  auth: SaleAuth,
  input: CreateSaleInput,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  const authorizedBranchIds =
    branches.map(
      (branch) =>
        branch.id,
    );

  const createdSale =
    await prisma.$transaction(
      async (transaction) => {
        const cash =
          await transaction
            .caja
            .findFirst({
              where: {
                id:
                  input.cajaId,

                sucursalId: {
                  in:
                    authorizedBranchIds,
                },

                estado:
                  "ABIERTA",

                ...(auth.rol ===
                  "VENDEDOR"
                  ? {
                    vendedorId:
                      auth.usuarioId,
                  }
                  : {}),
              },

              select: {
                id: true,
                codigo: true,
                sucursalId: true,
                vendedorId: true,
                estado: true,
              },
            });

        if (!cash) {
          throw new AppError(
            404,
            "La caja no existe, está cerrada o no puedes utilizarla.",
            "CAJA_VENTA_INVALIDA",
          );
        }

        const order =
          await transaction
            .pedido
            .findFirst({
              where: {
                id:
                  input.pedidoId,

                sucursalId:
                  cash.sucursalId,
              },

              select: {
                id: true,
                codigo: true,
                sucursalId: true,
                clienteId: true,
                estado: true,
                reservaId: true,

                venta: {
                  select: {
                    id: true,
                    numeroTicket:
                      true,
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
                  orderBy: {
                    createdAt:
                      "asc",
                  },

                  select: {
                    id: true,
                    productoSucursalId:
                      true,
                    nombreProducto:
                      true,
                    cantidad: true,
                    precioUnitario:
                      true,
                    subtotal: true,

                    productoSucursal: {
                      select: {
                        id: true,

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

                reserva: {
                  select: {
                    id: true,
                    codigo: true,
                    estado: true,
                    adelantoPagado:
                      true,

                    detalles: {
                      select: {
                        id: true,
                        productoSucursalId:
                          true,
                        cantidadComprometida:
                          true,
                        estado: true,

                        productoSucursal: {
                          select: {
                            id: true,

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
                },
              },
            });

        if (!order) {
          throw new AppError(
            404,
            "El pedido no existe o no pertenece a la sucursal de la caja.",
            "PEDIDO_VENTA_NO_ENCONTRADO",
          );
        }

        if (order.venta) {
          throw new AppError(
            409,
            `El pedido ya fue cobrado en el ticket ${order.venta.numeroTicket}.`,
            "PEDIDO_YA_COBRADO",
          );
        }

        if (
          order.estado !==
          "ENTREGADO"
        ) {
          throw new AppError(
            409,
            "Solo un pedido entregado puede registrarse como venta.",
            "PEDIDO_NO_COBRABLE",
          );
        }

        if (
          order.detalles.length ===
          0
        ) {
          throw new AppError(
            400,
            "El pedido no contiene productos.",
            "PEDIDO_SIN_PRODUCTOS",
          );
        }

        const subtotal =
          roundMoney(
            order.detalles.reduce(
              (
                total,
                detail,
              ) =>
                total +
                Number(
                  detail.subtotal,
                ),
              0,
            ),
          );

        /*
        * El cálculo se ejecuta nuevamente dentro de la
        * misma transacción de venta.
        *
        * No se confía únicamente en la vista previa
        * realizada por el frontend.
        */
        const promotionCalculation =
          await calculateAutomaticPromotions(
            transaction,
            {
              pedidoId:
                order.id,
            },
          );

        const automaticDiscount =
          roundMoney(
            Number(
              promotionCalculation
                .descuentoTotal,
            ),
          );

        const loyaltyRedemption =
          await calculateLoyaltyRedemption(
            transaction,
            {
              pedidoId:
                order.id,

              premioIds:
                input.premioIds,

              promotionCalculation,
            },
          );

        const rewardDiscount =
          roundMoney(
            Number(
              loyaltyRedemption
                .descuentoPremios,
            ),
          );

        const totalDiscount =
          roundMoney(
            input.descuento +
            automaticDiscount +
            rewardDiscount,
          );

        if (
          totalDiscount >
          subtotal + EPSILON
        ) {
          throw new AppError(
            400,
            `El descuento manual de S/ ${input.descuento.toFixed(
              2,
            )} más las promociones de S/ ${automaticDiscount.toFixed(
              2,
            )} supera el subtotal de S/ ${subtotal.toFixed(
              2,
            )}.`,
            "DESCUENTO_TOTAL_INVALIDO",
          );
        }

        const total =
          roundMoney(
            subtotal -
            totalDiscount +
            input.propina,
          );

        const reservationAdvance =
          order.reserva
            ? Number(
              order.reserva
                .adelantoPagado,
            )
            : 0;

        const appliedAdvance =
          roundMoney(
            Math.min(
              total,
              Math.max(
                0,
                reservationAdvance,
              ),
            ),
          );

        const amountToCharge =
          roundMoney(
            Math.max(
              0,
              total -
              appliedAdvance,
            ),
          );

        const paymentTotal =
          roundMoney(
            input.pagos.reduce(
              (
                sum,
                payment,
              ) =>
                sum +
                payment.monto,
              0,
            ),
          );

        if (
          Math.abs(
            paymentTotal -
            amountToCharge,
          ) > EPSILON
        ) {
          throw new AppError(
            400,
            `Los pagos suman S/ ${paymentTotal.toFixed(
              2,
            )}, pero el saldo a cobrar es S/ ${amountToCharge.toFixed(
              2,
            )}.`,
            "PAGOS_NO_COINCIDEN",
          );
        }

        await ensureUniqueOperations(
          transaction,
          input,
        );

        const reservationDetails =
          order.reserva
            ?.detalles ??
          [];

        const reservationByProduct =
          new Map(
            reservationDetails.map(
              (detail) => [
                detail
                  .productoSucursalId,

                detail,
              ],
            ),
          );

        const processedReservationIds =
          new Set<string>();

        const operationalDate =
          getOperationalDate();

        const stockNotificationsToEvaluate =
          new Set<string>();

        for (
          const detail
          of order.detalles
        ) {
          const quantity =
            Number(
              detail.cantidad,
            );

          const reservedDetail =
            reservationByProduct.get(
              detail
                .productoSucursalId,
            );

          const ownCommitment =
            reservedDetail
              ? Number(
                reservedDetail
                  .cantidadComprometida,
              )
              : 0;

          if (reservedDetail) {
            processedReservationIds.add(
              reservedDetail.id,
            );
          }

          const stockType =
            detail
              .productoSucursal
              .producto
              .tipoStock;

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

                  select: {
                    id: true,
                    cantidadActual:
                      true,
                    cantidadComprometida:
                      true,
                  },
                });

            if (!stock) {
              throw new AppError(
                409,
                `El producto "${detail.nombreProducto}" no tiene stock permanente configurado.`,
                "STOCK_NO_CONFIGURADO",
              );
            }

            const currentQuantity =
              Number(
                stock
                  .cantidadActual,
              );

            const committedQuantity =
              Number(
                stock
                  .cantidadComprometida,
              );

            const availableForSale =
              currentQuantity -
              committedQuantity +
              ownCommitment;

            if (
              quantity >
              availableForSale +
              EPSILON
            ) {
              throw new AppError(
                409,
                `No existe stock suficiente de "${detail.nombreProducto}". Disponible: ${Math.max(
                  0,
                  availableForSale,
                )}.`,
                "STOCK_INSUFICIENTE",
              );
            }

            const resultingQuantity =
              currentQuantity -
              quantity;

            const resultingCommitted =
              Math.max(
                0,
                committedQuantity -
                ownCommitment,
              );

            await transaction
              .stockPermanente
              .update({
                where: {
                  id:
                    stock.id,
                },

                data: {
                  cantidadActual:
                    resultingQuantity,

                  cantidadComprometida:
                    resultingCommitted,
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
                    "VENTA",

                  cantidad:
                    quantity,

                  cantidadAnterior:
                    currentQuantity,

                  cantidadResultante:
                    resultingQuantity,

                  motivo:
                    `Venta del pedido ${order.codigo}.`,

                  referenciaTipo:
                    "VENTA",

                  referenciaId:
                    order.id,
                },
              });

            stockNotificationsToEvaluate.add(
              detail.productoSucursalId,
            );
          }

          if (
            stockType ===
            "DIARIO"
          ) {
            const stock =
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
                        operationalDate,
                    },
                  },

                  select: {
                    id: true,
                    cantidadActual:
                      true,
                    cantidadComprometida:
                      true,
                  },
                });

            if (!stock) {
              throw new AppError(
                409,
                `El producto "${detail.nombreProducto}" no tiene apertura de stock para hoy.`,
                "STOCK_DIARIO_NO_ABIERTO",
              );
            }

            const currentQuantity =
              Number(
                stock
                  .cantidadActual,
              );

            const committedQuantity =
              Number(
                stock
                  .cantidadComprometida,
              );

            const availableForSale =
              currentQuantity -
              committedQuantity +
              ownCommitment;

            if (
              quantity >
              availableForSale +
              EPSILON
            ) {
              throw new AppError(
                409,
                `No existe stock diario suficiente de "${detail.nombreProducto}". Disponible: ${Math.max(
                  0,
                  availableForSale,
                )}.`,
                "STOCK_INSUFICIENTE",
              );
            }

            const resultingQuantity =
              currentQuantity -
              quantity;

            const resultingCommitted =
              Math.max(
                0,
                committedQuantity -
                ownCommitment,
              );

            await transaction
              .stockDiario
              .update({
                where: {
                  id:
                    stock.id,
                },

                data: {
                  cantidadActual:
                    resultingQuantity,

                  cantidadComprometida:
                    resultingCommitted,
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
                    "VENTA",

                  cantidad:
                    quantity,

                  cantidadAnterior:
                    currentQuantity,

                  cantidadResultante:
                    resultingQuantity,

                  motivo:
                    `Venta del pedido ${order.codigo}.`,

                  referenciaTipo:
                    "VENTA",

                  referenciaId:
                    order.id,
                },
              });

            stockNotificationsToEvaluate.add(
              detail.productoSucursalId,
            );
          }
        }

        /*
         * Libera productos reservados que finalmente
         * no formaron parte del pedido vendido.
         */
        for (
          const reservedDetail
          of reservationDetails
        ) {
          const commitment =
            Number(
              reservedDetail
                .cantidadComprometida,
            );

          if (
            commitment <= 0 ||
            processedReservationIds.has(
              reservedDetail.id,
            )
          ) {
            continue;
          }

          const stockType =
            reservedDetail
              .productoSucursal
              .producto
              .tipoStock;

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
                      reservedDetail
                        .productoSucursalId,
                  },
                });

            if (stock) {
              const currentQuantity =
                Number(
                  stock
                    .cantidadActual,
                );

              const currentCommitted =
                Number(
                  stock
                    .cantidadComprometida,
                );

              const resultingCommitted =
                Math.max(
                  0,
                  currentCommitted -
                  commitment,
                );

              await transaction
                .stockPermanente
                .update({
                  where: {
                    id:
                      stock.id,
                  },

                  data: {
                    cantidadComprometida:
                      resultingCommitted,
                  },
                });

              await transaction
                .movimientoInventario
                .create({
                  data: {
                    productoSucursalId:
                      reservedDetail
                        .productoSucursalId,

                    usuarioId:
                      auth.usuarioId,

                    tipoMovimiento:
                      "LIBERACION_RESERVA",

                    cantidad:
                      commitment,

                    cantidadAnterior:
                      currentQuantity,

                    cantidadResultante:
                      currentQuantity,

                    motivo:
                      `Liberación de compromiso de la reserva ${order.reserva?.codigo ?? ""} al registrar la venta ${order.codigo}.`,

                    referenciaTipo:
                      "RESERVA",

                    referenciaId:
                      order.reservaId,
                  },
                });

              stockNotificationsToEvaluate.add(
                reservedDetail
                  .productoSucursalId,
              );
            }
          }

          if (
            stockType ===
            "DIARIO"
          ) {
            const stock =
              await transaction
                .stockDiario
                .findUnique({
                  where: {
                    productoSucursalId_fecha:
                    {
                      productoSucursalId:
                        reservedDetail
                          .productoSucursalId,

                      fecha:
                        operationalDate,
                    },
                  },
                });

            if (stock) {
              const currentQuantity =
                Number(
                  stock
                    .cantidadActual,
                );

              const currentCommitted =
                Number(
                  stock
                    .cantidadComprometida,
                );

              const resultingCommitted =
                Math.max(
                  0,
                  currentCommitted -
                  commitment,
                );

              await transaction
                .stockDiario
                .update({
                  where: {
                    id:
                      stock.id,
                  },

                  data: {
                    cantidadComprometida:
                      resultingCommitted,
                  },
                });

              await transaction
                .movimientoInventario
                .create({
                  data: {
                    productoSucursalId:
                      reservedDetail
                        .productoSucursalId,

                    usuarioId:
                      auth.usuarioId,

                    tipoMovimiento:
                      "LIBERACION_RESERVA",

                    cantidad:
                      commitment,

                    cantidadAnterior:
                      currentQuantity,

                    cantidadResultante:
                      currentQuantity,

                    motivo:
                      `Liberación de compromiso de la reserva ${order.reserva?.codigo ?? ""} al registrar la venta ${order.codigo}.`,

                    referenciaTipo:
                      "RESERVA",

                    referenciaId:
                      order.reservaId,
                  },
                });

              stockNotificationsToEvaluate.add(
                reservedDetail
                  .productoSucursalId,
              );
            }
          }
        }

        /*
         * El stock físico y los compromisos de reserva
         * ya tienen su valor definitivo para esta venta.
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

        const correlativo =
          await transaction
            .correlativo
            .upsert({
              where: {
                sucursalId_tipoDocumento:
                {
                  sucursalId:
                    order.sucursalId,

                  tipoDocumento:
                    "TICKET",
                },
              },

              update: {
                ultimoNumero: {
                  increment: 1,
                },
              },

              create: {
                sucursalId:
                  order.sucursalId,

                tipoDocumento:
                  "TICKET",

                prefijo: "T",
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

        const ticketNumber =
          `${correlativo.prefijo}-${correlativo.ultimoNumero
            .toString()
            .padStart(
              correlativo
                .longitudNumero,
              "0",
            )}`;

        const paymentData =
          input.pagos.map(
            (payment) => {
              const received =
                payment.metodoPago ===
                  "EFECTIVO"
                  ? payment
                    .montoRecibido ??
                  payment.monto
                  : null;

              const change =
                received === null
                  ? null
                  : roundMoney(
                    received -
                    payment.monto,
                  );

              return {
                metodoPago:
                  payment.metodoPago,

                monto:
                  payment.monto,

                numeroOperacion:
                  payment
                    .numeroOperacion,

                montoRecibido:
                  received,

                vuelto:
                  change,

                estado:
                  "CONFIRMADO" as const,
              };
            },
          );

        const paymentTotals = {
          EFECTIVO: 0,
          YAPE: 0,
          PLIN: 0,
          TARJETA: 0,
          TRANSFERENCIA: 0,
        };

        for (
          const payment
          of input.pagos
        ) {
          paymentTotals[
            payment.metodoPago
          ] += payment.monto;
        }

        const orderUpdate =
          await transaction
            .pedido
            .updateMany({
              where: {
                id:
                  order.id,

                estado:
                  "ENTREGADO",
              },

              data: {
                estado:
                  "PAGADO",

                pagadoAt:
                  new Date(),
              },
            });

        if (
          orderUpdate.count !== 1
        ) {
          throw new AppError(
            409,
            "El pedido cambió de estado y ya no puede cobrarse.",
            "PEDIDO_YA_PROCESADO",
          );
        }

        const sale =
          await transaction
            .venta
            .create({
              data: {
                numeroTicket:
                  ticketNumber,

                pedidoId:
                  order.id,

                clienteId:
                  order.clienteId,

                sucursalId:
                  order.sucursalId,

                vendedorId:
                  cash.vendedorId,

                cajaId:
                  cash.id,

                nombreCliente:
                  input.nombreCliente ??
                  (
                    order.cliente
                      ? userFullName(
                        order.cliente,
                      )
                      : "Público general"
                  ),

                subtotal,

                descuento:
                  totalDiscount,

                propina:
                  input.propina,

                total,

                adelantoAplicado:
                  appliedAdvance,

                saldoCobrar:
                  amountToCharge,

                estado:
                  "CONFIRMADA",

                observaciones:
                  input.observaciones,

                detalles: {
                  create:
                    order.detalles.map(
                      (detail) => ({
                        productoSucursalId:
                          detail
                            .productoSucursalId,

                        nombreProducto:
                          detail
                            .nombreProducto,

                        cantidad:
                          detail.cantidad,

                        precioUnitario:
                          detail
                            .precioUnitario,

                        subtotal:
                          detail.subtotal,
                      }),
                    ),
                },

                pagos: {
                  create:
                    paymentData,
                },
              },

              select: {
                id: true,
              },
            });

        /*
         * Guarda VentaPromocion e incrementa usosActuales.
         */
        await persistAutomaticPromotions(
          transaction,
          sale.id,
          promotionCalculation,
        );

        await persistRedeemedRewards(
          transaction,
          {
            saleId:
              sale.id,

            userId:
              auth.usuarioId,

            calculation:
              loyaltyRedemption,
          },
        );

        /*
         * Fidelización utiliza el total consumido después
         * de descuentos.
         */
        await applySaleLoyalty(
          transaction,
          sale.id,
        );

        await transaction
          .caja
          .update({
            where: {
              id:
                cash.id,
            },

            data: {
              totalVentas: {
                increment:
                  total,
              },

              totalEfectivo: {
                increment:
                  roundMoney(
                    paymentTotals
                      .EFECTIVO,
                  ),
              },

              totalYape: {
                increment:
                  roundMoney(
                    paymentTotals
                      .YAPE,
                  ),
              },

              totalPlin: {
                increment:
                  roundMoney(
                    paymentTotals
                      .PLIN,
                  ),
              },

              totalTarjeta: {
                increment:
                  roundMoney(
                    paymentTotals
                      .TARJETA,
                  ),
              },

              totalTransferencia:
              {
                increment:
                  roundMoney(
                    paymentTotals
                      .TRANSFERENCIA,
                  ),
              },

              efectivoEsperado: {
                increment:
                  roundMoney(
                    paymentTotals
                      .EFECTIVO,
                  ),
              },
            },
          });

        if (order.reserva) {
          await transaction
            .reserva
            .updateMany({
              where: {
                id:
                  order.reserva.id,

                estado:
                  "CONFIRMADA",
              },

              data: {
                estado:
                  "ATENDIDA",
              },
            });

          for (
            const reservedDetail
            of reservationDetails
          ) {
            await transaction
              .detalleReserva
              .update({
                where: {
                  id:
                    reservedDetail.id,
                },

                data: {
                  cantidadComprometida:
                    0,

                  estado:
                    processedReservationIds.has(
                      reservedDetail.id,
                    )
                      ? "CONSUMIDO"
                      : "LIBERADO",
                },
              });
          }

          await transaction
            .historialReserva
            .create({
              data: {
                reservaId:
                  order.reserva.id,

                usuarioId:
                  auth.usuarioId,

                estadoAnterior:
                  order.reserva
                    .estado,

                estadoNuevo:
                  "ATENDIDA",

                observacion:
                  `Reserva atendida mediante el ticket ${ticketNumber}.`,
              },
            });
        }

        return sale;
      },
      {
        isolationLevel:
          Prisma
            .TransactionIsolationLevel
            .Serializable,
      },
    );

  return getSaleById(
    auth,
    createdSale.id,
  );
}