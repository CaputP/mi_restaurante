import {
  randomInt,
} from "node:crypto";

import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { withSerializableTransaction } from "../../lib/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  CreateDeliveryInput,
  DeliveryOptionsQuery,
  ListDeliveriesQuery,
  ReadyOrdersQuery,
} from "./delivery.schema.js";

type DeliveryAuth = {
  usuarioId: string;
  rol: string;
};

const EPSILON = 0.0001;

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

async function getAuthorizedBranches(
  auth: DeliveryAuth,
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
        branch.id === branchId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes autorización para administrar esa sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

async function validateAssignedWaiter(
  waiterId: string,
  branchId: string,
) {
  const operationalDate =
    getOperationalDate();

  const assignment =
    await prisma
      .usuarioSucursal
      .findFirst({
        where: {
          usuarioId:
            waiterId,

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
              codigo: "MOZO",
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
            },
          },
        },
      });

  if (!assignment) {
    throw new AppError(
      400,
      "El mozo no existe, no está activo o no pertenece a la sucursal.",
      "MOZO_ENTREGA_INVALIDO",
    );
  }

  return assignment.usuario;
}

function createDeliveryAccessWhere(
  auth: DeliveryAuth,
): Prisma.EntregaPedidoWhereInput {
  if (
    auth.rol === "MOZO"
  ) {
    return {
      mozoId:
        auth.usuarioId,
    };
  }

  return {};
}

export async function getDeliveryOptions(
  auth: DeliveryAuth,
  query: DeliveryOptionsQuery,
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

  const waiters =
    selectedBranchId
      ? await prisma
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
                  codigo: "MOZO",
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
                },
              },
            },

            orderBy: {
              createdAt: "asc",
            },
          })
      : [];

  return {
    sucursales:
      branches,

    sucursalSeleccionadaId:
      selectedBranchId ??
      null,

    mozos:
      waiters
        .map(
          (assignment) => ({
            id:
              assignment.usuario.id,

            nombreCompleto:
              userFullName(
                assignment.usuario,
              ),

            correo:
              assignment.usuario.correo,
          }),
        )
        .filter(
          (waiter) =>
            auth.rol !== "MOZO" ||
            waiter.id ===
              auth.usuarioId,
        ),

    estados: [
      {
        codigo:
          "PENDIENTE",
        nombre:
          "Pendiente",
      },
      {
        codigo:
          "RETIRADA",
        nombre:
          "Retirada",
      },
      {
        codigo:
          "ENTREGADA",
        nombre:
          "Entregada",
      },
      {
        codigo:
          "ANULADA",
        nombre:
          "Anulada",
      },
    ],
  };
}

