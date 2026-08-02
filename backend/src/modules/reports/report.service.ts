import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  ReportOptionsQuery,
  ReportSummaryQuery,
} from "./report.schema.js";

type ReportAuth = {
  usuarioId: string;
  rol: string;
};

const PAYMENT_METHODS = [
  "EFECTIVO",
  "YAPE",
  "PLIN",
  "TARJETA",
  "TRANSFERENCIA",
] as const;

function getLimaDateText(
  date = new Date(),
): string {
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
      date,
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

  return `${year}-${month}-${day}`;
}

function getOperationalDate(): Date {
  return new Date(
    `${getLimaDateText()}T00:00:00.000Z`,
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

function addDaysToDateText(
  dateText: string,
  days: number,
): string {
  const [
    year,
    month,
    day,
  ] = dateText
    .split("-")
    .map(Number);

  const date =
    new Date(
      Date.UTC(
        year ?? 0,
        (month ?? 1) - 1,
        (day ?? 1) + days,
      ),
    );

  return date
    .toISOString()
    .slice(0, 10);
}

function roundMoney(
  value: number,
): number {
  return Number(
    value.toFixed(2),
  );
}

function getDefaultRange() {
  const today =
    getLimaDateText();

  return {
    fechaDesde:
      `${today.slice(0, 8)}01`,

    fechaHasta:
      today,
  };
}

function createDateSeries(
  dateFrom: string,
  dateTo: string,
) {
  const dates: string[] = [];

  let currentDate =
    dateFrom;

  while (
    currentDate <= dateTo
  ) {
    dates.push(
      currentDate,
    );

    currentDate =
      addDaysToDateText(
        currentDate,
        1,
      );
  }

  return dates;
}

async function getAuthorizedBranches(
  auth: ReportAuth,
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
      "No tienes autorización para consultar esa sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

export async function getReportOptions(
  auth: ReportAuth,
  query: ReportOptionsQuery,
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

  const defaultRange =
    getDefaultRange();

  return {
    sucursales:
      branches,

    sucursalSeleccionadaId:
      query.sucursalId ??
      (
        branches.length === 1
          ? branches[0]?.id
          : null
      ),

    ...defaultRange,
  };
}

export async function getReportSummary(
  auth: ReportAuth,
  query: ReportSummaryQuery,
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

  const defaultRange =
    getDefaultRange();

  const fechaDesde =
    query.fechaDesde ??
    defaultRange.fechaDesde;

  const fechaHasta =
    query.fechaHasta ??
    defaultRange.fechaHasta;

  const startDate =
    createLimaDateStart(
      fechaDesde,
    );

  const endDate =
    createNextLimaDate(
      fechaHasta,
    );

  const branchIds =
    query.sucursalId
      ? [query.sucursalId]
      : branches.map(
          (branch) =>
            branch.id,
        );

  const saleWhere = {
    sucursalId: {
      in: branchIds,
    },

    estado:
      "CONFIRMADA" as const,

    createdAt: {
      gte: startDate,
      lt: endDate,
    },
  };

  const expenseWhere = {
    sucursalId: {
      in: branchIds,
    },

    estado:
      "REGISTRADO" as const,

    fechaGasto: {
      gte: startDate,
      lt: endDate,
    },
  };

  const [
    saleAggregate,
    expenseAggregate,
    paymentGroups,
    productGroups,
    orderGroups,
    reservationGroups,
    closedCashAggregate,
    openCashCount,
    dailySales,
    dailyExpenses,
  ] = await Promise.all([
    prisma.venta.aggregate({
      where:
        saleWhere,

      _count: {
        _all: true,
      },

      _sum: {
        subtotal: true,
        descuento: true,
        propina: true,
        total: true,
        adelantoAplicado:
          true,
        saldoCobrar: true,
      },
    }),

    prisma.gasto.aggregate({
      where:
        expenseWhere,

      _count: {
        _all: true,
      },

      _sum: {
        monto: true,
      },
    }),

    prisma.pagoVenta.groupBy({
      by: [
        "metodoPago",
      ],

      where: {
        estado:
          "CONFIRMADO",

        venta:
          saleWhere,
      },

      _sum: {
        monto: true,
      },
    }),

    prisma.detalleVenta.groupBy({
      by: [
        "productoSucursalId",
        "nombreProducto",
      ],

      where: {
        venta:
          saleWhere,
      },

      _sum: {
        cantidad: true,
        subtotal: true,
      },

      _count: {
        _all: true,
      },

      orderBy: {
        _sum: {
          subtotal:
            "desc",
        },
      },

      take: 10,
    }),

    prisma.pedido.groupBy({
      by: [
        "estado",
      ],

      where: {
        sucursalId: {
          in: branchIds,
        },

        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },

      _count: {
        _all: true,
      },
    }),

    prisma.reserva.groupBy({
      by: [
        "estado",
      ],

      where: {
        sucursalId: {
          in: branchIds,
        },

        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },

      _count: {
        _all: true,
      },
    }),

    prisma.caja.aggregate({
      where: {
        sucursalId: {
          in: branchIds,
        },

        estado:
          "CERRADA",

        fechaCierre: {
          gte: startDate,
          lt: endDate,
        },
      },

      _count: {
        _all: true,
      },

      _sum: {
        diferencia: true,
      },
    }),

    prisma.caja.count({
      where: {
        sucursalId: {
          in: branchIds,
        },

        estado:
          "ABIERTA",
      },
    }),

    prisma.venta.findMany({
      where:
        saleWhere,

      select: {
        createdAt: true,
        total: true,
      },

      orderBy: {
        createdAt:
          "asc",
      },
    }),

    prisma.gasto.findMany({
      where:
        expenseWhere,

      select: {
        fechaGasto: true,
        monto: true,
      },

      orderBy: {
        fechaGasto:
          "asc",
      },
    }),
  ]);

  const salesCount =
    saleAggregate._count._all;

  const totalSold =
    Number(
      saleAggregate._sum
        .total ??
      0,
    );

  const totalExpenses =
    Number(
      expenseAggregate._sum
        .monto ??
      0,
    );

  const paymentMap =
    new Map(
      paymentGroups.map(
        (payment) => [
          payment.metodoPago,
          Number(
            payment._sum
              .monto ??
            0,
          ),
        ],
      ),
    );

  const salesByDate =
    new Map<
      string,
      number
    >();

  for (
    const sale
    of dailySales
  ) {
    const date =
      getLimaDateText(
        sale.createdAt,
      );

    salesByDate.set(
      date,
      (
        salesByDate.get(
          date,
        ) ??
        0
      ) +
        Number(
          sale.total,
        ),
    );
  }

  const expensesByDate =
    new Map<
      string,
      number
    >();

  for (
    const expense
    of dailyExpenses
  ) {
    const date =
      getLimaDateText(
        expense
          .fechaGasto,
      );

    expensesByDate.set(
      date,
      (
        expensesByDate.get(
          date,
        ) ??
        0
      ) +
        Number(
          expense.monto,
        ),
    );
  }

  const series =
    createDateSeries(
      fechaDesde,
      fechaHasta,
    ).map(
      (date) => ({
        fecha:
          date,

        ventas:
          roundMoney(
            salesByDate.get(
              date,
            ) ??
            0,
          ),

        gastos:
          roundMoney(
            expensesByDate.get(
              date,
            ) ??
            0,
          ),

        balance:
          roundMoney(
            (
              salesByDate.get(
                date,
              ) ??
              0
            ) -
            (
              expensesByDate.get(
                date,
              ) ??
              0
            ),
          ),
      }),
    );

  return {
    filtros: {
      sucursalId:
        query.sucursalId ??
        null,

      fechaDesde,
      fechaHasta,
    },

    resumen: {
      ventasConfirmadas:
        salesCount,

      subtotal:
        roundMoney(
          Number(
            saleAggregate._sum
              .subtotal ??
            0,
          ),
        ),

      descuentos:
        roundMoney(
          Number(
            saleAggregate._sum
              .descuento ??
            0,
          ),
        ),

      propinas:
        roundMoney(
          Number(
            saleAggregate._sum
              .propina ??
            0,
          ),
        ),

      totalVendido:
        roundMoney(
          totalSold,
        ),

      adelantosAplicados:
        roundMoney(
          Number(
            saleAggregate._sum
              .adelantoAplicado ??
            0,
          ),
        ),

      cobradoEnCaja:
        roundMoney(
          Number(
            saleAggregate._sum
              .saldoCobrar ??
            0,
          ),
        ),

      gastosRegistrados:
        expenseAggregate
          ._count._all,

      totalGastos:
        roundMoney(
          totalExpenses,
        ),

      balanceOperativo:
        roundMoney(
          totalSold -
          totalExpenses,
        ),

      ticketPromedio:
        salesCount > 0
          ? roundMoney(
              totalSold /
              salesCount,
            )
          : 0,

      cajasAbiertas:
        openCashCount,

      cajasCerradas:
        closedCashAggregate
          ._count._all,

      diferenciaCaja:
        roundMoney(
          Number(
            closedCashAggregate
              ._sum
              .diferencia ??
            0,
          ),
        ),
    },

    metodosPago:
      PAYMENT_METHODS.map(
        (method) => ({
          metodoPago:
            method,

          total:
            roundMoney(
              paymentMap.get(
                method,
              ) ??
              0,
            ),
        }),
      ),

    productosMasVendidos:
      productGroups.map(
        (
          product,
          index,
        ) => ({
          posicion:
            index + 1,

          productoSucursalId:
            product
              .productoSucursalId,

          nombreProducto:
            product
              .nombreProducto,

          cantidad:
            Number(
              product._sum
                .cantidad ??
              0,
            ),

          total:
            roundMoney(
              Number(
                product._sum
                  .subtotal ??
                0,
              ),
            ),

          registros:
            product
              ._count._all,
        }),
      ),

    estadosPedidos:
      orderGroups.map(
        (group) => ({
          estado:
            group.estado,

          cantidad:
            group._count
              ._all,
        }),
      ),

    estadosReservas:
      reservationGroups.map(
        (group) => ({
          estado:
            group.estado,

          cantidad:
            group._count
              ._all,
        }),
      ),

    serieDiaria:
      series,
  };
}