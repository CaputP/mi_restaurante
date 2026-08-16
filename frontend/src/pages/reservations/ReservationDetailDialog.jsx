import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    FaCalendarAlt,
    FaClock,
    FaHistory,
    FaMapMarkerAlt,
    FaReceipt,
    FaTimes,
    FaUsers
} from "react-icons/fa";

import AdminDialog from "../../components/adminDialog/AdminDialog";
import {
    getPendingReservationPaymentAmount,
    getRemainingRequiredAdvance,
    hasOutstandingRequiredAdvance
} from "../../utils/reservationPayments";

import ReservationPaymentForm from "./ReservationPaymentForm";

import {
    ACTIVE_RESERVATION_STATES,
    formatDate,
    formatDateTime,
    formatLabel,
    formatMoney,
    PAYABLE_STATES,
    RESCHEDULABLE_STATES
} from "./reservation.utils";

function ReservationDetailDialog({
    error,
    reservation,
    isBusy,
    onCancelReservation,
    onClose,
    onPay,
    onReschedule,
    success
}) {
    const [action, setAction] =
        useState(null);
    const [cancelReason, setCancelReason] =
        useState("");

    const actionFormRef =
        useRef(null);

    const pendingPaymentAmount =
        getPendingReservationPaymentAmount(
            reservation.pagos
        );

    const availablePaymentAmount =
        getRemainingRequiredAdvance(
            reservation
        );

    const canPay =
        PAYABLE_STATES.has(
            reservation.estado
        ) &&
        hasOutstandingRequiredAdvance(
            reservation
        );

    useEffect(() => {
        if (!action) {
            return;
        }

        const form =
            actionFormRef.current;

        form?.scrollIntoView?.({
            behavior: "smooth",
            block: "start"
        });

        form
            ?.querySelector(
                "select, input, textarea"
            )
            ?.focus({
                preventScroll: true
            });
    }, [action]);

    return (
        <AdminDialog
            className="client-reservation-dialog"
            labelledBy="client-reservation-dialog-title"
            onClose={onClose}
        >
            <header className="client-dialog-header">
                <div>
                    <span className="client-eyebrow">
                        {reservation.codigo}
                    </span>
                    <h2 id="client-reservation-dialog-title">
                        Detalle de la reserva
                    </h2>
                </div>
                <button
                    type="button"
                    className="client-icon-button"
                    onClick={onClose}
                    aria-label="Cerrar detalle"
                >
                    <FaTimes />
                </button>
            </header>

            <div className="client-dialog-body">
                <div className="client-dialog-status-row">
                    <span
                        className={`client-status-badge status-${reservation.estado.toLowerCase()}`}
                    >
                        {formatLabel(
                            reservation.estado
                        )}
                    </span>
                    <span>
                        Solicitud registrada el {formatDateTime(reservation.createdAt)}
                    </span>
                </div>

                {success && (
                    <div
                        className="client-dialog-feedback success"
                        role="status"
                    >
                        {success}
                    </div>
                )}

                {error && (
                    <div
                        className="client-dialog-feedback error"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                <section className="client-detail-grid">
                    <article>
                        <FaCalendarAlt />
                        <span>Fecha</span>
                        <strong>
                            {formatDate(
                                reservation.fechaReserva
                            )}
                        </strong>
                    </article>
                    <article>
                        <FaClock />
                        <span>Horario</span>
                        <strong>
                            {reservation.horaReserva} · {reservation.duracionMinutos} min
                        </strong>
                    </article>
                    <article>
                        <FaMapMarkerAlt />
                        <span>Ubicación</span>
                        <strong>
                            {reservation.sucursal.nombre} · {reservation.zona.nombre}
                        </strong>
                    </article>
                    <article>
                        <FaUsers />
                        <span>Asistentes</span>
                        <strong>
                            {reservation.cantidadPersonas} personas
                        </strong>
                    </article>
                </section>

                <section className="client-payment-summary">
                    <div>
                        <span>Total estimado</span>
                        <strong>
                            {formatMoney(
                                reservation.totalEstimado
                            )}
                        </strong>
                    </div>
                    <div>
                        <span>Adelanto requerido</span>
                        <strong>
                            {formatMoney(
                                reservation.adelantoRequerido
                            )}
                        </strong>
                    </div>
                    <div>
                        <span>Pago confirmado</span>
                        <strong>
                            {formatMoney(
                                reservation.adelantoPagado
                            )}
                        </strong>
                    </div>
                    <div className="pending">
                        <span>Pendiente de validación</span>
                        <strong>
                            {formatMoney(
                                pendingPaymentAmount
                            )}
                        </strong>
                    </div>
                    <div className="emphasis">
                        <span>Adelanto por informar</span>
                        <strong>
                            {formatMoney(
                                availablePaymentAmount
                            )}
                        </strong>
                    </div>
                </section>

                {reservation.observaciones && (
                    <section className="client-detail-section">
                        <h3>Indicaciones</h3>
                        <p>
                            {reservation.observaciones}
                        </p>
                    </section>
                )}

                {reservation.detalles.length > 0 && (
                    <section className="client-detail-section">
                        <h3>Productos solicitados</h3>
                        <div className="client-detail-list">
                            {reservation.detalles.map(
                                (detail) => (
                                    <div key={detail.id}>
                                        <span>
                                            {detail.nombreProducto}
                                            <small>
                                                {formatLabel(detail.estado)}
                                            </small>
                                        </span>
                                        <strong>
                                            {detail.cantidadAprobada || detail.cantidadSolicitada} × {formatMoney(detail.precioReservado)}
                                        </strong>
                                    </div>
                                )
                            )}
                        </div>
                    </section>
                )}

                {reservation.pagos.length > 0 && (
                    <section className="client-detail-section">
                        <h3>Pagos informados</h3>
                        <div className="client-detail-list">
                            {reservation.pagos.map(
                                (paymentItem) => (
                                    <div key={paymentItem.id}>
                                        <span>
                                            {formatLabel(paymentItem.metodoPago)} · {formatDateTime(paymentItem.fechaPago)}
                                            <small>
                                                {formatLabel(paymentItem.estado)}
                                                {paymentItem.numeroOperacion
                                                    ? ` · Op. ${paymentItem.numeroOperacion}`
                                                    : ""}
                                            </small>
                                        </span>
                                        <strong>
                                            {formatMoney(paymentItem.monto)}
                                        </strong>
                                        {paymentItem.estado === "CONFIRMADO" && (
                                            <a
                                                className="client-button secondary"
                                                href={`/reservations/${reservation.id}/payments/${paymentItem.id}/receipt`}
                                            >
                                                <FaReceipt />
                                                Constancia
                                            </a>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </section>
                )}

                {action === "payment" && (
                    <ReservationPaymentForm
                        availableAmount={
                            availablePaymentAmount
                        }
                        formRef={
                            actionFormRef
                        }
                        isBusy={isBusy}
                        onBack={() =>
                            setAction(null)
                        }
                        onSubmit={onPay}
                    />
                )}

                {action === "cancel" && (
                    <form
                        ref={actionFormRef}
                        className="client-inline-form danger"
                        onSubmit={(event) => {
                            event.preventDefault();
                            onCancelReservation(
                                cancelReason.trim()
                            );
                        }}
                    >
                        <h3>Cancelar reserva</h3>
                        <p>
                            Esta acción liberará el horario. Los pagos confirmados conservarán su trazabilidad y el establecimiento gestionará la devolución aplicable.
                        </p>
                        <label>
                            <span>Motivo</span>
                            <textarea
                                rows="3"
                                minLength="3"
                                maxLength="2000"
                                value={cancelReason}
                                onChange={(event) =>
                                    setCancelReason(
                                        event.target.value
                                    )
                                }
                                required
                            />
                        </label>
                        <div className="client-form-actions">
                            <button
                                type="button"
                                className="client-button secondary"
                                onClick={() => setAction(null)}
                            >
                                Conservar reserva
                            </button>
                            <button
                                type="submit"
                                className="client-button danger"
                                disabled={isBusy}
                            >
                                {isBusy ? "Cancelando..." : "Confirmar cancelación"}
                            </button>
                        </div>
                    </form>
                )}

                <section className="client-detail-section history">
                    <h3>
                        <FaHistory /> Historial
                    </h3>
                    <ol>
                        {reservation.historial.map(
                            (history) => (
                                <li key={history.id}>
                                    <span />
                                    <div>
                                        <strong>
                                            {formatLabel(history.estadoNuevo)}
                                        </strong>
                                        <p>
                                            {history.observacion ?? "Actualización de la reserva."}
                                        </p>
                                        <small>
                                            {formatDateTime(history.createdAt)}
                                        </small>
                                    </div>
                                </li>
                            )
                        )}
                    </ol>
                </section>
            </div>

            {!action && (
                <footer className="client-dialog-footer">
                    <button
                        type="button"
                        className="client-button secondary"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>

                    <div>
                        {RESCHEDULABLE_STATES.has(reservation.estado) && (
                            <button
                                type="button"
                                className="client-button secondary"
                                onClick={onReschedule}
                            >
                                Reprogramar
                            </button>
                        )}
                        {ACTIVE_RESERVATION_STATES.has(reservation.estado) && (
                            <button
                                type="button"
                                className="client-button danger-outline"
                                onClick={() => setAction("cancel")}
                            >
                                Cancelar reserva
                            </button>
                        )}
                        {canPay && (
                            <button
                                type="button"
                                className="client-button primary"
                                onClick={() => setAction("payment")}
                            >
                                Agregar pago
                            </button>
                        )}
                    </div>
                </footer>
            )}
        </AdminDialog>
    );
}

export default ReservationDetailDialog;
