import {
  Prisma,
} from "../../generated/prisma/client.js";
import {
  createBranchRoleNotifications,
  createUserNotification,
} from "./notification-generator.service.js";

type NotificationTransaction =
  Prisma.TransactionClient;

export async function createNewCommandNotifications(
  transaction: NotificationTransaction,
  input: {
    commandId: string;
    commandCode: string;
    orderCode: string;
    branchId: string;
    destination: string;
  },
) {
  return createBranchRoleNotifications(
    transaction,
    {
      sucursalId:
        input.branchId,
      roles: [
        "COCINA",
      ],
      tipo:
        "COMANDA_NUEVA",
      prioridad:
        "ALTA",
      titulo:
        `Nueva comanda ${input.commandCode}`,
      mensaje:
        `El pedido ${input.orderCode} fue enviado a ${input.destination.toLowerCase()} y espera preparación.`,
      entidad:
        "Comanda",
      entidadId:
        input.commandId,
    },
  );
}

export async function createOrderReadyNotifications(
  transaction: NotificationTransaction,
  orderId: string,
) {
  const order =
    await transaction
      .pedido
      .findUnique({
        where: {
          id:
            orderId,
        },
        select: {
          id: true,
          codigo: true,
          estado: true,
          sucursalId:
            true,
          vendedorId:
            true,
          mozoId: true,
        },
      });

  if (
    !order ||
    order.estado !==
      "LISTO"
  ) {
    return {
      creadas:
        0,
    };
  }

  const recipientIds =
    new Set<string>([
      order.vendedorId,
      ...(order.mozoId
        ? [order.mozoId]
        : []),
    ]);

  if (!order.mozoId) {
    const branchWaiters =
      await transaction
        .usuarioSucursal
        .findMany({
          where: {
            sucursalId:
              order.sucursalId,
            activo:
              true,
            usuario: {
              estado:
                "ACTIVO",
              rol: {
                codigo:
                  "MOZO",
                activo:
                  true,
              },
            },
          },
          select: {
            usuarioId:
              true,
          },
        });

    for (
      const waiter
      of branchWaiters
    ) {
      recipientIds.add(
        waiter.usuarioId,
      );
    }
  }

  const existing =
    await transaction
      .notificacion
      .findMany({
        where: {
          usuarioId: {
            in: [
              ...recipientIds,
            ],
          },
          tipo:
            "PEDIDO_LISTO",
          entidad:
            "Pedido",
          entidadId:
            order.id,
        },
        select: {
          usuarioId:
            true,
        },
      });
  const notified =
    new Set(
      existing
        .map(
          (notification) =>
            notification.usuarioId,
        )
        .filter(
          (userId): userId is string =>
            Boolean(userId),
        ),
    );

  let created = 0;
  for (
    const userId
    of recipientIds
  ) {
    if (
      notified.has(userId)
    ) {
      continue;
    }

    await createUserNotification(
      transaction,
      {
        usuarioId:
          userId,
        sucursalId:
          order.sucursalId,
        tipo:
          "PEDIDO_LISTO",
        prioridad:
          "ALTA",
        titulo:
          `Pedido ${order.codigo} listo`,
        mensaje:
          "El pedido terminó su preparación y está disponible para entrega o cobro.",
        entidad:
          "Pedido",
        entidadId:
          order.id,
      },
    );
    created += 1;
  }

  return {
    creadas:
      created,
  };
}

export async function createCashStatusNotifications(
  transaction: NotificationTransaction,
  input: {
    cashId: string;
    cashCode: string;
    branchId: string;
    event: "ABIERTA" | "CERRADA";
  },
) {
  const opened =
    input.event ===
    "ABIERTA";

  await transaction
    .notificacion
    .updateMany({
      where: {
        entidad:
          "Caja",
        entidadId:
          input.cashId,
        tipo:
          opened
            ? "CAJA_CERRADA"
            : "CAJA_ABIERTA",
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

  return createBranchRoleNotifications(
    transaction,
    {
      sucursalId:
        input.branchId,
      roles: [
        "ADMINISTRADOR_GENERAL",
        "ADMINISTRADOR_SUCURSAL",
      ],
      tipo:
        opened
          ? "CAJA_ABIERTA"
          : "CAJA_CERRADA",
      prioridad:
        "NORMAL",
      titulo:
        `Caja ${input.cashCode} ${opened ? "abierta" : "cerrada"}`,
      mensaje:
        `La caja ${input.cashCode} fue ${opened ? "abierta" : "cerrada"} correctamente.`,
      entidad:
        "Caja",
      entidadId:
        input.cashId,
    },
  );
}
