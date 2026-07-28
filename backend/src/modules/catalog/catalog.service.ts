import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
  UpdateCategoryStatusInput,
} from "./catalog.schema.js";

async function validateUniqueCategoryName(
  nombre: string,
  excludedId?: string,
): Promise<void> {
  const existingCategory =
    await prisma.categoria.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: "insensitive",
        },

        ...(excludedId
          ? {
              id: {
                not: excludedId,
              },
            }
          : {}),
      },

      select: {
        id: true,
      },
    });

  if (existingCategory) {
    throw new AppError(
      409,
      "Ya existe una categoría con ese nombre.",
      "CATEGORIA_DUPLICADA",
    );
  }
}

export async function listCategories(
  query: ListCategoriesQuery,
) {
  const categories =
    await prisma.categoria.findMany({
      where: {
        deletedAt: null,

        ...(query.estado !== "TODOS"
          ? {
              estado: query.estado,
            }
          : {}),

        ...(query.search
          ? {
              OR: [
                {
                  nombre: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
                {
                  descripcion: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },

      select: {
        id: true,
        nombre: true,
        descripcion: true,
        estado: true,
        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            productos: true,
          },
        },
      },

      orderBy: [
        {
          estado: "asc",
        },
        {
          nombre: "asc",
        },
      ],
    });

  return categories.map((category) => ({
    id: category.id,
    nombre: category.nombre,
    descripcion: category.descripcion,
    estado: category.estado,
    cantidadProductos:
      category._count.productos,
    createdAt:
      category.createdAt.toISOString(),
    updatedAt:
      category.updatedAt.toISOString(),
  }));
}

export async function createCategory(
  input: CreateCategoryInput,
) {
  await validateUniqueCategoryName(
    input.nombre,
  );

  const category =
    await prisma.categoria.create({
      data: {
        nombre: input.nombre,
        descripcion: input.descripcion,
        estado: "ACTIVO",
      },

      select: {
        id: true,
        nombre: true,
        descripcion: true,
        estado: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  return {
    ...category,
    cantidadProductos: 0,
    createdAt:
      category.createdAt.toISOString(),
    updatedAt:
      category.updatedAt.toISOString(),
  };
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
) {
  const existingCategory =
    await prisma.categoria.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

  if (!existingCategory) {
    throw new AppError(
      404,
      "La categoría no existe.",
      "CATEGORIA_NO_ENCONTRADA",
    );
  }

  await validateUniqueCategoryName(
    input.nombre,
    id,
  );

  const category =
    await prisma.categoria.update({
      where: {
        id,
      },

      data: {
        nombre: input.nombre,
        descripcion: input.descripcion,
      },

      select: {
        id: true,
        nombre: true,
        descripcion: true,
        estado: true,
        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            productos: true,
          },
        },
      },
    });

  return {
    id: category.id,
    nombre: category.nombre,
    descripcion: category.descripcion,
    estado: category.estado,
    cantidadProductos:
      category._count.productos,
    createdAt:
      category.createdAt.toISOString(),
    updatedAt:
      category.updatedAt.toISOString(),
  };
}

export async function updateCategoryStatus(
  id: string,
  input: UpdateCategoryStatusInput,
) {
  const category =
    await prisma.categoria.findFirst({
      where: {
        id,
        deletedAt: null,
      },

      select: {
        id: true,
        estado: true,
      },
    });

  if (!category) {
    throw new AppError(
      404,
      "La categoría no existe.",
      "CATEGORIA_NO_ENCONTRADA",
    );
  }

  if (
    input.estado === "INACTIVO"
  ) {
    const activeProducts =
      await prisma.producto.count({
        where: {
          categoriaId: id,
          estado: "ACTIVO",
          deletedAt: null,
        },
      });

    if (activeProducts > 0) {
      throw new AppError(
        409,
        "No se puede desactivar una categoría que todavía tiene productos activos.",
        "CATEGORIA_CON_PRODUCTOS_ACTIVOS",
      );
    }
  }

  const updatedCategory =
    await prisma.categoria.update({
      where: {
        id,
      },

      data: {
        estado: input.estado,
      },

      select: {
        id: true,
        nombre: true,
        descripcion: true,
        estado: true,
        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            productos: true,
          },
        },
      },
    });

  return {
    id: updatedCategory.id,
    nombre: updatedCategory.nombre,
    descripcion:
      updatedCategory.descripcion,
    estado: updatedCategory.estado,
    cantidadProductos:
      updatedCategory._count.productos,
    createdAt:
      updatedCategory.createdAt.toISOString(),
    updatedAt:
      updatedCategory.updatedAt.toISOString(),
  };
}