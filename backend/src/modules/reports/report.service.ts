import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  ReportDetailsQuery,
  ReportOptionsQuery,
  ReportSummaryQuery,
} from "./report.schema.js";

function personName(
  person: {
    nombres: string;
    apellidos: string;
  } | null,
): string {
  return person
    ? `${person.nombres} ${person.apellidos}`.trim()
    : "-";
}

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
    reservationPaymentAggregate,
    paymentGroups,
    reservationPaymentGroups,
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

    prisma.pagoReserva.aggregate({
      where: {
        estado: "CONFIRMADO",
        fechaConfirmacion: {
          gte: startDate,
          lt: endDate,
        },
        reserva: {
          sucursalId: {
            in: branchIds,
          },
        },
      },
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

    prisma.pagoReserva.groupBy({
      by: [
        "metodoPago",
      ],
      where: {
        estado: "CONFIRMADO",
        fechaConfirmacion: {
          gte: startDate,
          lt: endDate,
        },
        reserva: {
          sucursalId: {
            in: branchIds,
          },
        },
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

  const reservationPaymentMap =
    new Map(
      reservationPaymentGroups.map(
        (payment) => [
          payment.metodoPago,
          Number(
            payment._sum.monto ?? 0,
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

      adelantosRecibidos:
        roundMoney(
          Number(
            reservationPaymentAggregate
              ._sum.monto ?? 0,
          ),
        ),

      adelantosRegistrados:
        reservationPaymentAggregate
          ._count._all,

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
        (method) => {
          const salesPayments =
            paymentMap.get(method) ?? 0;
          const reservationPayments =
            reservationPaymentMap.get(method) ?? 0;

          return {
            metodoPago: method,
            ventas:
              roundMoney(salesPayments),
            adelantos:
              roundMoney(reservationPayments),
            total:
              roundMoney(
                salesPayments +
                reservationPayments,
              ),
          };
        },
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

export async function getReportDetails(
  auth: ReportAuth,
  query: ReportDetailsQuery,
) {
  const branches = await getAuthorizedBranches(auth);
  if (query.sucursalId) {
    assertAuthorizedBranch(branches, query.sucursalId);
  }

  const defaultRange = getDefaultRange();
  const fechaDesde = query.fechaDesde ?? defaultRange.fechaDesde;
  const fechaHasta = query.fechaHasta ?? defaultRange.fechaHasta;
  const startDate = createLimaDateStart(fechaDesde);
  const endDate = createNextLimaDate(fechaHasta);
  const branchIds = query.sucursalId
    ? [query.sucursalId]
    : branches.map((branch) => branch.id);
  const skip = (query.page - 1) * query.limit;

  const pagination = (total: number) => ({
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  });

  const saleWhere = {
    sucursalId: { in: branchIds },
    estado: "CONFIRMADA" as const,
    createdAt: { gte: startDate, lt: endDate },
    ...(query.filtro === "CON_ADELANTO"
      ? { adelantoAplicado: { gt: 0 } }
      : {}),
    ...(query.filtro === "CON_DESCUENTO"
      ? { descuento: { gt: 0 } }
      : {}),
    ...(query.filtro === "CON_PROPINA"
      ? { propina: { gt: 0 } }
      : {}),
    ...(query.filtro === "SALDO_CAJA"
      ? { saldoCobrar: { gt: 0 } }
      : {}),
  };

  if (query.tipo === "VENTAS") {
    const [total, sales] = await Promise.all([
      prisma.venta.count({ where: saleWhere }),
      prisma.venta.findMany({
        where: saleWhere,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          numeroTicket: true,
          nombreCliente: true,
          subtotal: true,
          descuento: true,
          propina: true,
          total: true,
          adelantoAplicado: true,
          saldoCobrar: true,
          createdAt: true,
          sucursal: { select: { nombre: true } },
          vendedor: { select: { nombres: true, apellidos: true } },
          pedido: { select: { codigo: true } },
          detalles: {
            select: {
              id: true,
              nombreProducto: true,
              cantidad: true,
              precioUnitario: true,
              subtotal: true,
            },
          },
          pagos: {
            where: { estado: "CONFIRMADO" },
            select: {
              id: true,
              metodoPago: true,
              monto: true,
              numeroOperacion: true,
            },
          },
        },
      }),
    ]);

    return {
      tipo: query.tipo,
      registros: sales.map((sale) => ({
        id: sale.id,
        codigo: sale.numeroTicket,
        fecha: sale.createdAt.toISOString(),
        estado: "CONFIRMADA",
        descripcion: `Pedido ${sale.pedido.codigo}`,
        importe: Number(
          query.filtro === "SUBTOTAL"
            ? sale.subtotal
            : query.filtro === "CON_DESCUENTO"
              ? sale.descuento
              : query.filtro === "CON_PROPINA"
                ? sale.propina
                : query.filtro === "CON_ADELANTO"
                  ? sale.adelantoAplicado
                  : query.filtro === "SALDO_CAJA"
                    ? sale.saldoCobrar
                    : sale.total,
        ),
        cliente: sale.nombreCliente ?? "Público general",
        responsable: personName(sale.vendedor),
        sucursal: sale.sucursal.nombre,
        datos: {
          subtotal: Number(sale.subtotal),
          descuento: Number(sale.descuento),
          propina: Number(sale.propina),
          adelantoAplicado: Number(sale.adelantoAplicado),
          saldoCobrar: Number(sale.saldoCobrar),
        },
        productos: sale.detalles.map((detail) => ({
          id: detail.id,
          nombre: detail.nombreProducto,
          cantidad: Number(detail.cantidad),
          precioUnitario: Number(detail.precioUnitario),
          subtotal: Number(detail.subtotal),
        })),
        pagos: sale.pagos.map((payment) => ({
          id: payment.id,
          metodoPago: payment.metodoPago,
          monto: Number(payment.monto),
          numeroOperacion: payment.numeroOperacion,
        })),
      })),
      pagination: pagination(total),
    };
  }

  if (query.tipo === "GASTOS") {
    const where = {
      sucursalId: { in: branchIds },
      estado: "REGISTRADO" as const,
      fechaGasto: { gte: startDate, lt: endDate },
    };
    const [total, expenses] = await Promise.all([
      prisma.gasto.count({ where }),
      prisma.gasto.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { fechaGasto: "desc" },
        select: {
          id: true,
          descripcion: true,
          monto: true,
          metodoPago: true,
          salioDeCaja: true,
          fechaGasto: true,
          sucursal: { select: { nombre: true } },
          categoriaGasto: { select: { nombre: true } },
          administrador: { select: { nombres: true, apellidos: true } },
          caja: { select: { codigo: true } },
        },
      }),
    ]);
    return {
      tipo: query.tipo,
      registros: expenses.map((expense) => ({
        id: expense.id,
        codigo: expense.caja?.codigo ?? "GASTO",
        fecha: expense.fechaGasto.toISOString(),
        estado: "REGISTRADO",
        descripcion: `${expense.categoriaGasto.nombre}: ${expense.descripcion}`,
        importe: Number(expense.monto),
        cliente: "-",
        responsable: personName(expense.administrador),
        sucursal: expense.sucursal.nombre,
        datos: {
          metodoPago: expense.metodoPago,
          salioDeCaja: expense.salioDeCaja,
        },
        productos: [],
        pagos: [],
      })),
      pagination: pagination(total),
    };
  }

  if (query.tipo === "ADELANTOS_RESERVA") {
    const where = {
      estado: "CONFIRMADO" as const,
      fechaConfirmacion: { gte: startDate, lt: endDate },
      ...(query.filtro
        ? { metodoPago: query.filtro as typeof PAYMENT_METHODS[number] }
        : {}),
      reserva: { sucursalId: { in: branchIds } },
    };
    const [total, payments] = await Promise.all([
      prisma.pagoReserva.count({ where }),
      prisma.pagoReserva.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { fechaConfirmacion: "desc" },
        select: {
          id: true,
          monto: true,
          metodoPago: true,
          numeroOperacion: true,
          fechaPago: true,
          fechaConfirmacion: true,
          reserva: {
            select: {
              codigo: true,
              fechaReserva: true,
              totalEstimado: true,
              adelantoRequerido: true,
              sucursal: { select: { nombre: true } },
              cliente: { select: { nombres: true, apellidos: true } },
              detalles: {
                select: {
                  id: true,
                  nombreProducto: true,
                  cantidadAprobada: true,
                  cantidadSolicitada: true,
                  precioReservado: true,
                  subtotal: true,
                },
              },
            },
          },
          registradoPor: { select: { nombres: true, apellidos: true } },
          confirmadoPor: { select: { nombres: true, apellidos: true } },
        },
      }),
    ]);
    return {
      tipo: query.tipo,
      registros: payments.map((payment) => ({
        id: payment.id,
        codigo: payment.reserva.codigo,
        fecha: (payment.fechaConfirmacion ?? payment.fechaPago).toISOString(),
        estado: "CONFIRMADO",
        descripcion: `Adelanto ${payment.metodoPago}`,
        importe: Number(payment.monto),
        cliente: personName(payment.reserva.cliente),
        responsable: personName(payment.confirmadoPor ?? payment.registradoPor),
        sucursal: payment.reserva.sucursal.nombre,
        datos: {
          numeroOperacion: payment.numeroOperacion,
          fechaReserva: payment.reserva.fechaReserva.toISOString().slice(0, 10),
          totalEstimado: Number(payment.reserva.totalEstimado),
          adelantoRequerido: Number(payment.reserva.adelantoRequerido),
        },
        productos: payment.reserva.detalles.map((detail) => ({
          id: detail.id,
          nombre: detail.nombreProducto,
          cantidad: Number(
            Number(detail.cantidadAprobada) > 0
              ? detail.cantidadAprobada
              : detail.cantidadSolicitada,
          ),
          precioUnitario: Number(detail.precioReservado),
          subtotal: Number(detail.subtotal),
        })),
        pagos: [{
          id: payment.id,
          metodoPago: payment.metodoPago,
          monto: Number(payment.monto),
          numeroOperacion: payment.numeroOperacion,
        }],
      })),
      pagination: pagination(total),
    };
  }

  if (query.tipo === "PAGOS") {
    const method = query.filtro as typeof PAYMENT_METHODS[number] | undefined;
    const salePaymentWhere = {
      estado: "CONFIRMADO" as const,
      ...(method ? { metodoPago: method } : {}),
      venta: saleWhere,
    };
    const reservationPaymentWhere = {
      estado: "CONFIRMADO" as const,
      ...(method ? { metodoPago: method } : {}),
      fechaConfirmacion: { gte: startDate, lt: endDate },
      reserva: { sucursalId: { in: branchIds } },
    };
    const [salePayments, reservationPayments] = await Promise.all([
      prisma.pagoVenta.findMany({
        where: salePaymentWhere,
        orderBy: { createdAt: "desc" },
        take: query.page * query.limit,
        select: {
          id: true, metodoPago: true, monto: true, numeroOperacion: true, createdAt: true,
          venta: {
            select: {
              numeroTicket: true, nombreCliente: true,
              sucursal: { select: { nombre: true } },
              vendedor: { select: { nombres: true, apellidos: true } },
              detalles: {
                select: {
                  id: true,
                  nombreProducto: true,
                  cantidad: true,
                  precioUnitario: true,
                  subtotal: true,
                },
              },
            },
          },
        },
      }),
      prisma.pagoReserva.findMany({
        where: reservationPaymentWhere,
        orderBy: { fechaConfirmacion: "desc" },
        take: query.page * query.limit,
        select: {
          id: true, metodoPago: true, monto: true, numeroOperacion: true,
          fechaPago: true, fechaConfirmacion: true,
          reserva: {
            select: {
              codigo: true,
              sucursal: { select: { nombre: true } },
              cliente: { select: { nombres: true, apellidos: true } },
              detalles: {
                select: {
                  id: true,
                  nombreProducto: true,
                  cantidadAprobada: true,
                  cantidadSolicitada: true,
                  precioReservado: true,
                  subtotal: true,
                },
              },
            },
          },
          confirmadoPor: { select: { nombres: true, apellidos: true } },
        },
      }),
    ]);
    const records = [
      ...salePayments.map((payment) => ({
        id: payment.id, codigo: payment.venta.numeroTicket,
        fecha: payment.createdAt.toISOString(), estado: "CONFIRMADO",
        descripcion: `Pago de venta - ${payment.metodoPago}`,
        importe: Number(payment.monto), cliente: payment.venta.nombreCliente ?? "Público general",
        responsable: personName(payment.venta.vendedor), sucursal: payment.venta.sucursal.nombre,
        datos: { numeroOperacion: payment.numeroOperacion, origen: "VENTA" },
        productos: payment.venta.detalles.map((detail) => ({
          id: detail.id,
          nombre: detail.nombreProducto,
          cantidad: Number(detail.cantidad),
          precioUnitario: Number(detail.precioUnitario),
          subtotal: Number(detail.subtotal),
        })),
        pagos: [{
          id: payment.id,
          metodoPago: payment.metodoPago,
          monto: Number(payment.monto),
          numeroOperacion: payment.numeroOperacion,
        }],
      })),
      ...reservationPayments.map((payment) => ({
        id: payment.id, codigo: payment.reserva.codigo,
        fecha: (payment.fechaConfirmacion ?? payment.fechaPago).toISOString(), estado: "CONFIRMADO",
        descripcion: `Adelanto de reserva - ${payment.metodoPago}`,
        importe: Number(payment.monto), cliente: personName(payment.reserva.cliente),
        responsable: personName(payment.confirmadoPor), sucursal: payment.reserva.sucursal.nombre,
        datos: { numeroOperacion: payment.numeroOperacion, origen: "RESERVA" },
        productos: payment.reserva.detalles.map((detail) => ({
          id: detail.id,
          nombre: detail.nombreProducto,
          cantidad: Number(
            Number(detail.cantidadAprobada) > 0
              ? detail.cantidadAprobada
              : detail.cantidadSolicitada,
          ),
          precioUnitario: Number(detail.precioReservado),
          subtotal: Number(detail.subtotal),
        })),
        pagos: [{
          id: payment.id,
          metodoPago: payment.metodoPago,
          monto: Number(payment.monto),
          numeroOperacion: payment.numeroOperacion,
        }],
      })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const total = await Promise.all([
      prisma.pagoVenta.count({ where: salePaymentWhere }),
      prisma.pagoReserva.count({ where: reservationPaymentWhere }),
    ]).then(([sales, reservations]) => sales + reservations);
    return {
      tipo: query.tipo,
      registros: records.slice(skip, skip + query.limit),
      pagination: pagination(total),
    };
  }

  if (query.tipo === "PRODUCTOS") {
    const where = {
      ...(query.filtro ? { productoSucursalId: query.filtro } : {}),
      venta: saleWhere,
    };
    const [total, details] = await Promise.all([
      prisma.detalleVenta.count({ where }),
      prisma.detalleVenta.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, nombreProducto: true, cantidad: true, precioUnitario: true, subtotal: true, createdAt: true,
          venta: {
            select: {
              numeroTicket: true, nombreCliente: true,
              sucursal: { select: { nombre: true } },
              vendedor: { select: { nombres: true, apellidos: true } },
            },
          },
        },
      }),
    ]);
    return {
      tipo: query.tipo,
      registros: details.map((detail) => ({
        id: detail.id, codigo: detail.venta.numeroTicket, fecha: detail.createdAt.toISOString(),
        estado: "VENDIDO", descripcion: detail.nombreProducto, importe: Number(detail.subtotal),
        cliente: detail.venta.nombreCliente ?? "Público general",
        responsable: personName(detail.venta.vendedor), sucursal: detail.venta.sucursal.nombre,
        datos: {},
        productos: [{
          id: detail.id, nombre: detail.nombreProducto, cantidad: Number(detail.cantidad),
          precioUnitario: Number(detail.precioUnitario), subtotal: Number(detail.subtotal),
        }],
        pagos: [],
      })),
      pagination: pagination(total),
    };
  }

  if (query.tipo === "PEDIDOS") {
    const where = {
      sucursalId: { in: branchIds },
      createdAt: { gte: startDate, lt: endDate },
      ...(query.filtro ? { estado: query.filtro as never } : {}),
    };
    const [total, orders] = await Promise.all([
      prisma.pedido.count({ where }),
      prisma.pedido.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, codigo: true, estado: true, tipoPedido: true, createdAt: true,
          sucursal: { select: { nombre: true } },
          cliente: { select: { nombres: true, apellidos: true } },
          vendedor: { select: { nombres: true, apellidos: true } },
          detalles: {
            select: { id: true, nombreProducto: true, cantidad: true, precioUnitario: true, subtotal: true },
          },
        },
      }),
    ]);
    return {
      tipo: query.tipo,
      registros: orders.map((order) => ({
        id: order.id, codigo: order.codigo, fecha: order.createdAt.toISOString(), estado: order.estado,
        descripcion: order.tipoPedido, importe: roundMoney(order.detalles.reduce((sum, detail) => sum + Number(detail.subtotal), 0)),
        cliente: personName(order.cliente), responsable: personName(order.vendedor), sucursal: order.sucursal.nombre,
        datos: {},
        productos: order.detalles.map((detail) => ({
          id: detail.id, nombre: detail.nombreProducto, cantidad: Number(detail.cantidad),
          precioUnitario: Number(detail.precioUnitario), subtotal: Number(detail.subtotal),
        })),
        pagos: [],
      })),
      pagination: pagination(total),
    };
  }

  if (query.tipo === "RESERVAS") {
    const where = {
      sucursalId: { in: branchIds },
      createdAt: { gte: startDate, lt: endDate },
      ...(query.filtro ? { estado: query.filtro as never } : {}),
    };
    const [total, reservations] = await Promise.all([
      prisma.reserva.count({ where }),
      prisma.reserva.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, codigo: true, estado: true, tipoReserva: true, createdAt: true,
          fechaReserva: true, totalEstimado: true, adelantoRequerido: true, adelantoPagado: true,
          sucursal: { select: { nombre: true } },
          cliente: { select: { nombres: true, apellidos: true } },
          aprobadoPor: { select: { nombres: true, apellidos: true } },
          detalles: {
            select: { id: true, nombreProducto: true, cantidadSolicitada: true, cantidadAprobada: true, precioReservado: true, subtotal: true },
          },
          pagos: {
            where: { estado: "CONFIRMADO" },
            select: { id: true, metodoPago: true, monto: true, numeroOperacion: true },
          },
        },
      }),
    ]);
    return {
      tipo: query.tipo,
      registros: reservations.map((reservation) => ({
        id: reservation.id, codigo: reservation.codigo, fecha: reservation.createdAt.toISOString(), estado: reservation.estado,
        descripcion: reservation.tipoReserva, importe: Number(reservation.totalEstimado),
        cliente: personName(reservation.cliente), responsable: personName(reservation.aprobadoPor), sucursal: reservation.sucursal.nombre,
        datos: {
          fechaReserva: reservation.fechaReserva.toISOString().slice(0, 10),
          adelantoRequerido: Number(reservation.adelantoRequerido),
          adelantoPagado: Number(reservation.adelantoPagado),
        },
        productos: reservation.detalles.map((detail) => ({
          id: detail.id, nombre: detail.nombreProducto,
          cantidad: Number(Number(detail.cantidadAprobada) > 0 ? detail.cantidadAprobada : detail.cantidadSolicitada),
          precioUnitario: Number(detail.precioReservado), subtotal: Number(detail.subtotal),
        })),
        pagos: reservation.pagos.map((payment) => ({
          id: payment.id, metodoPago: payment.metodoPago, monto: Number(payment.monto), numeroOperacion: payment.numeroOperacion,
        })),
      })),
      pagination: pagination(total),
    };
  }

  if (query.tipo === "CAJAS") {
    const cashStatus = query.filtro === "DIFERENCIA"
      ? "CERRADA"
      : query.filtro;
    const isOpen = cashStatus === "ABIERTA";
    const where = {
      sucursalId: { in: branchIds },
      ...(cashStatus ? { estado: cashStatus as never } : {}),
      ...(isOpen
        ? {}
        : { fechaCierre: { gte: startDate, lt: endDate } }),
    };
    const [total, cashRegisters] = await Promise.all([
      prisma.caja.count({ where }),
      prisma.caja.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { fechaApertura: "desc" },
        select: {
          id: true, codigo: true, estado: true, fechaApertura: true, fechaCierre: true,
          montoInicial: true, totalVentas: true, totalGastosCaja: true, efectivoEsperado: true, efectivoContado: true, diferencia: true,
          sucursal: { select: { nombre: true } },
          vendedor: { select: { nombres: true, apellidos: true } },
        },
      }),
    ]);
    return {
      tipo: query.tipo,
      registros: cashRegisters.map((cash) => ({
        id: cash.id, codigo: cash.codigo, fecha: (cash.fechaCierre ?? cash.fechaApertura).toISOString(), estado: cash.estado,
        descripcion: `Apertura ${cash.fechaApertura.toISOString()}`,
        importe: query.filtro === "DIFERENCIA"
          ? Number(cash.diferencia ?? 0)
          : Number(cash.totalVentas), cliente: "-", responsable: personName(cash.vendedor), sucursal: cash.sucursal.nombre,
        datos: {
          montoInicial: Number(cash.montoInicial), totalGastos: Number(cash.totalGastosCaja),
          efectivoEsperado: Number(cash.efectivoEsperado),
          efectivoContado: cash.efectivoContado !== null ? Number(cash.efectivoContado) : null,
          diferencia: cash.diferencia !== null ? Number(cash.diferencia) : null,
        },
        productos: [], pagos: [],
      })),
      pagination: pagination(total),
    };
  }

  const [sales, expenses, salesTotal, expensesTotal] = await Promise.all([
    prisma.venta.findMany({
      where: saleWhere, take: query.page * query.limit, orderBy: { createdAt: "desc" },
      select: { id: true, numeroTicket: true, total: true, createdAt: true, nombreCliente: true, sucursal: { select: { nombre: true } }, vendedor: { select: { nombres: true, apellidos: true } } },
    }),
    prisma.gasto.findMany({
      where: { sucursalId: { in: branchIds }, estado: "REGISTRADO", fechaGasto: { gte: startDate, lt: endDate } },
      take: query.page * query.limit, orderBy: { fechaGasto: "desc" },
      select: { id: true, descripcion: true, monto: true, fechaGasto: true, sucursal: { select: { nombre: true } }, administrador: { select: { nombres: true, apellidos: true } } },
    }),
    prisma.venta.count({ where: saleWhere }),
    prisma.gasto.count({ where: { sucursalId: { in: branchIds }, estado: "REGISTRADO", fechaGasto: { gte: startDate, lt: endDate } } }),
  ]);
  const records = [
    ...sales.map((sale) => ({
      id: sale.id, codigo: sale.numeroTicket, fecha: sale.createdAt.toISOString(), estado: "INGRESO",
      descripcion: "Venta confirmada", importe: Number(sale.total), cliente: sale.nombreCliente ?? "Público general",
      responsable: personName(sale.vendedor), sucursal: sale.sucursal.nombre, datos: { signo: 1 }, productos: [], pagos: [],
    })),
    ...expenses.map((expense) => ({
      id: expense.id, codigo: "GASTO", fecha: expense.fechaGasto.toISOString(), estado: "EGRESO",
      descripcion: expense.descripcion, importe: -Number(expense.monto), cliente: "-",
      responsable: personName(expense.administrador), sucursal: expense.sucursal.nombre, datos: { signo: -1 }, productos: [], pagos: [],
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return {
    tipo: "BALANCE",
    registros: records.slice(skip, skip + query.limit),
    pagination: pagination(salesTotal + expensesTotal),
  };
}
