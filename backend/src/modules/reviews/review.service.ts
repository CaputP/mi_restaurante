import {
  Prisma,
} from "../../generated/prisma/client.js";
import {
  prisma,
} from "../../lib/prisma.js";
import {
  withSerializableTransaction,
} from "../../lib/transaction.js";
import {
  AppError,
} from "../../shared/errors/app-error.js";
import {
  createBranchRoleNotifications,
  createUserNotification,
} from "../notifications/notification-generator.service.js";
import type {
  AdminReviewListQuery,
  ClientSaleReviewQuery,
  CreateReviewInput,
  ModerateReviewInput,
  PublicReviewQuery,
} from "./review.schema.js";

type ReviewAuth = {
  usuarioId: string;
  rol: string;
};

function publicName(
  user: {
    nombres: string;
    apellidos: string;
  },
): string {
  const firstName =
    user.nombres
      .trim()
      .split(/\s+/)[0] ??
    "Cliente";
  const lastInitial =
    user.apellidos
      .trim()
      .charAt(0)
      .toLocaleUpperCase("es-PE");

  return lastInitial
    ? `${firstName} ${lastInitial}.`
    : firstName;
}

function serializeReview(
  review: {
    id: string;
    calificacion: number;
    comentario: string;
    nombrePublico: string;
    estado: string;
    destacada: boolean;
    motivoModeracion: string | null;
    consentimientoPublicacionAt: Date;
    moderadaAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
) {
  return {
    ...review,
    consentimientoPublicacionAt:
      review.consentimientoPublicacionAt
        .toISOString(),
    moderadaAt:
      review.moderadaAt
        ?.toISOString() ??
      null,
    createdAt:
      review.createdAt
        .toISOString(),
    updatedAt:
      review.updatedAt
        .toISOString(),
  };
}

export async function listPublicReviews(
  query: PublicReviewQuery,
) {
  const publicWhere:
    Prisma.ResenaWhereInput = {
      estado:
        "APROBADA",
      destacada:
        true,
      venta: {
        estado:
          "CONFIRMADA",
      },
      cliente: {
        estado:
          "ACTIVO",
      },
      sucursal: {
        estado:
          "ACTIVO",
      },
    };

  const [reviews, aggregate] =
    await prisma.$transaction([
      prisma.resena.findMany({
        where:
          publicWhere,
        orderBy: [
          {
            moderadaAt:
              "desc",
          },
          {
            createdAt:
              "desc",
          },
        ],
        take:
          query.limit,
        select: {
          id: true,
          calificacion:
            true,
          comentario:
            true,
          nombrePublico:
            true,
          createdAt:
            true,
          sucursal: {
            select: {
              nombre:
                true,
            },
          },
        },
      }),
      prisma.resena.aggregate({
        where: {
          estado:
            "APROBADA",
          venta: {
            estado:
              "CONFIRMADA",
          },
        },
        _avg: {
          calificacion:
            true,
        },
        _count: {
          _all:
            true,
        },
      }),
    ]);

  return {
    testimonios:
      reviews.map(
        (review) => ({
          id:
            review.id,
          nombre:
            review.nombrePublico,
          calificacion:
            review.calificacion,
          comentario:
            review.comentario,
          fecha:
            review.createdAt
              .toISOString(),
          sucursal:
            review.sucursal
              .nombre,
          compraVerificada:
            true,
        }),
      ),
    resumen: {
      promedio:
        Number(
          (
            aggregate
              ._avg
              .calificacion ??
            0
          ).toFixed(1),
        ),
      total:
        aggregate
          ._count
          ._all,
    },
  };
}

export async function listClientReviewableSales(
  auth: ReviewAuth,
  query: ClientSaleReviewQuery,
) {
  const where:
    Prisma.VentaWhereInput = {
      clienteId:
        auth.usuarioId,
      estado:
        "CONFIRMADA",
    };

  const [sales, total] =
    await prisma.$transaction([
      prisma.venta.findMany({
        where,
        orderBy: {
          createdAt:
            "desc",
        },
        skip:
          (query.page - 1) *
          query.limit,
        take:
          query.limit,
        select: {
          id: true,
          numeroTicket:
            true,
          total: true,
          createdAt:
            true,
          sucursal: {
            select: {
              id: true,
              nombre:
                true,
            },
          },
          detalles: {
            orderBy: {
              createdAt:
                "asc",
            },
            take:
              4,
            select: {
              nombreProducto:
                true,
              cantidad:
                true,
            },
          },
          resena: {
            select: {
              id: true,
              calificacion:
                true,
              comentario:
                true,
              nombrePublico:
                true,
              estado: true,
              destacada:
                true,
              motivoModeracion:
                true,
              consentimientoPublicacionAt:
                true,
              moderadaAt:
                true,
              createdAt:
                true,
              updatedAt:
                true,
            },
          },
        },
      }),
      prisma.venta.count({
        where,
      }),
    ]);

  return {
    ventas:
      sales.map(
        (sale) => ({
          id:
            sale.id,
          numeroTicket:
            sale.numeroTicket,
          total:
            Number(sale.total),
          createdAt:
            sale.createdAt
              .toISOString(),
          sucursal:
            sale.sucursal,
          productos:
            sale.detalles.map(
              (detail) => ({
                nombre:
                  detail.nombreProducto,
                cantidad:
                  Number(detail.cantidad),
              }),
            ),
          puedeOpinar:
            !sale.resena,
          resena:
            sale.resena
              ? serializeReview(
                sale.resena,
              )
              : null,
        }),
      ),
    paginacion: {
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

export async function createVerifiedReview(
  auth: ReviewAuth,
  input: CreateReviewInput,
) {
  try {
    return await withSerializableTransaction(
      async (transaction) => {
        const sale =
          await transaction
            .venta
            .findUnique({
              where: {
                id:
                  input.ventaId,
              },
              select: {
                id: true,
                clienteId:
                  true,
                sucursalId:
                  true,
                numeroTicket:
                  true,
                estado: true,
                resena: {
                  select: {
                    id: true,
                  },
                },
                cliente: {
                  select: {
                    nombres:
                      true,
                    apellidos:
                      true,
                  },
                },
              },
            });

        if (
          !sale ||
          sale.clienteId !==
            auth.usuarioId
        ) {
          throw new AppError(
            404,
            "La venta no existe o no pertenece a tu cuenta.",
            "VENTA_NO_ENCONTRADA",
          );
        }

        if (
          sale.estado !==
          "CONFIRMADA"
        ) {
          throw new AppError(
            409,
            "Solo puedes opinar sobre una venta confirmada.",
            "VENTA_NO_CALIFICABLE",
          );
        }

        if (
          sale.resena
        ) {
          throw new AppError(
            409,
            "Esta compra ya tiene una reseña registrada.",
            "RESENA_YA_REGISTRADA",
          );
        }

        if (!sale.cliente) {
          throw new AppError(
            409,
            "La venta no contiene un cliente verificable.",
            "CLIENTE_NO_VERIFICABLE",
          );
        }

        const review =
          await transaction
            .resena
            .create({
              data: {
                ventaId:
                  sale.id,
                clienteId:
                  auth.usuarioId,
                sucursalId:
                  sale.sucursalId,
                calificacion:
                  input.calificacion,
                comentario:
                  input.comentario,
                nombrePublico:
                  publicName(
                    sale.cliente,
                  ),
                consentimientoPublicacionAt:
                  new Date(),
                estado:
                  "PENDIENTE",
              },
              select: {
                id: true,
                calificacion:
                  true,
                comentario:
                  true,
                nombrePublico:
                  true,
                estado: true,
                destacada:
                  true,
                motivoModeracion:
                  true,
                consentimientoPublicacionAt:
                  true,
                moderadaAt:
                  true,
                createdAt:
                  true,
                updatedAt:
                  true,
              },
            });

        await transaction
          .notificacion
          .updateMany({
            where: {
              usuarioId:
                auth.usuarioId,
              tipo:
                "RESENA_DISPONIBLE",
              entidad:
                "Venta",
              entidadId:
                sale.id,
              OR: [
                {
                  expiraAt:
                    null,
                },
                {
                  expiraAt: {
                    gt:
                      new Date(),
                  },
                },
              ],
            },
            data: {
              expiraAt:
                new Date(),
            },
          });

        await createBranchRoleNotifications(
          transaction,
          {
            sucursalId:
              sale.sucursalId,
            roles: [
              "ADMINISTRADOR_GENERAL",
              "ADMINISTRADOR_SUCURSAL",
            ],
            tipo:
              "RESENA_PENDIENTE",
            prioridad:
              "NORMAL",
            titulo:
              "Nueva reseña por moderar",
            mensaje:
              `La venta ${sale.numeroTicket} recibió una opinión verificada de ${input.calificacion} estrella(s).`,
            entidad:
              "Resena",
            entidadId:
              review.id,
          },
        );

        return serializeReview(
          review,
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
        "Esta compra ya tiene una reseña registrada.",
        "RESENA_YA_REGISTRADA",
      );
    }

    throw error;
  }
}

async function getAdminReviewWhere(
  auth: ReviewAuth,
): Promise<Prisma.ResenaWhereInput> {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return {};
  }

  const assignments =
    await prisma
      .usuarioSucursal
      .findMany({
        where: {
          usuarioId:
            auth.usuarioId,
          activo:
            true,
        },
        select: {
          sucursalId:
            true,
        },
      });

  return {
    sucursalId: {
      in:
        assignments.map(
          (assignment) =>
            assignment.sucursalId,
        ),
    },
  };
}

const adminReviewSelect = {
  id: true,
  calificacion: true,
  comentario: true,
  nombrePublico: true,
  estado: true,
  destacada: true,
  motivoModeracion: true,
  consentimientoPublicacionAt: true,
  moderadaAt: true,
  createdAt: true,
  updatedAt: true,
  venta: {
    select: {
      id: true,
      numeroTicket: true,
      total: true,
      createdAt: true,
    },
  },
  cliente: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  },
  sucursal: {
    select: {
      id: true,
      nombre: true,
    },
  },
  moderadaPor: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
    },
  },
} satisfies Prisma.ResenaSelect;

function serializeAdminReview(
  review: Prisma.ResenaGetPayload<{
    select: typeof adminReviewSelect;
  }>,
) {
  return {
    ...serializeReview(
      review,
    ),
    venta: {
      ...review.venta,
      total:
        Number(review.venta.total),
      createdAt:
        review.venta.createdAt
          .toISOString(),
    },
    cliente: {
      id:
        review.cliente.id,
      nombreCompleto:
        `${review.cliente.nombres} ${review.cliente.apellidos}`,
    },
    sucursal:
      review.sucursal,
    moderadaPor:
      review.moderadaPor
        ? {
            id:
              review.moderadaPor.id,
            nombreCompleto:
              `${review.moderadaPor.nombres} ${review.moderadaPor.apellidos}`,
          }
        : null,
  };
}

export async function listAdminReviews(
  auth: ReviewAuth,
  query: AdminReviewListQuery,
) {
  const authorizedWhere =
    await getAdminReviewWhere(
      auth,
    );

  const where:
    Prisma.ResenaWhereInput = {
      AND: [
        authorizedWhere,
        query.estado !==
        "TODOS"
          ? {
              estado:
                query.estado,
            }
          : {},
        query.destacada !==
        "TODAS"
          ? {
              destacada:
                query.destacada ===
                "SI",
            }
          : {},
        query.sucursalId
          ? {
              sucursalId:
                query.sucursalId,
            }
          : {},
        query.search
          ? {
              OR: [
                {
                  comentario: {
                    contains:
                      query.search,
                    mode:
                      "insensitive",
                  },
                },
                {
                  nombrePublico: {
                    contains:
                      query.search,
                    mode:
                      "insensitive",
                  },
                },
                {
                  venta: {
                    numeroTicket: {
                      contains:
                        query.search,
                      mode:
                        "insensitive",
                    },
                  },
                },
              ],
            }
          : {},
      ],
    };

  const [reviews, total, pending, approved] =
    await prisma.$transaction([
      prisma.resena.findMany({
        where,
        orderBy: {
          createdAt:
            "desc",
        },
        skip:
          (query.page - 1) *
          query.limit,
        take:
          query.limit,
        select:
          adminReviewSelect,
      }),
      prisma.resena.count({
        where,
      }),
      prisma.resena.count({
        where: {
          AND: [
            authorizedWhere,
            {
              estado:
                "PENDIENTE",
            },
          ],
        },
      }),
      prisma.resena.count({
        where: {
          AND: [
            authorizedWhere,
            {
              estado:
                "APROBADA",
            },
          ],
        },
      }),
    ]);

  return {
    resenas:
      reviews.map(
        serializeAdminReview,
      ),
    resumen: {
      pendientes:
        pending,
      aprobadas:
        approved,
    },
    paginacion: {
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

export async function moderateReview(
  auth: ReviewAuth,
  reviewId: string,
  input: ModerateReviewInput,
) {
  const authorizedWhere =
    await getAdminReviewWhere(
      auth,
    );

  return withSerializableTransaction(
    async (transaction) => {
      const review =
        await transaction
          .resena
          .findFirst({
            where: {
              AND: [
                {
                  id:
                    reviewId,
                },
                authorizedWhere,
              ],
            },
            select: {
              id: true,
              clienteId:
                true,
              sucursalId:
                true,
              estado: true,
            },
          });

      if (!review) {
        throw new AppError(
          404,
          "La reseña no existe o no pertenece a tu alcance.",
          "RESENA_NO_ENCONTRADA",
        );
      }

      const updated =
        await transaction
          .resena
          .update({
            where: {
              id:
                review.id,
            },
            data: {
              estado:
                input.estado,
              destacada:
                input.estado ===
                "APROBADA"
                  ? input.destacada
                  : false,
              motivoModeracion:
                input.motivo,
              moderadaPorId:
                auth.usuarioId,
              moderadaAt:
                new Date(),
            },
            select:
              adminReviewSelect,
          });

      const stateMessage = {
        APROBADA:
          "fue aprobada y ya puede publicarse",
        RECHAZADA:
          "fue rechazada durante la moderación",
        OCULTA:
          "fue retirada de la publicación",
      }[input.estado];

      await createUserNotification(
        transaction,
        {
          usuarioId:
            review.clienteId,
          sucursalId:
            review.sucursalId,
          tipo:
            "RESENA_MODERADA",
          prioridad:
            input.estado ===
            "APROBADA"
              ? "NORMAL"
              : "BAJA",
          titulo:
            "Estado de tu opinión",
          mensaje:
            `Tu reseña ${stateMessage}.${input.motivo ? ` Motivo: ${input.motivo}` : ""}`,
          entidad:
            "Resena",
          entidadId:
            review.id,
        },
      );

      return serializeAdminReview(
        updated,
      );
    },
  );
}

export async function createReviewAvailabilityNotification(
  transaction: Prisma.TransactionClient,
  saleId: string,
) {
  const sale =
    await transaction
      .venta
      .findUnique({
        where: {
          id:
            saleId,
        },
        select: {
          id: true,
          numeroTicket:
            true,
          clienteId:
            true,
          sucursalId:
            true,
          estado: true,
        },
      });

  if (
    !sale?.clienteId ||
    sale.estado !==
      "CONFIRMADA"
  ) {
    return {
      creada:
        false,
    };
  }

  const existing =
    await transaction
      .notificacion
      .findFirst({
        where: {
          usuarioId:
            sale.clienteId,
          tipo:
            "RESENA_DISPONIBLE",
          entidad:
            "Venta",
          entidadId:
            sale.id,
        },
        select: {
          id: true,
        },
      });

  if (existing) {
    return {
      creada:
        false,
    };
  }

  await createUserNotification(
    transaction,
    {
      usuarioId:
        sale.clienteId,
      sucursalId:
        sale.sucursalId,
      tipo:
        "RESENA_DISPONIBLE",
      prioridad:
        "BAJA",
      titulo:
        "Cuéntanos tu experiencia",
      mensaje:
        `Tu compra ${sale.numeroTicket} ya puede ser calificada. Tu opinión nos ayuda a mejorar.`,
      entidad:
        "Venta",
      entidadId:
        sale.id,
    },
  );

  return {
    creada:
      true,
  };
}
