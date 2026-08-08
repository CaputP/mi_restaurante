import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import {
  evaluateStockNotification,
} from "../notifications/stock-notification.service.js";

import type {
  CreateDailyStockInput,
  CreateInventoryMovementInput,
  ListInventoryQuery,
  ListMovementsQuery,
} from "./inventory.schema.js";

type InventoryAuth = {
  usuarioId: string;
  rol: string;
};

function getOperationalDate() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year",
  )?.value;

  const month = parts.find(
    (part) => part.type === "month",
  )?.value;

  const day = parts.find(
    (part) => part.type === "day",
  )?.value;

  if (!year || !month || !day) {
    throw new AppError(
      500,
      "No se pudo determinar la fecha operativa.",
      "FECHA_OPERATIVA_INVALIDA",
    );
  }

  const dateText =
    `${year}-${month}-${day}`;

  return {
    dateText,

    dateOnly: new Date(
      `${dateText}T00:00:00.000Z`,
    ),
  };
}

async function getAuthorizedBranches(
  auth: InventoryAuth,
  dateOnly: Date,
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
          lte: dateOnly,
        },

        OR: [
          {
            fechaFin: null,
          },
          {
            fechaFin: {
              gte: dateOnly,
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

async function getAuthorizedProductBranch(
  auth: InventoryAuth,
  productoSucursalId: string,
) {
  const { dateOnly } =
    getOperationalDate();

  const branches =
    await getAuthorizedBranches(
      auth,
      dateOnly,
    );

  const branchIds =
    branches.map(
      (branch) => branch.id,
    );

  const productBranch =
    await prisma.productoSucursal.findFirst({
      where: {
        id: productoSucursalId,

        sucursalId: {
          in: branchIds,
        },

        estado: "ACTIVO",

        producto: {
          estado: "ACTIVO",
          deletedAt: null,
        },

        sucursal: {
          estado: "ACTIVO",
          deletedAt: null,
        },
      },

      select: {
        id: true,
        stockMinimo: true,

        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipoStock: true,

            unidadMedida: {
              select: {
                nombre: true,
                abreviatura: true,
                decimales: true,
              },
            },
          },
        },

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    });

  if (!productBranch) {
    throw new AppError(
      404,
      "El producto no existe o no pertenece a una sucursal autorizada.",
      "PRODUCTO_SUCURSAL_NO_ENCONTRADO",
    );
  }

  return productBranch;
}

export async function listInventory(
  auth: InventoryAuth,
  query: ListInventoryQuery,
) {
  const {
    dateText,
    dateOnly,
  } = getOperationalDate();

  const branches =
    await getAuthorizedBranches(
      auth,
      dateOnly,
    );

  const authorizedBranchIds =
    branches.map(
      (branch) => branch.id,
    );

  if (
    query.sucursalId &&
    !authorizedBranchIds.includes(
      query.sucursalId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes autorización para consultar esa sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }

  const branchIds =
    query.sucursalId
      ? [query.sucursalId]
      : authorizedBranchIds;

  if (branchIds.length === 0) {
    return {
      fechaOperativa: dateText,
      sucursales: branches,
      inventario: [],
      total: 0,
      totalAlertas: 0,
    };
  }

  const records =
    await prisma.productoSucursal.findMany({
      where: {
        sucursalId: {
          in: branchIds,
        },

        estado: "ACTIVO",

        producto: {
          estado: "ACTIVO",
          deletedAt: null,

          tipoStock:
            query.tipoStock ===
              "TODOS"
              ? {
                in: [
                  "DIARIO",
                  "PERMANENTE",
                ],
              }
              : query.tipoStock,

          ...(query.search
            ? {
              OR: [
                {
                  codigo: {
                    contains:
                      query.search,
                    mode: "insensitive",
                  },
                },
                {
                  nombre: {
                    contains:
                      query.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
            : {}),
        },
      },

      select: {
        id: true,
        stockMinimo: true,
        disponibleVenta: true,

        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipoStock: true,

            unidadMedida: {
              select: {
                nombre: true,
                abreviatura: true,
                decimales: true,
              },
            },
          },
        },

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },

        stockPermanente: {
          select: {
            cantidadActual: true,
            cantidadComprometida: true,
            updatedAt: true,
          },
        },

        stocksDiarios: {
          where: {
            fecha: dateOnly,
          },

          take: 1,

          select: {
            id: true,
            cantidadInicial: true,
            cantidadActual: true,
            cantidadComprometida: true,
            updatedAt: true,
          },
        },
      },

      orderBy: [
        {
          producto: {
            nombre: "asc",
          },
        },
        {
          sucursal: {
            nombre: "asc",
          },
        },
      ],
    });

  const inventory =
    records.map((record) => {
      const dailyStock =
        record.stocksDiarios[0];

      const stock =
        record.producto.tipoStock ===
          "PERMANENTE"
          ? record.stockPermanente
          : dailyStock;

      const currentStock =
        Number(
          stock?.cantidadActual ?? 0,
        );

      const committedStock =
        Number(
          stock
            ?.cantidadComprometida ?? 0,
        );

      const availableStock =
        currentStock -
        committedStock;

      const minimumStock =
        Number(record.stockMinimo);

      const alert =
        minimumStock > 0 &&
        availableStock <=
        minimumStock;

      return {
        productoSucursalId:
          record.id,

        producto:
          record.producto,

        sucursal:
          record.sucursal,

        stockMinimo:
          minimumStock,

        stockActual:
          currentStock,

        stockComprometido:
          committedStock,

        stockDisponible:
          availableStock,

        cantidadInicial:
          dailyStock
            ? Number(
              dailyStock
                .cantidadInicial,
            )
            : null,

        stockDiarioInicializado:
          record.producto
            .tipoStock ===
            "DIARIO"
            ? Boolean(dailyStock)
            : null,

        disponibleVenta:
          record.disponibleVenta,

        alerta: alert,

        updatedAt:
          stock?.updatedAt
            .toISOString() ??
          null,
      };
    });

  const filteredInventory =
    query.soloAlertas
      ? inventory.filter(
        (item) => item.alerta,
      )
      : inventory;

  filteredInventory.sort(
    (first, second) => {
      if (
        first.alerta !==
        second.alerta
      ) {
        return first.alerta
          ? -1
          : 1;
      }

      return first.producto.nombre
        .localeCompare(
          second.producto.nombre,
          "es",
        );
    },
  );

  return {
    fechaOperativa: dateText,
    sucursales: branches,
    inventario:
      filteredInventory,
    total:
      filteredInventory.length,
    totalAlertas:
      inventory.filter(
        (item) => item.alerta,
      ).length,
  };
}

export async function createDailyStock(
  auth: InventoryAuth,
  input: CreateDailyStockInput,
) {
  const productBranch =
    await getAuthorizedProductBranch(
      auth,
      input.productoSucursalId,
    );

  if (
    productBranch.producto
      .tipoStock !== "DIARIO"
  ) {
    throw new AppError(
      400,
      "Solo los productos con stock diario pueden realizar una apertura diaria.",
      "TIPO_STOCK_INVALIDO",
    );
  }

  const {
    dateText,
    dateOnly,
  } = getOperationalDate();

  const existingStock =
    await prisma.stockDiario.findUnique({
      where: {
        productoSucursalId_fecha: {
          productoSucursalId:
            productBranch.id,
          fecha: dateOnly,
        },
      },

      select: {
        id: true,
      },
    });

  if (existingStock) {
    throw new AppError(
      409,
      "El stock diario de este producto ya fue inicializado.",
      "STOCK_DIARIO_YA_EXISTE",
    );
  }

  const result =
    await prisma.$transaction(
      async (transaction) => {
        const stock =
          await transaction
            .stockDiario
            .create({
              data: {
                productoSucursalId:
                  productBranch.id,

                creadoPorId:
                  auth.usuarioId,

                fecha: dateOnly,

                cantidadInicial:
                  input.cantidadInicial,

                cantidadActual:
                  input.cantidadInicial,

                cantidadComprometida:
                  0,
              },
            });

        if (
          input.cantidadInicial > 0
        ) {
          await transaction
            .movimientoInventario
            .create({
              data: {
                productoSucursalId:
                  productBranch.id,

                usuarioId:
                  auth.usuarioId,

                tipoMovimiento:
                  "AJUSTE_ENTRADA",

                cantidad:
                  input.cantidadInicial,

                cantidadAnterior: 0,

                cantidadResultante:
                  input.cantidadInicial,

                motivo:
                  input.motivo,

                referenciaTipo:
                  "APERTURA_STOCK_DIARIO",
              },
            });
        }

        /*
         * Evaluamos el stock después de que StockDiario
         * y MovimientoInventario ya fueron registrados.
         *
         * Todo queda dentro de la misma transacción.
         */
        await evaluateStockNotification(
          transaction,
          productBranch.id,
        );

        return stock;
      },
    );

  return {
    id: result.id,
    fecha: dateText,

    cantidadInicial:
      Number(
        result.cantidadInicial,
      ),

    cantidadActual:
      Number(
        result.cantidadActual,
      ),

    producto:
      productBranch.producto,

    sucursal:
      productBranch.sucursal,
  };
}

function isEntryMovement(
  movementType:
    CreateInventoryMovementInput["tipoMovimiento"],
) {
  return [
    "ENTRADA_COMPRA",
    "AJUSTE_ENTRADA",
  ].includes(movementType);
}

export async function createInventoryMovement(
  auth: InventoryAuth,
  input: CreateInventoryMovementInput,
) {
  const productBranch =
    await getAuthorizedProductBranch(
      auth,
      input.productoSucursalId,
    );

  if (
    productBranch.producto
      .tipoStock === "SIN_CONTROL"
  ) {
    throw new AppError(
      400,
      "Este producto no utiliza control de stock.",
      "PRODUCTO_SIN_CONTROL_STOCK",
    );
  }

  const { dateOnly } =
    getOperationalDate();

  const entry =
    isEntryMovement(
      input.tipoMovimiento,
    );

  const sign =
    entry ? 1 : -1;

  const result =
    await prisma.$transaction(
      async (transaction) => {
        let previousQuantity = 0;
        let committedQuantity = 0;
        let resultingQuantity = 0;

        if (
          productBranch.producto
            .tipoStock ===
          "PERMANENTE"
        ) {
          let permanentStock =
            await transaction
              .stockPermanente
              .findUnique({
                where: {
                  productoSucursalId:
                    productBranch.id,
                },
              });

          if (!permanentStock) {
            permanentStock =
              await transaction
                .stockPermanente
                .create({
                  data: {
                    productoSucursalId:
                      productBranch.id,

                    cantidadActual: 0,

                    cantidadComprometida:
                      0,
                  },
                });
          }

          previousQuantity =
            Number(
              permanentStock
                .cantidadActual,
            );

          committedQuantity =
            Number(
              permanentStock
                .cantidadComprometida,
            );

          resultingQuantity =
            previousQuantity +
            sign * input.cantidad;

          if (
            resultingQuantity <
            committedQuantity
          ) {
            throw new AppError(
              409,
              "La salida supera el stock disponible. Existen cantidades comprometidas.",
              "STOCK_INSUFICIENTE",
            );
          }

          await transaction
            .stockPermanente
            .update({
              where: {
                productoSucursalId:
                  productBranch.id,
              },

              data: {
                cantidadActual:
                  resultingQuantity,
              },
            });
        } else {
          const dailyStock =
            await transaction
              .stockDiario
              .findUnique({
                where: {
                  productoSucursalId_fecha: {
                    productoSucursalId:
                      productBranch.id,

                    fecha: dateOnly,
                  },
                },
              });

          if (!dailyStock) {
            throw new AppError(
              409,
              "Primero debes inicializar el stock diario de este producto.",
              "STOCK_DIARIO_NO_INICIALIZADO",
            );
          }

          previousQuantity =
            Number(
              dailyStock
                .cantidadActual,
            );

          committedQuantity =
            Number(
              dailyStock
                .cantidadComprometida,
            );

          resultingQuantity =
            previousQuantity +
            sign * input.cantidad;

          if (
            resultingQuantity <
            committedQuantity
          ) {
            throw new AppError(
              409,
              "La salida supera el stock disponible. Existen cantidades comprometidas.",
              "STOCK_INSUFICIENTE",
            );
          }

          await transaction
            .stockDiario
            .update({
              where: {
                id: dailyStock.id,
              },

              data: {
                cantidadActual:
                  resultingQuantity,
              },
            });
        }

        const movement =
          await transaction
            .movimientoInventario
            .create({
              data: {
                productoSucursalId:
                  productBranch.id,

                usuarioId:
                  auth.usuarioId,

                tipoMovimiento:
                  input.tipoMovimiento,

                cantidad:
                  input.cantidad,

                cantidadAnterior:
                  previousQuantity,

                cantidadResultante:
                  resultingQuantity,

                costoUnitario:
                  input.costoUnitario ??
                  null,

                costoTotal:
                  input.costoUnitario !==
                    undefined
                    ? input.costoUnitario *
                    input.cantidad
                    : null,

                motivo:
                  input.motivo,

                referenciaTipo:
                  "MOVIMIENTO_MANUAL",
              },
            });

        /*
         * El stock ya fue actualizado y el movimiento
         * de inventario ya quedó registrado.
         *
         * Ahora evaluamos si:
         *
         * - entró en stock bajo;
         * - continúa bajo;
         * - se agotó;
         * - o se recuperó por encima del mínimo.
         */
        await evaluateStockNotification(
          transaction,
          productBranch.id,
        );

        return {
          movement,
          previousQuantity,
          resultingQuantity,
          committedQuantity,
        };
      },
    );

  return {
    id: result.movement.id,

    tipoMovimiento:
      result.movement
        .tipoMovimiento,

    cantidad:
      Number(
        result.movement.cantidad,
      ),

    cantidadAnterior:
      result.previousQuantity,

    cantidadResultante:
      result.resultingQuantity,

    cantidadComprometida:
      result.committedQuantity,

    cantidadDisponible:
      result.resultingQuantity -
      result.committedQuantity,

    costoUnitario:
      result.movement
        .costoUnitario !== null
        ? Number(
          result.movement
            .costoUnitario,
        )
        : null,

    costoTotal:
      result.movement
        .costoTotal !== null
        ? Number(
          result.movement
            .costoTotal,
        )
        : null,

    motivo:
      result.movement.motivo,

    createdAt:
      result.movement
        .createdAt
        .toISOString(),

    producto:
      productBranch.producto,

    sucursal:
      productBranch.sucursal,
  };
}

export async function listInventoryMovements(
  auth: InventoryAuth,
  query: ListMovementsQuery,
) {
  const { dateOnly } =
    getOperationalDate();

  const branches =
    await getAuthorizedBranches(
      auth,
      dateOnly,
    );

  const authorizedBranchIds =
    branches.map(
      (branch) => branch.id,
    );

  if (
    query.sucursalId &&
    !authorizedBranchIds.includes(
      query.sucursalId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes autorización para consultar esa sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }

  const branchIds =
    query.sucursalId
      ? [query.sucursalId]
      : authorizedBranchIds;

  if (branchIds.length === 0) {
    return [];
  }

  const movements =
    await prisma
      .movimientoInventario
      .findMany({
        where: {
          productoSucursal: {
            sucursalId: {
              in: branchIds,
            },
          },

          ...(query.productoSucursalId
            ? {
              productoSucursalId:
                query.productoSucursalId,
            }
            : {}),

          ...(query.tipoMovimiento !==
            "TODOS"
            ? {
              tipoMovimiento:
                query.tipoMovimiento,
            }
            : {}),

          ...(query.search
            ? {
              OR: [
                {
                  motivo: {
                    contains:
                      query.search,
                    mode: "insensitive",
                  },
                },
                {
                  productoSucursal: {
                    producto: {
                      codigo: {
                        contains:
                          query.search,
                        mode:
                          "insensitive",
                      },
                    },
                  },
                },
                {
                  productoSucursal: {
                    producto: {
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
        },

        take: query.limit,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          tipoMovimiento: true,
          cantidad: true,
          cantidadAnterior: true,
          cantidadResultante: true,
          costoUnitario: true,
          costoTotal: true,
          motivo: true,
          referenciaTipo: true,
          createdAt: true,

          usuario: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
            },
          },

          productoSucursal: {
            select: {
              id: true,

              producto: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,

                  unidadMedida: {
                    select: {
                      abreviatura: true,
                    },
                  },
                },
              },

              sucursal: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                },
              },
            },
          },
        },
      });

  return movements.map(
    (movement) => ({
      id: movement.id,

      tipoMovimiento:
        movement.tipoMovimiento,

      cantidad:
        Number(
          movement.cantidad,
        ),

      cantidadAnterior:
        Number(
          movement
            .cantidadAnterior,
        ),

      cantidadResultante:
        Number(
          movement
            .cantidadResultante,
        ),

      costoUnitario:
        movement.costoUnitario !==
          null
          ? Number(
            movement
              .costoUnitario,
          )
          : null,

      costoTotal:
        movement.costoTotal !==
          null
          ? Number(
            movement.costoTotal,
          )
          : null,

      motivo:
        movement.motivo,

      referenciaTipo:
        movement.referenciaTipo,

      createdAt:
        movement.createdAt
          .toISOString(),

      usuario: {
        id: movement.usuario.id,

        nombreCompleto:
          `${movement.usuario.nombres} ${movement.usuario.apellidos}`.trim(),
      },

      productoSucursal:
        movement.productoSucursal,
    }),
  );
}