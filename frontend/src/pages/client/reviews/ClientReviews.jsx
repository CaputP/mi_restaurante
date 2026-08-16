import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";
import {
    FaCheckCircle,
    FaCommentDots,
    FaShoppingBag,
    FaStar,
    FaSyncAlt,
    FaTimes
} from "react-icons/fa";
import ClientNav from "../../../components/clientNav/ClientNav";
import SessionHeader from "../../../components/sessionHeader/SessionHeader";
import {
    useAuth
} from "../../../context/AuthContext";
import {
    useRealtimeVersion
} from "../../../context/RealtimeContext";
import {
    createReviewRequest,
    listClientReviewableSalesRequest
} from "../../../services/review.service";
import "./clientReviews.css";

const EMPTY_DATA = {
    ventas: [],
    paginacion: {
        page: 1,
        total: 0,
        totalPages: 1
    }
};

function formatMoney(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN"
        }
    ).format(Number(value ?? 0));
}

function formatDate(value) {
    return new Date(value).toLocaleDateString(
        "es-PE",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );
}

function statusLabel(status) {
    return {
        PENDIENTE: "Pendiente de moderación",
        APROBADA: "Publicada",
        RECHAZADA: "No publicada",
        OCULTA: "Oculta"
    }[status] ?? status;
}

