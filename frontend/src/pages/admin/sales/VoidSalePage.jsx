import {
    useEffect,
    useState
} from "react";

import {
    FaArrowLeft,
    FaBan,
    FaCashRegister,
    FaExclamationTriangle,
    FaReceipt,
    FaSave
} from "react-icons/fa";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import {
    useAuth
} from "../../../context/AuthContext";

import {
    ApiError
} from "../../../services/api";

import {
    voidSaleRequest
} from "../../../services/saleVoid.service";

import {
    getSaleTicketRequest
} from "../../../services/ticket.service";

import "./voidSalePage.css";

function isAbortError(error) {
    return (
        error?.name ===
        "AbortError"
    );
}

function getErrorMessage(error) {
    if (!(error instanceof ApiError)) {
        return null;
    }

    const validationMessage =
        error.errors?.[0]?.mensaje;

    return validationMessage
        ? `${error.message} ${validationMessage}`
        : error.message;
}

function numberValue(value) {
    const result =
        Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}

function formatMoney(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN",
            minimumFractionDigits: 2
        }
    ).format(
        numberValue(value)
    );
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(
        value
    ).toLocaleString(
        "es-PE",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}

function formatLabel(value) {
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(
            /(^|\s)\S/g,
            (letter) =>
                letter.toUpperCase()
        );
}

