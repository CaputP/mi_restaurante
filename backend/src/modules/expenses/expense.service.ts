import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

import type {
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  ExpenseOptionsQuery,
  ListExpensesQuery,
  VoidExpenseInput,
} from "./expense.schema.js";

type ExpenseAuth = {
  usuarioId: string;
  rol: string;
};

const expenseSelect = {
  id: true,
  descripcion: true,
  monto: true,
  metodoPago: true,
  salioDeCaja: true,
  comprobanteUrl: true,
  fechaGasto: true,
  estado: true,
  anuladoAt: true,
  motivoAnulacion: true,
  createdAt: true,
  updatedAt: true,

  sucursal: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  },

  categoriaGasto: {
    select: {
      id: true,
      nombre: true,
      descripcion: true,
    },
  },

  administrador: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  },

  caja: {
    select: {
      id: true,
      codigo: true,
      estado: true,

      vendedor: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
        },
      },
    },
  },

  anuladoPor: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  },
} satisfies Prisma.GastoSelect;

type ExpenseRecord =
  Prisma.GastoGetPayload<{
    select:
      typeof expenseSelect;
  }>;

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

  return new Date(
    `${year}-${month}-${day}T00:00:00.000Z`,
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

function createExpenseDate(
  dateText: string,
): Date {
  return new Date(
    `${dateText}T12:00:00-05:00`,
  );
}

async function getAuthorizedBranches(
  auth: ExpenseAuth,
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
      "No tienes autorización para administrar esa sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

function mapExpense(
  expense: ExpenseRecord,
) {
  return {
    ...expense,

    monto:
      Number(
        expense.monto,
      ),

    fechaGasto:
      expense.fechaGasto
        .toISOString(),

    anuladoAt:
      expense.anuladoAt
        ?.toISOString() ??
      null,

    createdAt:
      expense.createdAt
        .toISOString(),

    updatedAt:
      expense.updatedAt
        .toISOString(),

    administrador: {
      id:
        expense
          .administrador.id,

      nombreCompleto:
        userFullName(
          expense
            .administrador,
        ),
    },

    caja:
      expense.caja
        ? {
            id:
              expense.caja.id,

            codigo:
              expense.caja
                .codigo,

            estado:
              expense.caja
                .estado,

            vendedor: {
              id:
                expense.caja
                  .vendedor.id,

              nombreCompleto:
                userFullName(
                  expense.caja
                    .vendedor,
                ),
            },
          }
        : null,

    anuladoPor:
      expense.anuladoPor
        ? {
            id:
              expense
                .anuladoPor.id,

            nombreCompleto:
              userFullName(
                expense
                  .anuladoPor,
              ),
          }
        : null,
  };
}

export async function getExpenseOptions(
  auth: ExpenseAuth,
  query: ExpenseOptionsQuery,
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

  const [
    categories,
    cashRegisters,
  ] = await Promise.all([
    prisma.categoriaGasto
      .findMany({
        where: {
          activo: true,
        },

        select: {
          id: true,
          nombre: true,
          descripcion: true,
        },

        orderBy: {
          nombre: "asc",
        },
      }),

    selectedBranchId
      ? prisma.caja.findMany({
          where: {
            sucursalId:
              selectedBranchId,

            estado:
              "ABIERTA",
          },

          select: {
            id: true,
            codigo: true,
            efectivoEsperado:
              true,
            totalGastosCaja:
              true,
            fechaApertura:
              true,

            vendedor: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
              },
            },
          },

          orderBy: {
            fechaApertura:
              "desc",
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    sucursales:
      branches,

    sucursalSeleccionadaId:
      selectedBranchId ??
      null,

    categorias:
      categories,

    cajas:
      cashRegisters.map(
        (cash) => ({
          id:
            cash.id,

          codigo:
            cash.codigo,

          efectivoEsperado:
            Number(
              cash
                .efectivoEsperado,
            ),

          totalGastosCaja:
            Number(
              cash
                .totalGastosCaja,
            ),

          fechaApertura:
            cash.fechaApertura
              .toISOString(),

          vendedor: {
            id:
              cash.vendedor.id,

            nombreCompleto:
              userFullName(
                cash.vendedor,
              ),
          },
        }),
      ),

    metodosPago: [
      {
        codigo:
          "EFECTIVO",
        nombre:
          "Efectivo",
      },
      {
        codigo:
          "YAPE",
        nombre:
          "Yape",
      },
      {
        codigo:
          "PLIN",
        nombre:
          "Plin",
      },
      {
        codigo:
          "TARJETA",
        nombre:
          "Tarjeta",
      },
      {
        codigo:
          "TRANSFERENCIA",
        nombre:
          "Transferencia",
      },
    ],
  };
}

export async function listExpenses(
  auth: ExpenseAuth,
  query: ListExpensesQuery,
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
      gastos: [],

      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 1,
      },
    };
  }

  const where:
    Prisma.GastoWhereInput = {
      sucursalId: {
        in: branchIds,
      },

      ...(query.categoriaGastoId
        ? {
            categoriaGastoId:
              query
                .categoriaGastoId,
          }
        : {}),

      ...(query.cajaId
        ? {
            cajaId:
              query.cajaId,
          }
        : {}),

      ...(query.metodoPago
        ? {
            metodoPago:
              query.metodoPago,
          }
        : {}),

      ...(query.estado !==
      "TODOS"
        ? {
            estado:
              query.estado,
          }
        : {}),

      ...(query.salioDeCaja ===
      "SI"
        ? {
            salioDeCaja:
              true,
          }
        : query.salioDeCaja ===
          "NO"
          ? {
              salioDeCaja:
                false,
            }
          : {}),

      ...(
        query.fechaDesde ||
        query.fechaHasta
          ? {
              fechaGasto: {
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
                descripcion: {
                  contains:
                    query.search,

                  mode:
                    "insensitive",
                },
              },
              {
                categoriaGasto: {
                  nombre: {
                    contains:
                      query.search,

                    mode:
                      "insensitive",
                  },
                },
              },
              {
                administrador: {
                  nombres: {
                    contains:
                      query.search,

                    mode:
                      "insensitive",
                  },
                },
              },
              {
                administrador: {
                  apellidos: {
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
    expenses,
  ] = await prisma.$transaction([
    prisma.gasto.count({
      where,
    }),

    prisma.gasto.findMany({
      where,

      skip,
      take:
        query.limit,

      orderBy: [
        {
          fechaGasto:
            "desc",
        },
        {
          createdAt:
            "desc",
        },
      ],

      select:
        expenseSelect,
    }),
  ]);

  return {
    gastos:
      expenses.map(
        mapExpense,
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

export async function getExpenseById(
  auth: ExpenseAuth,
  expenseId: string,
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

  const expense =
    await prisma.gasto
      .findFirst({
        where: {
          id: expenseId,

          sucursalId: {
            in: branchIds,
          },
        },

        select:
          expenseSelect,
      });

  if (!expense) {
    throw new AppError(
      404,
      "El gasto no existe o no puedes consultarlo.",
      "GASTO_NO_ENCONTRADO",
    );
  }

  return mapExpense(
    expense,
  );
}

export async function createExpenseCategory(
  input: CreateExpenseCategoryInput,
) {
  const existingCategory =
    await prisma
      .categoriaGasto
      .findFirst({
        where: {
          nombre: {
            equals:
              input.nombre,

            mode:
              "insensitive",
          },
        },

        select: {
          id: true,
          activo: true,
        },
      });

  if (existingCategory) {
    throw new AppError(
      409,
      "Ya existe una categoría de gasto con ese nombre.",
      "CATEGORIA_GASTO_DUPLICADA",
    );
  }

  return prisma
    .categoriaGasto
    .create({
      data: {
        nombre:
          input.nombre,

        descripcion:
          input.descripcion,

        activo: true,
      },

      select: {
        id: true,
        nombre: true,
        descripcion: true,
        activo: true,
        createdAt: true,
      },
    });
}

export async function createExpense(
  auth: ExpenseAuth,
  input: CreateExpenseInput,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  assertAuthorizedBranch(
    branches,
    input.sucursalId,
  );

  const createdExpense =
    await prisma.$transaction(
      async (transaction) => {
        const category =
          await transaction
            .categoriaGasto
            .findFirst({
              where: {
                id:
                  input
                    .categoriaGastoId,

                activo: true,
              },

              select: {
                id: true,
                nombre: true,
              },
            });

        if (!category) {
          throw new AppError(
            400,
            "La categoría de gasto no existe o está inactiva.",
            "CATEGORIA_GASTO_INVALIDA",
          );
        }

        let cash:
          | {
              id: string;
              codigo: string;
            }
          | null = null;

        if (input.salioDeCaja) {
        const cashId =
            input.cajaId;

        if (!cashId) {
            throw new AppError(
            400,
            "Selecciona la caja de donde salió el dinero.",
            "CAJA_GASTO_REQUERIDA",
            );
        }

        cash =
            await transaction
            .caja
            .findFirst({
                where: {
                id:
                    cashId,

                sucursalId:
                    input.sucursalId,

                estado:
                    "ABIERTA",
                },

                select: {
                id: true,
                codigo: true,
                },
            });

        if (!cash) {
            throw new AppError(
            409,
            "La caja seleccionada no existe, está cerrada o pertenece a otra sucursal.",
            "CAJA_GASTO_INVALIDA",
            );
        }
        }

        const expense =
          await transaction
            .gasto
            .create({
              data: {
                sucursalId:
                  input
                    .sucursalId,

                categoriaGastoId:
                  category.id,

                administradorId:
                  auth.usuarioId,

                cajaId:
                  cash?.id ??
                  null,

                descripcion:
                  input
                    .descripcion,

                monto:
                  input.monto,

                metodoPago:
                  input
                    .metodoPago,

                salioDeCaja:
                  input
                    .salioDeCaja,

                comprobanteUrl:
                  input
                    .comprobanteUrl,

                fechaGasto:
                  input.fechaGasto
                    ? createExpenseDate(
                        input
                          .fechaGasto,
                      )
                    : new Date(),

                estado:
                  "REGISTRADO",
              },

              select: {
                id: true,
              },
            });

        if (cash) {
          const cashUpdate =
            await transaction
              .caja
              .updateMany({
                where: {
                  id:
                    cash.id,

                  estado:
                    "ABIERTA",
                },

                data: {
                  totalGastosCaja: {
                    increment:
                      input.monto,
                  },

                  efectivoEsperado: {
                    decrement:
                      input.monto,
                  },
                },
              });

          if (
            cashUpdate.count !==
            1
          ) {
            throw new AppError(
              409,
              "La caja fue cerrada mientras se registraba el gasto.",
              "CAJA_GASTO_CERRADA",
            );
          }
        }

        return expense;
      },
      {
        isolationLevel:
          Prisma
            .TransactionIsolationLevel
            .Serializable,
      },
    );

  return getExpenseById(
    auth,
    createdExpense.id,
  );
}

export async function voidExpense(
  auth: ExpenseAuth,
  expenseId: string,
  input: VoidExpenseInput,
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

  await prisma.$transaction(
    async (transaction) => {
      const expense =
        await transaction
          .gasto
          .findFirst({
            where: {
              id:
                expenseId,

              sucursalId: {
                in: branchIds,
              },
            },

            select: {
              id: true,
              monto: true,
              estado: true,
              salioDeCaja:
                true,
              cajaId: true,

              caja: {
                select: {
                  id: true,
                  codigo: true,
                  estado: true,
                },
              },
            },
          });

      if (!expense) {
        throw new AppError(
          404,
          "El gasto no existe o no puedes administrarlo.",
          "GASTO_NO_ENCONTRADO",
        );
      }

      if (
        expense.estado !==
        "REGISTRADO"
      ) {
        throw new AppError(
          409,
          "El gasto ya fue anulado.",
          "GASTO_YA_ANULADO",
        );
      }

      if (
        expense.salioDeCaja &&
        expense.caja?.estado !==
          "ABIERTA"
      ) {
        throw new AppError(
          409,
          `No se puede anular porque la caja ${expense.caja?.codigo ?? ""} ya está cerrada.`,
          "CAJA_GASTO_YA_CERRADA",
        );
      }

      const expenseUpdate =
        await transaction
          .gasto
          .updateMany({
            where: {
              id:
                expense.id,

              estado:
                "REGISTRADO",
            },

            data: {
              estado:
                "ANULADO",

              anuladoPorId:
                auth.usuarioId,

              anuladoAt:
                new Date(),

              motivoAnulacion:
                input.motivo,
            },
          });

      if (
        expenseUpdate.count !==
        1
      ) {
        throw new AppError(
          409,
          "El gasto cambió de estado y no pudo anularse.",
          "GASTO_YA_PROCESADO",
        );
      }

      if (
        expense.salioDeCaja &&
        expense.cajaId
      ) {
        const cashUpdate =
          await transaction
            .caja
            .updateMany({
              where: {
                id:
                  expense.cajaId,

                estado:
                  "ABIERTA",
              },

              data: {
                totalGastosCaja: {
                  decrement:
                    expense.monto,
                },

                efectivoEsperado: {
                  increment:
                    expense.monto,
                },
              },
            });

        if (
          cashUpdate.count !==
          1
        ) {
          throw new AppError(
            409,
            "La caja fue cerrada y no se pudo revertir el gasto.",
            "CAJA_GASTO_CERRADA",
          );
        }
      }
    },
    {
      isolationLevel:
        Prisma
          .TransactionIsolationLevel
          .Serializable,
    },
  );

  return getExpenseById(
    auth,
    expenseId,
  );
}