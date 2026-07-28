import {
    useEffect,
    useState
} from "react";
import {
    FaArrowRight,
    FaBoxes,
    FaCalendarCheck,
    FaCashRegister,
    FaClipboardList,
    FaExclamationTriangle
} from "react-icons/fa";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../services/api";
import {
    getAdminDashboardRequest
} from "../../services/dashboard.service";
import "./admin.css";

const moneyFormatter = new Intl.NumberFormat(
    "es-PE",
    {
        style: "currency",
        currency: "PEN",
        minimumFractionDigits: 2
    }
);

const quickAccess = [
    {
        nombre: "Gestionar reservas",
        descripcion:
            "Consulta, aprueba y organiza las reservas.",
        ruta: "/admin/reservas",
        icono: FaCalendarCheck
    },
    {
        nombre: "Revisar pedidos",
        descripcion:
            "Supervisa los pedidos enviados a cocina.",
        ruta: "/admin/pedidos",
        icono: FaClipboardList
    },
    {
        nombre: "Controlar inventario",
        descripcion:
            "Consulta existencias y alertas de stock.",
        ruta: "/admin/inventario",
        icono: FaBoxes
    },
    {
        nombre: "Ventas y caja",
        descripcion:
            "Consulta ventas, pagos y movimientos.",
        ruta: "/admin/ventas",
        icono: FaCashRegister
    }
];

