import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import {
    FaCheckCircle,
    FaCommentDots,
    FaEye,
    FaStar,
    FaSyncAlt
} from "react-icons/fa";
import {
    useLocation
} from "react-router-dom";
import AdminMetricCard from "../../../components/adminMetricCard/AdminMetricCard";
import {
    useAuth
} from "../../../context/AuthContext";
import {
    useRealtimeVersion
} from "../../../context/RealtimeContext";
import {
    listAdminReviewsRequest,
    moderateReviewRequest
} from "../../../services/review.service";
import "./reviewsAdmin.css";

const EMPTY_DATA = {
    resenas: [],
    resumen: {
        pendientes: 0,
        aprobadas: 0
    },
    paginacion: {
        total: 0,
        page: 1,
        totalPages: 1
    }
};

function statusLabel(status) {
    return {
        PENDIENTE: "Pendiente",
        APROBADA: "Aprobada",
        RECHAZADA: "Rechazada",
        OCULTA: "Oculta"
    }[status] ?? status;
}

function Stars({ value }) {
    return (
        <span
            className="review-admin-stars"
            aria-label={`${value} de 5 estrellas`}
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                    key={star}
                    className={star <= value ? "filled" : ""}
                    aria-hidden="true"
                />
            ))}
        </span>
    );
}