function ClientReviews() {
    const { token } = useAuth();
    const realtimeVersion =
        useRealtimeVersion(["REVIEWS"]);
    const [data, setData] = useState(EMPTY_DATA);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const loadSales = useCallback(
        async (signal) => {
            try {
                const result =
                    await listClientReviewableSalesRequest(
                        token,
                        {
                            page: 1,
                            limit: 24,
                            signal
                        }
                    );
                setData(result);
            } catch (error) {
                if (error?.name !== "AbortError") {
                    setFeedback({
                        type: "error",
                        text: error.message
                    });
                }
            } finally {
                if (!signal?.aborted) {
                    setIsLoading(false);
                }
            }
        },
        [token]
    );

    useEffect(() => {
        const controller = new AbortController();
        const timeoutId = globalThis.setTimeout(
            () => void loadSales(controller.signal),
            0
        );

        return () => {
            globalThis.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [loadSales, realtimeVersion]);

    const metrics = useMemo(
        () => ({
            purchases: data.paginacion.total,
            available: data.ventas.filter(
                (sale) => sale.puedeOpinar
            ).length,
            published: data.ventas.filter(
                (sale) =>
                    sale.resena?.estado === "APROBADA"
            ).length
        }),
        [data]
    );

    function openReview(sale) {
        setSelectedSale(sale);
        setRating(0);
        setComment("");
        setAccepted(false);
        setFeedback(null);
    }

    function closeReview() {
        if (!isSaving) {
            setSelectedSale(null);
        }
    }

    async function submitReview(event) {
        event.preventDefault();

        if (rating < 1) {
            setFeedback({
                type: "error",
                text: "Selecciona una calificación de una a cinco estrellas."
            });
            return;
        }

        if (comment.trim().length < 10) {
            setFeedback({
                type: "error",
                text: "Cuéntanos tu experiencia usando al menos 10 caracteres."
            });
            return;
        }

        if (!accepted) {
            setFeedback({
                type: "error",
                text: "Debes autorizar la publicación de tu opinión."
            });
            return;
        }

        setIsSaving(true);
        setFeedback(null);

        try {
            const response = await createReviewRequest(
                token,
                {
                    ventaId: selectedSale.id,
                    calificacion: rating,
                    comentario: comment.trim(),
                    aceptaPublicacion: accepted
                }
            );
            setSelectedSale(null);
            setFeedback({
                type: "success",
                text: response.message
            });
            await loadSales();
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
        <div className="client-reviews-page">
            <SessionHeader title="Mis opiniones" />
            <ClientNav />

            <main className="client-reviews-content">
                <header className="client-reviews-hero">
                    <div>
                        <span>EXPERIENCIAS VERIFICADAS</span>
                        <h2>Califica tus compras</h2>
                        <p>
                            Cada opinión está vinculada a una venta real y se publica después de ser revisada.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="client-reviews-refresh-button"
                        onClick={() => {
                            setIsLoading(true);
                            void loadSales();
                        }}
                        disabled={isLoading}
                    >
                        <FaSyncAlt />
                        Actualizar
                    </button>
                </header>

                {feedback && (
                    <div
                        className={`client-review-feedback ${feedback.type}`}
                        role="alert"
                    >
                        {feedback.text}
                    </div>
                )}

                <section className="client-review-metrics" aria-label="Resumen de opiniones">
                    <article>
                        <FaShoppingBag />
                        <div><span>Compras verificadas</span><strong>{metrics.purchases}</strong></div>
                    </article>
                    <article>
                        <FaCommentDots />
                        <div><span>Por calificar</span><strong>{metrics.available}</strong></div>
                    </article>
                    <article>
                        <FaCheckCircle />
                        <div><span>Publicadas</span><strong>{metrics.published}</strong></div>
                    </article>
                </section>

                {isLoading ? (
                    <div className="client-reviews-empty">Cargando tus compras...</div>
                ) : data.ventas.length === 0 ? (
                    <div className="client-reviews-empty">
                        <FaShoppingBag />
                        <strong>Todavía no tienes compras identificadas.</strong>
                        <p>Cuando realices una compra usando tu cuenta aparecerá aquí para que puedas calificarla.</p>
                    </div>
                ) : (
                    <section className="client-review-grid">
                        {data.ventas.map((sale) => (
                            <article key={sale.id} className="client-review-card">
                                <header>
                                    <div>
                                        <span>{sale.numeroTicket}</span>
                                        <h3>{sale.sucursal.nombre}</h3>
                                    </div>
                                    <strong>{formatMoney(sale.total)}</strong>
                                </header>
                                <p className="client-review-date">{formatDate(sale.createdAt)}</p>
                                <ul>
                                    {sale.productos.map((product) => (
                                        <li key={`${sale.id}-${product.nombre}`}>
                                            {product.cantidad} × {product.nombre}
                                        </li>
                                    ))}
                                </ul>

                                {sale.puedeOpinar ? (
                                    <button type="button" onClick={() => openReview(sale)}>
                                        <FaStar /> Calificar experiencia
                                    </button>
                                ) : (
                                    <div className="client-review-existing">
                                        <div className="client-review-stars" aria-label={`${sale.resena.calificacion} de 5 estrellas`}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <FaStar key={star} className={star <= sale.resena.calificacion ? "filled" : ""} aria-hidden="true" />
                                            ))}
                                        </div>
                                        <span className={`review-state ${sale.resena.estado.toLowerCase()}`}>
                                            {statusLabel(sale.resena.estado)}
                                        </span>
                                        <p>{sale.resena.comentario}</p>
                                        {sale.resena.motivoModeracion && <small>Motivo: {sale.resena.motivoModeracion}</small>}
                                    </div>
                                )}
                            </article>
                        ))}
                    </section>
                )}
            </main>

            {selectedSale && (
                <div className="client-review-dialog-backdrop" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) closeReview();
                }}>
                    <section className="client-review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-dialog-title">
                        <header>
                            <div><span>{selectedSale.numeroTicket}</span><h3 id="review-dialog-title">Califica tu experiencia</h3></div>
                            <button type="button" aria-label="Cerrar" onClick={closeReview}><FaTimes /></button>
                        </header>
                        <form onSubmit={submitReview}>
                            <fieldset>
                                <legend>Calificación</legend>
                                <div className="client-review-rating">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={star <= rating ? "selected" : ""}
                                            aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
                                            onClick={() => setRating(star)}
                                        >
                                            <FaStar />
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                            <label>
                                Tu comentario
                                <textarea
                                    rows="6"
                                    minLength="10"
                                    maxLength="1000"
                                    value={comment}
                                    onChange={(event) => setComment(event.target.value)}
                                    placeholder="Cuéntanos qué te gustó y qué podríamos mejorar."
                                    required
                                />
                                <small>{comment.length}/1000</small>
                            </label>
                            <label className="client-review-consent">
                                <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
                                <span>Autorizo que mi opinión y mi nombre abreviado se publiquen en la página principal.</span>
                            </label>
                            <div className="client-review-dialog-actions">
                                <button type="button" className="secondary" onClick={closeReview}>Cancelar</button>
                                <button type="submit" disabled={isSaving}>{isSaving ? "Enviando..." : "Enviar opinión"}</button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}

export default ClientReviews;
