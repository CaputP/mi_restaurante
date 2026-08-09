import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { withSerializableTransaction } from "../../lib/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createOrderReadyNotifications,
} from "../notifications/operational-notification.service.js";

import type {
  CommandOptionsQuery,
  ListCommandsQuery,
} from "./command.schema.js";

type CommandAuth = {
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

function userFullName(
  user: {
    nombres: string;
    apellidos: string;
  },
): string {
  return `${user.nombres} ${user.apellidos}`.trim();
}

async function getAuthorizedBranches(
  auth: CommandAuth,
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
      "No tienes autorización para consultar esa sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

export async function getCommandOptions(
  auth: CommandAuth,
  query: CommandOptionsQuery,
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

  return {
    sucursales: branches,

    sucursalSeleccionadaId:
      selectedBranchId ??
      null,

    destinos: [
      {
        codigo: "COCINA",
        nombre: "Cocina",
      },
      {
        codigo: "BARRA",
        nombre: "Barra",
      },
    ],

    estados: [
      {
        codigo: "PENDIENTE",
        nombre: "Pendiente",
      },
      {
        codigo: "PREPARANDO",
        nombre: "Preparando",
      },
      {
        codigo: "LISTA",
        nombre: "Lista",
      },
      {
        codigo: "RECHAZADA",
        nombre: "Rechazada",
      },
      {
        codigo: "CANCELADA",
        nombre: "Cancelada",
      },
    ],

    prioridades: [
      {
        codigo: "NORMAL",
        nombre: "Normal",
      },
      {
        codigo: "URGENTE",
        nombre: "Urgente",
      },
      {
        codigo: "EVENTO",
        nombre: "Evento",
      },
    ],
  };
}

export async function listCommands(
  auth: CommandAuth,
  query: ListCommandsQuery,
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
      comandas: [],

      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 1,
      },
    };
  }

  const where:
    Prisma.ComandaWhereInput = {
      sucursalId: {
        in: branchIds,
      },

      ...(query.destino !==
      "TODOS"
        ? {
            destino:
              query.destino,
          }
        : {}),

      ...(query.prioridad !==
      "TODAS"
        ? {
            prioridad:
              query.prioridad,
          }
        : {}),

      ...(query.estado ===
      "ACTIVAS"
        ? {
            estado: {
              in: [
                "PENDIENTE",
                "PREPARANDO",
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
                codigo: {
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
              {
                pedido: {
                  zona: {
                    nombre: {
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
    commands,
  ] = await prisma.$transaction([
    prisma.comanda.count({
      where,
    }),

    prisma.comanda.findMany({
      where,

      skip,
      take: query.limit,

      orderBy: [
        {
          prioridad: "desc",
        },
        {
          createdAt: "asc",
        },
      ],

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
        updatedAt: true,

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },

        procesadoPor: {
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
            createdAt: true,

            cliente: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
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

            zona: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },

        detalles: {
          select: {
            cantidad: true,
            estado: true,
          },
        },
      },
    }),
  ]);

  return {
    comandas:
      commands.map(
        (command) => ({
          id: command.id,
          codigo:
            command.codigo,
          destino:
            command.destino,
          prioridad:
            command.prioridad,
          estado:
            command.estado,

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

          updatedAt:
            command.updatedAt
              .toISOString(),

          sucursal:
            command.sucursal,

          procesadoPor:
            command.procesadoPor
              ? {
                  id:
                    command
                      .procesadoPor.id,

                  nombreCompleto:
                    userFullName(
                      command
                        .procesadoPor,
                    ),
                }
              : null,

          pedido: {
            id:
              command.pedido.id,

            codigo:
              command.pedido
                .codigo,

            tipoPedido:
              command.pedido
                .tipoPedido,

            estado:
              command.pedido
                .estado,

            createdAt:
              command.pedido
                .createdAt
                .toISOString(),

            cliente:
              command.pedido
                .cliente
                ? {
                    id:
                      command
                        .pedido
                        .cliente.id,

                    nombreCompleto:
                      userFullName(
                        command
                          .pedido
                          .cliente,
                      ),
                  }
                : null,

            vendedor: {
              id:
                command.pedido
                  .vendedor.id,

              nombreCompleto:
                userFullName(
                  command.pedido
                    .vendedor,
                ),
            },

            mozo:
              command.pedido
                .mozo
                ? {
                    id:
                      command
                        .pedido
                        .mozo.id,

                    nombreCompleto:
                      userFullName(
                        command
                          .pedido
                          .mozo,
                      ),
                  }
                : null,

            zona:
              command.pedido
                .zona,
          },

          cantidadDetalles:
            command.detalles.length,

          cantidadUnidades:
            command.detalles.reduce(
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

export async function getCommandById(
  auth: CommandAuth,
  commandId: string,
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

  const command =
    await prisma.comanda.findFirst({
      where: {
        id: commandId,

        sucursalId: {
          in: branchIds,
        },
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
        updatedAt: true,

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },

        procesadoPor: {
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
            observaciones: true,
            createdAt: true,

            cliente: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                telefono: true,
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

            zona: {
              select: {
                id: true,
                nombre: true,
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
            cantidad: true,
            observaciones: true,
            estado: true,
            createdAt: true,
            updatedAt: true,

            detallePedido: {
              select: {
                id: true,
                nombreProducto:
                  true,
                cantidad: true,
                precioUnitario:
                  true,
                subtotal: true,
                observaciones:
                  true,
                estado: true,

                productoSucursal: {
                  select: {
                    id: true,

                    producto: {
                      select: {
                        id: true,
                        codigo: true,
                        nombre: true,
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
          },
        },
      },
    });

  if (!command) {
    throw new AppError(
      404,
      "La comanda no existe o no puedes consultarla.",
      "COMANDA_NO_ENCONTRADA",
    );
  }

  return {
    ...command,

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

    updatedAt:
      command.updatedAt
        .toISOString(),

    procesadoPor:
      command.procesadoPor
        ? {
            id:
              command
                .procesadoPor.id,

            nombreCompleto:
              userFullName(
                command
                  .procesadoPor,
              ),
          }
        : null,

    pedido: {
      ...command.pedido,

      createdAt:
        command.pedido
          .createdAt
          .toISOString(),

      cliente:
        command.pedido.cliente
          ? {
              ...command.pedido
                .cliente,

              nombreCompleto:
                userFullName(
                  command.pedido
                    .cliente,
                ),
            }
          : null,

      vendedor: {
        id:
          command.pedido
            .vendedor.id,

        nombreCompleto:
          userFullName(
            command.pedido
              .vendedor,
          ),
      },

      mozo:
        command.pedido.mozo
          ? {
              id:
                command.pedido
                  .mozo.id,

              nombreCompleto:
                userFullName(
                  command.pedido
                    .mozo,
                ),
            }
          : null,
    },

    detalles:
      command.detalles.map(
        (detail) => ({
          ...detail,

          cantidad:
            Number(
              detail.cantidad,
            ),

          createdAt:
            detail.createdAt
              .toISOString(),

          updatedAt:
            detail.updatedAt
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

            precioUnitario:
              Number(
                detail
                  .detallePedido
                  .precioUnitario,
              ),

            subtotal:
              Number(
                detail
                  .detallePedido
                  .subtotal,
              ),
          },
        }),
      ),
  };
}

async function getCommandForOperation(
  auth: CommandAuth,
  commandId: string,
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

  const command =
    await prisma.comanda.findFirst({
      where: {
        id: commandId,

        sucursalId: {
          in: branchIds,
        },
      },

      select: {
        id: true,
        codigo: true,
        sucursalId: true,
        pedidoId: true,
        destino: true,
        estado: true,
        procesadoPorId: true,

        pedido: {
          select: {
            id: true,
            codigo: true,
            estado: true,
          },
        },

        detalles: {
          select: {
            id: true,
            detallePedidoId:
              true,
            estado: true,
          },
        },
      },
    });

  if (!command) {
    throw new AppError(
      404,
      "La comanda no existe o no puedes procesarla.",
      "COMANDA_NO_ENCONTRADA",
    );
  }

  return command;
}

async function synchronizeOrderStatus(
  transaction:
    Prisma.TransactionClient,

  orderId: string,
) {
  const commands =
    await transaction
      .comanda
      .findMany({
        where: {
          pedidoId:
            orderId,
        },

        select: {
          estado: true,
        },
      });

  if (
    commands.length === 0
  ) {
    return;
  }

  let nextStatus:
    | "ENVIADO"
    | "EN_PREPARACION"
    | "LISTO";

  if (
    commands.every(
      (command) =>
        command.estado ===
        "LISTA",
    )
  ) {
    nextStatus = "LISTO";
  } else if (
    commands.some(
      (command) =>
        command.estado ===
          "PREPARANDO" ||
        command.estado ===
          "LISTA",
    )
  ) {
    nextStatus =
      "EN_PREPARACION";
  } else {
    nextStatus = "ENVIADO";
  }

  await transaction
    .pedido
    .updateMany({
      where: {
        id: orderId,

        estado: {
          in: [
            "ENVIADO",
            "EN_PREPARACION",
          ],
        },
      },

      data: {
        estado:
          nextStatus,
      },
    });
}

export async function startCommand(
  auth: CommandAuth,
  commandId: string,
) {
  const command =
    await getCommandForOperation(
      auth,
      commandId,
    );

  if (
    command.estado !==
    "PENDIENTE"
  ) {
    throw new AppError(
      409,
      "Solo una comanda pendiente puede iniciar su preparación.",
      "COMANDA_NO_INICIABLE",
    );
  }

  if (
    command.pedido.estado !==
      "ENVIADO" &&
    command.pedido.estado !==
      "EN_PREPARACION"
  ) {
    throw new AppError(
      409,
      "El pedido no se encuentra disponible para preparación.",
      "PEDIDO_NO_PREPARABLE",
    );
  }

  const orderDetailIds =
    command.detalles.map(
      (detail) =>
        detail
          .detallePedidoId,
    );

  await withSerializableTransaction(
    async (transaction) => {
      const updateResult =
        await transaction
          .comanda
          .updateMany({
            where: {
              id: command.id,
              estado:
                "PENDIENTE",
            },

            data: {
              estado:
                "PREPARANDO",

              procesadoPorId:
                auth.usuarioId,

              fechaInicio:
                new Date(),
            },
          });

      if (
        updateResult.count !== 1
      ) {
        throw new AppError(
          409,
          "La comanda ya fue tomada por otro usuario.",
          "COMANDA_YA_PROCESADA",
        );
      }

      await transaction
        .detalleComanda
        .updateMany({
          where: {
            comandaId:
              command.id,

            estado:
              "PENDIENTE",
          },

          data: {
            estado:
              "PREPARANDO",
          },
        });

      if (
        orderDetailIds.length >
        0
      ) {
        await transaction
          .detallePedido
          .updateMany({
            where: {
              id: {
                in:
                  orderDetailIds,
              },

              estado: {
                in: [
                  "PENDIENTE",
                  "ENVIADO",
                ],
              },
            },

            data: {
              estado:
                "PREPARANDO",
            },
          });
      }

      await synchronizeOrderStatus(
        transaction,
        command.pedidoId,
      );
    },
  );

  return getCommandById(
    auth,
    command.id,
  );
}

export async function completeCommand(
  auth: CommandAuth,
  commandId: string,
) {
  const command =
    await getCommandForOperation(
      auth,
      commandId,
    );

  if (
    command.estado !==
    "PREPARANDO"
  ) {
    throw new AppError(
      409,
      "Solo una comanda en preparación puede marcarse como lista.",
      "COMANDA_NO_FINALIZABLE",
    );
  }

  if (
    command.pedido.estado !==
      "ENVIADO" &&
    command.pedido.estado !==
      "EN_PREPARACION"
  ) {
    throw new AppError(
      409,
      "El pedido no se encuentra disponible para finalizar la preparación.",
      "PEDIDO_NO_PREPARABLE",
    );
  }

  const orderDetailIds =
    command.detalles.map(
      (detail) =>
        detail
          .detallePedidoId,
    );

  await withSerializableTransaction(
    async (transaction) => {
      const updateResult =
        await transaction
          .comanda
          .updateMany({
            where: {
              id: command.id,
              estado:
                "PREPARANDO",
            },

            data: {
              estado: "LISTA",

              fechaFinalizacion:
                new Date(),
            },
          });

      if (
        updateResult.count !== 1
      ) {
        throw new AppError(
          409,
          "La comanda ya fue finalizada o cambió de estado.",
          "COMANDA_YA_FINALIZADA",
        );
      }

      await transaction
        .detalleComanda
        .updateMany({
          where: {
            comandaId:
              command.id,

            estado:
              "PREPARANDO",
          },

          data: {
            estado: "LISTO",
          },
        });

      if (
        orderDetailIds.length >
        0
      ) {
        await transaction
          .detallePedido
          .updateMany({
            where: {
              id: {
                in:
                  orderDetailIds,
              },

              estado: {
                in: [
                  "ENVIADO",
                  "PREPARANDO",
                ],
              },
            },

            data: {
              estado: "LISTO",
            },
          });
      }

      await synchronizeOrderStatus(
        transaction,
        command.pedidoId,
      );

      await createOrderReadyNotifications(
        transaction,
        command.pedidoId,
      );
    },
  );

  return getCommandById(
    auth,
    command.id,
  );
}
