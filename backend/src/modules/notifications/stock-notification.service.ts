import {
    Prisma,
} from "../../generated/prisma/client.js";

type StockNotificationTransaction =
    Prisma.TransactionClient;

const STOCK_ALERT_ROLES = [
    "ADMINISTRADOR_GENERAL",
    "ADMINISTRADOR_SUCURSAL",
];

function getOperationalDate() {
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
        throw new Error(
            "No se pudo determinar la fecha operativa.",
        );
    }

    return new Date(
        `${year}-${month}-${day}T00:00:00.000Z`,
    );
}

async function getRecipients(
    transaction:
        StockNotificationTransaction,
    branchId:
        string,
) {
    const operationalDate =
        getOperationalDate();

    /*
     * Administradores de sucursal asignados
     * actualmente a la sucursal.
     */
    const branchAdministrators =
        await transaction
            .usuarioSucursal
            .findMany({
                where: {
                    sucursalId:
                        branchId,

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

                    usuario: {
                        estado:
                            "ACTIVO",

                        rol: {
                            codigo:
                                "ADMINISTRADOR_SUCURSAL",

                            activo:
                                true,
                        },
                    },
                },

                select: {
                    usuario: {
                        select: {
                            id:
                                true,

                            rolId:
                                true,
                        },
                    },
                },
            });

    /*
     * El administrador general no necesita estar
     * asignado mediante UsuarioSucursal.
     */
    const generalAdministrators =
        await transaction
            .usuario
            .findMany({
                where: {
                    estado:
                        "ACTIVO",

                    rol: {
                        codigo:
                            "ADMINISTRADOR_GENERAL",

                        activo:
                            true,
                    },
                },

                select: {
                    id:
                        true,

                    rolId:
                        true,
                },
            });

    const recipientMap =
        new Map<
            string,
            {
                id: string;
                rolId: string;
            }
        >();

    for (
        const assignment
        of branchAdministrators
    ) {
        recipientMap.set(
            assignment
                .usuario
                .id,
            assignment.usuario,
        );
    }

    for (
        const administrator
        of generalAdministrators
    ) {
        recipientMap.set(
            administrator.id,
            administrator,
        );
    }

    return [
        ...recipientMap.values(),
    ];
}

async function closeExistingStockAlerts(
    transaction:
        StockNotificationTransaction,
    productBranchId:
        string,
) {
    const now =
        new Date();

    await transaction
        .notificacion
        .updateMany({
            where: {
                tipo:
                    "STOCK_BAJO",

                entidad:
                    "ProductoSucursal",

                entidadId:
                    productBranchId,

                OR: [
                    {
                        expiraAt:
                            null,
                    },
                    {
                        expiraAt: {
                            gt:
                                now,
                        },
                    },
                ],
            },

            data: {
                expiraAt:
                    now,
            },
        });
}

