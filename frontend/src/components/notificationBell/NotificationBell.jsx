import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    FaBell,
    FaBoxOpen,
    FaCalendarAlt,
    FaCalendarCheck,
    FaCashRegister,
    FaCheck,
    FaCheckDouble,
    FaClock,
    FaExclamationTriangle,
    FaGift,
    FaInfoCircle,
    FaTimes
} from "react-icons/fa";

import {
    ApiError
} from "../../services/api";

import {
    getNotificationsRequest,
    getUnreadNotificationCountRequest,
    markAllNotificationsAsReadRequest,
    markNotificationAsReadRequest
} from "../../services/notifications.service";

import "./NotificationBell.css";

function isAbortError(
    error
) {
    return (
        error?.name ===
        "AbortError"
    );
}

function getErrorMessage(
    error
) {
    if (
        error instanceof ApiError
    ) {
        return error.message;
    }

    return "No se pudieron cargar las notificaciones.";
}

function formatRelativeDate(
    value
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    const now =
        new Date();

    const difference =
        now.getTime() -
        date.getTime();

    const minutes =
        Math.floor(
            difference /
            60_000
        );

    if (
        minutes < 1
    ) {
        return "Ahora";
    }

    if (
        minutes < 60
    ) {
        return `Hace ${minutes} min`;
    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (
        hours < 24
    ) {
        return `Hace ${hours} h`;
    }

    const days =
        Math.floor(
            hours / 24
        );

    if (
        days < 7
    ) {
        return `Hace ${days} d`;
    }

    return date.toLocaleDateString(
        "es-PE",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function getNotificationIcon(
    type
) {
    switch (type) {
        case "STOCK_BAJO":
            return <FaBoxOpen />;

        case "RESERVA_PENDIENTE":
            return <FaCalendarAlt />;

        case "RESERVA_CONFIRMADA":
            return <FaCalendarCheck />;

        case "PEDIDO_LISTO":
            return <FaCheck />;

        case "CAJA_ABIERTA":
        case "CAJA_PENDIENTE_CIERRE":
            return <FaCashRegister />;

        case "PREMIO_DISPONIBLE":
            return <FaGift />;

        case "RESPALDO":
            return <FaClock />;

        default:
            return <FaInfoCircle />;
    }
}

function getPriorityLabel(
    priority
) {
    switch (priority) {
        case "CRITICA":
            return "Crítica";

        case "ALTA":
            return "Alta";

        case "BAJA":
            return "Baja";

        default:
            return "Normal";
    }
}

function getNotificationDestination(
    notification,
    role
) {
    switch (
    notification.tipo
    ) {
        case "STOCK_BAJO":
            return {
                pathname:
                    "/admin/inventario",

                state: {
                    notificationType:
                        notification.tipo,

                    notificationEntityId:
                        notification.entidadId
                }
            };

        case "RESERVA_PENDIENTE":
            return {
                pathname:
                    "/admin/reservas",

                state: {
                    notificationType:
                        notification.tipo,

                    notificationEntityId:
                        notification.entidadId
                }
            };

        case "RESERVA_CONFIRMADA":
            return {
                pathname:
                    "/reservations",

                state: {
                    notificationType:
                        notification.tipo,

                    notificationEntityId:
                        notification.entidadId
                }
            };

        case "PEDIDO_LISTO":
            if (
                role ===
                "MOZO"
            ) {
                return {
                    pathname:
                        "/operacion/entregas",

                    state: {
                        notificationType:
                            notification.tipo,

                        notificationEntityId:
                            notification.entidadId
                    }
                };
            }

            if (
                role ===
                "ADMINISTRADOR_GENERAL" ||
                role ===
                "ADMINISTRADOR_SUCURSAL"
            ) {
                return {
                    pathname:
                        "/admin/entregas",

                    state: {
                        notificationType:
                            notification.tipo,

                        notificationEntityId:
                            notification.entidadId
                    }
                };
            }

            return null;

        case "CAJA_ABIERTA":
        case "CAJA_PENDIENTE_CIERRE":
            if (
                role ===
                "VENDEDOR"
            ) {
                return {
                    pathname:
                        "/operacion/ventas",

                    state: {
                        notificationType:
                            notification.tipo,

                        notificationEntityId:
                            notification.entidadId
                    }
                };
            }

            if (
                role ===
                "ADMINISTRADOR_GENERAL" ||
                role ===
                "ADMINISTRADOR_SUCURSAL"
            ) {
                return {
                    pathname:
                        "/admin/ventas",

                    state: {
                        notificationType:
                            notification.tipo,

                        notificationEntityId:
                            notification.entidadId
                    }
                };
            }

            return null;

        case "PREMIO_DISPONIBLE":
            if (
                role ===
                "CLIENTE" ||
                role ===
                "USUARIO"
            ) {
                return {
                    pathname:
                        "/fidelizacion",

                    state: {
                        notificationType:
                            notification.tipo,

                        notificationEntityId:
                            notification.entidadId
                    }
                };
            }

            return null;

        default:
            return null;
    }
}

function NotificationBell({
    token,
    role
}) {
    const navigate =
        useNavigate();

    const containerRef =
        useRef(null);

    const [
        isOpen,
        setIsOpen
    ] = useState(false);

    const [
        unreadCount,
        setUnreadCount
    ] = useState(0);

    const [
        notifications,
        setNotifications
    ] = useState([]);

    const [
        isLoading,
        setIsLoading
    ] = useState(false);

    const [
        isMarkingAll,
        setIsMarkingAll
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const loadUnreadCount =
        useCallback(
            async (
                signal
            ) => {
                if (!token) {
                    return;
                }

                try {
                    const result =
                        await getUnreadNotificationCountRequest(
                            token,
                            signal
                        );

                    setUnreadCount(
                        Number(
                            result?.noLeidas ??
                            0
                        )
                    );
                } catch (
                requestError
                ) {
                    if (
                        isAbortError(
                            requestError
                        )
                    ) {
                        return;
                    }

                    console.error(
                        "No se pudo obtener el contador de notificaciones:",
                        requestError
                    );
                }
            },
            [
                token
            ]
        );

    const loadNotifications =
        useCallback(
            async (
                signal
            ) => {
                if (!token) {
                    return;
                }

                setIsLoading(
                    true
                );

                setError("");

                try {
                    const result =
                        await getNotificationsRequest(
                            token,
                            {
                                page: 1,
                                limit: 10
                            },
                            signal
                        );

                    setNotifications(
                        result?.notificaciones ??
                        []
                    );

                    setUnreadCount(
                        Number(
                            result
                                ?.resumen
                                ?.noLeidas ??
                            0
                        )
                    );
                } catch (
                requestError
                ) {
                    if (
                        isAbortError(
                            requestError
                        )
                    ) {
                        return;
                    }

                    setError(
                        getErrorMessage(
                            requestError
                        )
                    );
                } finally {
                    if (
                        !signal
                            ?.aborted
                    ) {
                        setIsLoading(
                            false
                        );
                    }
                }
            },
            [
                token
            ]
        );

    /*
     * Obtiene el contador al iniciar sesión.
     */
    useEffect(() => {
        if (!token) {
            setUnreadCount(
                0
            );

            setNotifications(
                []
            );

            return;
        }

        const controller =
            new AbortController();

        void loadUnreadCount(
            controller.signal
        );

        return () =>
            controller.abort();
    }, [
        token,
        loadUnreadCount
    ]);

    /*
     * Actualización ligera cada 30 segundos.
     * Todavía no necesitamos WebSocket.
     */
    useEffect(() => {
        if (!token) {
            return undefined;
        }

        const interval =
            window.setInterval(
                () => {
                    void loadUnreadCount();
                },
                30_000
            );

        return () =>
            window.clearInterval(
                interval
            );
    }, [
        token,
        loadUnreadCount
    ]);

    /*
     * Cerrar al presionar fuera del panel.
     */
    useEffect(() => {
        function handleClickOutside(
            event
        ) {
            if (
                containerRef.current &&
                !containerRef.current.contains(
                    event.target
                )
            ) {
                setIsOpen(
                    false
                );
            }
        }

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    /*
     * Cerrar con Escape.
     */
    useEffect(() => {
        function handleKeyDown(
            event
        ) {
            if (
                event.key ===
                "Escape"
            ) {
                setIsOpen(
                    false
                );
            }
        }

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, []);

    async function handleToggle() {
        const nextOpen =
            !isOpen;

        setIsOpen(
            nextOpen
        );

        if (nextOpen) {
            await loadNotifications();
        }
    }

    async function handleNotificationClick(
        notification
    ) {
        setError("");

        try {
            /*
             * Solo hacemos PATCH cuando todavía
             * no fue leída.
             */
            if (
                !notification.leida
            ) {
                await markNotificationAsReadRequest(
                    token,
                    notification.id
                );

                setNotifications(
                    (
                        current
                    ) =>
                        current.map(
                            (
                                item
                            ) =>
                                item.id ===
                                    notification.id
                                    ? {
                                        ...item,

                                        leida:
                                            true,

                                        fechaLectura:
                                            new Date()
                                                .toISOString()
                                    }
                                    : item
                        )
                );

                setUnreadCount(
                    (
                        current
                    ) =>
                        Math.max(
                            0,
                            current - 1
                        )
                );
            }

            const destination =
                getNotificationDestination(
                    notification,
                    role
                );

            setIsOpen(
                false
            );

            if (
                destination
            ) {
                navigate(
                    destination.pathname,
                    {
                        state:
                            destination.state
                    }
                );
            }
        } catch (
        requestError
        ) {
            setError(
                getErrorMessage(
                    requestError
                )
            );
        }
    }

    async function handleReadAll() {
        if (
            unreadCount === 0 ||
            isMarkingAll
        ) {
            return;
        }

        setIsMarkingAll(
            true
        );

        setError("");

        try {
            await markAllNotificationsAsReadRequest(
                token
            );

            const now =
                new Date()
                    .toISOString();

            setNotifications(
                (
                    current
                ) =>
                    current.map(
                        (
                            notification
                        ) => ({
                            ...notification,
                            leida: true,
                            fechaLectura:
                                notification
                                    .fechaLectura ??
                                now
                        })
                    )
            );

            setUnreadCount(
                0
            );
        } catch (
        requestError
        ) {
            setError(
                getErrorMessage(
                    requestError
                )
            );
        } finally {
            setIsMarkingAll(
                false
            );
        }
    }

    return (
        <div
            ref={
                containerRef
            }
            className="notification-bell"
        >
            <button
                type="button"
                className="notification-bell-button"
                aria-label={
                    unreadCount > 0
                        ? `Notificaciones. ${unreadCount} sin leer.`
                        : "Notificaciones"
                }
                aria-expanded={
                    isOpen
                }
                onClick={
                    handleToggle
                }
            >
                <FaBell />

                {unreadCount >
                    0 && (
                        <span className="notification-bell-count">
                            {unreadCount >
                                99
                                ? "99+"
                                : unreadCount}
                        </span>
                    )}
            </button>

            {isOpen && (
                <section className="notification-panel">
                    <header className="notification-panel-header">
                        <div>
                            <h3>
                                Notificaciones
                            </h3>

                            <p>
                                {unreadCount >
                                    0
                                    ? `${unreadCount} sin leer`
                                    : "Todo revisado"}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="notification-panel-close"
                            aria-label="Cerrar notificaciones"
                            onClick={() =>
                                setIsOpen(
                                    false
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </header>

                    <div className="notification-panel-actions">
                        <button
                            type="button"
                            disabled={
                                unreadCount ===
                                0 ||
                                isMarkingAll
                            }
                            onClick={
                                handleReadAll
                            }
                        >
                            <FaCheckDouble />

                            {isMarkingAll
                                ? "Actualizando..."
                                : "Marcar todas como leídas"}
                        </button>
                    </div>

                    {error && (
                        <div className="notification-panel-error">
                            <FaExclamationTriangle />

                            <span>
                                {error}
                            </span>
                        </div>
                    )}

                    <div className="notification-panel-list">
                        {isLoading ? (
                            <div className="notification-panel-empty">
                                <FaBell />

                                <span>
                                    Cargando notificaciones...
                                </span>
                            </div>
                        ) : notifications
                            .length ===
                            0 ? (
                            <div className="notification-panel-empty">
                                <FaBell />

                                <strong>
                                    Sin notificaciones
                                </strong>

                                <span>
                                    No tienes avisos activos.
                                </span>
                            </div>
                        ) : (
                            notifications.map(
                                (
                                    notification
                                ) => (
                                    <button
                                        key={
                                            notification.id
                                        }
                                        type="button"
                                        className={`notification-item ${notification.leida
                                            ? "read"
                                            : "unread"
                                            } priority-${notification.prioridad.toLowerCase()}`}
                                        onClick={() =>
                                            handleNotificationClick(
                                                notification
                                            )
                                        }
                                    >
                                        <span className="notification-item-icon">
                                            {getNotificationIcon(
                                                notification.tipo
                                            )}
                                        </span>

                                        <span className="notification-item-content">
                                            <span className="notification-item-top">
                                                <strong>
                                                    {
                                                        notification.titulo
                                                    }
                                                </strong>

                                                {!notification.leida && (
                                                    <span className="notification-unread-dot" />
                                                )}
                                            </span>

                                            <span className="notification-item-message">
                                                {
                                                    notification.mensaje
                                                }
                                            </span>

                                            <span className="notification-item-footer">
                                                <span>
                                                    {formatRelativeDate(
                                                        notification.createdAt
                                                    )}
                                                </span>

                                                <span>
                                                    {getPriorityLabel(
                                                        notification.prioridad
                                                    )}
                                                </span>

                                                {notification
                                                    .sucursal
                                                    ?.nombre && (
                                                        <span>
                                                            {
                                                                notification
                                                                    .sucursal
                                                                    .nombre
                                                            }
                                                        </span>
                                                    )}
                                            </span>
                                        </span>
                                    </button>
                                )
                            )
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}

export default NotificationBell;