import {
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import {
    FaCalendarCheck,
    FaClock,
    FaPlus,
    FaUsers
} from "react-icons/fa";
import { LEGAL_VERSIONS } from "../../config/legal.config";

import {
    formatMoney,
    getTodayInputValue,
    getTomorrowInputValue
} from "./reservation.utils";

function createInitialState(
    options,
    initialValues
) {
    return {
        sucursalId:
            initialValues?.sucursal?.id ??
            options.sucursalSeleccionadaId ??
            options.sucursales?.[0]?.id ??
            "",
        zonaId:
            initialValues?.zona?.id ?? "",
        fechaReserva:
            initialValues?.fechaReserva ??
            getTomorrowInputValue(),
        horaReserva:
            initialValues?.horaReserva ?? "12:00",
        duracionMinutos:
            initialValues?.duracionMinutos ?? 120,
        cantidadPersonas:
            initialValues?.cantidadPersonas ?? 2,
        tipoReserva:
            initialValues?.tipoReserva ?? "NORMAL",
        nombreEvento:
            initialValues?.nombreEvento ?? "",
        observaciones:
            initialValues?.observaciones ?? ""
    };
}

function ReservationForm({
    options,
    initialValues = null,
    mode = "create",
    isLoadingOptions = false,
    isSubmitting,
    onBranchChange,
    onCancel,
    onSubmit
}) {
    const [form, setForm] = useState(
        () => createInitialState(
            options,
            initialValues
        )
    );
    const [quantities, setQuantities] =
        useState({});
    const [submissionError, setSubmissionError] =
        useState("");
    const [acceptsReservationPolicy, setAcceptsReservationPolicy] =
        useState(false);
    const submissionInProgressRef =
        useRef(false);
    const formRef =
        useRef(null);
    const feedbackRef =
        useRef(null);

    const isRescheduling =
        mode === "reschedule";

    useEffect(() => {
        formRef.current
            ?.scrollIntoView?.({
                behavior: "smooth",
                block: "start"
            });
    }, []);

    useEffect(() => {
        if (!submissionError) {
            return;
        }

        feedbackRef.current
            ?.scrollIntoView?.({
                behavior: "smooth",
                block: "center"
            });

        feedbackRef.current
            ?.focus({
                preventScroll: true
            });
    }, [submissionError]);

    const selectedProducts = useMemo(
        () =>
            (options.productos ?? [])
                .map((product) => ({
                    ...product,
                    cantidad:
                        Number(
                            quantities[
                                product.productoSucursalId
                            ]
                        ) || 0
                }))
                .filter(
                    (product) =>
                        product.cantidad > 0
                ),
        [options.productos, quantities]
    );

    const productTotal = useMemo(
        () =>
            selectedProducts.reduce(
                (total, product) =>
                    total +
                    product.precioVenta *
                        product.cantidad,
                0
            ),
        [selectedProducts]
    );

    function updateField(event) {
        const { name, value } =
            event.target;

        setForm((current) => ({
            ...current,
            [name]: value
        }));
        setSubmissionError("");
    }

    function handleBranchChange(event) {
        const branchId =
            event.target.value;

        setForm((current) => ({
            ...current,
            sucursalId: branchId,
            zonaId: ""
        }));
        setQuantities({});
        setSubmissionError("");
        onBranchChange(branchId);
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (
            submissionInProgressRef.current ||
            isSubmitting ||
            isLoadingOptions
        ) {
            return;
        }

        setSubmissionError("");

        const requestedDateTime =
            new Date(
                `${form.fechaReserva}T${form.horaReserva}:00-05:00`
            );

        if (
            Number.isNaN(
                requestedDateTime.getTime()
            ) ||
            requestedDateTime.getTime() <=
                Date.now()
        ) {
            setSubmissionError(
                "Selecciona una fecha y hora futuras."
            );
            return;
        }

        const availabilityData = {
            sucursalId: form.sucursalId,
            zonaId: form.zonaId,
            fechaReserva:
                form.fechaReserva,
            horaReserva:
                form.horaReserva,
            duracionMinutos:
                Number(
                    form.duracionMinutos
                ),
            cantidadPersonas:
                Number(
                    form.cantidadPersonas
                )
        };

        const requestData =
            isRescheduling
                ? availabilityData
                : {
                    ...availabilityData,
                    tipoReserva:
                        form.tipoReserva,
                    nombreEvento:
                        form.tipoReserva ===
                        "EVENTO"
                            ? form.nombreEvento
                            : null,
                    observaciones:
                        form.observaciones
                            .trim() ||
                        null,
                    aceptaPoliticaReserva:
                        acceptsReservationPolicy,
                    versionPoliticaReserva:
                        LEGAL_VERSIONS.reservations,
                    detalles:
                        selectedProducts.map(
                            (product) => ({
                                productoSucursalId:
                                    product.productoSucursalId,
                                cantidadSolicitada:
                                    product.cantidad,
                                observaciones: null
                            })
                        )
                };

        submissionInProgressRef.current =
            true;

        try {
            const result =
                await onSubmit(
                    requestData
                );

            if (
                result?.success ===
                false
            ) {
                setSubmissionError(
                    result.error
                );
            }
        } catch (error) {
            setSubmissionError(
                error?.message ??
                    "No se pudo enviar la solicitud de reserva."
            );
        } finally {
            submissionInProgressRef.current =
                false;
        }
    }

    const isFormBusy =
        isSubmitting ||
        isLoadingOptions;

    return (
        <form
            ref={formRef}
            className="client-reservation-form"
            onSubmit={handleSubmit}
        >
            <div className="client-reservation-form-heading">
                <div>
                    <span className="client-eyebrow">
                        {isRescheduling
                            ? "Nueva fecha"
                            : "Solicitud en línea"}
                    </span>
                    <h2>
                        {isRescheduling
                            ? `Reprogramar ${initialValues?.codigo ?? "reserva"}`
                            : "Planifica tu visita"}
                    </h2>
                    <p>
                        Verificaremos capacidad, horario y cruces antes de guardar.
                    </p>
                </div>

                <FaCalendarCheck aria-hidden="true" />
            </div>

            {submissionError && (
                <div
                    ref={feedbackRef}
                    className="client-form-feedback error"
                    role="alert"
                    tabIndex={-1}
                >
                    {submissionError}
                </div>
            )}

            <fieldset disabled={isFormBusy}>
                <legend className="sr-only">
                    Datos de la reserva
                </legend>

                <div className="client-form-grid">
                    <label>
                        <span>Sucursal</span>
                        <select
                            name="sucursalId"
                            value={form.sucursalId}
                            onChange={handleBranchChange}
                            disabled={isRescheduling}
                            required
                        >
                            <option value="">
                                Selecciona una sucursal
                            </option>
                            {(options.sucursales ?? []).map(
                                (branch) => (
                                    <option
                                        key={branch.id}
                                        value={branch.id}
                                    >
                                        {branch.nombre}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label>
                        <span>Zona</span>
                        <select
                            name="zonaId"
                            value={form.zonaId}
                            onChange={updateField}
                            required
                        >
                            <option value="">
                                Selecciona una zona
                            </option>
                            {(options.zonas ?? []).map(
                                (zone) => (
                                    <option
                                        key={zone.id}
                                        value={zone.id}
                                    >
                                        {zone.nombre}
                                        {zone.capacidadReferencial
                                            ? ` · hasta ${zone.capacidadReferencial} personas`
                                            : ""}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label>
                        <span>
                            <FaCalendarCheck /> Fecha
                        </span>
                        <input
                            type="date"
                            name="fechaReserva"
                            min={getTodayInputValue()}
                            value={form.fechaReserva}
                            onChange={updateField}
                            required
                        />
                    </label>

                    <label>
                        <span>
                            <FaClock /> Hora
                        </span>
                        <input
                            type="time"
                            name="horaReserva"
                            value={form.horaReserva}
                            onChange={updateField}
                            required
                        />
                    </label>

                    <label>
                        <span>Duración estimada</span>
                        <select
                            name="duracionMinutos"
                            value={form.duracionMinutos}
                            onChange={updateField}
                            required
                        >
                            {(options.duraciones ?? [60, 90, 120, 180, 240]).map(
                                (duration) => (
                                    <option
                                        key={duration}
                                        value={duration}
                                    >
                                        {duration < 60
                                            ? `${duration} min`
                                            : `${duration / 60} h`}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label>
                        <span>
                            <FaUsers /> Personas
                        </span>
                        <input
                            type="number"
                            name="cantidadPersonas"
                            min="1"
                            max="2000"
                            value={form.cantidadPersonas}
                            onChange={updateField}
                            required
                        />
                    </label>

                    {!isRescheduling && (
                        <>
                            <label>
                                <span>Tipo de reserva</span>
                                <select
                                    name="tipoReserva"
                                    value={form.tipoReserva}
                                    onChange={updateField}
                                    required
                                >
                                    {(options.tiposReserva ?? []).map(
                                        (type) => (
                                            <option
                                                key={type.codigo}
                                                value={type.codigo}
                                            >
                                                {type.nombre}
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            {form.tipoReserva === "EVENTO" && (
                                <label>
                                    <span>Nombre del evento</span>
                                    <input
                                        type="text"
                                        name="nombreEvento"
                                        maxLength="180"
                                        value={form.nombreEvento}
                                        onChange={updateField}
                                        placeholder="Ej. Cumpleaños de Ana"
                                        required
                                    />
                                </label>
                            )}

                            <label className="client-form-full">
                                <span>Indicaciones</span>
                                <textarea
                                    name="observaciones"
                                    rows="3"
                                    maxLength="2000"
                                    value={form.observaciones}
                                    onChange={updateField}
                                    placeholder="Accesibilidad, ubicación preferida u otra información útil."
                                />
                            </label>
                        </>
                    )}
                </div>

                {!isRescheduling &&
                    (options.productos ?? []).length > 0 && (
                    <section className="client-products-picker">
                        <div className="client-products-heading">
                            <div>
                                <h3>
                                    Productos opcionales
                                </h3>
                                <p>
                                    Solicítalos ahora; el equipo confirmará disponibilidad y cantidades.
                                </p>
                            </div>
                            <strong>
                                Estimado: {formatMoney(productTotal)}
                            </strong>
                        </div>

                        <div className="client-product-list">
                            {options.productos.map(
                                (product) => (
                                    <label
                                        className="client-product-row"
                                        key={product.productoSucursalId}
                                    >
                                        <span>
                                            <strong>
                                                {product.nombre}
                                            </strong>
                                            <small>
                                                {product.categoria?.nombre ?? "Producto"} · {formatMoney(product.precioVenta)}
                                            </small>
                                        </span>
                                        <span className="client-quantity-control">
                                            <FaPlus aria-hidden="true" />
                                            <input
                                                aria-label={`Cantidad de ${product.nombre}`}
                                                type="number"
                                                min="0"
                                                max="999"
                                                step={product.unidadMedida?.decimales ? "0.001" : "1"}
                                                value={quantities[product.productoSucursalId] ?? ""}
                                                onChange={(event) => {
                                                    const value = event.target.value;
                                                    setQuantities((current) => ({
                                                        ...current,
                                                        [product.productoSucursalId]: value
                                                    }));
                                                }}
                                                placeholder="0"
                                            />
                                        </span>
                                    </label>
                                )
                            )}
                        </div>
                    </section>
                )}
            </fieldset>

            {!isRescheduling && (
                <label className="client-reservation-policy">
                    <input
                        type="checkbox"
                        checked={acceptsReservationPolicy}
                        onChange={(event) => {
                            setAcceptsReservationPolicy(event.target.checked);
                            setSubmissionError("");
                        }}
                        required
                    />
                    <span>
                        He leído y acepto la <a href="/legal/reservas-cancelaciones" target="_blank" rel="noreferrer">Política de Reservas, Cancelaciones y Reembolsos</a> aplicable a esta solicitud.
                    </span>
                </label>
            )}

            <div className="client-form-actions">
                <button
                    type="button"
                    className="client-button secondary"
                    onClick={onCancel}
                    disabled={isFormBusy}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="client-button primary"
                    disabled={isFormBusy}
                >
                    {isLoadingOptions
                        ? "Cargando sede..."
                        : isSubmitting
                        ? "Verificando..."
                        : isRescheduling
                            ? "Guardar nueva fecha"
                            : "Solicitar reserva"}
                </button>
            </div>
        </form>
    );
}

export default ReservationForm;
