import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaCalendarAlt,
    FaCheckCircle,
    FaClock,
    FaPlus,
    FaSyncAlt
} from "react-icons/fa";

import SessionHeader from "../../components/sessionHeader/SessionHeader";
import ClientNav from "../../components/clientNav/ClientNav";

import {
    useAuth
} from "../../context/AuthContext";
import {
    useRealtimeVersion
} from "../../context/RealtimeContext";

import {
    cancelClientReservationRequest,
    checkClientReservationAvailabilityRequest,
    createClientReservationRequest,
    getClientReservationOptionsRequest,
    getClientReservationRequest,
    listClientReservationsRequest,
    registerClientReservationPaymentRequest,
    rescheduleClientReservationRequest
} from "../../services/reservation.service";

import ReservationCard from "./ReservationCard";
import ReservationDetailDialog from "./ReservationDetailDialog";
import ReservationForm from "./ReservationForm";

import {
    ACTIVE_RESERVATION_STATES,
    getErrorMessage,
    isAbortError,
    STATUS_OPTIONS
} from "./reservation.utils";

import "./reservations.css";

const EMPTY_OPTIONS = {
    sucursales: [],
    zonas: [],
    productos: [],
    horarios: [],
    tiposReserva: [],
    duraciones: [],
    sucursalSeleccionadaId: null
};

