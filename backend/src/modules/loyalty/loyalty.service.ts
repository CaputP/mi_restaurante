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
  CreateLoyaltyProgramInput,
  LoyaltyProgramListQuery,
  UpdateLoyaltyProgramInput,
} from "./loyalty.schema.js";

import {
  loyaltyStructuralRulesChanged,
} from "./loyalty-program-version.policy.js";

import {
  lockLoyaltyProgramRules,
} from "./loyalty-program-lock.js";

type LoyaltyAuth = {
  usuarioId: string;
  rol: string;
};

const programSelect = {
  id: true,
  sucursalId: true,
  creadoPorId: true,

  nombre: true,
  descripcion: true,

  tipo: true,
  visitasRequeridas: true,
  montoRequerido: true,

  tipoRecompensa: true,
  productoPremioId: true,
  cantidadPremio: true,
  montoDescuento: true,
  porcentajeDescuento: true,
  descripcionBeneficio: true,

  vigenciaDiasPremio: true,
  automatico: true,
  activo: true,

  fechaInicio: true,
  fechaFin: true,

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

  productoPremio: {
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

  _count: {
    select: {
      progresos: true,
      premios: true,
    },
  },
} satisfies
  Prisma.ProgramaFidelizacionSelect;

const programRuleVersionSelect = {
  id: true,
  sucursalId: true,
  tipo: true,
  visitasRequeridas: true,
  montoRequerido: true,
  tipoRecompensa: true,
  productoPremioId: true,
  cantidadPremio: true,
  montoDescuento: true,
  porcentajeDescuento: true,
  descripcionBeneficio: true,
  vigenciaDiasPremio: true,
  automatico: true,
  fechaInicio: true,

  _count: {
    select: {
      progresos:
        true,

      movimientos:
        true,
    },
  },
} satisfies Prisma.ProgramaFidelizacionSelect;

type ProgramRecord =
  Prisma.ProgramaFidelizacionGetPayload<{
    select:
      typeof programSelect;
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

function parseDateOnly(
  value: string,
): Date {
  return new Date(
    `${value}T00:00:00.000Z`,
  );
}

function formatDateOnly(
  value: Date,
): string {
  return value
    .toISOString()
    .slice(
      0,
      10,
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

function mapProgram(
  program: ProgramRecord,
) {
  return {
    id:
      program.id,

    sucursalId:
      program.sucursalId,

    nombre:
      program.nombre,

    descripcion:
      program.descripcion,

    tipo:
      program.tipo,

    visitasRequeridas:
      program
        .visitasRequeridas,

    montoRequerido:
      program
        .montoRequerido
        ?.toString() ??
      null,

    tipoRecompensa:
      program.tipoRecompensa,

    productoPremioId:
      program.productoPremioId,

    cantidadPremio:
      program
        .cantidadPremio
        ?.toString() ??
      null,

    montoDescuento:
      program
        .montoDescuento
        ?.toString() ??
      null,

    porcentajeDescuento:
      program
        .porcentajeDescuento
        ?.toString() ??
      null,

    descripcionBeneficio:
      program
        .descripcionBeneficio,

    vigenciaDiasPremio:
      program
        .vigenciaDiasPremio,

    automatico:
      program.automatico,

    activo:
      program.activo,

    fechaInicio:
      formatDateOnly(
        program.fechaInicio,
      ),

    fechaFin:
      program.fechaFin
        ? formatDateOnly(
            program.fechaFin,
          )
        : null,

    sucursal:
      program.sucursal,

    productoPremio:
      program.productoPremio,

    creadoPor: {
      id:
        program.creadoPor.id,

      nombreCompleto:
        getFullName(
          program.creadoPor,
        ),
    },

    cantidadClientes:
      program._count
        .progresos,

    cantidadPremios:
      program._count
        .premios,

    createdAt:
      program.createdAt
        .toISOString(),

    updatedAt:
      program.updatedAt
        .toISOString(),
  };
}

async function getAuthorizedBranches(
  auth: LoyaltyAuth,
  database: Pick<
    Prisma.TransactionClient,
    "sucursal" |
    "usuarioSucursal"
  > = prisma,
) {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return database.sucursal
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
    await database
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
  auth: LoyaltyAuth,
  branchId: string | null,
  database: Pick<
    Prisma.TransactionClient,
    "sucursal" |
    "usuarioSucursal"
  > = prisma,
): Promise<void> {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    if (!branchId) {
      return;
    }

    const branch =
      await database.sucursal
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
      "Solo el administrador general puede crear programas globales.",
      "PROGRAMA_GLOBAL_NO_AUTORIZADO",
    );
  }

  const branches =
    await getAuthorizedBranches(
      auth,
      database,
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
      "No tienes autorización para administrar programas de esta sucursal.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }
}

function buildVisibilityWhere(
  auth: LoyaltyAuth,
  branchIds: string[],
): Prisma.ProgramaFidelizacionWhereInput {
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

async function assertRewardProduct(
  productId: string | null,
  branchId: string | null,
): Promise<void> {
  if (!productId) {
    return;
  }

  const product =
    await prisma.producto
      .findFirst({
        where: {
          id:
            productId,

          deletedAt:
            null,

          estado:
            "ACTIVO",

          categoria: {
            estado:
              "ACTIVO",

            deletedAt:
              null,
          },

          sucursales: {
            some: {
              ...(branchId
                ? {
                    sucursalId:
                      branchId,
                  }
                : {
                    sucursal: {
                      estado:
                        "ACTIVO",

                      deletedAt:
                        null,
                    },
                  }),

              estado:
                "ACTIVO",

              disponibleVenta:
                true,
            },
          },
        },

        select: {
          id: true,
        },
      });

  if (!product) {
    throw new AppError(
      400,
      "El producto seleccionado no está disponible para el programa.",
      "PRODUCTO_PREMIO_INVALIDO",
    );
  }
}

function buildProgramData(
  input:
    | CreateLoyaltyProgramInput
    | UpdateLoyaltyProgramInput,
) {
  return {
    sucursalId:
      input.sucursalId,

    nombre:
      input.nombre,

    descripcion:
      input.descripcion?.trim() ||
      null,

    tipo:
      input.tipo,

    visitasRequeridas:
      input.tipo ===
        "VISITAS" ||
      input.tipo ===
        "AMBOS"
        ? input.visitasRequeridas
        : null,

    montoRequerido:
      input.tipo ===
        "MONTO_CONSUMIDO" ||
      input.tipo ===
        "AMBOS"
        ? input.montoRequerido
        : null,

    tipoRecompensa:
      input.tipoRecompensa,

    productoPremioId:
      input.tipoRecompensa ===
        "PRODUCTO_GRATIS"
        ? input.productoPremioId
        : null,

    cantidadPremio:
      input.tipoRecompensa ===
        "PRODUCTO_GRATIS"
        ? input.cantidadPremio
        : null,

    montoDescuento:
      input.tipoRecompensa ===
        "DESCUENTO_FIJO"
        ? input.montoDescuento
        : null,

    porcentajeDescuento:
      input.tipoRecompensa ===
        "DESCUENTO_PORCENTAJE"
        ? input.porcentajeDescuento
        : null,

    descripcionBeneficio:
      input.tipoRecompensa ===
        "BENEFICIO"
        ? input
            .descripcionBeneficio
            ?.trim() ||
          null
        : null,

    vigenciaDiasPremio:
      input.vigenciaDiasPremio,

    automatico:
      input.automatico,

    activo:
      input.activo,

    fechaInicio:
      parseDateOnly(
        input.fechaInicio,
      ),

    fechaFin:
      input.fechaFin
        ? parseDateOnly(
            input.fechaFin,
          )
        : null,
  };
}

export async function getLoyaltyOptions(
  auth: LoyaltyAuth,
  selectedBranchId?: string | null,
) {
  const branches =
    await getAuthorizedBranches(
      auth,
    );

  if (
    selectedBranchId &&
    auth.rol !==
      "ADMINISTRADOR_GENERAL" &&
    !branches.some(
      (branch) =>
        branch.id ===
        selectedBranchId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes acceso a la sucursal seleccionada.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }

  const products =
    await prisma.producto
      .findMany({
        where: {
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
            : {}),
        },

        select: {
          id: true,
          codigo: true,
          nombre: true,

          unidadMedida: {
            select: {
              abreviatura:
                true,
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

    tiposPrograma: [
      {
        codigo:
          "VISITAS",

        nombre:
          "Por visitas",
      },
      {
        codigo:
          "MONTO_CONSUMIDO",

        nombre:
          "Por monto consumido",
      },
      {
        codigo:
          "AMBOS",

        nombre:
          "Visitas y monto",
      },
    ],

    tiposRecompensa: [
      {
        codigo:
          "PRODUCTO_GRATIS",

        nombre:
          "Producto gratis",
      },
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
          "BENEFICIO",

        nombre:
          "Beneficio especial",
      },
    ],

    puedeCrearGlobal:
      auth.rol ===
      "ADMINISTRADOR_GENERAL",
  };
}

export async function listLoyaltyPrograms(
  auth: LoyaltyAuth,
  query: LoyaltyProgramListQuery,
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
    query.sucursalId &&
    auth.rol !==
      "ADMINISTRADOR_GENERAL" &&
    !branchIds.includes(
      query.sucursalId,
    )
  ) {
    throw new AppError(
      403,
      "No tienes acceso a la sucursal seleccionada.",
      "SUCURSAL_NO_AUTORIZADA",
    );
  }

  const where:
    Prisma.ProgramaFidelizacionWhereInput = {
      AND: [
        buildVisibilityWhere(
          auth,
          branchIds,
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

        ...(query.sucursalId
          ? [
              {
                sucursalId:
                  query.sucursalId,
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

        ...(query.activo ===
        "ACTIVO"
          ? [
              {
                activo:
                  true,
              },
            ]
          : []),

        ...(query.activo ===
        "INACTIVO"
          ? [
              {
                activo:
                  false,
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
    programs,
    total,
  ] =
    await Promise.all([
      prisma
        .programaFidelizacion
        .findMany({
          where,

          select:
            programSelect,

          orderBy: [
            {
              activo:
                "desc",
            },
            {
              createdAt:
                "desc",
            },
          ],

          skip,

          take:
            query.limit,
        }),

      prisma
        .programaFidelizacion
        .count({
          where,
        }),
    ]);

  return {
    programas:
      programs.map(
        mapProgram,
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

export async function getLoyaltyProgramById(
  auth: LoyaltyAuth,
  programId: string,
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

  const program =
    await prisma
      .programaFidelizacion
      .findFirst({
        where: {
          id:
            programId,

          AND: [
            buildVisibilityWhere(
              auth,
              branchIds,
            ),
          ],
        },

        select:
          programSelect,
      });

  if (!program) {
    throw new AppError(
      404,
      "El programa de fidelización no existe.",
      "PROGRAMA_NO_ENCONTRADO",
    );
  }

  return mapProgram(
    program,
  );
}

export async function createLoyaltyProgram(
  auth: LoyaltyAuth,
  input: CreateLoyaltyProgramInput,
) {
  await assertWriteAccess(
    auth,
    input.sucursalId,
  );

  await assertRewardProduct(
    input.productoPremioId,
    input.sucursalId,
  );

  const program =
    await prisma
      .programaFidelizacion
      .create({
        data: {
          ...buildProgramData(
            input,
          ),

          creadoPorId:
            auth.usuarioId,
        },

        select:
          programSelect,
      });

  return mapProgram(
    program,
  );
}

export async function updateLoyaltyProgram(
  auth: LoyaltyAuth,
  programId: string,
  input: UpdateLoyaltyProgramInput,
) {
  const currentProgram =
    await prisma
      .programaFidelizacion
      .findUnique({
        where: {
          id:
            programId,
        },

        select: {
          id: true,
          sucursalId: true,
        },
      });

  if (!currentProgram) {
    throw new AppError(
      404,
      "El programa de fidelización no existe.",
      "PROGRAMA_NO_ENCONTRADO",
    );
  }

  await assertWriteAccess(
    auth,
    currentProgram.sucursalId,
  );

  await assertWriteAccess(
    auth,
    input.sucursalId,
  );

  const nextProgramData =
    buildProgramData(
      input,
    );

  await assertRewardProduct(
    input.productoPremioId,
    input.sucursalId,
  );

  const program =
    await prisma.$transaction(
      async (transaction) => {
        await lockLoyaltyProgramRules(
          transaction,
          programId,
        );

        const lockedProgram =
          await transaction
            .programaFidelizacion
            .findUnique({
              where: {
                id:
                  programId,
              },

              select:
                programRuleVersionSelect,
            });

        if (!lockedProgram) {
          throw new AppError(
            404,
            "El programa de fidelización no existe.",
            "PROGRAMA_NO_ENCONTRADO",
          );
        }

        await assertWriteAccess(
          auth,
          lockedProgram
            .sucursalId,
          transaction,
        );

        const hasActivity =
          lockedProgram
            ._count
            .progresos > 0 ||
          lockedProgram
            ._count
            .movimientos > 0;

        if (
          hasActivity &&
          loyaltyStructuralRulesChanged(
            lockedProgram,
            nextProgramData,
          )
        ) {
          throw new AppError(
            409,
            "Las reglas de un programa con actividad no pueden modificarse. Cierra este programa y crea uno nuevo para conservar el historial de los clientes.",
            "REGLAS_PROGRAMA_INMUTABLES",
          );
        }

        return transaction
          .programaFidelizacion
          .update({
            where: {
              id:
                programId,
            },

            data:
              nextProgramData,

            select:
              programSelect,
          });
      },
    );

  return mapProgram(
    program,
  );
}

export async function updateLoyaltyProgramStatus(
  auth: LoyaltyAuth,
  programId: string,
  active: boolean,
) {
  const currentProgram =
    await prisma
      .programaFidelizacion
      .findUnique({
        where: {
          id:
            programId,
        },

        select: {
          id: true,
          sucursalId: true,
        },
      });

  if (!currentProgram) {
    throw new AppError(
      404,
      "El programa de fidelización no existe.",
      "PROGRAMA_NO_ENCONTRADO",
    );
  }

  await assertWriteAccess(
    auth,
    currentProgram.sucursalId,
  );

  const program =
    await prisma
      .programaFidelizacion
      .update({
        where: {
          id:
            programId,
        },

        data: {
          activo:
            active,
        },

        select:
          programSelect,
      });

  return mapProgram(
    program,
  );
}
