import {
    useState
} from "react";

import {
    FaCreditCard
} from "react-icons/fa";

function ReservationPaymentForm({
    availableAmount,
    formRef,
    isBusy,
    onBack,
    onSubmit
}) {
    const [payment, setPayment] =
        useState({
            metodoPago: "YAPE",
            monto: availableAmount,
            numeroOperacion: "",
            observaciones: ""
        });

    async function handleSubmit(
        event
    ) {
        event.preventDefault();

        const wasRegistered =
            await onSubmit({
                ...payment,
                monto:
                    Number(
                        payment.monto
                    ),
                numeroOperacion:
                    payment
                        .numeroOperacion
                        .trim(),
                observaciones:
                    payment
                        .observaciones
                        .trim() ||
                    null
            });

        if (wasRegistered) {
            onBack();
        }
    }

    return (
        <form
            ref={formRef}
            className="client-inline-form client-payment-form"
            onSubmit={handleSubmit}
        >
            <h3>
                <FaCreditCard />
                Informar pago realizado
            </h3>

            <p>
                Registra un pago realizado por un medio externo. Se enviará al administrador y no se considerará pagado hasta que sea validado.
            </p>

            <div
                className="client-payment-flow"
                role="note"
            >
                <strong>
                    Flujo de validación
                </strong>

                <span>
                    1. Realizas el pago · 2. Informas la operación · 3. Administración confirma la recepción.
                </span>
            </div>

            <div className="client-form-grid compact">
                <label>
                    <span>
                        Método
                    </span>

                    <select
                        autoFocus
                        value={
                            payment.metodoPago
                        }
                        onChange={(
                            event
                        ) =>
                            setPayment(
                                (
                                    current
                                ) => ({
                                    ...current,
                                    metodoPago:
                                        event
                                            .target
                                            .value
                                })
                            )
                        }
                    >
                        <option value="YAPE">
                            Yape
                        </option>
                        <option value="PLIN">
                            Plin
                        </option>
                        <option value="TRANSFERENCIA">
                            Transferencia
                        </option>
                        <option value="TARJETA">
                            Tarjeta
                        </option>
                    </select>
                </label>

                <label>
                    <span>
                        Monto
                    </span>

                    <input
                        type="number"
                        min="0.01"
                        max={availableAmount}
                        step="0.01"
                        value={
                            payment.monto
                        }
                        onChange={(
                            event
                        ) =>
                            setPayment(
                                (
                                    current
                                ) => ({
                                    ...current,
                                    monto:
                                        event
                                            .target
                                            .value
                                })
                            )
                        }
                        required
                    />
                </label>

                <label>
                    <span>
                        Número de operación
                    </span>

                    <input
                        type="text"
                        maxLength="100"
                        value={
                            payment
                                .numeroOperacion
                        }
                        onChange={(
                            event
                        ) =>
                            setPayment(
                                (
                                    current
                                ) => ({
                                    ...current,
                                    numeroOperacion:
                                        event
                                            .target
                                            .value
                                })
                            )
                        }
                        required
                    />
                </label>

                <label>
                    <span>
                        Observación
                    </span>

                    <input
                        type="text"
                        maxLength="1000"
                        value={
                            payment
                                .observaciones
                        }
                        onChange={(
                            event
                        ) =>
                            setPayment(
                                (
                                    current
                                ) => ({
                                    ...current,
                                    observaciones:
                                        event
                                            .target
                                            .value
                                })
                            )
                        }
                    />
                </label>
            </div>

            <div className="client-form-actions">
                <button
                    type="button"
                    className="client-button secondary"
                    onClick={onBack}
                >
                    Volver
                </button>

                <button
                    type="submit"
                    className="client-button primary"
                    disabled={isBusy}
                >
                    {isBusy
                        ? "Enviando..."
                        : "Enviar para validación"}
                </button>
            </div>
        </form>
    );
}

export default ReservationPaymentForm;
