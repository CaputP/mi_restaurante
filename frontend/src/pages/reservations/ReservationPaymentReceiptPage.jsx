import {
    useEffect,
    useState
} from "react";
import {
    FaArrowLeft,
    FaPrint,
    FaReceipt
} from "react-icons/fa";
import {
    useNavigate,
    useParams
} from "react-router-dom";

import {
    useAuth
} from "../../context/AuthContext";
import {
    ApiError
} from "../../services/api";
import {
    getReservationPaymentReceiptRequest
} from "../../services/reservation.service";

import "./reservationPaymentReceiptPage.css";

function formatMoney(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN",
            minimumFractionDigits: 2
        }
    ).format(Number(value ?? 0));
}

function formatDateTime(value) {
    return value
        ? new Date(value).toLocaleString(
            "es-PE",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        )
        : "-";
}

function formatLabel(value) {
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/(^|\s)\S/g, (letter) =>
            letter.toUpperCase()
        );
}

function getErrorMessage(error) {
    if (!(error instanceof ApiError)) {
        return null;
    }

    return error.errors?.[0]?.mensaje
        ? `${error.message} ${error.errors[0].mensaje}`
        : error.message;
}

function ReservationPaymentReceiptPage() {
    const {
        reservationId,
        paymentId
    } = useParams();
    const navigate = useNavigate();
    const {
        token,
        usuario
    } = useAuth();
    const isClient =
        usuario?.rol?.codigo === "CLIENTE";
    const backPath = isClient
        ? "/reservations"
        : "/admin/reservas";

    const [receipt, setReceipt] =
        useState(null);
    const [isLoading, setIsLoading] =
        useState(true);
    const [error, setError] =
        useState("");

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadReceipt() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await getReservationPaymentReceiptRequest(
                        token,
                        reservationId,
                        paymentId,
                        {
                            client: isClient,
                            signal: controller.signal
                        }
                    );

                setReceipt(result);
            } catch (requestError) {
                if (requestError?.name === "AbortError") {
                    return;
                }

                setError(
                    getErrorMessage(requestError) ??
                    "No se pudo cargar la constancia."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        if (reservationId && paymentId) {
            void loadReceipt();
        }

        return () => controller.abort();
    }, [
        token,
        reservationId,
        paymentId,
        isClient
    ]);

    if (isLoading) {
        return (
            <div className="reservation-receipt-state">
                <FaReceipt />
                Cargando constancia...
            </div>
        );
    }

    if (error || !receipt) {
        return (
            <section className="reservation-receipt-state">
                <FaReceipt />
                <h2>No se pudo mostrar la constancia</h2>
                <p>{error || "El adelanto no fue encontrado."}</p>
                <button
                    type="button"
                    onClick={() => navigate(backPath)}
                >
                    <FaArrowLeft /> Volver
                </button>
            </section>
        );
    }

    return (
        <section className="reservation-receipt-page">
            <div className="reservation-receipt-toolbar">
                <button
                    type="button"
                    onClick={() => navigate(backPath)}
                >
                    <FaArrowLeft /> Volver
                </button>
                <button
                    type="button"
                    className="primary"
                    onClick={() => window.print()}
                >
                    <FaPrint /> Imprimir
                </button>
            </div>

            <article className="reservation-receipt-paper">
                <header>
                    <h1>{receipt.negocio.nombre}</h1>
                    {receipt.negocio.razonSocial && (
                        <p>{receipt.negocio.razonSocial}</p>
                    )}
                    {receipt.negocio.ruc && (
                        <p>RUC: {receipt.negocio.ruc}</p>
                    )}
                    <p>{receipt.negocio.direccion}</p>
                    <h2>CONSTANCIA DE ADELANTO</h2>
                    <strong>{receipt.numeroConstancia}</strong>
                </header>

                <dl className="reservation-receipt-data">
                    <div>
                        <dt>Confirmado</dt>
                        <dd>{formatDateTime(receipt.fechaConfirmacion)}</dd>
                    </div>
                    <div>
                        <dt>Reserva</dt>
                        <dd>{receipt.reserva.codigo}</dd>
                    </div>
                    <div>
                        <dt>Cliente</dt>
                        <dd>{receipt.reserva.cliente.nombreCompleto}</dd>
                    </div>
                    <div>
                        <dt>Atención</dt>
                        <dd>{receipt.reserva.fechaReserva} · {receipt.reserva.horaReserva}</dd>
                    </div>
                    <div>
                        <dt>Zona</dt>
                        <dd>{receipt.reserva.zona.nombre}</dd>
                    </div>
                    <div>
                        <dt>Caja</dt>
                        <dd>{receipt.caja?.codigo ?? "Registro histórico"}</dd>
                    </div>
                </dl>

                {receipt.reserva.detalles.length > 0 && (
                    <section className="reservation-receipt-products">
                        <h3>Productos reservados</h3>
                        {receipt.reserva.detalles.map((detail) => (
                            <div key={detail.id}>
                                <span>
                                    {detail.nombreProducto}
                                    <small>
                                        {detail.cantidadAprobada} × {formatMoney(detail.precioReservado)}
                                    </small>
                                </span>
                                <strong>{formatMoney(detail.subtotal)}</strong>
                            </div>
                        ))}
                    </section>
                )}

                <section className="reservation-receipt-totals">
                    <div>
                        <span>Método</span>
                        <strong>{formatLabel(receipt.metodoPago)}</strong>
                    </div>
                    {receipt.numeroOperacion && (
                        <div>
                            <span>N.º operación</span>
                            <strong>{receipt.numeroOperacion}</strong>
                        </div>
                    )}
                    <div className="paid">
                        <span>Adelanto recibido</span>
                        <strong>{formatMoney(receipt.monto)}</strong>
                    </div>
                    <div>
                        <span>Adelanto acumulado</span>
                        <strong>{formatMoney(receipt.reserva.adelantoPagado)}</strong>
                    </div>
                    <div>
                        <span>Saldo estimado</span>
                        <strong>{formatMoney(receipt.reserva.saldoEstimado)}</strong>
                    </div>
                </section>

                <footer>
                    <p>{receipt.aviso}</p>
                    <small>
                        Validado por {receipt.confirmadoPor ?? "el establecimiento"}.
                    </small>
                </footer>
            </article>
        </section>
    );
}

export default ReservationPaymentReceiptPage;