function VoidSalePage() {
    const {
        saleId
    } = useParams();

    const navigate =
        useNavigate();

    const {
        token
    } = useAuth();

    const [
        ticket,
        setTicket
    ] = useState(null);

    const [
        reason,
        setReason
    ] = useState("");

    const [
        isLoading,
        setIsLoading
    ] = useState(true);

    const [
        isSaving,
        setIsSaving
    ] = useState(false);

    const [
        message,
        setMessage
    ] = useState("");

    const [
        error,
        setError
    ] = useState("");

    useEffect(() => {
        if (!saleId) {
            return undefined;
        }

        const controller =
            new AbortController();

        async function loadSale() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await getSaleTicketRequest(
                        token,
                        saleId,
                        controller.signal
                    );

                setTicket(result);
            } catch (requestError) {
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
                    ) ??
                        "No se pudo cargar la venta."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoading(false);
                }
            }
        }

        void loadSale();

        return () =>
            controller.abort();
    }, [
        token,
        saleId
    ]);

    const hasAdvance =
        numberValue(
            ticket?.resumen
                ?.adelantoAplicado
        ) > 0;

    const canVoid =
        ticket?.estado ===
            "CONFIRMADA" &&
        !hasAdvance;

    async function handleSubmit(
        event
    ) {
        event.preventDefault();

        setMessage("");
        setError("");

        const cleanReason =
            reason.trim();

        if (
            cleanReason.length < 5
        ) {
            setError(
                "El motivo debe contener al menos 5 caracteres."
            );
            return;
        }

        const confirmed =
            window.confirm(
                "¿Confirmas la anulación? La caja y el inventario serán revertidos y el pedido quedará cancelado."
            );

        if (!confirmed) {
            return;
        }

        setIsSaving(true);

        try {
            const response =
                await voidSaleRequest(
                    token,
                    saleId,
                    cleanReason
                );

            setMessage(
                response.message
            );

            setTicket(
                (previous) => ({
                    ...previous,
                    estado:
                        "ANULADA"
                })
            );

            setReason("");
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo anular la venta."
            );
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="void-sale-loading">
                <FaReceipt />
                Cargando venta...
            </div>
        );
    }

    return (
        <section className="void-sale-page">
            <header className="void-sale-heading">
                <div>
                    <button
                        type="button"
                        className="void-sale-back"
                        onClick={() =>
                            navigate(
                                "/admin/ventas"
                            )
                        }
                    >
                        <FaArrowLeft />
                        Volver a ventas
                    </button>

                    <span className="admin-eyebrow">
                        ANULACIÓN
                    </span>

                    <h2>
                        Anular venta
                    </h2>

                    <p>
                        Esta operación revierte la caja,
                        los pagos y el inventario.
                    </p>
                </div>

                <FaBan />
            </header>

            {message && (
                <div className="void-sale-feedback success">
                    {message}
                </div>
            )}

            {error && (
                <div className="void-sale-feedback error">
                    {error}
                </div>
            )}

            {!ticket ? (
                <div className="void-sale-empty">
                    <FaReceipt />

                    <strong>
                        Venta no encontrada
                    </strong>
                </div>
            ) : (
                <>
                    <section className="void-sale-summary">
                        <article>
                            <FaReceipt />

                            <div>
                                <span>
                                    Ticket
                                </span>

                                <strong>
                                    {
                                        ticket.numeroTicket
                                    }
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaCashRegister />

                            <div>
                                <span>
                                    Total
                                </span>

                                <strong>
                                    {formatMoney(
                                        ticket.resumen
                                            .total
                                    )}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaReceipt />

                            <div>
                                <span>
                                    Pedido
                                </span>

                                <strong>
                                    {
                                        ticket.pedido
                                            .codigo
                                    }
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaExclamationTriangle />

                            <div>
                                <span>
                                    Estado
                                </span>

                                <strong>
                                    {formatLabel(
                                        ticket.estado
                                    )}
                                </strong>
                            </div>
                        </article>
                    </section>

                    <section className="void-sale-detail">
                        <dl>
                            <div>
                                <dt>
                                    Sucursal
                                </dt>

                                <dd>
                                    {
                                        ticket.negocio
                                            .nombre
                                    }
                                </dd>
                            </div>

                            <div>
                                <dt>
                                    Cliente
                                </dt>

                                <dd>
                                    {
                                        ticket.cliente
                                            .nombreCompleto
                                    }
                                </dd>
                            </div>

                            <div>
                                <dt>
                                    Vendedor
                                </dt>

                                <dd>
                                    {
                                        ticket.vendedor
                                            .nombreCompleto
                                    }
                                </dd>
                            </div>

                            <div>
                                <dt>
                                    Fecha de venta
                                </dt>

                                <dd>
                                    {formatDateTime(
                                        ticket.fechaEmision
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt>
                                    Adelanto aplicado
                                </dt>

                                <dd>
                                    {formatMoney(
                                        ticket.resumen
                                            .adelantoAplicado
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {hasAdvance && (
                        <div className="void-sale-warning">
                            <FaExclamationTriangle />

                            <div>
                                <strong>
                                    Venta con adelanto
                                </strong>

                                <p>
                                    Esta venta no puede anularse desde esta pantalla porque tiene un adelanto de reserva aplicado.
                                </p>
                            </div>
                        </div>
                    )}

                    {ticket.estado ===
                        "ANULADA" && (
                        <div className="void-sale-warning">
                            <FaBan />

                            <div>
                                <strong>
                                    Venta anulada
                                </strong>

                                <p>
                                    Esta venta ya no puede volver a procesarse.
                                </p>
                            </div>
                        </div>
                    )}

                    {canVoid && (
                        <form
                            className="void-sale-form"
                            onSubmit={
                                handleSubmit
                            }
                        >
                            <div>
                                <span className="admin-eyebrow">
                                    CONFIRMACIÓN
                                </span>

                                <h3>
                                    Motivo de anulación
                                </h3>

                                <p>
                                    El motivo quedará registrado en la venta y en auditoría.
                                </p>
                            </div>

                            <label>
                                Motivo *

                                <textarea
                                    rows="5"
                                    minLength="5"
                                    maxLength="500"
                                    placeholder="Describe por qué se está anulando la venta..."
                                    value={
                                        reason
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setReason(
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <div className="void-sale-effects">
                                <strong>
                                    Al confirmar:
                                </strong>

                                <p>
                                    Se anularán los pagos, se descontará la venta de la caja, se devolverán las cantidades al inventario y el pedido quedará cancelado.
                                </p>
                            </div>

                            <div className="void-sale-actions">
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() =>
                                        navigate(
                                            "/admin/ventas"
                                        )
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="danger"
                                    disabled={
                                        isSaving
                                    }
                                >
                                    <FaSave />

                                    {isSaving
                                        ? "Anulando..."
                                        : "Confirmar anulación"}
                                </button>
                            </div>
                        </form>
                    )}
                </>
            )}
        </section>
    );
}

export default VoidSalePage;