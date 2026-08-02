import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

import {
  AppError,
} from "../../shared/errors/app-error.js";

import type {
  CreatePromotionInput,
  PromotionListQuery,
  PromotionStatus,
  UpdatePromotionInput,
} from "./promotions.schema.js";

type PromotionAuth = {
  usuarioId: string;
  rol: string;
};

const promotionSelect = {
  id: true,
  sucursalId: true,
  creadoPorId: true,

  nombre: true,
  descripcion: true,
  tipo: true,

  valor: true,
  consumoMinimo: true,

  automatica: true,
  acumulable: true,

  maximoUsos: true,
  usosActuales: true,

  fechaInicio: true,
  fechaFin: true,

  estado: true,

  createdAt: true,
  updatedAt: true,

  sucursal: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  },

  creadoPor: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  },

  productos: {
    select: {
      producto: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          tipoStock: true,

          categoria: {
            select: {
              id: true,
              nombre: true,
            },
          },

          unidadMedida: {
            select: {
              id: true,
              abreviatura: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt:
        "asc",
    },
  },

  _count: {
    select: {
      ventas: true,
    },
  },
} satisfies
  Prisma.PromocionSelect;

type PromotionRecord =
  Prisma.PromocionGetPayload<{
    select:
      typeof promotionSelect;
  }>;

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

function getFullName(
  user: {
    nombres: string;
    apellidos: string;
  },
): string {
  return [
    user.nombres,
    user.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function mapPromotion(
  promotion:
    PromotionRecord,
) {
  return {
    id:
      promotion.id,

    sucursalId:
      promotion.sucursalId,

    nombre:
      promotion.nombre,

    descripcion:
      promotion.descripcion,

    tipo:
      promotion.tipo,

    valor:
      promotion.valor
        .toString(),

    consumoMinimo:
      promotion
        .consumoMinimo
        .toString(),

    automatica:
      promotion.automatica,

    acumulable:
      promotion.acumulable,

    maximoUsos:
      promotion.maximoUsos,

    usosActuales:
      promotion.usosActuales,

    usosRestantes:
      promotion.maximoUsos ===
      null
        ? null
        : Math.max(
            0,
            promotion
              .maximoUsos -
              promotion
                .usosActuales,
          ),

    fechaInicio:
      promotion.fechaInicio
        .toISOString(),

    fechaFin:
      promotion.fechaFin
        .toISOString(),

    estado:
      promotion.estado,

    sucursal:
      promotion.sucursal,

    creadoPor: {
      id:
        promotion
          .creadoPor.id,

      nombreCompleto:
        getFullName(
          promotion.creadoPor,
        ),
    },

    productos:
      promotion.productos
        .map(
          (relation) =>
            relation.producto,
        ),

    cantidadVentas:
      promotion._count
        .ventas,

    createdAt:
      promotion.createdAt
        .toISOString(),

    updatedAt:
      promotion.updatedAt
        .toISOString(),
  };
}

async function getAuthorizedBranches(
  auth: PromotionAuth,
) {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return prisma.sucursal
      .findMany({
        where: {
          deletedAt:
            null,

          estado: {
            not:
              "ARCHIVADO",
          },
        },

        select: {
          id: true,
          codigo: true,
          nombre: true,
          estado: true,
        },

        orderBy: {
          nombre:
            "asc",
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

          sucursal: {
            deletedAt:
              null,

            estado: {
              not:
                "ARCHIVADO",
            },
          },
        },

        select: {
          sucursal: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              estado: true,
            },
          },
        },
      });

  return assignments.map(
    (assignment) =>
      assignment.sucursal,
  );
}

async function assertWriteAccess(
  auth: PromotionAuth,
  branchId: string | null,
): Promise<void> {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    if (!branchId) {
      return;
    }

    const branch =
      await prisma.sucursal
        .findFirst({
          where: {
            id:
              branchId,

            deletedAt:
              null,

            estado: {
              not:
                "ARCHIVADO",
            },
          },

          select: {
            id: true,
          },
        });

    if (!branch) {
      throw new AppError(
        400,
        "La sucursal seleccionada no existe.",
        "SUCURSAL_INVALIDA",
      );
    }

    return;
  }

  if (!branchId) {
    throw new AppError(
      403,
      "Solo el administrador general puede administrar promociones globales.",
      "PROMOCION_GLOBAL_NO_AUTORIZADA",
    );
  }

  const branches =
    await getAuthorizedBranches(
      auth,
    );

  const hasAccess =
    branches.some(
      (branch) =>
        branch.id ===
        branchId,
    );

  if (!hasAccess) {
    throw new AppError(
      403,
      "No tienes autorización para administrar promociones de esta sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

function buildVisibilityWhere(
  auth: PromotionAuth,
  branchIds: string[],
  selectedBranchId?: string | null,
): Prisma.PromocionWhereInput {
  if (selectedBranchId) {
    return {
      OR: [
        {
          sucursalId:
            null,
        },
        {
          sucursalId:
            selectedBranchId,
        },
      ],
    };
  }

  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return {};
  }

  return {
    OR: [
      {
        sucursalId:
          null,
      },
      {
        sucursalId: {
          in:
            branchIds,
        },
      },
    ],
  };
}

async function validateSelectedBranch(
  auth: PromotionAuth,
  branchIds: string[],
  selectedBranchId?: string | null,
): Promise<void> {
  if (!selectedBranchId) {
    return;
  }

  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    const branch =
      await prisma.sucursal
        .findFirst({
          where: {
            id:
              selectedBranchId,

            deletedAt:
              null,

            estado: {
              not:
                "ARCHIVADO",
            },
          },

          select: {
            id: true,
          },
        });

    if (!branch) {
      throw new AppError(
        400,
        "La sucursal seleccionada no existe.",
        "SUCURSAL_INVALIDA",
      );
    }

    return;
  }

  if (
    !branchIds.includes(
      selectedBranchId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes acceso a la sucursal seleccionada.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

async function assertProducts(
  productIds: string[],
  branchId: string | null,
): Promise<void> {
  if (
    productIds.length ===
    0
  ) {
    return;
  }

  const products =
    await prisma.producto
      .findMany({
        where: {
          id: {
            in:
              productIds,
          },

          deletedAt:
            null,

          estado:
            "ACTIVO",

          ...(branchId
            ? {
                sucursales: {
                  some: {
                    sucursalId:
                      branchId,

                    estado:
                      "ACTIVO",

                    disponibleVenta:
                      true,
                  },
                },
              }
            : {}),
        },

        select: {
          id: true,
        },
      });

  if (
    products.length !==
    productIds.length
  ) {
    throw new AppError(
      400,
      "Uno o más productos no existen o no están disponibles en la sucursal.",
      "PRODUCTOS_PROMOCION_INVALIDOS",
    );
  }
}

function buildPromotionData(
  input:
    | CreatePromotionInput
    | UpdatePromotionInput,
) {
  return {
    sucursalId:
      input.sucursalId,

    nombre:
      input.nombre,

    descripcion:
      input.descripcion
        ?.trim() ||
      null,

    tipo:
      input.tipo,

    valor:
      input.valor,

    consumoMinimo:
      input.consumoMinimo,

    automatica:
      input.automatica,

    acumulable:
      input.acumulable,

    maximoUsos:
      input.maximoUsos,

    fechaInicio:
      new Date(
        input.fechaInicio,
      ),

    fechaFin:
      new Date(
        input.fechaFin,
      ),

    estado:
      input.estado,
  };
}

export async function getPromotionOptions(
  auth: PromotionAuth,
  selectedBranchId?: string | null,
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

  await validateSelectedBranch(
    auth,
    branchIds,
    selectedBranchId,
  );

  const productWhere:
    Prisma.ProductoWhereInput = {
      deletedAt:
        null,

      estado:
        "ACTIVO",

      ...(selectedBranchId
        ? {
            sucursales: {
              some: {
                sucursalId:
                  selectedBranchId,

                estado:
                  "ACTIVO",

                disponibleVenta:
                  true,
              },
            },
          }
        : auth.rol !==
            "ADMINISTRADOR_GENERAL"
          ? {
              sucursales: {
                some: {
                  sucursalId: {
                    in:
                      branchIds,
                  },

                  estado:
                    "ACTIVO",

                  disponibleVenta:
                    true,
                },
              },
            }
          : {}),
    };

  const products =
    await prisma.producto
      .findMany({
        where:
          productWhere,

        select: {
          id: true,
          codigo: true,
          nombre: true,
          tipoStock: true,

          categoria: {
            select: {
              id: true,
              nombre: true,
            },
          },

          unidadMedida: {
            select: {
              id: true,
              abreviatura: true,
            },
          },
        },

        orderBy: {
          nombre:
            "asc",
        },
      });

  return {
    sucursales:
      branches,

    productos:
      products,

    tipos: [
      {
        codigo:
          "DESCUENTO_FIJO",

        nombre:
          "Descuento fijo",
      },
      {
        codigo:
          "DESCUENTO_PORCENTAJE",

        nombre:
          "Descuento porcentual",
      },
      {
        codigo:
          "PRODUCTO_GRATIS",

        nombre:
          "Producto gratis",
      },
      {
        codigo:
          "COMBO",

        nombre:
          "Combo promocional",
      },
    ],

    estados: [
      {
        codigo:
          "BORRADOR",

        nombre:
          "Borrador",
      },
      {
        codigo:
          "ACTIVA",

        nombre:
          "Activa",
      },
      {
        codigo:
          "PAUSADA",

        nombre:
          "Pausada",
      },
      {
        codigo:
          "FINALIZADA",

        nombre:
          "Finalizada",
      },
      {
        codigo:
          "ARCHIVADA",

        nombre:
          "Archivada",
      },
    ],

    puedeCrearGlobal:
      auth.rol ===
      "ADMINISTRADOR_GENERAL",
  };
}

export async function listPromotions(
  auth: PromotionAuth,
  query: PromotionListQuery,
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

  await validateSelectedBranch(
    auth,
    branchIds,
    query.sucursalId,
  );

  const where:
    Prisma.PromocionWhereInput = {
      AND: [
        buildVisibilityWhere(
          auth,
          branchIds,
          query.sucursalId,
        ),

        ...(query.search
          ? [
              {
                OR: [
                  {
                    nombre: {
                      contains:
                        query.search,

                      mode:
                        "insensitive" as const,
                    },
                  },
                  {
                    descripcion: {
                      contains:
                        query.search,

                      mode:
                        "insensitive" as const,
                    },
                  },
                ],
              },
            ]
          : []),

        ...(query.tipo
          ? [
              {
                tipo:
                  query.tipo,
              },
            ]
          : []),

        ...(query.estado !==
        "TODOS"
          ? [
              {
                estado:
                  query.estado,
              },
            ]
          : []),
      ],
    };

  const skip =
    (
      query.page -
      1
    ) *
    query.limit;

  const [
    promotions,
    total,
  ] =
    await Promise.all([
      prisma.promocion
        .findMany({
          where,

          select:
            promotionSelect,

          orderBy: [
            {
              createdAt:
                "desc",
            },
          ],

          skip,

          take:
            query.limit,
        }),

      prisma.promocion.count({
        where,
      }),
    ]);

  return {
    promociones:
      promotions.map(
        mapPromotion,
      ),

    pagination: {
      page:
        query.page,

      limit:
        query.limit,

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

export async function getPromotionById(
  auth: PromotionAuth,
  promotionId: string,
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

  const promotion =
    await prisma.promocion
      .findFirst({
        where: {
          id:
            promotionId,

          AND: [
            buildVisibilityWhere(
              auth,
              branchIds,
            ),
          ],
        },

        select:
          promotionSelect,
      });

  if (!promotion) {
    throw new AppError(
      404,
      "La promoción no existe.",
      "PROMOCION_NO_ENCONTRADA",
    );
  }

  return mapPromotion(
    promotion,
  );
}

export async function createPromotion(
  auth: PromotionAuth,
  input: CreatePromotionInput,
) {
  await assertWriteAccess(
    auth,
    input.sucursalId,
  );

  await assertProducts(
    input.productoIds,
    input.sucursalId,
  );

  return prisma.$transaction(
    async (
      transaction,
    ) => {
      /*
       * Primero se crea la promoción sin enviar
       * productos: undefined.
       */
      const createdPromotion =
        await transaction
          .promocion
          .create({
            data: {
              ...buildPromotionData(
                input,
              ),

              creadoPorId:
                auth.usuarioId,
            },

            select: {
              id:
                true,
            },
          });

      /*
       * Los productos se registran solamente
       * cuando existe al menos uno.
       */
      if (
        input.productoIds
          .length > 0
      ) {
        await transaction
          .promocionProducto
          .createMany({
            data:
              input.productoIds
                .map(
                  (
                    productId,
                  ) => ({
                    promocionId:
                      createdPromotion.id,

                    productoId:
                      productId,
                  }),
                ),
          });
      }

      /*
       * Se vuelve a consultar para obtener todas
       * las relaciones requeridas por mapPromotion.
       */
      const promotion =
        await transaction
          .promocion
          .findUnique({
            where: {
              id:
                createdPromotion.id,
            },

            select:
              promotionSelect,
          });

      if (!promotion) {
        throw new AppError(
          500,
          "La promoción fue creada, pero no pudo recuperarse.",
          "PROMOCION_NO_RECUPERADA",
        );
      }

      return mapPromotion(
        promotion,
      );
    },
  );
}

export async function updatePromotion(
  auth: PromotionAuth,
  promotionId: string,
  input: UpdatePromotionInput,
) {
  const currentPromotion =
    await prisma.promocion
      .findUnique({
        where: {
          id:
            promotionId,
        },

        select: {
          id: true,
          sucursalId: true,
        },
      });

  if (!currentPromotion) {
    throw new AppError(
      404,
      "La promoción no existe.",
      "PROMOCION_NO_ENCONTRADA",
    );
  }

  await assertWriteAccess(
    auth,
    currentPromotion
      .sucursalId,
  );

  await assertWriteAccess(
    auth,
    input.sucursalId,
  );

  await assertProducts(
    input.productoIds,
    input.sucursalId,
  );

  return prisma.$transaction(
    async (
      transaction,
    ) => {
      await transaction
        .promocionProducto
        .deleteMany({
          where: {
            promocionId:
              promotionId,
          },
        });

      if (
        input.productoIds
          .length > 0
      ) {
        await transaction
          .promocionProducto
          .createMany({
            data:
              input.productoIds
                .map(
                  (
                    productId,
                  ) => ({
                    promocionId:
                      promotionId,

                    productoId:
                      productId,
                  }),
                ),
          });
      }

      const promotion =
        await transaction
          .promocion
          .update({
            where: {
              id:
                promotionId,
            },

            data:
              buildPromotionData(
                input,
              ),

            select:
              promotionSelect,
          });

      return mapPromotion(
        promotion,
      );
    },
  );
}

export async function updatePromotionStatus(
  auth: PromotionAuth,
  promotionId: string,
  status: PromotionStatus,
) {
  const currentPromotion =
    await prisma.promocion
      .findUnique({
        where: {
          id:
            promotionId,
        },

        select: {
          id: true,
          sucursalId: true,
          estado: true,
          fechaInicio: true,
          fechaFin: true,
        },
      });

  if (!currentPromotion) {
    throw new AppError(
      404,
      "La promoción no existe.",
      "PROMOCION_NO_ENCONTRADA",
    );
  }

  await assertWriteAccess(
    auth,
    currentPromotion
      .sucursalId,
  );

  if (
    currentPromotion.estado ===
      "ARCHIVADA" &&
    status !==
      "ARCHIVADA"
  ) {
    throw new AppError(
      409,
      "Una promoción archivada no puede reactivarse.",
      "PROMOCION_ARCHIVADA",
    );
  }

  if (
    status ===
      "ACTIVA" &&
    currentPromotion.fechaFin <=
      new Date()
  ) {
    throw new AppError(
      409,
      "No puedes activar una promoción cuya vigencia ya terminó.",
      "PROMOCION_VENCIDA",
    );
  }

  const promotion =
    await prisma.promocion
      .update({
        where: {
          id:
            promotionId,
        },

        data: {
          estado:
            status,
        },

        select:
          promotionSelect,
      });

  return mapPromotion(
    promotion,
  );
}