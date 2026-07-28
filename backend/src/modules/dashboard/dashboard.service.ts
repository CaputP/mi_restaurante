import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

type DashboardAuth = {
  usuarioId: string;
  rol: string;
};

type OperationalDate = {
  dateText: string;
  dateOnly: Date;
  startOfDay: Date;
  endOfDay: Date;
};

/*
 * PostgreSQL guarda las fechas de reserva como DATE,
 * mientras que ventas y pedidos utilizan timestamps.
 *
 * El restaurante opera con la zona horaria de Perú.
 */
function getOperationalDate(
  referenceDate = new Date(),
): OperationalDate {
  const dateParts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(referenceDate);

  const year = dateParts.find(
    (part) => part.type === "year",
  )?.value;

  const month = dateParts.find(
    (part) => part.type === "month",
  )?.value;

  const day = dateParts.find(
    (part) => part.type === "day",
  )?.value;

  if (!year || !month || !day) {
    throw new AppError(
      500,
      "No se pudo determinar la fecha operativa.",
      "FECHA_OPERATIVA_INVALIDA",
    );
  }

  const dateText = `${year}-${month}-${day}`;

  /*
   * El campo @db.Date se compara utilizando la fecha
   * sin componente horario.
   */
  const dateOnly = new Date(
    `${dateText}T00:00:00.000Z`,
  );

  /*
   * America/Lima utiliza UTC-05:00.
   * Las 00:00 de Lima equivalen a las 05:00 UTC.
   */
  const startOfDay = new Date(
    `${dateText}T05:00:00.000Z`,
  );

  const endOfDay = new Date(
    startOfDay.getTime() +
      24 * 60 * 60 * 1000,
  );

  return {
    dateText,
    dateOnly,
    startOfDay,
    endOfDay,
  };
}

