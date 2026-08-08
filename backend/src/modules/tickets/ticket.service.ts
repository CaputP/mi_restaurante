import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

type TicketAuth = {
  usuarioId: string;
  rol: string;
};

function getLimaOperationalDate(): Date {
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

async function assertSaleAccess(
  auth: TicketAuth,
  sale: {
    sucursalId: string;
    vendedorId: string;
  },
): Promise<void> {
  if (
    auth.rol ===
    "ADMINISTRADOR_GENERAL"
  ) {
    return;
  }

  if (
    auth.rol ===
    "VENDEDOR" &&
    sale.vendedorId ===
    auth.usuarioId
  ) {
    return;
  }

  const operationalDate =
    getLimaOperationalDate();

  const assignment =
    await prisma
      .usuarioSucursal
      .findFirst({
        where: {
          usuarioId:
            auth.usuarioId,

          sucursalId:
            sale.sucursalId,

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
        },

        select: {
          id:
            true,
        },
      });

  if (!assignment) {
    throw new AppError(
      403,
      "No tienes autorización para consultar el ticket de esta venta.",
      "VENTA_NO_AUTORIZADA",
    );
  }
}

export async function getSaleTicket(
  auth: TicketAuth,
  saleId: string,
) {
  const sale =
    await prisma.venta.findFirst({
      where: {
        id:
          saleId,
      },

      select: {
        id:
          true,

        numeroTicket:
          true,

        sucursalId:
          true,

        vendedorId:
          true,

        nombreCliente:
          true,

        subtotal:
          true,

        descuento:
          true,

        propina:
          true,

        total:
          true,

        adelantoAplicado:
          true,

        saldoCobrar:
          true,

        estado:
          true,

        observaciones:
          true,

        motivoAnulacion:
          true,

        anuladaAt:
          true,

        createdAt:
          true,

        sucursal: {
          select: {
            codigo:
              true,

            nombre:
              true,

            razonSocial:
              true,

            ruc:
              true,

            direccion:
              true,

            telefono:
              true,

            correo:
              true,
          },
        },

        pedido: {
          select: {
            codigo:
              true,

            tipoPedido:
              true,

            zona: {
              select: {
                nombre:
                  true,
              },
            },
          },
        },

        caja: {
          select: {
            codigo:
              true,
          },
        },

        vendedor: {
          select: {
            nombres:
              true,

            apellidos:
              true,
          },
        },

        cliente: {
          select: {
            nombres:
              true,

            apellidos:
              true,

            correo:
              true,

            telefono:
              true,
          },
        },

        anuladaPor: {
          select: {
            nombres:
              true,

            apellidos:
              true,
          },
        },

        detalles: {
          orderBy: {
            createdAt:
              "asc",
          },

          select: {
            id:
              true,

            nombreProducto:
              true,

            cantidad:
              true,

            precioUnitario:
              true,

            subtotal:
              true,
          },
        },

        pagos: {
          where: {
            estado: {
              in: [
                "CONFIRMADO",
                "ANULADO",
              ],
            },
          },

          orderBy: {
            createdAt:
              "asc",
          },

          select: {
            id:
              true,

            metodoPago:
              true,

            monto:
              true,

            numeroOperacion:
              true,

            montoRecibido:
              true,

            vuelto:
              true,

            estado:
              true,
          },
        },

        promocionesAplicadas: {
          orderBy: {
            createdAt:
              "asc",
          },

          select: {
            id:
              true,

            descripcion:
              true,

            montoDescuento:
              true,

            promocion: {
              select: {
                id:
                  true,

                nombre:
                  true,

                tipo:
                  true,
              },
            },
          },
        },

        canjesPremios: {
          orderBy: {
            fechaCanje:
              "asc",
          },

          select: {
            id: true,

            descripcion:
              true,

            tipoRecompensa:
              true,

            montoAplicado:
              true,

            productoPremioNombre:
              true,

            estado:
              true,

            fechaCanje:
              true,

            premio: {
              select: {
                programa: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
            },
          },
        },

      },
    });

  if (!sale) {
    throw new AppError(
      404,
      "La venta no existe.",
      "VENTA_NO_ENCONTRADA",
    );
  }

  await assertSaleAccess(
    auth,
    {
      sucursalId:
        sale.sucursalId,

      vendedorId:
        sale.vendedorId,
    },
  );

  const registeredCustomerName =
    sale.cliente
      ? getFullName(
        sale.cliente,
      )
      : null;

  const customerName =
    sale.nombreCliente?.trim() ||
    registeredCustomerName ||
    "Cliente general";

  const promotionalDiscount =
    sale.promocionesAplicadas
      .reduce(
        (
          total,
          appliedPromotion,
        ) =>
          total +
          Number(
            appliedPromotion
              .montoDescuento,
          ),
        0,
      );

  const rewardDiscount =
    sale.canjesPremios
      .reduce(
        (
          total,
          redemption,
        ) =>
          total +
          Number(
            redemption
              .montoAplicado,
          ),
        0,
      );

  const manualDiscount =
    Math.max(
      0,
      Number(
        sale.descuento,
      ) -
      promotionalDiscount -
      rewardDiscount,
    );

  return {
    id:
      sale.id,

    numeroTicket:
      sale.numeroTicket,

    estado:
      sale.estado,

    fechaEmision:
      sale.createdAt
        .toISOString(),

    negocio: {
      codigo:
        sale.sucursal.codigo,

      nombre:
        sale.sucursal.nombre,

      razonSocial:
        sale.sucursal
          .razonSocial,

      ruc:
        sale.sucursal.ruc,

      direccion:
        sale.sucursal
          .direccion,

      telefono:
        sale.sucursal
          .telefono,

      correo:
        sale.sucursal.correo,
    },

    pedido: {
      codigo:
        sale.pedido.codigo,

      tipo:
        sale.pedido
          .tipoPedido,

      zona:
        sale.pedido.zona
          ?.nombre ??
        null,
    },

    caja: {
      codigo:
        sale.caja.codigo,
    },

    vendedor: {
      nombreCompleto:
        getFullName(
          sale.vendedor,
        ),
    },

    cliente: {
      nombreCompleto:
        customerName,

      correo:
        sale.cliente
          ?.correo ??
        null,

      telefono:
        sale.cliente
          ?.telefono ??
        null,
    },

    detalles:
      sale.detalles.map(
        (detail) => ({
          id:
            detail.id,

          nombreProducto:
            detail.nombreProducto,

          cantidad:
            detail.cantidad
              .toString(),

          precioUnitario:
            detail.precioUnitario
              .toString(),

          subtotal:
            detail.subtotal
              .toString(),
        }),
      ),

    promociones:
      sale.promocionesAplicadas
        .map(
          (
            appliedPromotion,
          ) => ({
            id:
              appliedPromotion.id,

            promocionId:
              appliedPromotion
                .promocion.id,

            nombre:
              appliedPromotion
                .promocion.nombre,

            tipo:
              appliedPromotion
                .promocion.tipo,

            descripcion:
              appliedPromotion
                .descripcion,

            montoDescuento:
              appliedPromotion
                .montoDescuento
                .toString(),
          }),
        ),

    premiosCanjeados:
      sale.canjesPremios
        .map(
          (redemption) => ({
            id:
              redemption.id,

            descripcion:
              redemption
                .descripcion,

            tipoRecompensa:
              redemption
                .tipoRecompensa,

            montoAplicado:
              redemption
                .montoAplicado
                .toString(),

            productoPremioNombre:
              redemption
                .productoPremioNombre,

            estado:
              redemption.estado,

            fechaCanje:
              redemption
                .fechaCanje
                .toISOString(),

            programa: {
              id:
                redemption
                  .premio
                  .programa.id,

              nombre:
                redemption
                  .premio
                  .programa.nombre,
            },
          }),
        ),

    resumen: {
      subtotal:
        sale.subtotal
          .toString(),

      descuento:
        sale.descuento
          .toString(),

      descuentoPromocional:
        promotionalDiscount
          .toFixed(
            2,
          ),

      descuentoManual:
        manualDiscount
          .toFixed(
            2,
          ),

      propina:
        sale.propina
          .toString(),

      total:
        sale.total
          .toString(),

      adelantoAplicado:
        sale.adelantoAplicado
          .toString(),

      saldoCobrar:
        sale.saldoCobrar
          .toString(),

      descuentoPremios:
        rewardDiscount
          .toFixed(
            2,
          ),
    },

    pagos:
      sale.pagos.map(
        (payment) => ({
          id:
            payment.id,

          metodoPago:
            payment.metodoPago,

          monto:
            payment.monto
              .toString(),

          numeroOperacion:
            payment
              .numeroOperacion,

          montoRecibido:
            payment
              .montoRecibido
              ?.toString() ??
            null,

          vuelto:
            payment.vuelto
              ?.toString() ??
            null,

          estado:
            payment.estado,
        }),
      ),

    observaciones:
      sale.observaciones,

    anulacion:
      sale.estado ===
        "ANULADA"
        ? {
          fecha:
            sale.anuladaAt
              ?.toISOString() ??
            null,

          motivo:
            sale
              .motivoAnulacion,

          responsable:
            sale.anuladaPor
              ? getFullName(
                sale.anuladaPor,
              )
              : null,
        }
        : null,
  };
}   