export async function getReadyOrders(
  auth: DeliveryAuth,
  query: ReadyOrdersQuery,
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
      pedidos: [],
    };
  }

  const orders =
    await prisma.pedido.findMany({
      where: {
        sucursalId: {
          in:
            branchIds,
        },

        estado: {
          in: [
            "LISTO",
            "ENTREGA_PARCIAL",
          ],
        },

        ...(auth.rol ===
        "MOZO"
          ? {
              OR: [
                {
                  mozoId:
                    auth.usuarioId,
                },
                {
                  mozoId: null,
                },
              ],
            }
          : {}),

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
                  zona: {
                    nombre: {
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
      },

      take:
        query.limit,

      orderBy: {
        createdAt: "asc",
      },

      select: {
        id: true,
        codigo: true,
        tipoPedido: true,
        estado: true,
        createdAt: true,
        observaciones: true,

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },

        cliente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            telefono: true,
          },
        },

        mozo: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        zona: {
          select: {
            id: true,
            nombre: true,
          },
        },

        detalles: {
          where: {
            estado: {
              in: [
                "LISTO",
                "ENTREGA_PARCIAL",
              ],
            },
          },

          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            nombreProducto: true,
            cantidad: true,
            estado: true,

            productoSucursal: {
              select: {
                producto: {
                  select: {
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

            entregas: {
              where: {
                entregaPedido: {
                  estado: {
                    not:
                      "ANULADA",
                  },
                },
              },

              select: {
                cantidadEntregada:
                  true,
              },
            },
          },
        },
      },
    });

  const mappedOrders =
    orders
      .map(
        (order) => ({
          ...order,

          createdAt:
            order.createdAt
              .toISOString(),

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

          detalles:
            order.detalles
              .map(
                (detail) => {
                  const orderedQuantity =
                    Number(
                      detail.cantidad,
                    );

                  const committedQuantity =
                    detail.entregas
                      .reduce(
                        (
                          accumulator,
                          delivery,
                        ) =>
                          accumulator +
                          Number(
                            delivery
                              .cantidadEntregada,
                          ),
                        0,
                      );

                  const availableQuantity =
                    Math.max(
                      0,
                      orderedQuantity -
                        committedQuantity,
                    );

                  return {
                    id:
                      detail.id,

                    nombreProducto:
                      detail
                        .nombreProducto,

                    cantidad:
                      orderedQuantity,

                    cantidadComprometida:
                      committedQuantity,

                    cantidadDisponible:
                      availableQuantity,

                    estado:
                      detail.estado,

                    unidadMedida:
                      detail
                        .productoSucursal
                        .producto
                        .unidadMedida
                        .abreviatura,
                  };
                },
              )
              .filter(
                (detail) =>
                  detail
                    .cantidadDisponible >
                  EPSILON,
              ),
        }),
      )
      .filter(
        (order) =>
          order.detalles.length >
          0,
      );

  return {
    pedidos:
      mappedOrders,
  };
}

export async function listDeliveries(
  auth: DeliveryAuth,
  query: ListDeliveriesQuery,
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
      entregas: [],

      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 1,
      },
    };
  }

  const where:
    Prisma.EntregaPedidoWhereInput = {
      pedido: {
        sucursalId: {
          in:
            branchIds,
        },
      },

      ...createDeliveryAccessWhere(
        auth,
      ),

      ...(query.estado ===
      "ACTIVAS"
        ? {
            estado: {
              in: [
                "PENDIENTE",
                "RETIRADA",
              ],
            },
          }
        : query.estado !==
          "TODOS"
          ? {
              estado:
                query.estado,
            }
          : {}),

      ...(query.search
        ? {
            OR: [
              {
                codigoValidacion: {
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
                pedido: {
                  cliente: {
                    nombres: {
                      contains:
                        query.search,

                      mode:
                        "insensitive",
                    },
                  },
                },
              },
              {
                pedido: {
                  cliente: {
                    apellidos: {
                      contains:
                        query.search,

                      mode:
                        "insensitive",
                    },
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
    deliveries,
  ] = await prisma.$transaction([
    prisma.entregaPedido.count({
      where,
    }),

    prisma.entregaPedido.findMany({
      where,

      skip,
      take:
        query.limit,

      orderBy: {
        createdAt: "desc",
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
        updatedAt: true,

        mozo: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        pedido: {
          select: {
            id: true,
            codigo: true,
            tipoPedido: true,
            estado: true,

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

            cliente: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
              },
            },
          },
        },

        detalles: {
          select: {
            cantidadEntregada:
              true,
          },
        },
      },
    }),
  ]);

  return {
    entregas:
      deliveries.map(
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

          updatedAt:
            delivery.updatedAt
              .toISOString(),

          cantidadProductos:
            delivery.detalles
              .length,

          cantidadUnidades:
            delivery.detalles
              .reduce(
                (
                  accumulator,
                  detail,
                ) =>
                  accumulator +
                  Number(
                    detail
                      .cantidadEntregada,
                  ),
                0,
              ),

          mozo: {
            id:
              delivery.mozo.id,

            nombreCompleto:
              userFullName(
                delivery.mozo,
              ),
          },

          pedido: {
            ...delivery.pedido,

            cliente:
              delivery.pedido
                .cliente
                ? {
                    ...delivery
                      .pedido
                      .cliente,

                    nombreCompleto:
                      userFullName(
                        delivery
                          .pedido
                          .cliente,
                      ),
                  }
                : null,
          },
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

export async function getDeliveryById(
  auth: DeliveryAuth,
  deliveryId: string,
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

  const delivery =
    await prisma
      .entregaPedido
      .findFirst({
        where: {
          id: deliveryId,

          pedido: {
            sucursalId: {
              in:
                branchIds,
            },
          },

          ...createDeliveryAccessWhere(
            auth,
          ),
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
          updatedAt: true,

          mozo: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              telefono: true,
            },
          },

          pedido: {
            select: {
              id: true,
              codigo: true,
              tipoPedido: true,
              estado: true,
              observaciones: true,
              createdAt: true,

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
                },
              },

              cliente: {
                select: {
                  id: true,
                  nombres: true,
                  apellidos: true,
                  telefono: true,
                },
              },
            },
          },

          detalles: {
            orderBy: {
              createdAt: "asc",
            },

            select: {
              id: true,
              cantidadEntregada:
                true,
              createdAt: true,

              detallePedido: {
                select: {
                  id: true,
                  nombreProducto:
                    true,
                  cantidad: true,
                  estado: true,

                  productoSucursal: {
                    select: {
                      producto: {
                        select: {
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
            },
          },
        },
      });

  if (!delivery) {
    throw new AppError(
      404,
      "La entrega no existe o no puedes consultarla.",
      "ENTREGA_NO_ENCONTRADA",
    );
  }

  return {
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

    updatedAt:
      delivery.updatedAt
        .toISOString(),

    mozo: {
      ...delivery.mozo,

      nombreCompleto:
        userFullName(
          delivery.mozo,
        ),
    },

    pedido: {
      ...delivery.pedido,

      createdAt:
        delivery.pedido
          .createdAt
          .toISOString(),

      cliente:
        delivery.pedido.cliente
          ? {
              ...delivery.pedido
                .cliente,

              nombreCompleto:
                userFullName(
                  delivery.pedido
                    .cliente,
                ),
            }
          : null,
    },

    detalles:
      delivery.detalles.map(
        (detail) => ({
          ...detail,

          cantidadEntregada:
            Number(
              detail
                .cantidadEntregada,
            ),

          createdAt:
            detail.createdAt
              .toISOString(),

          detallePedido: {
            ...detail
              .detallePedido,

            cantidad:
              Number(
                detail
                  .detallePedido
                  .cantidad,
              ),

            unidadMedida:
              detail
                .detallePedido
                .productoSucursal
                .producto
                .unidadMedida
                .abreviatura,
          },
        }),
      ),
  };
}

async function generateValidationCode(
  transaction:
    Prisma.TransactionClient,
): Promise<string> {
  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const code =
      randomInt(
        100000,
        1000000,
      ).toString();

    const existing =
      await transaction
        .entregaPedido
        .findUnique({
          where: {
            codigoValidacion:
              code,
          },

          select: {
            id: true,
          },
        });

    if (!existing) {
      return code;
    }
  }

  throw new AppError(
    500,
    "No se pudo generar el código de validación de la entrega.",
    "CODIGO_ENTREGA_NO_GENERADO",
  );
}

export async function createDelivery(
  auth: DeliveryAuth,
  orderId: string,
  input: CreateDeliveryInput,
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

  if (
    branchIds.length === 0
  ) {
    throw new AppError(
      403,
      "No tienes una sucursal autorizada.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }

  const createdDelivery =
    await withSerializableTransaction(
      async (transaction) => {
        const order =
          await transaction
            .pedido
            .findFirst({
              where: {
                id: orderId,

                sucursalId: {
                  in:
                    branchIds,
                },

                estado: {
                  in: [
                    "LISTO",
                    "ENTREGA_PARCIAL",
                  ],
                },

                ...(auth.rol ===
                "MOZO"
                  ? {
                      OR: [
                        {
                          mozoId:
                            auth.usuarioId,
                        },
                        {
                          mozoId:
                            null,
                        },
                      ],
                    }
                  : {}),
              },

              select: {
                id: true,
                codigo: true,
                sucursalId: true,
                mozoId: true,
                estado: true,

                detalles: {
                  orderBy: {
                    createdAt:
                      "asc",
                  },

                  select: {
                    id: true,
                    nombreProducto:
                      true,
                    cantidad: true,
                    estado: true,

                    entregas: {
                      where: {
                        entregaPedido: {
                          estado: {
                            not:
                              "ANULADA",
                          },
                        },
                      },

                      select: {
                        cantidadEntregada:
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
            "El pedido no existe, no está listo o no puedes entregarlo.",
            "PEDIDO_NO_ENTREGABLE",
          );
        }

        const waiterId =
          auth.rol === "MOZO"
            ? auth.usuarioId
            : input.mozoId ??
              order.mozoId;

        if (!waiterId) {
          throw new AppError(
            400,
            "Selecciona el mozo responsable de la entrega.",
            "MOZO_ENTREGA_REQUERIDO",
          );
        }

        await validateAssignedWaiter(
          waiterId,
          order.sucursalId,
        );

        if (
          order.mozoId &&
          order.mozoId !==
            waiterId
        ) {
          throw new AppError(
            409,
            "El pedido ya está asignado a otro mozo.",
            "PEDIDO_ASIGNADO_OTRO_MOZO",
          );
        }

        const requestedMap =
          new Map(
            input.detalles.map(
              (detail) => [
                detail
                  .detallePedidoId,

                detail
                  .cantidadEntregada,
              ],
            ),
          );

        const deliveryDetails =
          input.detalles.map(
            (inputDetail) => {
              const orderDetail =
                order.detalles.find(
                  (detail) =>
                    detail.id ===
                    inputDetail
                      .detallePedidoId,
                );

              if (!orderDetail) {
                throw new AppError(
                  400,
                  "Uno de los productos no pertenece al pedido.",
                  "DETALLE_ENTREGA_INVALIDO",
                );
              }

              if (
                orderDetail.estado !==
                  "LISTO" &&
                orderDetail.estado !==
                  "ENTREGA_PARCIAL"
              ) {
                throw new AppError(
                  409,
                  `El producto "${orderDetail.nombreProducto}" todavía no está disponible para entrega.`,
                  "PRODUCTO_NO_LISTO",
                );
              }

              const orderedQuantity =
                Number(
                  orderDetail.cantidad,
                );

              const committedQuantity =
                orderDetail.entregas
                  .reduce(
                    (
                      accumulator,
                      delivery,
                    ) =>
                      accumulator +
                      Number(
                        delivery
                          .cantidadEntregada,
                      ),
                    0,
                  );

              const availableQuantity =
                orderedQuantity -
                committedQuantity;

              if (
                inputDetail
                  .cantidadEntregada >
                availableQuantity +
                  EPSILON
              ) {
                throw new AppError(
                  409,
                  `La cantidad disponible de "${orderDetail.nombreProducto}" es ${Math.max(
                    0,
                    availableQuantity,
                  )}.`,
                  "CANTIDAD_ENTREGA_EXCEDIDA",
                );
              }

              return {
                detallePedidoId:
                  orderDetail.id,

                cantidadEntregada:
                  inputDetail
                    .cantidadEntregada,
              };
            },
          );

        const remainingAfterDelivery =
          order.detalles.reduce(
            (
              accumulator,
              detail,
            ) => {
              const orderedQuantity =
                Number(
                  detail.cantidad,
                );

              const committedQuantity =
                detail.entregas
                  .reduce(
                    (
                      total,
                      delivery,
                    ) =>
                      total +
                      Number(
                        delivery
                          .cantidadEntregada,
                      ),
                    0,
                  );

              const requestedQuantity =
                requestedMap.get(
                  detail.id,
                ) ?? 0;

              return (
                accumulator +
                Math.max(
                  0,
                  orderedQuantity -
                    committedQuantity -
                    requestedQuantity,
                )
              );
            },
            0,
          );

        const deliveryType =
          remainingAfterDelivery <=
          EPSILON
            ? "COMPLETA"
            : "PARCIAL";

        const validationCode =
          await generateValidationCode(
            transaction,
          );

        if (!order.mozoId) {
          await transaction
            .pedido
            .update({
              where: {
                id: order.id,
              },

              data: {
                mozoId:
                  waiterId,
              },
            });
        }

        return transaction
          .entregaPedido
          .create({
            data: {
              pedidoId:
                order.id,

              mozoId:
                waiterId,

              tipoEntrega:
                deliveryType,

              estado:
                "PENDIENTE",

              codigoValidacion:
                validationCode,

              observaciones:
                input.observaciones,

              detalles: {
                create:
                  deliveryDetails,
              },
            },

            select: {
              id: true,
            },
          });
      },
    );

  return getDeliveryById(
    auth,
    createdDelivery.id,
  );
}

async function getDeliveryForOperation(
  auth: DeliveryAuth,
  deliveryId: string,
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

  const delivery =
    await prisma
      .entregaPedido
      .findFirst({
        where: {
          id: deliveryId,

          pedido: {
            sucursalId: {
              in:
                branchIds,
            },
          },

          ...createDeliveryAccessWhere(
            auth,
          ),
        },

        select: {
          id: true,
          pedidoId: true,
          mozoId: true,
          estado: true,

          pedido: {
            select: {
              id: true,
              estado: true,
            },
          },
        },
      });

  if (!delivery) {
    throw new AppError(
      404,
      "La entrega no existe o no puedes procesarla.",
      "ENTREGA_NO_ENCONTRADA",
    );
  }

  return delivery;
}

export async function pickupDelivery(
  auth: DeliveryAuth,
  deliveryId: string,
) {
  const delivery =
    await getDeliveryForOperation(
      auth,
      deliveryId,
    );

  if (
    delivery.estado !==
    "PENDIENTE"
  ) {
    throw new AppError(
      409,
      "Solo una entrega pendiente puede retirarse.",
      "ENTREGA_NO_RETIRABLE",
    );
  }

  const updateResult =
    await prisma
      .entregaPedido
      .updateMany({
        where: {
          id: delivery.id,
          estado:
            "PENDIENTE",
        },

        data: {
          estado:
            "RETIRADA",

          fechaRetiro:
            new Date(),
        },
      });

  if (
    updateResult.count !== 1
  ) {
    throw new AppError(
      409,
      "La entrega ya fue retirada o cambió de estado.",
      "ENTREGA_YA_RETIRADA",
    );
  }

  return getDeliveryById(
    auth,
    delivery.id,
  );
}

async function synchronizeDeliveredOrder(
  transaction:
    Prisma.TransactionClient,

  orderId: string,
) {
  const order =
    await transaction.pedido
      .findUnique({
        where: {
          id:
            orderId,
        },

        select: {
          pagadoAt:
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

  const orderDetails =
    await transaction
      .detallePedido
      .findMany({
        where: {
          pedidoId:
            orderId,

          estado: {
            not:
              "CANCELADO",
          },
        },

        select: {
          id: true,
          cantidad: true,
          estado: true,
        },
      });

  const deliveredGroups =
    await transaction
      .detalleEntrega
      .groupBy({
        by: [
          "detallePedidoId",
        ],

        where: {
          entregaPedido: {
            pedidoId:
              orderId,

            estado:
              "ENTREGADA",
          },
        },

        _sum: {
          cantidadEntregada:
            true,
        },
      });

  const deliveredMap =
    new Map(
      deliveredGroups.map(
        (group) => [
          group.detallePedidoId,

          Number(
            group._sum
              .cantidadEntregada ??
              0,
          ),
        ],
      ),
    );

  let allDelivered =
    orderDetails.length > 0;

  let anyDelivered =
    false;

  for (
    const detail
    of orderDetails
  ) {
    const orderedQuantity =
      Number(
        detail.cantidad,
      );

    const deliveredQuantity =
      deliveredMap.get(
        detail.id,
      ) ?? 0;

    let nextState =
      detail.estado;

    if (
      deliveredQuantity >=
      orderedQuantity -
        EPSILON
    ) {
      nextState =
        "ENTREGADO";
      anyDelivered = true;
    } else if (
      deliveredQuantity >
      EPSILON
    ) {
      nextState =
        "ENTREGA_PARCIAL";
      anyDelivered = true;
      allDelivered = false;
    } else {
      allDelivered = false;
    }

    if (
      nextState !==
      detail.estado
    ) {
      await transaction
        .detallePedido
        .update({
          where: {
            id: detail.id,
          },

          data: {
            estado:
              nextState,
          },
        });
    }
  }

  const nextOrderStatus =
    allDelivered
      ? order.pagadoAt
        ? "PAGADO"
        : "ENTREGADO"
      : anyDelivered
        ? "ENTREGA_PARCIAL"
        : "LISTO";

  await transaction
    .pedido
    .updateMany({
      where: {
        id: orderId,

        estado: {
          in: [
            "LISTO",
            "ENTREGA_PARCIAL",
          ],
        },
      },

      data: {
        estado:
          nextOrderStatus,
      },
    });
}

export async function completeDelivery(
  auth: DeliveryAuth,
  deliveryId: string,
) {
  const delivery =
    await getDeliveryForOperation(
      auth,
      deliveryId,
    );

  if (
    delivery.estado !==
    "RETIRADA"
  ) {
    throw new AppError(
      409,
      "Solo una entrega retirada puede marcarse como entregada.",
      "ENTREGA_NO_COMPLETABLE",
    );
  }

  await withSerializableTransaction(
    async (transaction) => {
      const updateResult =
        await transaction
          .entregaPedido
          .updateMany({
            where: {
              id: delivery.id,
              estado:
                "RETIRADA",
            },

            data: {
              estado:
                "ENTREGADA",

              fechaEntrega:
                new Date(),
            },
          });

      if (
        updateResult.count !== 1
      ) {
        throw new AppError(
          409,
          "La entrega ya fue completada o cambió de estado.",
          "ENTREGA_YA_COMPLETADA",
        );
      }

      await synchronizeDeliveredOrder(
        transaction,
        delivery.pedidoId,
      );
    },
  );

  return getDeliveryById(
    auth,
    delivery.id,
  );
}