async function createMissingStockAlerts(
    transaction:
        StockNotificationTransaction,
    input: {
        productBranchId:
        string;

        branchId:
        string;

        productName:
        string;

        availableStock:
        Prisma.Decimal;

        minimumStock:
        Prisma.Decimal;

        stockType:
        "PERMANENTE" | "DIARIO";

        stockDate?:
        Date | null;
    },
) {
    const recipients =
        await getRecipients(
            transaction,
            input.branchId,
        );

    if (
        recipients.length ===
        0
    ) {
        return {
            creadas:
                0,
        };
    }

    const now =
        new Date();

    const available =
        input.availableStock
            .toDecimalPlaces(
                3,
            )
            .toString();

    const minimum =
        input.minimumStock
            .toDecimalPlaces(
                3,
            )
            .toString();

    const exhausted =
        input.availableStock
            .lessThanOrEqualTo(
                0,
            );

    const priority =
        exhausted
            ? "CRITICA"
            : "ALTA";

    const title =
        exhausted
            ? `Stock agotado: ${input.productName}`
            : `Stock bajo: ${input.productName}`;

    const message =
        exhausted
            ? `El producto "${input.productName}" no tiene stock disponible. Stock disponible: ${available}. Stock mínimo: ${minimum}.`
            : `El producto "${input.productName}" alcanzó o cayó por debajo del stock mínimo. Disponible: ${available}. Mínimo: ${minimum}.`;

    const activeWhere:
        Prisma.NotificacionWhereInput =
    {
        tipo:
            "STOCK_BAJO",

        entidad:
            "ProductoSucursal",

        entidadId:
            input
                .productBranchId,

        usuarioId: {
            in:
                recipients.map(
                    (
                        recipient,
                    ) =>
                        recipient.id,
                ),
        },

        OR: [
            {
                expiraAt:
                    null,
            },
            {
                expiraAt: {
                    gt:
                        now,
                },
            },
        ],
    };

    const existingNotifications =
        await transaction
            .notificacion
            .findMany({
                where:
                    activeWhere,

                select: {
                    id:
                        true,

                    usuarioId:
                        true,
                },
            });

    /*
     * Si ya existe una alerta activa no creamos
     * otra, pero sí refrescamos su contenido.
     *
     * Ejemplo:
     * 0 unidades -> CRITICA / agotado
     * 3 unidades -> ALTA / stock bajo
     */
    if (
        existingNotifications
            .length > 0
    ) {
        await transaction
            .notificacion
            .updateMany({
                where:
                    activeWhere,

                data: {
                    prioridad:
                        priority,

                    titulo:
                        title,

                    mensaje:
                        message,
                },
            });
    }

    const alreadyNotified =
        new Set(
            existingNotifications
                .map(
                    (
                        notification,
                    ) =>
                        notification
                            .usuarioId,
                )
                .filter(
                    (
                        userId,
                    ): userId is string =>
                        Boolean(
                            userId,
                        ),
                ),
        );

    const missingRecipients =
        recipients.filter(
            (
                recipient,
            ) =>
                !alreadyNotified.has(
                    recipient.id,
                ),
        );

    if (
        missingRecipients.length ===
        0
    ) {
        return {
            creadas:
                0,
        };
    }

    await transaction
        .notificacion
        .createMany({
            data:
                missingRecipients.map(
                    (
                        recipient,
                    ) => ({
                        usuarioId:
                            recipient.id,

                        rolId:
                            recipient.rolId,

                        sucursalId:
                            input.branchId,

                        tipo:
                            "STOCK_BAJO",

                        prioridad:
                            priority,

                        titulo:
                            title,

                        mensaje:
                            message,

                        entidad:
                            "ProductoSucursal",

                        entidadId:
                            input
                                .productBranchId,

                        leida:
                            false,
                    }),
                ),
        });

    return {
        creadas:
            missingRecipients.length,
    };
}

