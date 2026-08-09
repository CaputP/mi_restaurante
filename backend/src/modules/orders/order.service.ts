import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { withSerializableTransaction } from "../../lib/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  calculateAvailableStock,
  hasSufficientStock,
} from "../../shared/orders/order-stock-policy.js";
import { findAvailableCustomerRewards } from "../loyalty/loyalty-reward-query.service.js";
import { evaluateStockNotification } from "../notifications/stock-notification.service.js";

import type {
  CreateOrderInput,
  ListOrdersQuery,
  OrderCustomerRewardsQuery,
  OrderOptionsQuery,
  SendOrderInput,
  UpdateOrderInput,
} from "./order.schema.js";

type OrderAuth = {
  usuarioId: string;
  rol: string;
};

const ADMIN_ROLES = [
  "ADMINISTRADOR_GENERAL",
  "ADMINISTRADOR_SUCURSAL",
] as const;

function isAdministrator(
  role: string,
): boolean {
  return ADMIN_ROLES.includes(
    role as
      (typeof ADMIN_ROLES)[number],
  );
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

  const year = parts.find(
    (part) =>
      part.type === "year",
  )?.value;

  const month = parts.find(
    (part) =>
      part.type === "month",
  )?.value;

  const day = parts.find(
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

async function assertDraftStockAvailable(
  transaction: Prisma.TransactionClient,
  details: Array<{
    productoSucursalId: string;
    cantidad: number;
  }>,
): Promise<void> {
  const operationalDate = getOperationalDate();
  const productIds = details.map((detail) => detail.productoSucursalId);
  const products = await transaction.productoSucursal.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      producto: { select: { nombre: true, tipoStock: true } },
      stockPermanente: { select: { cantidadActual: true, cantidadComprometida: true } },
      stocksDiarios: {
        where: { fecha: operationalDate },
        take: 1,
        select: { cantidadActual: true, cantidadComprometida: true },
      },
    },
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const detail of details) {
    const product = productMap.get(detail.productoSucursalId);
    if (!product || product.producto.tipoStock === "SIN_CONTROL") continue;

    const stock = product.producto.tipoStock === "PERMANENTE"
      ? product.stockPermanente
      : product.stocksDiarios[0];

    if (!stock) {
      throw new AppError(
        409,
        product.producto.tipoStock === "DIARIO"
          ? `El producto "${product.producto.nombre}" no tiene apertura de stock para hoy.`
          : `El producto "${product.producto.nombre}" no tiene stock permanente configurado.`,
        product.producto.tipoStock === "DIARIO"
          ? "STOCK_DIARIO_NO_ABIERTO"
          : "STOCK_NO_CONFIGURADO",
      );
    }

    const available = calculateAvailableStock(
      Number(stock.cantidadActual),
      Number(stock.cantidadComprometida),
    );
    if (!hasSufficientStock(detail.cantidad, available)) {
      throw new AppError(
        409,
        `No existe stock suficiente de "${product.producto.nombre}". Solicitado: ${detail.cantidad}; disponible: ${available}.`,
        "STOCK_INSUFICIENTE",
      );
    }
  }
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

function userFullName(
  user: {
    nombres: string;
    apellidos: string;
  },
): string {
  return `${user.nombres} ${user.apellidos}`.trim();
}

async function getAuthorizedBranches(
  auth: OrderAuth,
) {
  const operationalDate =
    getOperationalDate();

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
        zonaHoraria: true,
      },

      orderBy: {
        nombre: "asc",
      },
    });
  }

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
              zonaHoraria: true,
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
        branch.id === branchId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes autorización para administrar la sucursal seleccionada.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

async function validateAssignedWorker(
  workerId: string,
  branchId: string,
  allowedRoles: string[],
  workerName: string,
) {
  const operationalDate =
    getOperationalDate();

  const assignment =
    await prisma
      .usuarioSucursal
      .findFirst({
        where: {
          usuarioId:
            workerId,

          sucursalId:
            branchId,

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

          usuario: {
            estado: "ACTIVO",
            deletedAt: null,

            rol: {
              codigo: {
                in:
                  allowedRoles,
              },

              activo: true,
            },
          },
        },

        select: {
          usuario: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,

              rol: {
                select: {
                  codigo: true,
                },
              },
            },
          },
        },
      });

  if (!assignment) {
    throw new AppError(
      400,
      `${workerName} no existe, no está activo o no pertenece a la sucursal.`,
      "TRABAJADOR_PEDIDO_INVALIDO",
    );
  }

  return assignment.usuario;
}