async function getAuthorizedBranches(
  auth: DashboardAuth,
  operationalDate: Date,
) {
  if (
    auth.rol === "ADMINISTRADOR_GENERAL"
  ) {
    return prisma.sucursal.findMany({
      where: {
        estado: "ACTIVO",
      },

      select: {
        id: true,
        codigo: true,
        nombre: true,
      },

      orderBy: {
        nombre: "asc",
      },
    });
  }

  const assignments =
    await prisma.usuarioSucursal.findMany({
      where: {
        usuarioId: auth.usuarioId,
        activo: true,

        fechaInicio: {
          lte: operationalDate,
        },

        OR: [
          {
            fechaFin: null,
          },
          {
            fechaFin: {
              gte: operationalDate,
            },
          },
        ],

        sucursal: {
          estado: "ACTIVO",
        },
      },

      select: {
        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
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
    (assignment) => assignment.sucursal,
  );
}

export async function getAdminDashboard(
  auth: DashboardAuth,
) {
  const {
    dateText,
    dateOnly,
    startOfDay,
    endOfDay,
  } = getOperationalDate();

  const branches =
    await getAuthorizedBranches(
      auth,
      dateOnly,
    );

  if (branches.length === 0) {
    throw new AppError(
      403,
      "No tienes una sucursal activa asignada.",
      "SUCURSAL_NO_ASIGNADA",
    );
  }

  const branchIds = branches.map(
    (branch) => branch.id,
  );

  const [
    reservationsToday,
    salesToday,
    activeOrders,
    stockRecords,
    recentReservations,
    recentOrders,
    recentSales,
  ] = await prisma.$transaction([
    prisma.reserva.count({
      where: {
        sucursalId: {
          in: branchIds,
        },

        fechaReserva: dateOnly,

        estado: {
          notIn: [
            "RECHAZADA",
            "CANCELADA",
          ],
        },
      },
    }),

    prisma.venta.aggregate({
      where: {
        sucursalId: {
          in: branchIds,
        },

        estado: "CONFIRMADA",

        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },

      _sum: {
        total: true,
      },

      _count: {
        _all: true,
      },
    }),

    prisma.pedido.count({
      where: {
        sucursalId: {
          in: branchIds,
        },

        estado: {
          notIn: [
            "PAGADO",
            "CANCELADO",
          ],
        },
      },
    }),

    prisma.productoSucursal.findMany({
      where: {
        sucursalId: {
          in: branchIds,
        },

        estado: "ACTIVO",

        producto: {
          estado: "ACTIVO",

          tipoStock: {
            in: [
              "PERMANENTE",
              "DIARIO",
            ],
          },
        },
      },

      select: {
        id: true,
        stockMinimo: true,

        producto: {
          select: {
            nombre: true,
            tipoStock: true,
          },
        },

        sucursal: {
          select: {
            id: true,
            nombre: true,
          },
        },

        stockPermanente: {
          select: {
            cantidadActual: true,
            cantidadComprometida: true,
          },
        },

        stocksDiarios: {
          where: {
            fecha: dateOnly,
          },

          take: 1,

          select: {
            cantidadActual: true,
            cantidadComprometida: true,
          },
        },
      },
    }),

    prisma.reserva.findMany({
      where: {
        sucursalId: {
          in: branchIds,
        },
      },

      take: 5,

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        codigo: true,
        estado: true,
        createdAt: true,

        cliente: {
          select: {
            nombres: true,
            apellidos: true,
          },
        },

        sucursal: {
          select: {
            nombre: true,
          },
        },
      },
    }),

    prisma.pedido.findMany({
      where: {
        sucursalId: {
          in: branchIds,
        },
      },

      take: 5,

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        codigo: true,
        estado: true,
        createdAt: true,

        cliente: {
          select: {
            nombres: true,
            apellidos: true,
          },
        },

        sucursal: {
          select: {
            nombre: true,
          },
        },
      },
    }),

    prisma.venta.findMany({
      where: {
        sucursalId: {
          in: branchIds,
        },
      },

      take: 5,

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        numeroTicket: true,
        estado: true,
        total: true,
        nombreCliente: true,
        createdAt: true,

        sucursal: {
          select: {
            nombre: true,
          },
        },
      },
    }),
  ]);

  const stockAlerts = stockRecords
    .map((record) => {
      const minimumStock =
        Number(record.stockMinimo);

      const stock =
        record.producto.tipoStock ===
        "PERMANENTE"
          ? record.stockPermanente
          : record.stocksDiarios[0];

      const currentStock = Number(
        stock?.cantidadActual ?? 0,
      );

      const committedStock = Number(
        stock?.cantidadComprometida ?? 0,
      );

      const availableStock =
        currentStock - committedStock;

      return {
        productoSucursalId: record.id,
        producto: record.producto.nombre,
        sucursalId: record.sucursal.id,
        sucursal: record.sucursal.nombre,
        tipoStock:
          record.producto.tipoStock,
        stockDisponible: availableStock,
        stockMinimo: minimumStock,
      };
    })
    /*
     * Un stock mínimo igual a cero significa que no
     * se configuró un umbral de alerta.
     */
    .filter(
      (record) =>
        record.stockMinimo > 0 &&
        record.stockDisponible <=
          record.stockMinimo,
    )
    .sort(
      (first, second) =>
        first.stockDisponible -
        first.stockMinimo -
        (second.stockDisponible -
          second.stockMinimo),
    );

  const activity = [
    ...recentReservations.map(
      (reservation) => ({
        id: `reserva-${reservation.id}`,
        tipo: "RESERVA" as const,
        codigo: reservation.codigo,
        estado: reservation.estado,
        fecha:
          reservation.createdAt.toISOString(),
        sucursal:
          reservation.sucursal.nombre,
        persona:
          `${reservation.cliente.nombres} ${reservation.cliente.apellidos}`.trim(),
        monto: null,
      }),
    ),

    ...recentOrders.map((order) => ({
      id: `pedido-${order.id}`,
      tipo: "PEDIDO" as const,
      codigo: order.codigo,
      estado: order.estado,
      fecha: order.createdAt.toISOString(),
      sucursal: order.sucursal.nombre,
      persona: order.cliente
        ? `${order.cliente.nombres} ${order.cliente.apellidos}`.trim()
        : "Cliente no registrado",
      monto: null,
    })),

    ...recentSales.map((sale) => ({
      id: `venta-${sale.id}`,
      tipo: "VENTA" as const,
      codigo: sale.numeroTicket,
      estado: sale.estado,
      fecha: sale.createdAt.toISOString(),
      sucursal: sale.sucursal.nombre,
      persona:
        sale.nombreCliente ??
        "Cliente no registrado",
      monto: Number(sale.total),
    })),
  ]
    .sort(
      (first, second) =>
        new Date(second.fecha).getTime() -
        new Date(first.fecha).getTime(),
    )
    .slice(0, 8);

  return {
    fechaOperativa: dateText,
    zonaHoraria: "America/Lima",

    alcance: {
      cantidadSucursales: branches.length,
      sucursales: branches,
    },

    indicadores: {
      reservasHoy: {
        cantidad: reservationsToday,
      },

      ventasHoy: {
        cantidad:
          salesToday._count._all,
        monto: Number(
          salesToday._sum.total ?? 0,
        ),
      },

      pedidosActivos: {
        cantidad: activeOrders,
      },

      alertasStock: {
        cantidad: stockAlerts.length,
        items: stockAlerts.slice(0, 5),
      },
    },

    actividadReciente: activity,
  };
}