function ReviewsAdmin() {
    const { token } = useAuth();
    const location = useLocation();
    const realtimeVersion =
        useRealtimeVersion(["REVIEWS"]);
    const [filters, setFilters] = useState({
        search: "",
        estado: "PENDIENTE",
        destacada: "TODAS"
    });
    const [data, setData] = useState(EMPTY_DATA);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({
        estado: "APROBADA",
        destacada: false,
        motivo: ""
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const loadReviews = useCallback(
        async (signal) => {
            try {
                const result = await listAdminReviewsRequest(
                    token,
                    {
                        ...filters,
                        limit: 50,
                        signal
                    }
                );
                setData(result);
                setFeedback(null);

                const notificationId =
                    location.state?.notificationEntityId;
                if (notificationId) {
                    const target = result.resenas.find(
                        (review) => review.id === notificationId
                    );
                    if (target) selectReview(target);
                }
            } catch (error) {
                if (error?.name !== "AbortError") {
                    setFeedback({
                        type: "error",
                        text: error.message
                    });
                }
            } finally {
                if (!signal?.aborted) setIsLoading(false);
            }
        },
        [filters, location.state, token]
    );

    useEffect(() => {
        const controller = new AbortController();
        const timer = globalThis.setTimeout(
            () => void loadReviews(controller.signal),
            120
        );
        return () => {
            globalThis.clearTimeout(timer);
            controller.abort();
        };
    }, [loadReviews, realtimeVersion]);

    const featuredCount = useMemo(
        () => data.resenas.filter(
            (review) => review.destacada
        ).length,
        [data.resenas]
    );

    function selectReview(review) {
        setSelected(review);
        setForm({
            estado:
                review.estado === "PENDIENTE"
                    ? "APROBADA"
                    : review.estado,
            destacada: review.destacada,
            motivo: review.motivoModeracion ?? ""
        });
        setFeedback(null);
    }

    async function saveModeration(event) {
        event.preventDefault();
        setIsSaving(true);
        setFeedback(null);

        try {
            const response = await moderateReviewRequest(
                token,
                selected.id,
                form
            );
            setSelected(response.data.resena);
            setFeedback({
                type: "success",
                text: response.message
            });
            await loadReviews();
        } catch (error) {
            setFeedback({
                type: "error",
                text: error.message
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="admin-page reviews-admin-page">
            <header className="admin-page-header">
                <div>
                    <span className="admin-eyebrow">EXPERIENCIA DEL CLIENTE</span>
                    <h2>Reseñas verificadas</h2>
                    <p>Modera opiniones vinculadas a ventas reales y selecciona cuáles aparecerán en la página principal.</p>
                </div>
                <button
                    type="button"
                    className="admin-button secondary"
                    disabled={isLoading}
                    onClick={() => {
                        setIsLoading(true);
                        void loadReviews();
                    }}
                >
                    <FaSyncAlt /> Actualizar
                </button>
            </header>

            {feedback && (
                <div className={`admin-feedback ${feedback.type}`} role="alert">
                    {feedback.text}
                </div>
            )}

            <div className="admin-metric-grid columns-3">
                <AdminMetricCard icon={FaCommentDots} label="Pendientes" value={data.resumen.pendientes} tone="warning" isLoading={isLoading} />
                <AdminMetricCard icon={FaCheckCircle} label="Aprobadas" value={data.resumen.aprobadas} tone="success" isLoading={isLoading} />
                <AdminMetricCard icon={FaStar} label="Destacadas en esta vista" value={featuredCount} tone="accent" isLoading={isLoading} />
            </div>

            <div className="admin-filter-bar reviews-admin-filter">
                <input
                    aria-label="Buscar reseña"
                    placeholder="Ticket, nombre o comentario"
                    value={filters.search}
                    onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                />
                <select
                    aria-label="Filtrar por estado"
                    value={filters.estado}
                    onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))}
                >
                    <option value="TODOS">Todos los estados</option>
                    <option value="PENDIENTE">Pendientes</option>
                    <option value="APROBADA">Aprobadas</option>
                    <option value="RECHAZADA">Rechazadas</option>
                    <option value="OCULTA">Ocultas</option>
                </select>
                <select
                    aria-label="Filtrar destacadas"
                    value={filters.destacada}
                    onChange={(event) => setFilters((current) => ({ ...current, destacada: event.target.value }))}
                >
                    <option value="TODAS">Todas</option>
                    <option value="SI">Solo destacadas</option>
                    <option value="NO">No destacadas</option>
                </select>
            </div>

            <div className="reviews-admin-workspace">
                <section className="admin-surface reviews-admin-list">
                    <div className="reviews-admin-heading">
                        <FaCommentDots />
                        <strong>{data.paginacion.total} reseña(s)</strong>
                    </div>
                    <div className="admin-table-shell responsive-cards">
                        <table className="admin-data-table">
                            <thead><tr><th>Compra</th><th>Cliente</th><th>Calificación</th><th>Estado</th><th>Publicación</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {data.resenas.map((review) => (
                                    <tr key={review.id}>
                                        <td data-label="Compra"><strong>{review.venta.numeroTicket}</strong><small>{review.sucursal.nombre}</small></td>
                                        <td data-label="Cliente">{review.nombrePublico}</td>
                                        <td data-label="Calificación"><Stars value={review.calificacion} /></td>
                                        <td data-label="Estado"><span className={`admin-status-badge review-${review.estado.toLowerCase()}`}>{statusLabel(review.estado)}</span></td>
                                        <td data-label="Publicación">{review.destacada ? "Destacada" : "Normal"}</td>
                                        <td data-label="Acciones"><button type="button" className="admin-button secondary" onClick={() => selectReview(review)}><FaEye /> Revisar</button></td>
                                    </tr>
                                ))}
                                {!isLoading && data.resenas.length === 0 && <tr><td colSpan="6">No hay reseñas para los filtros seleccionados.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>

                {selected && (
                    <aside className="admin-surface review-admin-detail">
                        <header>
                            <span className="admin-eyebrow">{selected.venta.numeroTicket}</span>
                            <h3>{selected.nombrePublico}</h3>
                            <Stars value={selected.calificacion} />
                        </header>
                        <blockquote>{selected.comentario}</blockquote>
                        <dl>
                            <div><dt>Cliente verificado</dt><dd>{selected.cliente.nombreCompleto}</dd></div>
                            <div><dt>Sucursal</dt><dd>{selected.sucursal.nombre}</dd></div>
                            <div><dt>Fecha</dt><dd>{new Date(selected.createdAt).toLocaleString("es-PE")}</dd></div>
                        </dl>
                        <form onSubmit={saveModeration}>
                            <label>
                                Decisión
                                <select
                                    value={form.estado}
                                    onChange={(event) => setForm((current) => ({
                                        ...current,
                                        estado: event.target.value,
                                        destacada: event.target.value === "APROBADA" ? current.destacada : false
                                    }))}
                                >
                                    <option value="APROBADA">Aprobar</option>
                                    <option value="RECHAZADA">Rechazar</option>
                                    <option value="OCULTA">Ocultar</option>
                                </select>
                            </label>
                            {form.estado === "APROBADA" && (
                                <label className="review-featured-control">
                                    <input type="checkbox" checked={form.destacada} onChange={(event) => setForm((current) => ({ ...current, destacada: event.target.checked }))} />
                                    <span>Mostrar como testimonio destacado en Inicio</span>
                                </label>
                            )}
                            <label>
                                Motivo o nota de moderación
                                <textarea
                                    rows="4"
                                    maxLength="500"
                                    value={form.motivo}
                                    required={form.estado !== "APROBADA"}
                                    onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
                                />
                            </label>
                            <div className="review-admin-actions">
                                <button type="button" className="admin-button secondary" onClick={() => setSelected(null)}>Cerrar</button>
                                <button type="submit" className="admin-button primary" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar moderación"}</button>
                            </div>
                        </form>
                    </aside>
                )}
            </div>
        </section>
    );
}

export default ReviewsAdmin;