function Reservations() {
    const { token, usuario } = useAuth();
    const realtimeVersion =
        useRealtimeVersion([
            "RESERVATIONS"
        ]);
    const [options, setOptions] =
        useState(EMPTY_OPTIONS);
    const [reservations, setReservations] =
        useState([]);
    const [pagination, setPagination] =
        useState({
            page: 1,
            total: 0,
            totalPages: 1
        });
    const [statusFilter, setStatusFilter] =
        useState("TODOS");
    const [isLoading, setIsLoading] =
        useState(true);
    const [isBusy, setIsBusy] =
        useState(false);
    const [isLoadingBranchOptions, setIsLoadingBranchOptions] =
        useState(false);
    const [isFormOpen, setIsFormOpen] =
        useState(false);
    const [rescheduling, setRescheduling] =
        useState(null);
    const [selectedReservation, setSelectedReservation] =
        useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadReservations = useCallback(
        async (
            {
                page = 1,
                signal
            } = {}
        ) => {
            const result =
                await listClientReservationsRequest(
                    token,
                    {
                        estado: statusFilter,
                        page,
                        limit: 12,
                        signal
                    }
                );

            setReservations(result.reservas);
            setPagination(result.pagination);
        },
        [statusFilter, token]
    );

    const loadBranchOptions = useCallback(
        async (branchId, signal) => {
            if (!branchId) {
                return;
            }

            const result =
                await getClientReservationOptionsRequest(
                    token,
                    {
                        sucursalId: branchId,
                        signal
                    }
                );

            setOptions(result);
        },
        [token]
    );

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadPage() {
            setIsLoading(true);
            setError("");

            try {
                const [initialOptions] =
                    await Promise.all([
                        getClientReservationOptionsRequest(
                            token,
                            {
                                signal: controller.signal
                            }
                        ),
                        loadReservations({
                            signal: controller.signal
                        })
                    ]);

                const branchId =
                    initialOptions.sucursalSeleccionadaId ??
                    initialOptions.sucursales?.[0]?.id;

                if (branchId) {
                    await loadBranchOptions(
                        branchId,
                        controller.signal
                    );
                } else {
                    setOptions(initialOptions);
                }
            } catch (requestError) {
                if (!isAbortError(requestError)) {
                    setError(
                        getErrorMessage(requestError)
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadPage();

        return () => controller.abort();
    }, [
        loadBranchOptions,
        loadReservations,
        token
    ]);

    useEffect(() => {
        if (realtimeVersion === 0) {
            return undefined;
        }

        const controller =
            new AbortController();

        async function synchronizeReservations() {
            try {
                await loadReservations({
                    page:
                        pagination.page,
                    signal:
                        controller.signal
                });

                if (selectedReservation?.id) {
                    const updatedReservation =
                        await getClientReservationRequest(
                            token,
                            selectedReservation.id,
                            controller.signal
                        );

                    setSelectedReservation(
                        updatedReservation
                    );
                }
            } catch (requestError) {
                if (!isAbortError(requestError)) {
                    console.error(
                        "No se pudieron sincronizar las reservas:",
                        requestError
                    );
                }
            }
        }

        void synchronizeReservations();

        return () =>
            controller.abort();
    }, [
        realtimeVersion,
        loadReservations,
        pagination.page,
        selectedReservation?.id,
        token
    ]);

    const metrics = useMemo(
        () => ({
            total: pagination.total,
            active: reservations.filter(
                (reservation) =>
                    ACTIVE_RESERVATION_STATES.has(
                        reservation.estado
                    )
            ).length,
            confirmed: reservations.filter(
                (reservation) =>
                    reservation.estado === "CONFIRMADA"
            ).length
        }),
        [pagination.total, reservations]
    );

    function clearFeedback() {
        setError("");
        setSuccess("");
    }

    async function handleBranchSelection(
        branchId
    ) {
        clearFeedback();

        setOptions(
            (current) => ({
                ...current,
                sucursalSeleccionadaId:
                    branchId || null,
                zonas: [],
                productos: [],
                horarios: []
            })
        );

        if (!branchId) {
            return;
        }

        setIsLoadingBranchOptions(true);

        try {
            await loadBranchOptions(
                branchId
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                )
            );
        } finally {
            setIsLoadingBranchOptions(false);
        }
    }

    async function refreshAfterMutation(
        message,
        reservationId = null
    ) {
        await loadReservations({
            page: pagination.page
        });

        if (reservationId) {
            const detail =
                await getClientReservationRequest(
                    token,
                    reservationId
                );
            setSelectedReservation(detail);
        }

        setSuccess(message);
    }

    async function handleCreate(data) {
        clearFeedback();
        setIsBusy(true);

        try {
            const availability =
                await checkClientReservationAvailabilityRequest(
                    token,
                    data
                );

            if (!availability.disponible) {
                const availabilityError =
                    availability.motivos.join(" ") ||
                    "El horario seleccionado no se encuentra disponible.";

                setError(
                    availabilityError
                );

                return {
                    success: false,
                    error:
                        availabilityError
                };
            }

            await createClientReservationRequest(
                token,
                data
            );
            setIsFormOpen(false);
            await refreshAfterMutation(
                "Tu solicitud fue registrada. El equipo revisará disponibilidad y productos."
            );

            return {
                success: true
            };
        } catch (requestError) {
            const requestErrorMessage =
                getErrorMessage(
                    requestError
                );

            setError(
                requestErrorMessage
            );

            return {
                success: false,
                error:
                    requestErrorMessage
            };
        } finally {
            setIsBusy(false);
        }
    }

    async function handleOpenDetail(reservationId) {
        clearFeedback();
        setIsBusy(true);

        try {
            const detail =
                await getClientReservationRequest(
                    token,
                    reservationId
                );
            setSelectedReservation(detail);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setIsBusy(false);
        }
    }

    async function handlePayment(data) {
        if (!selectedReservation) {
            return false;
        }

        clearFeedback();
        setIsBusy(true);

        try {
            await registerClientReservationPaymentRequest(
                token,
                selectedReservation.id,
                data
            );
            await refreshAfterMutation(
                "Pago informado. Queda pendiente de confirmación.",
                selectedReservation.id
            );

            return true;
        } catch (requestError) {
            setError(getErrorMessage(requestError));
            return false;
        } finally {
            setIsBusy(false);
        }
    }

    async function handleCancel(motivo) {
        if (!selectedReservation) {
            return;
        }

        clearFeedback();
        setIsBusy(true);

        try {
            await cancelClientReservationRequest(
                token,
                selectedReservation.id,
                motivo
            );
            const reservationId =
                selectedReservation.id;
            await refreshAfterMutation(
                "La reserva fue cancelada y el horario quedó liberado.",
                reservationId
            );
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setIsBusy(false);
        }
    }

    async function handleReschedule(data) {
        if (!rescheduling) {
            return {
                success: false,
                error:
                    "No se encontró la reserva que deseas reprogramar."
            };
        }

        clearFeedback();
        setIsBusy(true);

        try {
            await rescheduleClientReservationRequest(
                token,
                rescheduling.id,
                data
            );
            setRescheduling(null);
            await refreshAfterMutation(
                "La reserva fue reprogramada correctamente."
            );

            return {
                success: true
            };
        } catch (requestError) {
            const requestErrorMessage =
                getErrorMessage(
                    requestError
                );

            setError(
                requestErrorMessage
            );

            return {
                success: false,
                error:
                    requestErrorMessage
            };
        } finally {
            setIsBusy(false);
        }
    }

    return (
        <div className="client-reservations-shell">
            <SessionHeader title="Mis reservas" />
            <ClientNav />

            <main className="client-reservations-page">
                <section className="client-reservations-hero">
                    <div>
                        <span className="client-eyebrow">
                            Experiencias en El Vallecito
                        </span>
                        <h1>
                            Hola, {usuario?.nombres ?? "cliente"}. Planifiquemos tu visita.
                        </h1>
                        <p>
                            Reserva una zona, solicita productos y sigue cada confirmación desde un solo lugar.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="client-button hero-action"
                        onClick={() => {
                            clearFeedback();
                            setRescheduling(null);
                            setIsFormOpen(true);
                        }}
                    >
                        <FaPlus /> Nueva reserva
                    </button>
                </section>

                {(error || success) && (
                    <div
                        className={`client-feedback ${error ? "error" : "success"}`}
                        role={error ? "alert" : "status"}
                    >
                        {error || success}
                    </div>
                )}

                <section
                    className="client-reservation-metrics"
                    aria-label="Resumen de reservas"
                >
                    <article>
                        <FaCalendarAlt />
                        <span>Historial</span>
                        <strong>{metrics.total}</strong>
                    </article>
                    <article>
                        <FaClock />
                        <span>En proceso</span>
                        <strong>{metrics.active}</strong>
                    </article>
                    <article>
                        <FaCheckCircle />
                        <span>Confirmadas visibles</span>
                        <strong>{metrics.confirmed}</strong>
                    </article>
                </section>

                {(isFormOpen || rescheduling) && (
                    <ReservationForm
                        key={rescheduling?.id ?? "new"}
                        options={options}
                        initialValues={rescheduling}
                        mode={rescheduling ? "reschedule" : "create"}
                        isSubmitting={isBusy}
                        isLoadingOptions={
                            isLoadingBranchOptions
                        }
                        onBranchChange={(branchId) => {
                            void handleBranchSelection(
                                branchId
                            );
                        }}
                        onCancel={() => {
                            setIsFormOpen(false);
                            setRescheduling(null);
                        }}
                        onSubmit={
                            rescheduling
                                ? handleReschedule
                                : handleCreate
                        }
                    />
                )}

                <section className="client-reservations-section">
                    <header>
                        <div>
                            <span className="client-eyebrow">
                                Seguimiento
                            </span>
                            <h2>Tu historial de reservas</h2>
                        </div>

                        <div className="client-list-controls">
                            <label>
                                <span className="sr-only">
                                    Filtrar por estado
                                </span>
                                <select
                                    value={statusFilter}
                                    onChange={(event) => {
                                        setStatusFilter(
                                            event.target.value
                                        );
                                    }}
                                >
                                    {STATUS_OPTIONS.map(
                                        ([value, label]) => (
                                            <option
                                                key={value}
                                                value={value}
                                            >
                                                {label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>
                            <button
                                type="button"
                                className="client-icon-button"
                                onClick={() => {
                                    setIsLoading(true);
                                    loadReservations({
                                        page: pagination.page
                                    })
                                        .catch((requestError) =>
                                            setError(
                                                getErrorMessage(requestError)
                                            )
                                        )
                                        .finally(() =>
                                            setIsLoading(false)
                                        );
                                }}
                                aria-label="Actualizar reservas"
                                disabled={isLoading}
                            >
                                <FaSyncAlt />
                            </button>
                        </div>
                    </header>

                    {isLoading ? (
                        <div className="client-empty-state" aria-busy="true">
                            <FaSyncAlt className="spin" />
                            <h3>Cargando tus reservas</h3>
                            <p>Estamos sincronizando el historial.</p>
                        </div>
                    ) : reservations.length === 0 ? (
                        <div className="client-empty-state">
                            <FaCalendarAlt />
                            <h3>No hay reservas en este filtro</h3>
                            <p>
                                Crea una nueva solicitud o selecciona otro estado.
                            </p>
                        </div>
                    ) : (
                        <div className="client-reservation-grid">
                            {reservations.map(
                                (reservation) => (
                                    <ReservationCard
                                        key={reservation.id}
                                        reservation={reservation}
                                        onOpen={handleOpenDetail}
                                    />
                                )
                            )}
                        </div>
                    )}

                    {pagination.totalPages > 1 && (
                        <nav
                            className="client-pagination"
                            aria-label="Paginación de reservas"
                        >
                            <button
                                type="button"
                                className="client-button secondary"
                                disabled={pagination.page <= 1 || isLoading}
                                onClick={() =>
                                    void loadReservations({
                                        page: pagination.page - 1
                                    })
                                }
                            >
                                Anterior
                            </button>
                            <span>
                                Página {pagination.page} de {pagination.totalPages}
                            </span>
                            <button
                                type="button"
                                className="client-button secondary"
                                disabled={pagination.page >= pagination.totalPages || isLoading}
                                onClick={() =>
                                    void loadReservations({
                                        page: pagination.page + 1
                                    })
                                }
                            >
                                Siguiente
                            </button>
                        </nav>
                    )}
                </section>
            </main>

            {selectedReservation && (
                <ReservationDetailDialog
                    error={error}
                    reservation={selectedReservation}
                    isBusy={isBusy}
                    onClose={() =>
                        setSelectedReservation(null)
                    }
                    onPay={handlePayment}
                    onCancelReservation={handleCancel}
                    onReschedule={() => {
                        const reservation =
                            selectedReservation;
                        setSelectedReservation(null);
                        setRescheduling(reservation);
                        setIsFormOpen(false);
                        void loadBranchOptions(
                            reservation.sucursal.id
                        );
                    }}
                    success={success}
                />
            )}
        </div>
    );
}

export default Reservations;