export async function getOrderOptions(
  auth: OrderAuth,
  query: OrderOptionsQuery,
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

  const operationalDate =
    getOperationalDate();

  const [
    currentUser,
    clients,
    zones,
    products,
    assignments,
  ] = await Promise.all([
    prisma.usuario.findUnique({
      where: {
        id: auth.usuarioId,
      },

      select: {
        id: true,
        nombres: true,
        apellidos: true,

        rol: {
          select: {
            codigo: true,
            nombre: true,
          },
        },
      },
    }),

    prisma.usuario.findMany({
      where: {
        estado: "ACTIVO",
        deletedAt: null,

        rol: {
          codigo: "CLIENTE",
          activo: true,
        },
      },

      take: 500,

      select: {
        id: true,
        nombres: true,
        apellidos: true,
        correo: true,
        telefono: true,
      },

      orderBy: [
        {
          apellidos: "asc",
        },
        {
          nombres: "asc",
        },
      ],
    }),

    selectedBranchId
      ? prisma.zona.findMany({
          where: {
            sucursalId:
              selectedBranchId,

            estado: "ACTIVO",
            deletedAt: null,
          },

          select: {
            id: true,
            nombre: true,
            descripcion: true,
            capacidadReferencial:
              true,
          },

          orderBy: {
            nombre: "asc",
          },
        })
      : Promise.resolve([]),

    selectedBranchId
      ? prisma
          .productoSucursal
          .findMany({
            where: {
              sucursalId:
                selectedBranchId,

              estado: "ACTIVO",

              disponibleVenta:
                true,

              producto: {
                estado: "ACTIVO",
                deletedAt: null,
              },
            },

            select: {
              id: true,
              precioVenta: true,
              stockMinimo: true,

              stockPermanente: {
                select: {
                  cantidadActual: true,
                  cantidadComprometida: true,
                },
              },

              stocksDiarios: {
                where: {
                  fecha: operationalDate,
                },
                take: 1,
                select: {
                  cantidadActual: true,
                  cantidadComprometida: true,
                },
              },

              producto: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  descripcion: true,
                  tipoStock: true,
                  requierePreparacion:
                    true,
                  destinoPreparacion:
                    true,

                  categoria: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },

                  unidadMedida: {
                    select: {
                      codigo: true,
                      nombre: true,
                      abreviatura:
                        true,
                      decimales:
                        true,
                    },
                  },
                },
              },
            },

            orderBy: {
              producto: {
                nombre: "asc",
              },
            },
          })
      : Promise.resolve([]),

    selectedBranchId
      ? prisma
          .usuarioSucursal
          .findMany({
            where: {
              sucursalId:
                selectedBranchId,

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

              usuario: {
                estado: "ACTIVO",
                deletedAt: null,

                rol: {
                  codigo: {
                    in: [
                      "VENDEDOR",
                      "MOZO",
                    ],
                  },

                  activo: true,
                },
              },
            },

            select: {
              usuario: {
                select: {
                  id: true,
                  nombres: true,
                  apellidos: true,
                  correo: true,

                  rol: {
                    select: {
                      codigo: true,
                      nombre: true,
                    },
                  },
                },
              },
            },

            orderBy: {
              createdAt: "asc",
            },
          })
      : Promise.resolve([]),
  ]);

  const workers =
    assignments.map(
      (assignment) => ({
        id:
          assignment.usuario.id,

        nombres:
          assignment.usuario
            .nombres,

        apellidos:
          assignment.usuario
            .apellidos,

        nombreCompleto:
          userFullName(
            assignment.usuario,
          ),

        correo:
          assignment.usuario
            .correo,

        rol:
          assignment.usuario.rol,
      }),
    );

  const sellers =
    workers.filter(
      (worker) =>
        worker.rol.codigo ===
        "VENDEDOR",
    );

  /*
   * Un administrador también puede registrar
   * personalmente una venta cuando sea necesario.
   */
  if (
    currentUser &&
    isAdministrator(auth.rol) &&
    !sellers.some(
      (seller) =>
        seller.id ===
        currentUser.id,
    )
  ) {
    sellers.unshift({
      id: currentUser.id,
      nombres:
        currentUser.nombres,
      apellidos:
        currentUser.apellidos,
      nombreCompleto:
        userFullName(
          currentUser,
        ),
      correo: "",
      rol: currentUser.rol,
    });
  }

  return {
    sucursales: branches,

    sucursalSeleccionadaId:
      selectedBranchId ??
      null,

    clientes:
      clients.map(
        (client) => ({
          ...client,

          nombreCompleto:
            userFullName(
              client,
            ),
        }),
      ),

    zonas: zones,

    productos:
      products.map(
        (productBranch) => {
          const stockType = productBranch.producto.tipoStock;
          const stock = stockType === "PERMANENTE"
            ? productBranch.stockPermanente
            : productBranch.stocksDiarios[0];
          const stockControlled = stockType !== "SIN_CONTROL";
          const availableStock = stockControlled && stock
            ? calculateAvailableStock(
              Number(stock.cantidadActual),
              Number(stock.cantidadComprometida),
            )
            : null;

          return {
          productoSucursalId:
            productBranch.id,

          precioVenta:
            Number(
              productBranch
                .precioVenta,
            ),

          stockMinimo:
            Number(
              productBranch
                .stockMinimo,
            ),

          stockControlado:
            stockControlled,

          stockConfigurado:
            stockControlled
              ? Boolean(stock)
              : true,

          stockDisponible:
            availableStock,

          ...productBranch.producto,
          };
        },
      ),

    vendedores: sellers,

    mozos:
      workers.filter(
        (worker) =>
          worker.rol.codigo ===
          "MOZO",
      ),

    tiposPedido: [
      {
        codigo:
          "CONSUMO_LOCAL",
        nombre:
          "Consumo local",
      },
      {
        codigo:
          "PARA_LLEVAR",
        nombre:
          "Para llevar",
      },
    ],
  };
}

