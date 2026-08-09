import {
  Prisma,
} from "../../generated/prisma/client.js";

import { prisma } from "../../lib/prisma.js";
import { withSerializableTransaction } from "../../lib/transaction.js";
import { reauthenticateUser } from "../../shared/security/reauthentication.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createCashStatusNotifications,
} from "../notifications/operational-notification.service.js";

import type {
  CashOptionsQuery,
  CloseCashRegisterInput,
  CurrentCashQuery,
  ListCashRegistersQuery,
  OpenCashRegisterInput,
  ReopenCashRegisterInput,
} from "./cash.schema.js";

type CashAuth = {
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

async function getAuthorizedBranches(
  auth: CashAuth,
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

async function resolveSeller(
  auth: CashAuth,
  branchId: string,
  requestedSellerId?: string,
) {
  const sellerId =
    auth.rol === "VENDEDOR"
      ? auth.usuarioId
      : requestedSellerId ??
        auth.usuarioId;

  /*
   * Un administrador puede operar personalmente una
   * caja cuando todavía no existe un vendedor asignado.
   */
  if (
    sellerId ===
      auth.usuarioId &&
    isAdministrator(auth.rol)
  ) {
    const administrator =
      await prisma.usuario.findFirst({
        where: {
          id: auth.usuarioId,
          estado: "ACTIVO",
          deletedAt: null,

          rol: {
            activo: true,
          },
        },

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
      });

    if (!administrator) {
      throw new AppError(
        404,
        "El usuario administrador no se encuentra activo.",
        "USUARIO_CAJA_INVALIDO",
      );
    }

    return administrator;
  }

  const operationalDate =
    getOperationalDate();

  const assignment =
    await prisma
      .usuarioSucursal
      .findFirst({
        where: {
          usuarioId:
            sellerId,

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
              codigo: "VENDEDOR",
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
      });

  if (!assignment) {
    throw new AppError(
      400,
      "El vendedor no existe, no está activo o no pertenece a la sucursal.",
      "VENDEDOR_CAJA_INVALIDO",
    );
  }

  return assignment.usuario;
}

function createCashAccessWhere(
  auth: CashAuth,
): Prisma.CajaWhereInput {
  if (
    auth.rol === "VENDEDOR"
  ) {
    return {
      vendedorId:
        auth.usuarioId,
    };
  }

  return {};
}

export async function getCashOptions(
  auth: CashAuth,
  query: CashOptionsQuery,
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
    assignments,
  ] = await Promise.all([
    prisma.usuario.findFirst({
      where: {
        id: auth.usuarioId,
        estado: "ACTIVO",
        deletedAt: null,
      },

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
    }),

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
                  codigo:
                    "VENDEDOR",

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

  let sellers =
    assignments.map(
      (assignment) => ({
        id:
          assignment.usuario.id,

        nombreCompleto:
          userFullName(
            assignment.usuario,
          ),

        correo:
          assignment.usuario.correo,

        rol:
          assignment.usuario.rol,
      }),
    );

  if (
    currentUser &&
    isAdministrator(auth.rol) &&
    !sellers.some(
      (seller) =>
        seller.id ===
        currentUser.id,
    )
  ) {
    sellers = [
      {
        id:
          currentUser.id,

        nombreCompleto:
          userFullName(
            currentUser,
          ),

        correo:
          currentUser.correo,

        rol:
          currentUser.rol,
      },
      ...sellers,
    ];
  }

  if (
    auth.rol === "VENDEDOR"
  ) {
    sellers =
      sellers.filter(
        (seller) =>
          seller.id ===
          auth.usuarioId,
      );
  }

  return {
    sucursales:
      branches,

    sucursalSeleccionadaId:
      selectedBranchId ??
      null,

    vendedorActualId:
      auth.usuarioId,

    vendedores:
      sellers,

    estados: [
      {
        codigo: "ABIERTA",
        nombre: "Abierta",
      },
      {
        codigo: "CERRADA",
        nombre: "Cerrada",
      },
      {
        codigo: "ANULADA",
        nombre: "Anulada",
      },
    ],
  };
}

function mapCashRegister(
  cash: {
    id: string;
    codigo: string;
    montoInicial: Prisma.Decimal;
    totalVentas: Prisma.Decimal;
    totalEfectivo: Prisma.Decimal;
    totalYape: Prisma.Decimal;
    totalPlin: Prisma.Decimal;
    totalTarjeta: Prisma.Decimal;
    totalTransferencia: Prisma.Decimal;
    totalGastosCaja: Prisma.Decimal;
    efectivoEsperado: Prisma.Decimal;
    efectivoContado: Prisma.Decimal | null;
    diferencia: Prisma.Decimal | null;
    estado: string;
    fechaApertura: Date;
    fechaCierre: Date | null;
    observaciones: string | null;
    createdAt: Date;
    updatedAt: Date;
    sucursal: {
      id: string;
      codigo: string;
      nombre: string;
      direccion?: string;
    };
    vendedor: {
      id: string;
      nombres: string;
      apellidos: string;
      correo?: string;
    };
    abiertaPor: {
      id: string;
      nombres: string;
      apellidos: string;
    };
    cerradaPor: {
      id: string;
      nombres: string;
      apellidos: string;
    } | null;
    _count?: {
      ventas: number;
      gastos: number;
    };
  },
) {
  return {
    ...cash,

    montoInicial:
      Number(
        cash.montoInicial,
      ),

    totalVentas:
      Number(
        cash.totalVentas,
      ),

    totalEfectivo:
      Number(
        cash.totalEfectivo,
      ),

    totalYape:
      Number(
        cash.totalYape,
      ),

    totalPlin:
      Number(
        cash.totalPlin,
      ),

    totalTarjeta:
      Number(
        cash.totalTarjeta,
      ),

    totalTransferencia:
      Number(
        cash.totalTransferencia,
      ),

    totalGastosCaja:
      Number(
        cash.totalGastosCaja,
      ),

    efectivoEsperado:
      Number(
        cash.efectivoEsperado,
      ),

    efectivoContado:
      cash.efectivoContado ===
      null
        ? null
        : Number(
            cash.efectivoContado,
          ),

    diferencia:
      cash.diferencia ===
      null
        ? null
        : Number(
            cash.diferencia,
          ),

    fechaApertura:
      cash.fechaApertura
        .toISOString(),

    fechaCierre:
      cash.fechaCierre
        ?.toISOString() ??
      null,

    createdAt:
      cash.createdAt
        .toISOString(),

    updatedAt:
      cash.updatedAt
        .toISOString(),

    vendedor: {
      id:
        cash.vendedor.id,

      nombreCompleto:
        userFullName(
          cash.vendedor,
        ),

      ...(
        cash.vendedor.correo
          ? {
              correo:
                cash.vendedor
                  .correo,
            }
          : {}
      ),
    },

    abiertaPor: {
      id:
        cash.abiertaPor.id,

      nombreCompleto:
        userFullName(
          cash.abiertaPor,
        ),
    },

    cerradaPor:
      cash.cerradaPor
        ? {
            id:
              cash.cerradaPor.id,

            nombreCompleto:
              userFullName(
                cash.cerradaPor,
              ),
          }
        : null,

    cantidadVentas:
      cash._count?.ventas ??
      0,

    cantidadGastos:
      cash._count?.gastos ??
      0,
  };
}

export async function getCurrentCashRegister(
  auth: CashAuth,
  query: CurrentCashQuery,
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

  const sellerId =
    auth.rol === "VENDEDOR"
      ? auth.usuarioId
      : query.vendedorId ??
        auth.usuarioId;

  const cash =
    await prisma.caja.findFirst({
      where: {
        sucursalId: {
          in:
            branchIds,
        },

        vendedorId:
          sellerId,

        estado: "ABIERTA",
      },

      orderBy: {
        fechaApertura:
          "desc",
      },

      select: {
        id: true,
        codigo: true,
        montoInicial: true,
        totalVentas: true,
        totalEfectivo: true,
        totalYape: true,
        totalPlin: true,
        totalTarjeta: true,
        totalTransferencia:
          true,
        totalGastosCaja: true,
        efectivoEsperado:
          true,
        efectivoContado:
          true,
        diferencia: true,
        estado: true,
        fechaApertura: true,
        fechaCierre: true,
        observaciones: true,
        createdAt: true,
        updatedAt: true,

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            direccion: true,
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

        abiertaPor: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        cerradaPor: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        _count: {
          select: {
            ventas: true,
            gastos: true,
          },
        },
      },
    });

  return cash
    ? mapCashRegister(cash)
    : null;
}

export async function listCashRegisters(
  auth: CashAuth,
  query: ListCashRegistersQuery,
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
      cajas: [],

      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 1,
      },
    };
  }

  const where:
    Prisma.CajaWhereInput = {
      sucursalId: {
        in:
          branchIds,
      },

      ...createCashAccessWhere(
        auth,
      ),

      ...(query.vendedorId &&
      isAdministrator(auth.rol)
        ? {
            vendedorId:
              query.vendedorId,
          }
        : {}),

      ...(query.estado !==
      "TODOS"
        ? {
            estado:
              query.estado,
          }
        : {}),

      ...(
        query.fechaDesde ||
        query.fechaHasta
          ? {
              fechaApertura: {
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
                vendedor: {
                  nombres: {
                    contains:
                      query.search,

                    mode:
                      "insensitive",
                  },
                },
              },
              {
                vendedor: {
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
    cashRegisters,
  ] = await prisma.$transaction([
    prisma.caja.count({
      where,
    }),

    prisma.caja.findMany({
      where,

      skip,
      take:
        query.limit,

      orderBy: {
        fechaApertura:
          "desc",
      },

      select: {
        id: true,
        codigo: true,
        montoInicial: true,
        totalVentas: true,
        totalEfectivo: true,
        totalYape: true,
        totalPlin: true,
        totalTarjeta: true,
        totalTransferencia:
          true,
        totalGastosCaja: true,
        efectivoEsperado:
          true,
        efectivoContado:
          true,
        diferencia: true,
        estado: true,
        fechaApertura: true,
        fechaCierre: true,
        observaciones: true,
        createdAt: true,
        updatedAt: true,

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
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

        abiertaPor: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        cerradaPor: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        _count: {
          select: {
            ventas: true,
            gastos: true,
          },
        },
      },
    }),
  ]);

  return {
    cajas:
      cashRegisters.map(
        mapCashRegister,
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

export async function getCashRegisterById(
  auth: CashAuth,
  cashRegisterId: string,
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

  const cash =
    await prisma.caja.findFirst({
      where: {
        id:
          cashRegisterId,

        sucursalId: {
          in:
            branchIds,
        },

        ...createCashAccessWhere(
          auth,
        ),
      },

      select: {
        id: true,
        codigo: true,
        montoInicial: true,
        totalVentas: true,
        totalEfectivo: true,
        totalYape: true,
        totalPlin: true,
        totalTarjeta: true,
        totalTransferencia:
          true,
        totalGastosCaja: true,
        efectivoEsperado:
          true,
        efectivoContado:
          true,
        diferencia: true,
        estado: true,
        fechaApertura: true,
        fechaCierre: true,
        observaciones: true,
        createdAt: true,
        updatedAt: true,

        sucursal: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            direccion: true,
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

        abiertaPor: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        cerradaPor: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },

        ventas: {
          orderBy: {
            createdAt:
              "desc",
          },

          take: 100,

          select: {
            id: true,
            numeroTicket:
              true,
            subtotal: true,
            descuento: true,
            propina: true,
            total: true,
            adelantoAplicado:
              true,
            saldoCobrar: true,
            estado: true,
            createdAt: true,

            pedido: {
              select: {
                id: true,
                codigo: true,
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

        _count: {
          select: {
            ventas: true,
            gastos: true,
          },
        },
      },
    });

  if (!cash) {
    throw new AppError(
      404,
      "La caja no existe o no puedes consultarla.",
      "CAJA_NO_ENCONTRADA",
    );
  }

  const {
    ventas,
    ...cashData
  } = cash;

  return {
    ...mapCashRegister(
      cashData,
    ),

    ventas:
      ventas.map(
        (sale) => ({
          ...sale,

          subtotal:
            Number(
              sale.subtotal,
            ),

          descuento:
            Number(
              sale.descuento,
            ),

          propina:
            Number(
              sale.propina,
            ),

          total:
            Number(
              sale.total,
            ),

          adelantoAplicado:
            Number(
              sale
                .adelantoAplicado,
            ),

          saldoCobrar:
            Number(
              sale.saldoCobrar,
            ),

          createdAt:
            sale.createdAt
              .toISOString(),

          cliente:
            sale.cliente
              ? {
                  id:
                    sale.cliente.id,

                  nombreCompleto:
                    userFullName(
                      sale.cliente,
                    ),
                }
              : null,
        }),
      ),
  };
}

export async function openCashRegister(
  auth: CashAuth,
  input: OpenCashRegisterInput,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  assertAuthorizedBranch(
    branches,
    input.sucursalId,
  );

  const seller =
    await resolveSeller(
      auth,
      input.sucursalId,
      input.vendedorId,
    );

  try {
    const createdCash =
      await withSerializableTransaction(
      async (transaction) => {
        const existingOpenCash =
          await transaction
            .caja
            .findFirst({
              where: {
                vendedorId:
                  seller.id,

                estado:
                  "ABIERTA",
              },

              select: {
                id: true,
                codigo: true,
              },
            });

        if (existingOpenCash) {
          throw new AppError(
            409,
            `El usuario ya tiene la caja ${existingOpenCash.codigo} abierta.`,
            "CAJA_YA_ABIERTA",
          );
        }

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
                      "CAJA",
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
                  "CAJA",

                prefijo: "CJ",
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

        const created =
          await transaction
            .caja
            .create({
            data: {
              codigo: code,

              sucursalId:
                input.sucursalId,

              vendedorId:
                seller.id,

              abiertaPorId:
                auth.usuarioId,

              montoInicial:
                input.montoInicial,

              efectivoEsperado:
                input.montoInicial,

              estado:
                "ABIERTA",

              observaciones:
                input.observaciones,
            },

            select: {
              id: true,
              codigo: true,
            },
          });

        await createCashStatusNotifications(
          transaction,
          {
            cashId:
              created.id,
            cashCode:
              created.codigo,
            branchId:
              input.sucursalId,
            event:
              "ABIERTA",
          },
        );

        return created;
      },
      );

    return getCashRegisterById(
      auth,
      createdCash.id,
    );
  } catch (error: unknown) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "El usuario ya tiene una caja abierta.",
        "CAJA_YA_ABIERTA",
      );
    }

    throw error;
  }
}

async function getCashRegisterForOperation(
  auth: CashAuth,
  cashRegisterId: string,
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

  const cash =
    await prisma.caja.findFirst({
      where: {
        id:
          cashRegisterId,

        sucursalId: {
          in:
            branchIds,
        },

        ...createCashAccessWhere(
          auth,
        ),
      },

      select: {
        id: true,
        codigo: true,
        sucursalId: true,
        vendedorId: true,
        estado: true,
        fechaApertura: true,
        fechaCierre: true,
        observaciones: true,
        montoInicial: true,
        totalEfectivo: true,
        totalGastosCaja: true,
      },
    });

  if (!cash) {
    throw new AppError(
      404,
      "La caja no existe o no puedes administrarla.",
      "CAJA_NO_ENCONTRADA",
    );
  }

  return cash;
}

export async function closeCashRegister(
  auth: CashAuth,
  cashRegisterId: string,
  input: CloseCashRegisterInput,
) {
  const cash =
    await getCashRegisterForOperation(
      auth,
      cashRegisterId,
    );

  if (
    cash.estado !==
    "ABIERTA"
  ) {
    throw new AppError(
      409,
      "Solo una caja abierta puede cerrarse.",
      "CAJA_NO_CERRABLE",
    );
  }

  const updateResult =
    await withSerializableTransaction(
      async (transaction) => {
        await transaction.$queryRaw(
          Prisma.sql`
            SELECT "id"
            FROM "caja"
            WHERE "id" = ${cash.id}::uuid
            FOR UPDATE
          `,
        );

        const currentCash =
          await transaction.caja.findUnique({
            where: { id: cash.id },
            select: {
              estado: true,
              montoInicial: true,
              totalEfectivo: true,
              totalGastosCaja: true,
              observaciones: true,
            },
          });

        if (
          !currentCash ||
          currentCash.estado !== "ABIERTA"
        ) {
          throw new AppError(
            409,
            "La caja ya fue cerrada o cambió de estado.",
            "CAJA_YA_CERRADA",
          );
        }

        const lockedExpectedCash = Number(
          (
            Number(currentCash.montoInicial) +
            Number(currentCash.totalEfectivo) -
            Number(currentCash.totalGastosCaja)
          ).toFixed(2),
        );
        const lockedDifference = Number(
          (
            input.efectivoContado -
            lockedExpectedCash
          ).toFixed(2),
        );
        const lockedObservations = [
          currentCash.observaciones,
          input.observaciones
            ? `Cierre: ${input.observaciones}`
            : null,
        ]
          .filter(
            (value): value is string =>
              Boolean(value),
          )
          .join("\n");

        const result =
          await transaction.caja.updateMany({
          where: {
            id: cash.id,
            estado: "ABIERTA",
          },
          data: {
            estado: "CERRADA",
            efectivoEsperado:
              lockedExpectedCash,
            efectivoContado:
              input.efectivoContado,
            diferencia:
              lockedDifference,
            cerradaPorId:
              auth.usuarioId,
            fechaCierre: new Date(),
            observaciones:
              lockedObservations || null,
          },
          });

        if (
          result.count ===
          1
        ) {
          await createCashStatusNotifications(
            transaction,
            {
              cashId:
                cash.id,
              cashCode:
                cash.codigo,
              branchId:
                cash.sucursalId,
              event:
                "CERRADA",
            },
          );
        }

        return result;
      },
    );

  if (
    updateResult.count !== 1
  ) {
    throw new AppError(
      409,
      "La caja ya fue cerrada o cambió de estado.",
      "CAJA_YA_CERRADA",
    );
  }

  return getCashRegisterById(
    auth,
    cash.id,
  );
}

export async function reopenCashRegister(
  auth: CashAuth,
  cashRegisterId: string,
  input: ReopenCashRegisterInput,
) {
  if (
    ![
      "ADMINISTRADOR_GENERAL",
      "ADMINISTRADOR_SUCURSAL",
    ].includes(auth.rol)
  ) {
    throw new AppError(
      403,
      "Sólo un administrador puede reabrir una caja.",
      "ACCESO_DENEGADO",
    );
  }

  await reauthenticateUser(
    auth.usuarioId,
    input.password,
  );

  const cash =
    await getCashRegisterForOperation(
      auth,
      cashRegisterId,
    );

  if (cash.estado !== "CERRADA") {
    throw new AppError(
      409,
      "Sólo una caja cerrada puede reabrirse.",
      "CAJA_NO_REABRIBLE",
    );
  }

  try {
    await withSerializableTransaction(
      async (transaction) => {
        const rows =
          await transaction.$queryRaw<
            Array<{
              id: string;
              estado: string;
            }>
          >(
            Prisma.sql`
              SELECT "id", "estado"::text
              FROM "caja"
              WHERE "id" = ${cash.id}::uuid
              FOR UPDATE
            `,
          );

        if (
          rows.length !== 1 ||
          rows[0]?.estado !== "CERRADA"
        ) {
          throw new AppError(
            409,
            "La caja cambió de estado y ya no puede reabrirse.",
            "CAJA_NO_REABRIBLE",
          );
        }

        const laterCash =
          await transaction.caja.findFirst({
            where: {
              vendedorId:
                cash.vendedorId,
              id: {
                not: cash.id,
              },
              fechaApertura: {
                gt: cash.fechaApertura,
              },
            },
            select: {
              codigo: true,
            },
          });

        if (laterCash) {
          throw new AppError(
            409,
            `No se puede reabrir porque existe una caja posterior (${laterCash.codigo}).`,
            "CAJA_POSTERIOR_EXISTENTE",
          );
        }

        const auditNote =
          `[REAPERTURA ${new Date().toISOString()}] ${input.motivo}`;

        await transaction.caja.update({
          where: {
            id: cash.id,
          },
          data: {
            estado: "ABIERTA",
            fechaCierre: null,
            cerradaPorId: null,
            efectivoContado: null,
            diferencia: null,
            observaciones:
              cash.observaciones
                ? `${cash.observaciones}\n${auditNote}`
                : auditNote,
          },
        });

        await createCashStatusNotifications(
          transaction,
          {
            cashId:
              cash.id,
            cashCode:
              cash.codigo,
            branchId:
              cash.sucursalId,
            event:
              "ABIERTA",
          },
        );
      },
    );
  } catch (error: unknown) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "El vendedor ya tiene otra caja abierta.",
        "CAJA_YA_ABIERTA",
      );
    }

    throw error;
  }

  return getCashRegisterById(
    auth,
    cash.id,
  );
}
