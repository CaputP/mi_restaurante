import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
  UpdateProductStatusInput,
} from "./product.schema.js";

type ProductAuth = {
  usuarioId: string;
  rol: string;
};

function getOperationalDate(): Date {
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

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`,
  );
}

async function getAuthorizedBranches(
  auth: ProductAuth,
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

  const operationalDate =
    getOperationalDate();

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

async function validateBranches(
  auth: ProductAuth,
  branchIds: string[],
): Promise<void> {
  const authorizedBranches =
    await getAuthorizedBranches(auth);

  const authorizedIds =
    new Set(
      authorizedBranches.map(
        (branch) => branch.id,
      ),
    );

  const invalidBranch =
    branchIds.find(
      (branchId) =>
        !authorizedIds.has(branchId),
    );

  if (invalidBranch) {
    throw new AppError(
      403,
      "No tienes autorización para administrar una de las sucursales seleccionadas.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

async function validateCatalogReferences(
  categoriaId: string,
  unidadMedidaId: string,
): Promise<void> {
  const [
    category,
    measurementUnit,
  ] = await Promise.all([
    prisma.categoria.findFirst({
      where: {
        id: categoriaId,
        estado: "ACTIVO",
        deletedAt: null,
      },

      select: {
        id: true,
      },
    }),

    prisma.unidadMedida.findFirst({
      where: {
        id: unidadMedidaId,
        activo: true,
      },

      select: {
        id: true,
      },
    }),
  ]);

  if (!category) {
    throw new AppError(
      400,
      "La categoría seleccionada no está disponible.",
      "CATEGORIA_INVALIDA",
    );
  }

  if (!measurementUnit) {
    throw new AppError(
      400,
      "La unidad de medida seleccionada no está disponible.",
      "UNIDAD_MEDIDA_INVALIDA",
    );
  }
}

async function validateUniqueCode(
  code: string,
  excludedProductId?: string,
): Promise<void> {
  const existingProduct =
    await prisma.producto.findFirst({
      where: {
        codigo: {
          equals: code,
          mode: "insensitive",
        },

        ...(excludedProductId
          ? {
              id: {
                not: excludedProductId,
              },
            }
          : {}),
      },

      select: {
        id: true,
      },
    });

  if (existingProduct) {
    throw new AppError(
      409,
      "Ya existe un producto con ese código.",
      "CODIGO_PRODUCTO_DUPLICADO",
    );
  }
}

function normalizeProductInput<
  T extends
    | CreateProductInput
    | UpdateProductInput,
>(input: T): T {
  return {
    ...input,

    destinoPreparacion:
      input.requierePreparacion
        ? input.destinoPreparacion
        : "NINGUNO",

    sucursales:
      input.sucursales.map(
        (branch) => ({
          ...branch,

          stockMinimo:
            input.tipoStock ===
            "SIN_CONTROL"
              ? 0
              : branch.stockMinimo,
        }),
      ),
  };
}

export async function getProductOptions(
  auth: ProductAuth,
) {
  const [
    categories,
    measurementUnits,
    branches,
  ] = await Promise.all([
    prisma.categoria.findMany({
      where: {
        estado: "ACTIVO",
        deletedAt: null,
      },

      select: {
        id: true,
        nombre: true,
      },

      orderBy: {
        nombre: "asc",
      },
    }),

    prisma.unidadMedida.findMany({
      where: {
        activo: true,
      },

      select: {
        id: true,
        codigo: true,
        nombre: true,
        abreviatura: true,
        decimales: true,
      },

      orderBy: {
        nombre: "asc",
      },
    }),

    getAuthorizedBranches(auth),
  ]);

  return {
    categorias: categories,
    unidadesMedida: measurementUnits,
    sucursales: branches,

    tiposStock: [
      {
        codigo: "DIARIO",
        nombre: "Stock diario",
      },
      {
        codigo: "PERMANENTE",
        nombre: "Stock permanente",
      },
      {
        codigo: "SIN_CONTROL",
        nombre: "Sin control de stock",
      },
    ],

    destinosPreparacion: [
      {
        codigo: "COCINA",
        nombre: "Cocina",
      },
      {
        codigo: "BARRA",
        nombre: "Barra",
      },
    ],
  };
}

export async function listProducts(
  auth: ProductAuth,
  query: ListProductsQuery,
) {
  const authorizedBranches =
    await getAuthorizedBranches(auth);

  const authorizedBranchIds =
    authorizedBranches.map(
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

  const operationalDate =
    getOperationalDate();

  const branchFilterIds =
    query.sucursalId
      ? [query.sucursalId]
      : authorizedBranchIds;

  if (
    branchFilterIds.length === 0
  ) {
    return [];
  }

  const products =
    await prisma.producto.findMany({
      where: {
        deletedAt: null,

        ...(query.estado !== "TODOS"
          ? {
              estado: query.estado,
            }
          : {}),

        ...(query.categoriaId
          ? {
              categoriaId:
                query.categoriaId,
            }
          : {}),

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
                {
                  descripcion: {
                    contains:
                      query.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),

        sucursales: {
          some: {
            sucursalId: {
              in: branchFilterIds,
            },
          },
        },
      },

      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        tipoStock: true,
        requierePreparacion: true,
        destinoPreparacion: true,
        permiteCortesia: true,
        estado: true,
        createdAt: true,
        updatedAt: true,

        categoria: {
          select: {
            id: true,
            nombre: true,
          },
        },

        unidadMedida: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            abreviatura: true,
          },
        },

        sucursales: {
          where: {
            sucursalId: {
              in: authorizedBranchIds,
            },
          },

          orderBy: {
            sucursal: {
              nombre: "asc",
            },
          },

          select: {
            id: true,
            precioVenta: true,
            stockMinimo: true,
            disponibleVenta: true,
            estado: true,

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
          },
        },
      },

      orderBy: [
        {
          nombre: "asc",
        },
        {
          codigo: "asc",
        },
      ],
    });

  return products.map((product) => ({
    id: product.id,
    codigo: product.codigo,
    nombre: product.nombre,
    descripcion: product.descripcion,
    tipoStock: product.tipoStock,
    requierePreparacion:
      product.requierePreparacion,
    destinoPreparacion:
      product.destinoPreparacion,
    permiteCortesia:
      product.permiteCortesia,
    estado: product.estado,

    categoria: product.categoria,

    unidadMedida:
      product.unidadMedida,

    sucursales:
      product.sucursales.map(
        (configuration) => {
          const stock =
            product.tipoStock ===
            "PERMANENTE"
              ? configuration
                  .stockPermanente
              : configuration
                  .stocksDiarios[0];

          const cantidadActual =
            Number(
              stock?.cantidadActual ??
                0,
            );

          const cantidadComprometida =
            Number(
              stock
                ?.cantidadComprometida ??
                0,
            );

          return {
            id: configuration.id,

            sucursal:
              configuration.sucursal,

            precioVenta:
              Number(
                configuration.precioVenta,
              ),

            stockMinimo:
              Number(
                configuration.stockMinimo,
              ),

            disponibleVenta:
              configuration
                .disponibleVenta,

            estado:
              configuration.estado,

            stockActual:
              cantidadActual,

            stockComprometido:
              cantidadComprometida,

            stockDisponible:
              cantidadActual -
              cantidadComprometida,
          };
        },
      ),

    createdAt:
      product.createdAt.toISOString(),

    updatedAt:
      product.updatedAt.toISOString(),
  }));
}

export async function createProduct(
  auth: ProductAuth,
  rawInput: CreateProductInput,
) {
  const input =
    normalizeProductInput(rawInput);

  await Promise.all([
    validateUniqueCode(input.codigo),

    validateCatalogReferences(
      input.categoriaId,
      input.unidadMedidaId,
    ),

    validateBranches(
      auth,
      input.sucursales.map(
        (branch) =>
          branch.sucursalId,
      ),
    ),
  ]);

  const product =
    await prisma.$transaction(
      async (transaction) => {
        const createdProduct =
          await transaction.producto.create({
            data: {
              codigo: input.codigo,
              nombre: input.nombre,
              descripcion:
                input.descripcion,

              categoriaId:
                input.categoriaId,

              unidadMedidaId:
                input.unidadMedidaId,

              tipoStock:
                input.tipoStock,

              requierePreparacion:
                input.requierePreparacion,

              destinoPreparacion:
                input.destinoPreparacion,

              permiteCortesia:
                input.permiteCortesia,

              estado: "ACTIVO",
            },
          });

        for (
          const branchConfiguration
          of input.sucursales
        ) {
          const productBranch =
            await transaction
              .productoSucursal
              .create({
                data: {
                  productoId:
                    createdProduct.id,

                  sucursalId:
                    branchConfiguration
                      .sucursalId,

                  precioVenta:
                    branchConfiguration
                      .precioVenta,

                  stockMinimo:
                    branchConfiguration
                      .stockMinimo,

                  disponibleVenta:
                    branchConfiguration
                      .disponibleVenta,

                  estado: "ACTIVO",
                },

                select: {
                  id: true,
                },
              });

          if (
            input.tipoStock ===
            "PERMANENTE"
          ) {
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
        }

        return createdProduct;
      },
    );

  return {
    id: product.id,
    codigo: product.codigo,
    nombre: product.nombre,
  };
}

async function validateProductTypeChange(
  productId: string,
  currentType: string,
  newType: string,
): Promise<void> {
  if (
    currentType === newType
  ) {
    return;
  }

  const [
    dailyStockCount,
    movementsCount,
    reservationDetailsCount,
    orderDetailsCount,
    saleDetailsCount,
  ] = await Promise.all([
    prisma.stockDiario.count({
      where: {
        productoSucursal: {
          productoId: productId,
        },
      },
    }),

    prisma.movimientoInventario.count({
      where: {
        productoSucursal: {
          productoId: productId,
        },
      },
    }),

    prisma.detalleReserva.count({
      where: {
        productoSucursal: {
          productoId: productId,
        },
      },
    }),

    prisma.detallePedido.count({
      where: {
        productoSucursal: {
          productoId: productId,
        },
      },
    }),

    prisma.detalleVenta.count({
      where: {
        productoSucursal: {
          productoId: productId,
        },
      },
    }),
  ]);

  const hasOperationalHistory =
    dailyStockCount > 0 ||
    movementsCount > 0 ||
    reservationDetailsCount > 0 ||
    orderDetailsCount > 0 ||
    saleDetailsCount > 0;

  if (hasOperationalHistory) {
    throw new AppError(
      409,
      "No se puede cambiar el tipo de stock porque el producto ya tiene movimientos o registros operativos.",
      "TIPO_STOCK_NO_MODIFICABLE",
    );
  }
}

export async function updateProduct(
  auth: ProductAuth,
  productId: string,
  rawInput: UpdateProductInput,
) {
  const input =
    normalizeProductInput(rawInput);

  const existingProduct =
    await prisma.producto.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },

      select: {
        id: true,
        tipoStock: true,

        sucursales: {
          select: {
            id: true,
            sucursalId: true,
          },
        },
      },
    });

  if (!existingProduct) {
    throw new AppError(
      404,
      "El producto no existe.",
      "PRODUCTO_NO_ENCONTRADO",
    );
  }

  await Promise.all([
    validateUniqueCode(
      input.codigo,
      productId,
    ),

    validateCatalogReferences(
      input.categoriaId,
      input.unidadMedidaId,
    ),

    validateBranches(
      auth,
      input.sucursales.map(
        (branch) =>
          branch.sucursalId,
      ),
    ),

    validateProductTypeChange(
      productId,
      existingProduct.tipoStock,
      input.tipoStock,
    ),
  ]);

  await prisma.$transaction(
    async (transaction) => {
      await transaction.producto.update({
        where: {
          id: productId,
        },

        data: {
          codigo: input.codigo,
          nombre: input.nombre,
          descripcion:
            input.descripcion,

          categoriaId:
            input.categoriaId,

          unidadMedidaId:
            input.unidadMedidaId,

          tipoStock:
            input.tipoStock,

          requierePreparacion:
            input.requierePreparacion,

          destinoPreparacion:
            input.destinoPreparacion,

          permiteCortesia:
            input.permiteCortesia,
        },
      });

      for (
        const branchConfiguration
        of input.sucursales
      ) {
        const existingBranch =
          existingProduct.sucursales.find(
            (branch) =>
              branch.sucursalId ===
              branchConfiguration
                .sucursalId,
          );

        let productBranchId: string;

        if (existingBranch) {
          const updatedBranch =
            await transaction
              .productoSucursal
              .update({
                where: {
                  id: existingBranch.id,
                },

                data: {
                  precioVenta:
                    branchConfiguration
                      .precioVenta,

                  stockMinimo:
                    branchConfiguration
                      .stockMinimo,

                  disponibleVenta:
                    branchConfiguration
                      .disponibleVenta,

                  estado: "ACTIVO",
                },

                select: {
                  id: true,
                },
              });

          productBranchId =
            updatedBranch.id;
        } else {
          const createdBranch =
            await transaction
              .productoSucursal
              .create({
                data: {
                  productoId:
                    productId,

                  sucursalId:
                    branchConfiguration
                      .sucursalId,

                  precioVenta:
                    branchConfiguration
                      .precioVenta,

                  stockMinimo:
                    branchConfiguration
                      .stockMinimo,

                  disponibleVenta:
                    branchConfiguration
                      .disponibleVenta,

                  estado: "ACTIVO",
                },

                select: {
                  id: true,
                },
              });

          productBranchId =
            createdBranch.id;
        }

        if (
          input.tipoStock ===
          "PERMANENTE"
        ) {
          await transaction
            .stockPermanente
            .upsert({
              where: {
                productoSucursalId:
                  productBranchId,
              },

              create: {
                productoSucursalId:
                  productBranchId,

                cantidadActual: 0,

                cantidadComprometida:
                  0,
              },

              update: {},
            });
        }
      }

      if (
        existingProduct.tipoStock ===
          "PERMANENTE" &&
        input.tipoStock !==
          "PERMANENTE"
      ) {
        await transaction
          .stockPermanente
          .deleteMany({
            where: {
              productoSucursal: {
                productoId: productId,
              },
            },
          });
      }
    },
  );

  return {
    id: productId,
    codigo: input.codigo,
    nombre: input.nombre,
  };
}

export async function updateProductStatus(
  productId: string,
  input: UpdateProductStatusInput,
) {
  const product =
    await prisma.producto.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

  if (!product) {
    throw new AppError(
      404,
      "El producto no existe.",
      "PRODUCTO_NO_ENCONTRADO",
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      await transaction.producto.update({
        where: {
          id: productId,
        },

        data: {
          estado: input.estado,
        },
      });

      if (
        input.estado === "INACTIVO"
      ) {
        await transaction
          .productoSucursal
          .updateMany({
            where: {
              productoId: productId,
            },

            data: {
              disponibleVenta: false,
            },
          });
      }
    },
  );

  return {
    id: productId,
    estado: input.estado,
  };
}