export async function getOrderCustomerRewards(
  auth: OrderAuth,
  query: OrderCustomerRewardsQuery,
) {
  const branches = await getAuthorizedBranches(auth);
  assertAuthorizedBranch(branches, query.sucursalId);

  const customer = await prisma.usuario.findFirst({
    where: {
      id: query.clienteId,
      estado: "ACTIVO",
      deletedAt: null,
      rol: {
        codigo: "CLIENTE",
        activo: true,
      },
    },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  });

  if (!customer) {
    throw new AppError(
      404,
      "El cliente no existe o no se encuentra activo.",
      "CLIENTE_NO_ENCONTRADO",
    );
  }

  const rewards = await prisma.$transaction(
    (transaction) =>
      findAvailableCustomerRewards(
        transaction,
        customer.id,
        query.sucursalId,
      ),
  );

  return {
    cliente: {
      id: customer.id,
      nombreCompleto: userFullName(customer),
    },
    premios: rewards.map((reward) => ({
      id: reward.id,
      descripcion: reward.descripcion,
      tipoRecompensa:
        reward.tipoRecompensaSnapshot ??
        reward.programa.tipoRecompensa,
      cantidadProducto:
        reward.cantidadProducto !== null
          ? Number(reward.cantidadProducto)
          : null,
      valorReferencia:
        reward.valorReferencia !== null
          ? Number(reward.valorReferencia)
          : null,
      fechaVencimiento:
        reward.fechaVencimiento.toISOString(),
      programa: {
        id: reward.programa.id,
        nombre: reward.programa.nombre,
      },
      productoPremio: reward.productoPremio,
    })),
  };
}

function createOrderAccessWhere(
  auth: OrderAuth,
): Prisma.PedidoWhereInput {
  if (
    auth.rol === "VENDEDOR"
  ) {
    return {
      vendedorId:
        auth.usuarioId,
    };
  }

  if (auth.rol === "MOZO") {
    return {
      mozoId:
        auth.usuarioId,
    };
  }

  return {};
}

