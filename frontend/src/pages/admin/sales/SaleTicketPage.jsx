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
} from "../../../context/AuthContext";

import {
    ApiError
} from "../../../services/api";

import {
    getSaleTicketRequest
} from "../../../services/ticket.service";

import "./saleTicketPage.css";

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

function formatQuantity(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
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

function SaleTicketPage() {
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
        isLoading,
        setIsLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState("");

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadTicket() {
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
                        "No se pudo cargar el ticket."
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

        if (saleId) {
            void loadTicket();
        }

        return () =>
            controller.abort();
    }, [
        token,
        saleId
    ]);

    function handlePrint() {
        window.print();
    }

    if (isLoading) {
        return (
            <div className="sale-ticket-loading">
                <FaReceipt />
                Cargando ticket...
            </div>
        );
    }

    if (
        error ||
        !ticket
    ) {
        return (
            <section className="sale-ticket-error">
                <FaReceipt />

                <h2>
                    No se pudo mostrar el ticket
                </h2>

                <p>
                    {error ||
                        "La venta no fue encontrada."}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/admin/ventas"
                        )
                    }
                >
                    <FaArrowLeft />
                    Regresar a ventas
                </button>
            </section>
        );
    }

    return (
        <section className="sale-ticket-page">
            <div className="sale-ticket-toolbar">
                <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                        navigate(
                            "/admin/ventas"
                        )
                    }
                >
                    <FaArrowLeft />
                    Volver
                </button>

                <button
                    type="button"
                    className="primary"
                    onClick={
                        handlePrint
                    }
                >
                    <FaPrint />
                    Imprimir ticket
                </button>
            </div>

            <article className="sale-ticket-paper">
                <header className="sale-ticket-business">
                    <h1>
                        {ticket.negocio.nombre}
                    </h1>

                    {ticket.negocio
                        .razonSocial && (
                        <p>
                            {
                                ticket
                                    .negocio
                                    .razonSocial
                            }
                        </p>
                    )}

                    {ticket.negocio.ruc && (
                        <p>
                            RUC:{" "}
                            {
                                ticket
                                    .negocio
                                    .ruc
                            }
                        </p>
                    )}

                    <p>
                        {
                            ticket
                                .negocio
                                .direccion
                        }
                    </p>

                    {ticket.negocio
                        .telefono && (
                        <p>
                            Teléfono:{" "}
                            {
                                ticket
                                    .negocio
                                    .telefono
                            }
                        </p>
                    )}
                </header>

                <div className="sale-ticket-separator">
                    --------------------------------
                </div>

                <section className="sale-ticket-document">
                    <h2>
                        TICKET DE VENTA
                    </h2>

                    <strong>
                        {
                            ticket.numeroTicket
                        }
                    </strong>

                    <span
                        className={`sale-ticket-state ${ticket.estado.toLowerCase()}`}
                    >
                        {formatLabel(
                            ticket.estado
                        )}
                    </span>
                </section>

                <div className="sale-ticket-separator">
                    --------------------------------
                </div>

                <dl className="sale-ticket-information">
                    <div>
                        <dt>
                            Fecha
                        </dt>

                        <dd>
                            {formatDateTime(
                                ticket.fechaEmision
                            )}
                        </dd>
                    </div>

                    <div>
                        <dt>
                            Pedido
                        </dt>

                        <dd>
                            {
                                ticket.pedido
                                    .codigo
                            }
                        </dd>
                    </div>

                    <div>
                        <dt>
                            Tipo
                        </dt>

                        <dd>
                            {formatLabel(
                                ticket.pedido.tipo
                            )}
                        </dd>
                    </div>

                    {ticket.pedido.zona && (
                        <div>
                            <dt>
                                Zona
                            </dt>

                            <dd>
                                {
                                    ticket.pedido
                                        .zona
                                }
                            </dd>
                        </div>
                    )}

                    <div>
                        <dt>
                            Caja
                        </dt>

                        <dd>
                            {
                                ticket.caja.codigo
                            }
                        </dd>
                    </div>

                    <div>
                        <dt>
                            Vendedor
                        </dt>

                        <dd>
                            {
                                ticket
                                    .vendedor
                                    .nombreCompleto
                            }
                        </dd>
                    </div>

                    <div>
                        <dt>
                            Cliente
                        </dt>

                        <dd>
                            {
                                ticket
                                    .cliente
                                    .nombreCompleto
                            }
                        </dd>
                    </div>
                </dl>

                <div className="sale-ticket-separator">
                    --------------------------------
                </div>

                <table className="sale-ticket-items">
                    <thead>
                        <tr>
                            <th>
                                Producto
                            </th>

                            <th>
                                Cant.
                            </th>

                            <th>
                                Importe
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {ticket.detalles.map(
                            (detail) => (
                                <tr
                                    key={
                                        detail.id
                                    }
                                >
                                    <td>
                                        <strong>
                                            {
                                                detail.nombreProducto
                                            }
                                        </strong>

                                        <small>
                                            {formatMoney(
                                                detail.precioUnitario
                                            )}{" "}
                                            c/u
                                        </small>
                                    </td>

                                    <td>
                                        {formatQuantity(
                                            detail.cantidad
                                        )}
                                    </td>

                                    <td>
                                        {formatMoney(
                                            detail.subtotal
                                        )}
                                    </td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>

                <div className="sale-ticket-separator">
                    --------------------------------
                </div>

                <dl className="sale-ticket-totals">
                    <div>
                        <dt>
                            Subtotal
                        </dt>

                        <dd>
                            {formatMoney(
                                ticket.resumen
                                    .subtotal
                            )}
                        </dd>
                    </div>

                    {numberValue(
                        ticket.resumen
                            .descuento
                    ) > 0 && (
                        <div>
                            <dt>
                                Descuento
                            </dt>

                            <dd>
                                -{" "}
                                {formatMoney(
                                    ticket
                                        .resumen
                                        .descuento
                                )}
                            </dd>
                        </div>
                    )}

                    {numberValue(
                        ticket.resumen
                            .propina
                    ) > 0 && (
                        <div>
                            <dt>
                                Propina
                            </dt>

                            <dd>
                                {formatMoney(
                                    ticket
                                        .resumen
                                        .propina
                                )}
                            </dd>
                        </div>
                    )}

                    <div className="total">
                        <dt>
                            TOTAL
                        </dt>

                        <dd>
                            {formatMoney(
                                ticket.resumen
                                    .total
                            )}
                        </dd>
                    </div>

                    {numberValue(
                        ticket.resumen
                            .adelantoAplicado
                    ) > 0 && (
                        <div>
                            <dt>
                                Adelanto aplicado
                            </dt>

                            <dd>
                                {formatMoney(
                                    ticket
                                        .resumen
                                        .adelantoAplicado
                                )}
                            </dd>
                        </div>
                    )}

                    <div>
                        <dt>
                            Cobrado en caja
                        </dt>

                        <dd>
                            {formatMoney(
                                ticket.resumen
                                    .saldoCobrar
                            )}
                        </dd>
                    </div>
                </dl>

                <div className="sale-ticket-separator">
                    --------------------------------
                </div>

                <section className="sale-ticket-payments">
                    <h3>
                        PAGOS
                    </h3>

                    {ticket.pagos.map(
                        (payment) => (
                            <article
                                key={
                                    payment.id
                                }
                            >
                                <div>
                                    <strong>
                                        {formatLabel(
                                            payment.metodoPago
                                        )}
                                    </strong>

                                    <span>
                                        {formatMoney(
                                            payment.monto
                                        )}
                                    </span>
                                </div>

                                {payment
                                    .numeroOperacion && (
                                    <small>
                                        Operación:{" "}
                                        {
                                            payment.numeroOperacion
                                        }
                                    </small>
                                )}

                                {payment
                                    .montoRecibido && (
                                    <small>
                                        Recibido:{" "}
                                        {formatMoney(
                                            payment.montoRecibido
                                        )}
                                    </small>
                                )}

                                {payment.vuelto && (
                                    <small>
                                        Vuelto:{" "}
                                        {formatMoney(
                                            payment.vuelto
                                        )}
                                    </small>
                                )}

                                {payment.estado ===
                                    "ANULADO" && (
                                    <small className="payment-voided">
                                        Pago anulado
                                    </small>
                                )}
                            </article>
                        )
                    )}
                </section>

                {ticket.observaciones && (
                    <>
                        <div className="sale-ticket-separator">
                            --------------------------------
                        </div>

                        <section className="sale-ticket-notes">
                            <strong>
                                Observaciones
                            </strong>

                            <p>
                                {
                                    ticket.observaciones
                                }
                            </p>
                        </section>
                    </>
                )}

                {ticket.anulacion && (
                    <section className="sale-ticket-void">
                        <strong>
                            VENTA ANULADA
                        </strong>

                        <p>
                            Motivo:{" "}
                            {ticket.anulacion
                                .motivo ??
                                "No registrado"}
                        </p>

                        <p>
                            Fecha:{" "}
                            {formatDateTime(
                                ticket.anulacion
                                    .fecha
                            )}
                        </p>

                        <p>
                            Responsable:{" "}
                            {ticket.anulacion
                                .responsable ??
                                "No registrado"}
                        </p>
                    </section>
                )}

                <div className="sale-ticket-separator">
                    --------------------------------
                </div>

                <footer className="sale-ticket-footer">
                    <strong>
                        Gracias por su visita
                    </strong>

                    <p>
                        El Vallecito de Chocco
                    </p>

                    <small>
                        Documento interno de venta.
                        No reemplaza una boleta o
                        factura electrónica.
                    </small>
                </footer>
            </article>
        </section>
    );
}

export default SaleTicketPage;