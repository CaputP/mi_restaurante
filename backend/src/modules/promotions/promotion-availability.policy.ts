import type {
  Prisma,
} from "../../generated/prisma/client.js";

export function hasAvailablePromotionUses(
  maximumUses: number | null,
  currentUses: number,
): boolean {
  return (
    maximumUses === null ||
    currentUses < maximumUses
  );
}

export function promotionClaimChangesPublicAvailability(
  maximumUses: number | null,
  currentUses: number,
): boolean {
  return (
    maximumUses !== null &&
    currentUses < maximumUses &&
    currentUses + 1 >=
      maximumUses
  );
}

export function promotionReversalChangesPublicAvailability(
  maximumUses: number | null,
  currentUses: number,
): boolean {
  return (
    maximumUses !== null &&
    currentUses > 0 &&
    currentUses >=
      maximumUses
  );
}

export function buildPromotionProductAvailabilityWhere(
  branchId?: string,
): Prisma.ProductoWhereInput {
  return {
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
  };
}