export async function listOrders(
  auth: OrderAuth,
  query: ListOrdersQuery,
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

  if (query.sucursalId) {
    assertAuthorizedBranch(
      branches,
      query.sucursalId,
    );
  }

  const selectedBranchIds =
    query.sucursalId
      ? [query.sucursalId]
      : branchIds;

  if (
    selectedBranchIds.length === 0
  ) {
    return {
      pedidos: [],

      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 1,
      },
    };
  }

  const where:
    Prisma.PedidoWhereInput = {
      sucursalId: {
        in:
          selectedBranchIds,
      },

      ...createOrderAccessWhere(
        auth,
      ),

      ...(query.vendedorId &&
      isAdministrator(auth.rol)
        ? {
            vendedorId:
              query.vendedorId,
          }
        : {}),

      ...(query.mozoId &&
      isAdministrator(auth.rol)
        ? {
            mozoId:
              query.mozoId,
          }
        : {}),

      ...(query.estado !==
      "TODOS"
        ? {
            estado:
              query.estado,
          }
        : {}),

      ...(query.tipoPedido !==
      "TODOS"
        ? {
            tipoPedido:
              query.tipoPedido,
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
                codigo: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                observaciones: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
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
              {
                cliente: {
                  correo: {
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
    orders,
  ] = await prisma.$transaction([
    prisma.pedido.count({
      where,
    }),

    prisma.pedido.findMany({
      where,

      skip,
      take: query.limit,

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        codigo: true,
        tipoPedido: true,
        estado: true,
        observaciones: true,
        createdAt: true,
        updatedAt: true,

        cliente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true,
            telefono: true,
          },
        },

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
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

        mozo: {
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
          },
        },

        detalles: {
          select: {
            subtotal: true,
            cantidad: true,
          },
        },

        _count: {
          select: {
            comandas: true,
            entregas: true,
          },
        },
      },
    }),
  ]);

  return {
    pedidos:
      orders.map(
        (order) => {
          const {
            detalles,
            _count,
            ...orderData
          } = order;

          const totalOrder =
            Number(
              detalles
                .reduce(
                  (
                    accumulator,
                    detail,
                  ) =>
                    accumulator +
                    Number(
                      detail.subtotal,
                    ),
                  0,
                )
                .toFixed(2),
            );

          return {
            ...orderData,

            createdAt:
              order.createdAt
                .toISOString(),

            updatedAt:
              order.updatedAt
                .toISOString(),

            total:
              totalOrder,

            cantidadProductos:
              detalles.length,

            cantidadUnidades:
              detalles.reduce(
                (
                  accumulator,
                  detail,
                ) =>
                  accumulator +
                  Number(
                    detail.cantidad,
                  ),
                0,
              ),

            cantidadComandas:
              _count.comandas,

            cantidadEntregas:
              _count.entregas,

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

            mozo:
              order.mozo
                ? {
                    id:
                      order.mozo.id,

                    nombreCompleto:
                      userFullName(
                        order.mozo,
                      ),
                  }
                : null,
          };
        },
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

export async function getOrderById(
  auth: OrderAuth,
  orderId: string,
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

  const order =
    await prisma.pedido.findFirst({
      where: {
        id: orderId,

        sucursalId: {
          in:
            branchIds,
        },

        ...createOrderAccessWhere(
          auth,
        ),
      },

      select: {
        id: true,
        codigo: true,
        tipoPedido: true,
        estado: true,
        observaciones: true,

        enviadoAt: true,
        pagadoAt: true,
        canceladoAt: true,
        motivoCancelacion:
          true,

        createdAt: true,
        updatedAt: true,

        cliente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true,
            telefono: true,
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

        zona: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
          },
        },

        vendedor: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true,
          },
        },

        mozo: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true,
          },
        },

        reserva: {
          select: {
            id: true,
            codigo: true,
            tipoReserva: true,
            fechaReserva: true,
            horaReserva: true,
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
            observaciones: true,
            estado: true,
            createdAt: true,
            updatedAt: true,

            productoSucursal: {
              select: {
                id: true,
                precioVenta: true,

                producto: {
                  select: {
                    id: true,
                    codigo: true,
                    nombre: true,
                    tipoStock: true,
                    requierePreparacion:
                      true,
                    destinoPreparacion:
                      true,

                    unidadMedida: {
                      select: {
                        abreviatura:
                          true,
                      },
                    },
                  },
                },
              },
            },
          },
        },

        comandas: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            codigo: true,
            destino: true,
            prioridad: true,
            estado: true,
            fechaInicio: true,
            fechaFinalizacion:
              true,
            createdAt: true,

            _count: {
              select: {
                detalles: true,
              },
            },
          },
        },

        entregas: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            tipoEntrega: true,
            estado: true,
            codigoValidacion:
              true,
            fechaRetiro: true,
            fechaEntrega: true,
            observaciones: true,
            createdAt: true,

            mozo: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
              },
            },
          },
        },
      },
    });

  if (!order) {
    throw new AppError(
      404,
      "El pedido no existe o no puedes consultarlo.",
      "PEDIDO_NO_ENCONTRADO",
    );
  }

  const total =
    Number(
      order.detalles
        .reduce(
          (
            accumulator,
            detail,
          ) =>
            accumulator +
            Number(
              detail.subtotal,
            ),
          0,
        )
        .toFixed(2),
    );

  return {
    ...order,

    total,

    createdAt:
      order.createdAt
        .toISOString(),

    updatedAt:
      order.updatedAt
        .toISOString(),

    enviadoAt:
      order.enviadoAt
        ?.toISOString() ??
      null,

    pagadoAt:
      order.pagadoAt
        ?.toISOString() ??
      null,

    canceladoAt:
      order.canceladoAt
        ?.toISOString() ??
      null,

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
      ...order.vendedor,

      nombreCompleto:
        userFullName(
          order.vendedor,
        ),
    },

    mozo:
      order.mozo
        ? {
            ...order.mozo,

            nombreCompleto:
              userFullName(
                order.mozo,
              ),
          }
        : null,

    reserva:
      order.reserva
        ? {
            ...order.reserva,

            fechaReserva:
              order.reserva
                .fechaReserva
                .toISOString()
                .slice(0, 10),

            horaReserva:
              order.reserva
                .horaReserva
                .toISOString()
                .slice(11, 16),
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

          createdAt:
            detail.createdAt
              .toISOString(),

          updatedAt:
            detail.updatedAt
              .toISOString(),

          productoSucursal: {
            ...detail
              .productoSucursal,

            precioVenta:
              Number(
                detail
                  .productoSucursal
                  .precioVenta,
              ),
          },
        }),
      ),

    comandas:
      order.comandas.map(
        (command) => ({
          id: command.id,
          codigo: command.codigo,
          destino:
            command.destino,
          prioridad:
            command.prioridad,
          estado: command.estado,

          fechaInicio:
            command.fechaInicio
              ?.toISOString() ??
            null,

          fechaFinalizacion:
            command
              .fechaFinalizacion
              ?.toISOString() ??
            null,

          createdAt:
            command.createdAt
              .toISOString(),

          cantidadDetalles:
            command._count
              .detalles,
        }),
      ),

    entregas:
      order.entregas.map(
        (delivery) => ({
          ...delivery,

          fechaRetiro:
            delivery.fechaRetiro
              ?.toISOString() ??
            null,

          fechaEntrega:
            delivery.fechaEntrega
              ?.toISOString() ??
            null,

          createdAt:
            delivery.createdAt
              .toISOString(),

          mozo: {
            id:
              delivery.mozo.id,

            nombreCompleto:
              userFullName(
                delivery.mozo,
              ),
          },
        }),
      ),
  };
}

