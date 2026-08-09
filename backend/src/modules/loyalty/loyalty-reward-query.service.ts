import type {
  Prisma,
} from "../../generated/prisma/client.js";

export type AvailableCustomerReward = {
  id: string;
  descripcion: string;
  tipoRecompensaSnapshot:
  | "PRODUCTO_GRATIS"
  | "DESCUENTO_FIJO"
  | "DESCUENTO_PORCENTAJE"
  | "BENEFICIO"
  | null;
  productoPremioId: string | null;
  cantidadProducto: Prisma.Decimal | null;
  valorReferencia: Prisma.Decimal | null;
  fechaObtencion: Date;
  fechaVencimiento: Date;
  programa: {
    id: string;
    nombre: string;
    tipoRecompensa:
    | "PRODUCTO_GRATIS"
    | "DESCUENTO_FIJO"
    | "DESCUENTO_PORCENTAJE"
    | "BENEFICIO";
    sucursalId: string | null;
  };
  productoPremio: {
    id: string;
    codigo: string;
    nombre: string;
  } | null;
};

export async function findAvailableCustomerRewards(
  transaction: Prisma.TransactionClient,
  customerId: string,
  branchId: string,
): Promise<AvailableCustomerReward[]> {
  return transaction.premioCliente.findMany({
    where: {
      clienteId: customerId,
      estado: "DISPONIBLE",
      fechaVencimiento: {
        gte: new Date(),
      },
      OR: [
        {
          programa: {
            sucursalId: null,
          },
        },
        {
          programa: {
            sucursalId: branchId,
          },
        },
      ],
    },
    select: {
      id: true,
      descripcion: true,
      tipoRecompensaSnapshot: true,
      productoPremioId: true,
      cantidadProducto: true,
      valorReferencia: true,
      fechaObtencion: true,
      fechaVencimiento: true,
      programa: {
        select: {
          id: true,
          nombre: true,
          tipoRecompensa: true,
          sucursalId: true,
        },
      },
      productoPremio: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
        },
      },
    },
    orderBy: [
      {
        fechaVencimiento: "asc",
      },
      {
        fechaObtencion: "asc",
      },
    ],
  });
}