function Admin() {
    const {
        usuario,
        token
    } = useAuth();

    const [dashboard, setDashboard] =
        useState(null);

    const [isLoading, setIsLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [reloadKey, setReloadKey] =
        useState(0);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadDashboard() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await getAdminDashboardRequest(
                        token,
                        controller.signal
                    );

                setDashboard(result);
            } catch (requestError) {
                if (
                    requestError instanceof DOMException &&
                    requestError.name === "AbortError"
                ) {
                    return;
                }

                if (
                    requestError instanceof ApiError
                ) {
                    setError(
                        requestError.message
                    );
                    return;
                }

                console.error(
                    "Error cargando dashboard:",
                    requestError
                );

                setError(
                    "No se pudo cargar el panel administrativo."
                );
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setIsLoading(false);
                }
            }
        }

        void loadDashboard();

        return () => {
            controller.abort();
        };
    }, [token, reloadKey]);

    const indicators = [
        {
            titulo: "Reservas de hoy",
            valor: isLoading
                ? "..."
                : String(
                    dashboard?.indicadores
                        .reservasHoy
                        .cantidad ?? 0
                ),
            descripcion:
                dashboard?.fechaOperativa ??
                "Fecha operativa",
            icono: FaCalendarCheck
        },
        {
            titulo: "Ventas del día",
            valor: isLoading
                ? "..."
                : moneyFormatter.format(
                    dashboard?.indicadores
                        .ventasHoy
                        .monto ?? 0
                ),
            descripcion: `${
                dashboard?.indicadores
                    .ventasHoy
                    .cantidad ?? 0
            } ventas confirmadas`,
            icono: FaCashRegister
        },
        {
            titulo: "Pedidos activos",
            valor: isLoading
                ? "..."
                : String(
                    dashboard?.indicadores
                        .pedidosActivos
                        .cantidad ?? 0
                ),
            descripcion:
                "Pedidos aún no pagados o cancelados",
            icono: FaClipboardList
        },
        {
            titulo: "Alertas de stock",
            valor: isLoading
                ? "..."
                : String(
                    dashboard?.indicadores
                        .alertasStock
                        .cantidad ?? 0
                ),
            descripcion:
                "Productos en el límite mínimo",
            icono: FaExclamationTriangle
        }
    ];

    const activity =
        dashboard?.actividadReciente ?? [];

    return (
        <section className="admin-dashboard">
            <div className="admin-welcome">
                <div>
                    <span className="admin-eyebrow">
                        RESUMEN GENERAL
                    </span>

                    <h2>
                        Bienvenido, {usuario.nombres}
                    </h2>

                    <p>
                        Supervisa las operaciones
                        principales del restaurante
                        utilizando datos reales.
                    </p>
                </div>

                <div className="admin-current-role">
                    <span>Rol actual</span>
                    <strong>
                        {usuario.rol.nombre}
                    </strong>

                    {dashboard && (
                        <small>
                            {
                                dashboard.alcance
                                    .cantidadSucursales
                            }{" "}
                            sucursal(es)
                        </small>
                    )}
                </div>
            </div>

            {error && (
                <div
                    className="admin-dashboard-feedback error"
                    role="alert"
                >
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() =>
                            setReloadKey(
                                (value) =>
                                    value + 1
                            )
                        }
                    >
                        Reintentar
                    </button>
                </div>
            )}

            <div className="admin-indicator-grid">
                {indicators.map(
                    (indicator) => {
                        const Icono =
                            indicator.icono;

                        return (
                            <article
                                key={
                                    indicator.titulo
                                }
                                className="admin-indicator-card"
                            >
                                <div className="admin-indicator-icon">
                                    <Icono />
                                </div>

                                <div>
                                    <span>
                                        {
                                            indicator.titulo
                                        }
                                    </span>

                                    <strong>
                                        {
                                            indicator.valor
                                        }
                                    </strong>

                                    <small>
                                        {
                                            indicator.descripcion
                                        }
                                    </small>
                                </div>
                            </article>
                        );
                    }
                )}
            </div>

            <div className="admin-dashboard-columns">
                <article className="admin-dashboard-panel">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="admin-eyebrow">
                                ACCESOS RÁPIDOS
                            </span>

                            <h3>
                                Módulos principales
                            </h3>
                        </div>
                    </div>

                    <div className="admin-quick-grid">
                        {quickAccess.map(
                            (option) => {
                                const Icono =
                                    option.icono;

                                return (
                                    <Link
                                        key={
                                            option.ruta
                                        }
                                        to={
                                            option.ruta
                                        }
                                        className="admin-quick-card"
                                    >
                                        <div>
                                            <Icono />

                                            <h4>
                                                {
                                                    option.nombre
                                                }
                                            </h4>

                                            <p>
                                                {
                                                    option.descripcion
                                                }
                                            </p>
                                        </div>

                                        <FaArrowRight />
                                    </Link>
                                );
                            }
                        )}
                    </div>
                </article>

                <article className="admin-dashboard-panel">
                    <div className="admin-panel-heading">
                        <div>
                            <span className="admin-eyebrow">
                                ACTIVIDAD
                            </span>

                            <h3>
                                Movimientos recientes
                            </h3>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="admin-empty-state">
                            <FaClipboardList />

                            <strong>
                                Cargando actividad...
                            </strong>
                        </div>
                    ) : activity.length === 0 ? (
                        <div className="admin-empty-state">
                            <FaClipboardList />

                            <strong>
                                Aún no hay datos
                                disponibles
                            </strong>

                            <p>
                                Las reservas, ventas y
                                pedidos recientes aparecerán
                                aquí.
                            </p>
                        </div>
                    ) : (
                        <div className="admin-activity-list">
                            {activity.map((item) => (
                                <article
                                    key={item.id}
                                    className="admin-activity-item"
                                >
                                    <div className="admin-activity-type">
                                        {item.tipo}
                                    </div>

                                    <div className="admin-activity-body">
                                        <strong>
                                            {item.codigo}
                                        </strong>

                                        <span>
                                            {item.persona}
                                        </span>

                                        <small>
                                            {item.sucursal}
                                            {" · "}
                                            {item.estado}
                                        </small>
                                    </div>

                                    <div className="admin-activity-meta">
                                        {item.monto !==
                                            null && (
                                            <strong>
                                                {moneyFormatter.format(
                                                    item.monto
                                                )}
                                            </strong>
                                        )}

                                        <time
                                            dateTime={
                                                item.fecha
                                            }
                                        >
                                            {new Date(
                                                item.fecha
                                            ).toLocaleString(
                                                "es-PE",
                                                {
                                                    dateStyle:
                                                        "short",
                                                    timeStyle:
                                                        "short"
                                                }
                                            )}
                                        </time>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </article>
            </div>
        </section>
    );
}

export default Admin;