export async function createOrder(
  auth: OrderAuth,
  input: CreateOrderInput,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  assertAuthorizedBranch(
    branches,
    input.sucursalId,
  );

  let sellerId:
    string;

  if (
    auth.rol ===
    "VENDEDOR"
  ) {
    sellerId =
      auth.usuarioId;
  } else {
    sellerId =
      input.vendedorId ??
      auth.usuarioId;
  }

  /*
   * El administrador actual puede actuar como
   * vendedor al registrar un pedido.
   */
  if (
    sellerId !==
      auth.usuarioId ||
    !isAdministrator(auth.rol)
  ) {
    await validateAssignedWorker(
      sellerId,
      input.sucursalId,
      ["VENDEDOR"],
      "El vendedor seleccionado",
    );
  }

  if (input.mozoId) {
    await validateAssignedWorker(
      input.mozoId,
      input.sucursalId,
      ["MOZO"],
      "El mozo seleccionado",
    );
  }

  if (input.zonaId) {
    const zone =
      await prisma.zona.findFirst({
        where: {
          id: input.zonaId,

          sucursalId:
            input.sucursalId,

          estado: "ACTIVO",
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (!zone) {
      throw new AppError(
        404,
        "La zona no existe, no está activa o no pertenece a la sucursal.",
        "ZONA_PEDIDO_INVALIDA",
      );
    }
  }

  if (input.clienteId) {
    const client =
      await prisma.usuario.findFirst({
        where: {
          id: input.clienteId,
          estado: "ACTIVO",
          deletedAt: null,

          rol: {
            codigo: "CLIENTE",
            activo: true,
          },
        },

        select: {
          id: true,
        },
      });

    if (!client) {
      throw new AppError(
        404,
        "El cliente no existe o no se encuentra activo.",
        "CLIENTE_NO_ENCONTRADO",
      );
    }
  }

  const productIds =
    input.detalles.map(
      (detail) =>
        detail
          .productoSucursalId,
    );

  const products =
    await prisma
      .productoSucursal
      .findMany({
        where: {
          id: {
            in: productIds,
          },

          sucursalId:
            input.sucursalId,

          estado: "ACTIVO",

          disponibleVenta:
            true,

          producto: {
            estado: "ACTIVO",
            deletedAt: null,
          },
        },

        select: {
          id: true,
          precioVenta: true,

          producto: {
            select: {
              nombre: true,
            },
          },
        },
      });

  if (
    products.length !==
    productIds.length
  ) {
    throw new AppError(
      400,
      "Uno o más productos no existen, están inactivos o no pertenecen a la sucursal.",
      "PRODUCTO_PEDIDO_INVALIDO",
    );
  }

  const productMap =
    new Map(
      products.map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );

  const details =
    input.detalles.map(
      (detail) => {
        const product =
          productMap.get(
            detail
              .productoSucursalId,
          );

        if (!product) {
          throw new AppError(
            400,
            "No se pudo procesar uno de los productos.",
            "PRODUCTO_PEDIDO_INVALIDO",
          );
        }

        const unitPrice =
          Number(
            product
              .precioVenta,
          );

        const subtotal =
          Number(
            (
              unitPrice *
              detail.cantidad
            ).toFixed(2),
          );

        return {
          productoSucursalId:
            product.id,

          nombreProducto:
            product.producto
              .nombre,

          cantidad:
            detail.cantidad,

          precioUnitario:
            unitPrice,

          subtotal,

          observaciones:
            detail
              .observaciones,

          estado:
            "PENDIENTE" as const,
        };
      },
    );

  const createdOrder =
    await withSerializableTransaction(
      async (transaction) => {
        await assertDraftStockAvailable(
          transaction,
          input.detalles,
        );

        const correlativo =
          await transaction
            .correlativo
            .upsert({
              where: {
                sucursalId_tipoDocumento:
                  {
                    sucursalId:
                      input.sucursalId,

                    tipoDocumento:
                      "PEDIDO",
                  },
              },

              update: {
                ultimoNumero: {
                  increment: 1,
                },
              },

              create: {
                sucursalId:
                  input.sucursalId,

                tipoDocumento:
                  "PEDIDO",

                prefijo: "P",
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

        const numberText =
          correlativo
            .ultimoNumero
            .toString()
            .padStart(
              correlativo
                .longitudNumero,
              "0",
            );

        const code =
          `${correlativo.prefijo}-${numberText}`;

        return transaction
          .pedido
          .create({
            data: {
              codigo: code,

              sucursalId:
                input.sucursalId,

              clienteId:
                input.clienteId,

              vendedorId:
                sellerId,

              mozoId:
                input.mozoId,

              zonaId:
                input.zonaId,

              tipoPedido:
                input.tipoPedido,

              estado:
                "ABIERTO",

              observaciones:
                input.observaciones,

              detalles: {
                create: details,
              },
            },

            select: {
              id: true,
            },
          });
      },
    );

  return getOrderById(
    auth,
    createdOrder.id,
  );
}

async function getOrderForOperation(
  auth: OrderAuth,
  orderId: string,
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

  const order =
    await prisma.pedido.findFirst({
      where: {
        id: orderId,

        sucursalId: {
          in: branchIds,
        },

        ...createOrderAccessWhere(
          auth,
        ),
      },

      select: {
        id: true,
        codigo: true,
        sucursalId: true,
        reservaId: true,
        vendedorId: true,
        tipoPedido: true,
        estado: true,
        updatedAt: true,
        observaciones: true,

        detalles: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,

            productoSucursalId:
              true,

            nombreProducto:
              true,

            cantidad: true,
            cantidadComprometida: true,

            precioUnitario:
              true,

            subtotal: true,

            observaciones: true,
            estado: true,

            productoSucursal: {
              select: {
                id: true,

                producto: {
                  select: {
                    id: true,
                    nombre: true,
                    tipoStock: true,

                    requierePreparacion:
                      true,

                    destinoPreparacion:
                      true,
                  },
                },
              },
            },
          },
        },

        reserva: {
          select: {
            codigo: true,
            fechaReserva: true,
            detalles: {
              select: {
                id: true,
                productoSucursalId: true,
                nombreProducto: true,
                cantidadComprometida: true,
                estado: true,
                productoSucursal: {
                  select: {
                    producto: {
                      select: {
                        tipoStock: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },

        _count: {
          select: {
            comandas: true,
            entregas: true,
          },
        },
      },
    });

  if (!order) {
    throw new AppError(
      404,
      "El pedido no existe o no puedes administrarlo.",
      "PEDIDO_NO_ENCONTRADO",
    );
  }

  return order;
}

async function commitStockForSentOrder(
  transaction: Prisma.TransactionClient,
  auth: OrderAuth,
  order: Awaited<ReturnType<typeof getOrderForOperation>>,
): Promise<void> {
  const notifications = new Set<string>();
  const orderProductIds = new Set(
    order.detalles.map((detail) => detail.productoSucursalId),
  );

  /*
   * Primero liberamos el compromiso de la reserva vinculada. Luego la
   * cantidad pasa a pertenecer al pedido, evitando contabilizarla dos veces.
   */
  for (const reservedDetail of order.reserva?.detalles ?? []) {
    const commitment = Number(reservedDetail.cantidadComprometida);
    if (commitment <= 0) continue;

    const stockType = reservedDetail.productoSucursal.producto.tipoStock;
    const stock = stockType === "PERMANENTE"
      ? await transaction.stockPermanente.findUnique({
        where: { productoSucursalId: reservedDetail.productoSucursalId },
      })
      : stockType === "DIARIO"
        ? await transaction.stockDiario.findUnique({
          where: {
            productoSucursalId_fecha: {
              productoSucursalId: reservedDetail.productoSucursalId,
              fecha: order.reserva?.fechaReserva ?? getOperationalDate(),
            },
          },
        })
        : null;

    if (stockType !== "SIN_CONTROL" && !stock) {
      throw new AppError(
        409,
        `No se pudo verificar el stock comprometido de "${reservedDetail.nombreProducto}".`,
        "STOCK_COMPROMETIDO_NO_ENCONTRADO",
      );
    }

    if (stock) {
      const currentQuantity = Number(stock.cantidadActual);
      const resultingCommitted = Math.max(
        0,
        Number(stock.cantidadComprometida) - commitment,
      );

      if (stockType === "PERMANENTE") {
        await transaction.stockPermanente.update({
          where: { id: stock.id },
          data: { cantidadComprometida: resultingCommitted },
        });
      } else {
        await transaction.stockDiario.update({
          where: { id: stock.id },
          data: { cantidadComprometida: resultingCommitted },
        });
      }

      await transaction.movimientoInventario.create({
        data: {
          productoSucursalId: reservedDetail.productoSucursalId,
          usuarioId: auth.usuarioId,
          tipoMovimiento: "LIBERACION_RESERVA",
          cantidad: commitment,
          cantidadAnterior: currentQuantity,
          cantidadResultante: currentQuantity,
          motivo: `Transferencia de stock de la reserva ${order.reserva?.codigo ?? ""} al pedido ${order.codigo}.`,
          referenciaTipo: "RESERVA",
          referenciaId: order.reservaId,
        },
      });
      notifications.add(reservedDetail.productoSucursalId);
    }

    await transaction.detalleReserva.update({
      where: { id: reservedDetail.id },
      data: {
        cantidadComprometida: 0,
        estado: orderProductIds.has(reservedDetail.productoSucursalId)
          ? "APROBADO"
          : "LIBERADO",
      },
    });
  }

  const operationalDate = getOperationalDate();

  for (const detail of order.detalles) {
    const stockType = detail.productoSucursal.producto.tipoStock;
    if (stockType === "SIN_CONTROL") continue;

    const stock = stockType === "PERMANENTE"
      ? await transaction.stockPermanente.findUnique({
        where: { productoSucursalId: detail.productoSucursalId },
      })
      : await transaction.stockDiario.findUnique({
        where: {
          productoSucursalId_fecha: {
            productoSucursalId: detail.productoSucursalId,
            fecha: operationalDate,
          },
        },
      });

    if (!stock) {
      throw new AppError(
        409,
        stockType === "DIARIO"
          ? `El producto "${detail.nombreProducto}" no tiene apertura de stock para hoy.`
          : `El producto "${detail.nombreProducto}" no tiene stock permanente configurado.`,
        stockType === "DIARIO"
          ? "STOCK_DIARIO_NO_ABIERTO"
          : "STOCK_NO_CONFIGURADO",
      );
    }

    const quantity = Number(detail.cantidad);
    const currentQuantity = Number(stock.cantidadActual);
    const committedQuantity = Number(stock.cantidadComprometida);
    const available = calculateAvailableStock(currentQuantity, committedQuantity);

    if (!hasSufficientStock(quantity, available)) {
      throw new AppError(
        409,
        `No existe stock suficiente de "${detail.nombreProducto}". Solicitado: ${quantity}; disponible: ${available}. El pedido no fue enviado.`,
        "STOCK_INSUFICIENTE",
      );
    }

    if (stockType === "PERMANENTE") {
      await transaction.stockPermanente.update({
        where: { id: stock.id },
        data: { cantidadComprometida: { increment: quantity } },
      });
    } else {
      await transaction.stockDiario.update({
        where: { id: stock.id },
        data: { cantidadComprometida: { increment: quantity } },
      });
    }

    await transaction.detallePedido.update({
      where: { id: detail.id },
      data: { cantidadComprometida: quantity },
    });

    await transaction.movimientoInventario.create({
      data: {
        productoSucursalId: detail.productoSucursalId,
        usuarioId: auth.usuarioId,
        tipoMovimiento: "COMPROMISO_PEDIDO",
        cantidad: quantity,
        cantidadAnterior: currentQuantity,
        cantidadResultante: currentQuantity,
        motivo: `Stock comprometido al enviar el pedido ${order.codigo}.`,
        referenciaTipo: "PEDIDO",
        referenciaId: order.id,
      },
    });
    notifications.add(detail.productoSucursalId);
  }

  for (const productBranchId of notifications) {
    await evaluateStockNotification(transaction, productBranchId);
  }
}

async function buildOrderDetails(
  branchId: string,
  inputDetails:
    UpdateOrderInput["detalles"],
) {
  const productIds =
    inputDetails.map(
      (detail) =>
        detail
          .productoSucursalId,
    );

  const products =
    await prisma
      .productoSucursal
      .findMany({
        where: {
          id: {
            in: productIds,
          },

          sucursalId:
            branchId,

          estado: "ACTIVO",

          disponibleVenta:
            true,

          producto: {
            estado: "ACTIVO",
            deletedAt: null,
          },
        },

        select: {
          id: true,
          precioVenta: true,

          producto: {
            select: {
              nombre: true,
            },
          },
        },
      });

  if (
    products.length !==
    productIds.length
  ) {
    throw new AppError(
      400,
      "Uno o más productos no existen, están inactivos o no pertenecen a la sucursal.",
      "PRODUCTO_PEDIDO_INVALIDO",
    );
  }

  const productMap =
    new Map(
      products.map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );

  return inputDetails.map(
    (detail) => {
      const product =
        productMap.get(
          detail
            .productoSucursalId,
        );

      if (!product) {
        throw new AppError(
          400,
          "No se pudo procesar uno de los productos.",
          "PRODUCTO_PEDIDO_INVALIDO",
        );
      }

      const unitPrice =
        Number(
          product.precioVenta,
        );

      const subtotal =
        Number(
          (
            unitPrice *
            detail.cantidad
          ).toFixed(2),
        );

      return {
        productoSucursalId:
          product.id,

        nombreProducto:
          product.producto
            .nombre,

        cantidad:
          detail.cantidad,

        precioUnitario:
          unitPrice,

        subtotal,

        observaciones:
          detail.observaciones,

        estado:
          "PENDIENTE" as const,
      };
    },
  );
}

export async function updateOrder(
  auth: OrderAuth,
  orderId: string,
  input: UpdateOrderInput,
) {
  const order =
    await getOrderForOperation(
      auth,
      orderId,
    );

  if (
    order.estado !==
    "ABIERTO"
  ) {
    throw new AppError(
      409,
      "Solo los pedidos abiertos pueden modificarse.",
      "PEDIDO_NO_EDITABLE",
    );
  }

  if (
    order._count.comandas >
      0 ||
    order._count.entregas >
      0
  ) {
    throw new AppError(
      409,
      "El pedido ya tiene operaciones relacionadas y no puede modificarse.",
      "PEDIDO_CON_OPERACIONES",
    );
  }

  if (input.mozoId) {
    await validateAssignedWorker(
      input.mozoId,
      order.sucursalId,
      ["MOZO"],
      "El mozo seleccionado",
    );
  }

  if (input.zonaId) {
    const zone =
      await prisma.zona.findFirst({
        where: {
          id: input.zonaId,

          sucursalId:
            order.sucursalId,

          estado: "ACTIVO",
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (!zone) {
      throw new AppError(
        404,
        "La zona no existe, no está activa o no pertenece a la sucursal.",
        "ZONA_PEDIDO_INVALIDA",
      );
    }
  }

  if (input.clienteId) {
    const client =
      await prisma.usuario.findFirst({
        where: {
          id: input.clienteId,

          estado: "ACTIVO",
          deletedAt: null,

          rol: {
            codigo: "CLIENTE",
            activo: true,
          },
        },

        select: {
          id: true,
        },
      });

    if (!client) {
      throw new AppError(
        404,
        "El cliente no existe o no se encuentra activo.",
        "CLIENTE_NO_ENCONTRADO",
      );
    }
  }

  const details =
    await buildOrderDetails(
      order.sucursalId,
      input.detalles,
    );

  await withSerializableTransaction(
    async (transaction) => {
      await assertDraftStockAvailable(
        transaction,
        input.detalles,
      );

      const updateResult =
        await transaction
          .pedido
          .updateMany({
            where: {
              id: order.id,
              estado: "ABIERTO",
              updatedAt: order.updatedAt,
            },

            data: {
              clienteId:
                input.clienteId,

              mozoId:
                input.mozoId,

              zonaId:
                input.zonaId,

              tipoPedido:
                input.tipoPedido,

              observaciones:
                input.observaciones,
            },
          });

      if (
        updateResult.count !== 1
      ) {
        throw new AppError(
          409,
          "El pedido cambió de estado y ya no puede modificarse.",
          "PEDIDO_NO_EDITABLE",
        );
      }

      await transaction
        .detallePedido
        .deleteMany({
          where: {
            pedidoId:
              order.id,
          },
        });

      await transaction
        .detallePedido
        .createMany({
          data:
            details.map(
              (detail) => ({
                pedidoId:
                  order.id,

                ...detail,
              }),
            ),
        });
    },
  );

  return getOrderById(
    auth,
    order.id,
  );
}

export async function sendOrder(
  auth: OrderAuth,
  orderId: string,
  input: SendOrderInput,
) {
  const order =
    await getOrderForOperation(
      auth,
      orderId,
    );

  if (
    order.estado !==
    "ABIERTO"
  ) {
    throw new AppError(
      409,
      "Solo los pedidos abiertos pueden enviarse.",
      "PEDIDO_NO_ENVIABLE",
    );
  }

  if (
    order.detalles.length === 0
  ) {
    throw new AppError(
      400,
      "El pedido debe contener al menos un producto.",
      "PEDIDO_SIN_PRODUCTOS",
    );
  }

  const invalidProducts =
    order.detalles.filter(
      (detail) =>
        detail
          .productoSucursal
          .producto
          .requierePreparacion &&
        detail
          .productoSucursal
          .producto
          .destinoPreparacion ===
          "NINGUNO",
    );

  if (
    invalidProducts.length > 0
  ) {
    throw new AppError(
      409,
      `El producto "${invalidProducts[0]?.nombreProducto}" requiere preparación, pero no tiene destino configurado.`,
      "DESTINO_PREPARACION_NO_CONFIGURADO",
    );
  }

  const kitchenDetails =
    order.detalles.filter(
      (detail) =>
        detail
          .productoSucursal
          .producto
          .requierePreparacion &&
        detail
          .productoSucursal
          .producto
          .destinoPreparacion ===
          "COCINA",
    );

  const barDetails =
    order.detalles.filter(
      (detail) =>
        detail
          .productoSucursal
          .producto
          .requierePreparacion &&
        detail
          .productoSucursal
          .producto
          .destinoPreparacion ===
          "BARRA",
    );

  const directDetails =
    order.detalles.filter(
      (detail) =>
        !detail
          .productoSucursal
          .producto
          .requierePreparacion,
    );

  const commandGroups = [
    {
      destino:
        "COCINA" as const,

      detalles:
        kitchenDetails,
    },
    {
      destino:
        "BARRA" as const,

      detalles:
        barDetails,
    },
  ].filter(
    (group) =>
      group.detalles.length >
      0,
  );

  const nextOrderStatus =
    commandGroups.length > 0
      ? "ENVIADO"
      : "LISTO";

  await withSerializableTransaction(
    async (transaction) => {
      /*
       * Este update condicional evita que dos solicitudes
       * envíen el mismo pedido simultáneamente.
       */
      const updateResult =
        await transaction
          .pedido
          .updateMany({
            where: {
              id: order.id,
              estado: "ABIERTO",
              updatedAt: order.updatedAt,
            },

            data: {
              estado:
                nextOrderStatus,

              enviadoAt:
                new Date(),
            },
          });

      if (
        updateResult.count !== 1
      ) {
        throw new AppError(
          409,
          "El pedido ya fue enviado o cambió de estado.",
          "PEDIDO_YA_ENVIADO",
        );
      }

      /*
       * La reserva de stock forma parte de la misma transacción. Si no hay
       * existencias, el cambio de estado anterior se revierte por completo.
       */
      await commitStockForSentOrder(
        transaction,
        auth,
        order,
      );

      const preparedDetailIds = [
        ...kitchenDetails,
        ...barDetails,
      ].map(
        (detail) =>
          detail.id,
      );

      if (
        preparedDetailIds.length >
        0
      ) {
        await transaction
          .detallePedido
          .updateMany({
            where: {
              id: {
                in:
                  preparedDetailIds,
              },
            },

            data: {
              estado:
                "ENVIADO",
            },
          });
      }

      const directDetailIds =
        directDetails.map(
          (detail) =>
            detail.id,
        );

      if (
        directDetailIds.length >
        0
      ) {
        await transaction
          .detallePedido
          .updateMany({
            where: {
              id: {
                in:
                  directDetailIds,
              },
            },

            data: {
              estado:
                "LISTO",
            },
          });
      }

      for (
        const group
        of commandGroups
      ) {
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
                      "COMANDA",
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
                  "COMANDA",

                prefijo: "C",
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

        const numberText =
          correlativo
            .ultimoNumero
            .toString()
            .padStart(
              correlativo
                .longitudNumero,
              "0",
            );

        const commandCode =
          `${correlativo.prefijo}-${numberText}`;

        await transaction
          .comanda
          .create({
            data: {
              codigo:
                commandCode,

              sucursalId:
                order.sucursalId,

              pedidoId:
                order.id,

              destino:
                group.destino,

              prioridad:
                input.prioridad,

              estado:
                "PENDIENTE",

              detalles: {
                create:
                  group.detalles.map(
                    (detail) => ({
                      detallePedidoId:
                        detail.id,

                      cantidad:
                        detail.cantidad,

                      observaciones:
                        detail
                          .observaciones,

                      estado:
                        "PENDIENTE",
                    }),
                  ),
              },
            },
          });
      }
    },
  );

  return getOrderById(
    auth,
    order.id,
  );
}