export async function evaluateStockNotification(
    transaction:
        StockNotificationTransaction,
    productBranchId:
        string,
) {
    const productBranch =
        await transaction
            .productoSucursal
            .findUnique({
                where: {
                    id:
                        productBranchId,
                },

                select: {
                    id:
                        true,

                    sucursalId:
                        true,

                    stockMinimo:
                        true,

                    estado:
                        true,

                    disponibleVenta:
                        true,

                    producto: {
                        select: {
                            id:
                                true,

                            nombre:
                                true,

                            tipoStock:
                                true,

                            estado:
                                true,
                        },
                    },

                    stockPermanente: {
                        select: {
                            cantidadActual:
                                true,

                            cantidadComprometida:
                                true,
                        },
                    },
                },
            });

    if (!productBranch) {
        return {
            evaluado:
                false,

            motivo:
                "PRODUCTO_SUCURSAL_NO_ENCONTRADO",

            stockBajo:
                false,

            alertasCreadas:
                0,
        };
    }

    /*
     * Un producto sin control de stock no debe
     * generar alertas.
     */
    if (
        productBranch
            .producto
            .tipoStock ===
        "SIN_CONTROL"
    ) {
        await closeExistingStockAlerts(
            transaction,
            productBranch.id,
        );

        return {
            evaluado:
                true,

            motivo:
                "SIN_CONTROL",

            stockBajo:
                false,

            alertasCreadas:
                0,
        };
    }

    /*
     * Un producto inactivo tampoco debe conservar
     * una alerta operativa activa.
     */
    if (
        productBranch.estado !==
        "ACTIVO" ||
        productBranch
            .producto
            .estado !==
        "ACTIVO"
    ) {
        await closeExistingStockAlerts(
            transaction,
            productBranch.id,
        );

        return {
            evaluado:
                true,

            motivo:
                "PRODUCTO_INACTIVO",

            stockBajo:
                false,

            alertasCreadas:
                0,
        };
    }

    let currentStock =
        new Prisma.Decimal(
            0,
        );

    let committedStock =
        new Prisma.Decimal(
            0,
        );

    let stockDate:
        Date | null =
        null;

    if (
        productBranch
            .producto
            .tipoStock ===
        "PERMANENTE"
    ) {
        currentStock =
            productBranch
                .stockPermanente
                ?.cantidadActual ??
            new Prisma.Decimal(
                0,
            );

        committedStock =
            productBranch
                .stockPermanente
                ?.cantidadComprometida ??
            new Prisma.Decimal(
                0,
            );
    }

    if (
        productBranch
            .producto
            .tipoStock ===
        "DIARIO"
    ) {
        stockDate =
            getOperationalDate();

        const dailyStock =
            await transaction
                .stockDiario
                .findUnique({
                    where: {
                        productoSucursalId_fecha: {
                            productoSucursalId:
                                productBranch.id,

                            fecha:
                                stockDate,
                        },
                    },

                    select: {
                        cantidadActual:
                            true,

                        cantidadComprometida:
                            true,
                    },
                });

        /*
         * La ausencia de jornada no se interpreta como
         * stock cero. Es un problema distinto y no debe
         * crear falsos STOCK_BAJO.
         */
        if (!dailyStock) {
            await closeExistingStockAlerts(
                transaction,
                productBranch.id,
            );

            return {
                evaluado:
                    false,

                motivo:
                    "STOCK_DIARIO_NO_CARGADO",

                stockBajo:
                    false,

                alertasCreadas:
                    0,
            };
        }

        currentStock =
            dailyStock
                .cantidadActual;

        committedStock =
            dailyStock
                .cantidadComprometida;
    }

    const availableStock =
        currentStock.minus(
            committedStock,
        );

    const minimumStock =
        productBranch
            .stockMinimo;

    /*
     * stockMinimo = 0 significa que todavía
     * no se configuró un umbral de alerta.
     *
     * Esto mantiene exactamente la misma regla
     * utilizada actualmente por listInventory().
     */
    if (
        minimumStock
            .lessThanOrEqualTo(
                0,
            )
    ) {
        await closeExistingStockAlerts(
            transaction,
            productBranch.id,
        );

        return {
            evaluado:
                true,

            motivo:
                "STOCK_MINIMO_NO_CONFIGURADO",

            stockBajo:
                false,

            stockActual:
                currentStock
                    .toString(),

            stockComprometido:
                committedStock
                    .toString(),

            stockDisponible:
                availableStock
                    .toString(),

            stockMinimo:
                minimumStock
                    .toString(),

            alertasCreadas:
                0,
        };
    }

    const isLow =
        availableStock
            .lessThanOrEqualTo(
                minimumStock,
            );

    /*
     * Si el producto se recuperó, cerramos las
     * alertas anteriores. No las eliminamos.
     */
    if (!isLow) {
        await closeExistingStockAlerts(
            transaction,
            productBranch.id,
        );

        return {
            evaluado:
                true,

            motivo:
                "STOCK_NORMAL",

            stockBajo:
                false,

            stockActual:
                currentStock
                    .toString(),

            stockComprometido:
                committedStock
                    .toString(),

            stockDisponible:
                availableStock
                    .toString(),

            stockMinimo:
                minimumStock
                    .toString(),

            alertasCreadas:
                0,
        };
    }

    const alertResult =
        await createMissingStockAlerts(
            transaction,
            {
                productBranchId:
                    productBranch.id,

                branchId:
                    productBranch
                        .sucursalId,

                productName:
                    productBranch
                        .producto
                        .nombre,

                availableStock,

                minimumStock,

                stockType:
                    productBranch
                        .producto
                        .tipoStock,

                stockDate,
            },
        );

    return {
        evaluado:
            true,

        motivo:
            availableStock
                .lessThanOrEqualTo(
                    0,
                )
                ? "STOCK_AGOTADO"
                : "STOCK_BAJO",

        stockBajo:
            true,

        stockActual:
            currentStock
                .toString(),

        stockComprometido:
            committedStock
                .toString(),

        stockDisponible:
            availableStock
                .toString(),

        stockMinimo:
            minimumStock
                .toString(),

        alertasCreadas:
            alertResult
                .creadas,
    };
}