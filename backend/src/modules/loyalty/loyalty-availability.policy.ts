import type {
  Prisma,
} from "../../generated/prisma/client.js";

/**
 * Única definición de un programa publicable y operable para el cliente.
 * Se reutiliza tanto en el catálogo como en "Mi progreso" para que ninguna
 * vista prometa un premio que la otra considera inactivo o no entregable.
 */
export function buildAvailableLoyaltyProgramWhere(
  operationalDate: Date,
): Prisma.ProgramaFidelizacionWhereInput {
  return {
    activo:
      true,

    automatico:
      true,

    fechaInicio: {
      lte:
        operationalDate,
    },

    AND: [
      {
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
      },
      {
        OR: [
          {
            sucursalId:
              null,
          },
          {
            sucursal: {
              is: {
                estado:
                  "ACTIVO",

                deletedAt:
                  null,
              },
            },
          },
        ],
      },
      buildLoyaltyRewardAvailabilityWhere(),
    ],
  };
}

/**
 * Condición compartida por el catálogo y el motor de ventas. Cuando se
 * conoce una sede, el producto premio debe poder venderse específicamente
 * allí; para el catálogo global basta con que exista al menos una sede
 * operativa y luego se publica la lista exacta de sedes aplicables.
 */
export function buildLoyaltyRewardAvailabilityWhere(
  branchId?: string,
): Prisma.ProgramaFidelizacionWhereInput {
  return {
    OR: [
      {
        tipoRecompensa: {
          not:
            "PRODUCTO_GRATIS",
        },
      },
      {
        productoPremio: {
          is: {
            estado:
              "ACTIVO",

            deletedAt:
              null,

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
                  : {}),

                estado:
                  "ACTIVO",

                disponibleVenta:
                  true,

                sucursal: {
                  estado:
                    "ACTIVO",

                  deletedAt:
                    null,
                },
              },
            },
          },
        },
      },
    ],
  };
}

type LoyaltyAvailabilityRecord = {
  sucursalId:
    string | null;

  tipoRecompensa:
    string;

  sucursal:
    | {
        nombre:
          string;
      }
    | null;

  productoPremio:
    | {
        sucursales: Array<{
          sucursalId:
            string;

          sucursal: {
            nombre:
              string;
          };
        }>;
      }
    | null;
};

export function getLoyaltyApplicableBranchNames(
  program: LoyaltyAvailabilityRecord,
): string[] {
  if (
    program.tipoRecompensa !==
    "PRODUCTO_GRATIS"
  ) {
    return program.sucursal
      ? [
          program
            .sucursal
            .nombre,
        ]
      : [];
  }

  const branchNames =
    program
      .productoPremio
      ?.sucursales
      .filter(
        (assignment) =>
          !program.sucursalId ||
          assignment
            .sucursalId ===
            program.sucursalId,
      )
      .map(
        (assignment) =>
          assignment
            .sucursal
            .nombre,
      ) ?? [];

  return [
    ...new Set(
      branchNames,
    ),
  ].sort(
    (left, right) =>
      left.localeCompare(
        right,
        "es",
      ),
  );
}

export function isLoyaltyProgramDeliverable(
  program: LoyaltyAvailabilityRecord,
): boolean {
  return (
    program.tipoRecompensa !==
      "PRODUCTO_GRATIS" ||
    getLoyaltyApplicableBranchNames(
      program,
    ).length > 0
  );
}
