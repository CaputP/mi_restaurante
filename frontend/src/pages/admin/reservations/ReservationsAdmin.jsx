import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useLocation
} from "react-router-dom";

import {
    FaBan,
    FaBoxOpen,
    FaBuilding,
    FaCalendarAlt,
    FaCheck,
    FaChevronLeft,
    FaChevronRight,
    FaClipboardCheck,
    FaEye,
    FaList,
    FaMoneyBillWave,
    FaPlus,
    FaSave,
    FaSearch,
    FaTimes,
    FaUsers
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";
import {
    useRealtimeVersion
} from "../../../context/RealtimeContext";

import AdminMetricCard from "../../../components/adminMetricCard/AdminMetricCard";
import ReservationCalendar from "./ReservationCalendar";

import {
    ApiError
} from "../../../services/api";

import {
    approveReservationRequest,
    cancelReservationRequest,
    checkReservationAvailabilityRequest,
    confirmReservationPaymentRequest,
    createReservationRequest,
    getReservationByIdRequest,
    getReservationOptionsRequest,
    listReservationsRequest,
    registerReservationPaymentRequest,
    rejectReservationRequest,
    reviewReservationRequest
} from "../../../services/reservation.service";
import {
    getRemainingRequiredAdvance,
    hasOutstandingRequiredAdvance,
    RESERVATION_PAYMENT_EPSILON
} from "../../../utils/reservationPayments";

import "./ReservationsAdmin.css";

const EMPTY_OPTIONS = {
    sucursales: [],
    sucursalSeleccionadaId: null,
    clientes: [],
    zonas: [],
    productos: [],
    horarios: [],
    tiposReserva: [],
    duraciones: []
};

const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

const RESERVATION_STATES = [
    "SOLICITADA",
    "EN_REVISION",
    "ESPERANDO_ADELANTO",
    "CONFIRMADA",
    "RECHAZADA",
    "CANCELADA",
    "ATENDIDA",
    "NO_ASISTIO"
];

const RESERVATION_TYPES = [
    "NORMAL",
    "EVENTO",
    "SOLO_ZONA"
];

const PAYMENT_METHODS = [
    {
        codigo: "EFECTIVO",
        nombre: "Efectivo"
    },
    {
        codigo: "YAPE",
        nombre: "Yape"
    },
    {
        codigo: "PLIN",
        nombre: "Plin"
    },
    {
        codigo: "TARJETA",
        nombre: "Tarjeta"
    },
    {
        codigo: "TRANSFERENCIA",
        nombre: "Transferencia"
    }
];

function createEmptyForm() {
    return {
        clienteId: "",
        sucursalId: "",
        zonaId: "",
        tipoReserva: "NORMAL",
        fechaReserva: "",
        horaReserva: "",
        duracionMinutos: "120",
        cantidadPersonas: "1",
        nombreEvento: "",
        observaciones: "",
        totalEstimado: "",
        adelantoRequerido: "0"
    };
}

function createEmptyPaymentForm() {
    return {
        metodoPago: "EFECTIVO",
        monto: "",
        numeroOperacion: "",
        observaciones: ""
    };
}

function getApiErrorMessage(error) {
    if (!(error instanceof ApiError)) {
        return null;
    }

    const validationMessage =
        error.errors?.[0]?.mensaje;

    if (validationMessage) {
        return `${error.message} ${validationMessage}`;
    }

    return error.message;
}

function isAbortError(error) {
    return (
        error instanceof DOMException &&
        error.name === "AbortError"
    );
}

function formatMoney(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN"
        }
    ).format(
        Number(value ?? 0)
    );
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    const date =
        new Date(
            `${value}T00:00:00`
        );

    return date.toLocaleDateString(
        "es-PE",
        {
            year: "numeric",
            month: "short",
            day: "2-digit"
        }
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
    return String(value)
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(
            /(^|\s)\S/g,
            (letter) =>
                letter.toUpperCase()
        );
}

function ReservationsAdmin() {

    const location =
        useLocation();

    const {
        token
    } = useAuth();

    const realtimeVersion =
        useRealtimeVersion([
            "RESERVATIONS"
        ]);

    const [
        options,
        setOptions
    ] = useState(EMPTY_OPTIONS);

    const [
        reservations,
        setReservations
    ] = useState([]);

    const [
        pagination,
        setPagination
    ] = useState(
        EMPTY_PAGINATION
    );

    const [
        page,
        setPage
    ] = useState(1);

    const [
        viewMode,
        setViewMode
    ] = useState("LIST");

    const [
        search,
        setSearch
    ] = useState("");

    const [
        appliedSearch,
        setAppliedSearch
    ] = useState("");

    const [
        filters,
        setFilters
    ] = useState({
        sucursalId: "",
        estado: "TODOS",
        tipoReserva: "TODOS",
        fechaDesde: "",
        fechaHasta: ""
    });

    const [
        formVisible,
        setFormVisible
    ] = useState(false);

    const [
        form,
        setForm
    ] = useState(
        createEmptyForm
    );

    const [
        selectedProducts,
        setSelectedProducts
    ] = useState({});

    const [
        availability,
        setAvailability
    ] = useState(null);

    const [
        selectedReservation,
        setSelectedReservation
    ] = useState(null);

    const [
        approvalForm,
        setApprovalForm
    ] = useState({
        detalles: [],
        totalEstimado: "0",
        adelantoRequerido: "0",
        observacion: ""
    });

    const [
        paymentForm,
        setPaymentForm
    ] = useState(
        createEmptyPaymentForm
    );

    const [
        isLoadingOptions,
        setIsLoadingOptions
    ] = useState(true);

    const [
        isLoadingList,
        setIsLoadingList
    ] = useState(true);

    const [
        isLoadingDetail,
        setIsLoadingDetail
    ] = useState(false);

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

    const [
        reloadKey,
        setReloadKey
    ] = useState(0);

    const reservationMetrics =
        useMemo(
            () =>
                reservations.reduce(
                    (metrics, reservation) => {
                        if (
                            [
                                "SOLICITADA",
                                "EN_REVISION"
                            ].includes(
                                reservation.estado
                            )
                        ) {
                            metrics.toReview += 1;
                        }

                        if (
                            reservation.estado ===
                            "ESPERANDO_ADELANTO"
                        ) {
                            metrics.waitingPayment += 1;
                        }

                        if (
                            reservation.estado ===
                            "CONFIRMADA"
                        ) {
                            metrics.confirmed += 1;
                        }

                        return metrics;
                    },
                    {
                        toReview: 0,
                        waitingPayment: 0,
                        confirmed: 0
                    }
                ),
            [reservations]
        );

    const productTotal =
        useMemo(
            () =>
                options.productos.reduce(
                    (
                        total,
                        product
                    ) => {
                        const selection =
                            selectedProducts[
                            product
                                .productoSucursalId
                            ];

                        if (
                            !selection ||
                            !selection.selected
                        ) {
                            return total;
                        }

                        const quantity =
                            Number(
                                selection
                                    .cantidadSolicitada
                            );

                        if (
                            !Number.isFinite(
                                quantity
                            )
                        ) {
                            return total;
                        }

                        return (
                            total +
                            Number(
                                product
                                    .precioVenta
                            ) *
                            quantity
                        );
                    },
                    0
                ),
            [
                options.productos,
                selectedProducts
            ]
        );

    useEffect(() => {
        const notificationEntityId =
            location.state
                ?.notificationEntityId;

        const notificationType =
            location.state
                ?.notificationType;

        if (
            !notificationEntityId ||
            notificationType !==
            "RESERVA_PENDIENTE"
        ) {
            return;
        }

        const controller =
            new AbortController();

        async function openNotificationReservation() {
            setIsLoadingDetail(
                true
            );

            setError("");

            try {
                const result =
                    await getReservationByIdRequest(
                        token,
                        notificationEntityId,
                        {
                            signal:
                                controller.signal
                        }
                    );

                setSelectedReservation(
                    result
                );

                /*
                 * Dejamos limpio el state para que
                 * no vuelva a abrir la misma reserva
                 * en renders o navegaciones posteriores.
                 */
                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname
                );
            } catch (
            requestError
            ) {
                if (
                    isAbortError(
                        requestError
                    )
                ) {
                    return;
                }

                setError(
                    getApiErrorMessage(
                        requestError
                    ) ??
                    "No se pudo abrir la reserva seleccionada."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingDetail(
                        false
                    );
                }
            }
        }

        void openNotificationReservation();

        return () =>
            controller.abort();
    }, [
        token,
        location.state
    ]);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadInitialOptions() {
            setIsLoadingOptions(true);
            setError("");

            try {
                const initialOptions =
                    await getReservationOptionsRequest(
                        token,
                        {
                            signal:
                                controller.signal
                        }
                    );

                const selectedBranchId =
                    initialOptions
                        .sucursalSeleccionadaId ??
                    initialOptions
                        .sucursales[0]?.id ??
                    "";

                let completeOptions =
                    initialOptions;

                if (
                    selectedBranchId &&
                    initialOptions
                        .sucursalSeleccionadaId !==
                    selectedBranchId
                ) {
                    completeOptions =
                        await getReservationOptionsRequest(
                            token,
                            {
                                sucursalId:
                                    selectedBranchId,

                                signal:
                                    controller.signal
                            }
                        );
                }

                setOptions(
                    completeOptions
                );

                setForm(
                    (previous) => ({
                        ...previous,

                        sucursalId:
                            selectedBranchId,

                        zonaId:
                            completeOptions
                                .zonas[0]?.id ??
                            ""
                    })
                );

                setFilters(
                    (previous) => ({
                        ...previous,

                        sucursalId:
                            selectedBranchId
                    })
                );
            } catch (requestError) {
                if (
                    isAbortError(
                        requestError
                    )
                ) {
                    return;
                }

                setError(
                    getApiErrorMessage(
                        requestError
                    ) ??
                    "No se pudieron cargar las opciones de reservas."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingOptions(
                        false
                    );
                }
            }
        }

        void loadInitialOptions();

        return () =>
            controller.abort();
    }, [token]);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadReservations() {
            setIsLoadingList(true);
            setError("");

            try {
                const result =
                    await listReservationsRequest(
                        token,
                        {
                            search:
                                appliedSearch,

                            ...filters,

                            page,
                            limit: 20,

                            signal:
                                controller.signal
                        }
                    );

                setReservations(
                    result.reservas
                );

                setPagination(
                    result.pagination
                );
            } catch (requestError) {
                if (
                    isAbortError(
                        requestError
                    )
                ) {
                    return;
                }

                setError(
                    getApiErrorMessage(
                        requestError
                    ) ??
                    "No se pudieron cargar las reservas."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingList(
                        false
                    );
                }
            }
        }

        void loadReservations();

        return () =>
            controller.abort();
    }, [
        token,
        appliedSearch,
        filters,
        page,
        reloadKey,
        realtimeVersion
    ]);

    useEffect(() => {
        if (
            realtimeVersion === 0 ||
            !selectedReservation?.id
        ) {
            return undefined;
        }

        const controller =
            new AbortController();

        async function synchronizeSelectedReservation() {
            try {
                const result =
                    await getReservationByIdRequest(
                        token,
                        selectedReservation.id,
                        controller.signal
                    );

                setSelectedReservation(result);
            } catch (requestError) {
                if (
                    !isAbortError(
                        requestError
                    )
                ) {
                    console.error(
                        "No se pudo sincronizar la reserva seleccionada:",
                        requestError
                    );
                }
            }
        }

        void synchronizeSelectedReservation();

        return () =>
            controller.abort();
    }, [
        realtimeVersion,
        selectedReservation?.id,
        token
    ]);

    function clearFeedback() {
        setMessage("");
        setError("");
    }

    function markAvailabilityOutdated() {
        setAvailability(null);
    }

    function updateFormField(
        field,
        value,
        affectsAvailability = false
    ) {
        setForm(
            (previous) => ({
                ...previous,
                [field]: value
            })
        );

        if (affectsAvailability) {
            markAvailabilityOutdated();
        }
    }

    async function handleBranchChange(
        branchId
    ) {
        clearFeedback();
        setIsLoadingOptions(true);
        setAvailability(null);
        setSelectedProducts({});

        setForm(
            (previous) => ({
                ...previous,
                sucursalId: branchId,
                zonaId: ""
            })
        );

        try {
            const result =
                await getReservationOptionsRequest(
                    token,
                    {
                        sucursalId:
                            branchId
                    }
                );

            setOptions(result);

            setForm(
                (previous) => ({
                    ...previous,

                    sucursalId:
                        branchId,

                    zonaId:
                        result.zonas[0]
                            ?.id ?? ""
                })
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                "No se pudieron cargar los datos de la sucursal."
            );
        } finally {
            setIsLoadingOptions(false);
        }
    }

    function toggleProduct(
        productId
    ) {
        setSelectedProducts(
            (previous) => {
                const current =
                    previous[
                    productId
                    ];

                return {
                    ...previous,

                    [productId]: {
                        selected:
                            !current
                                ?.selected,

                        cantidadSolicitada:
                            current
                                ?.cantidadSolicitada ??
                            "1",

                        observaciones:
                            current
                                ?.observaciones ??
                            ""
                    }
                };
            }
        );
    }

    function updateProductSelection(
        productId,
        field,
        value
    ) {
        setSelectedProducts(
            (previous) => ({
                ...previous,

                [productId]: {
                    selected:
                        previous[
                            productId
                        ]?.selected ??
                        true,

                    cantidadSolicitada:
                        previous[
                            productId
                        ]
                            ?.cantidadSolicitada ??
                        "1",

                    observaciones:
                        previous[
                            productId
                        ]?.observaciones ??
                        "",

                    [field]: value
                }
            })
        );
    }

    function validateAvailabilityFields() {
        if (!form.sucursalId) {
            return "Selecciona una sucursal.";
        }

        if (!form.zonaId) {
            return "Selecciona una zona.";
        }

        if (!form.fechaReserva) {
            return "Selecciona la fecha.";
        }

        if (!form.horaReserva) {
            return "Selecciona la hora.";
        }

        if (
            Number(
                form.duracionMinutos
            ) < 30
        ) {
            return "La duración debe ser de al menos 30 minutos.";
        }

        if (
            Number(
                form.cantidadPersonas
            ) < 1
        ) {
            return "Ingresa la cantidad de personas.";
        }

        return null;
    }

    async function checkAvailability() {
        clearFeedback();

        const validationError =
            validateAvailabilityFields();

        if (validationError) {
            setError(validationError);
            return null;
        }

        try {
            const result =
                await checkReservationAvailabilityRequest(
                    token,
                    {
                        sucursalId:
                            form.sucursalId,

                        zonaId:
                            form.zonaId,

                        fechaReserva:
                            form.fechaReserva,

                        horaReserva:
                            form.horaReserva,

                        duracionMinutos:
                            Number(
                                form
                                    .duracionMinutos
                            ),

                        cantidadPersonas:
                            Number(
                                form
                                    .cantidadPersonas
                            )
                    }
                );

            setAvailability(
                result
            );

            return result;
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                "No se pudo comprobar la disponibilidad."
            );

            return null;
        }
    }

    function buildReservationDetails() {
        return options.productos
            .filter(
                (product) =>
                    selectedProducts[
                        product
                            .productoSucursalId
                    ]?.selected
            )
            .map(
                (product) => {
                    const selection =
                        selectedProducts[
                        product
                            .productoSucursalId
                        ];

                    return {
                        productoSucursalId:
                            product
                                .productoSucursalId,

                        cantidadSolicitada:
                            Number(
                                selection
                                    .cantidadSolicitada
                            ),

                        observaciones:
                            selection
                                .observaciones
                                .trim() ||
                            null
                    };
                }
            );
    }

    function validateReservationForm() {
        const availabilityError =
            validateAvailabilityFields();

        if (availabilityError) {
            return availabilityError;
        }

        if (!form.clienteId) {
            return "Selecciona un cliente.";
        }

        if (
            form.tipoReserva ===
            "EVENTO" &&
            form.nombreEvento
                .trim().length < 2
        ) {
            return "Ingresa el nombre del evento.";
        }

        const details =
            buildReservationDetails();

        const invalidDetail =
            details.some(
                (detail) =>
                    !Number.isFinite(
                        detail
                            .cantidadSolicitada
                    ) ||
                    detail
                        .cantidadSolicitada <=
                    0
            );

        if (invalidDetail) {
            return "Las cantidades de productos deben ser mayores que cero.";
        }

        const estimatedTotal =
            form.totalEstimado ===
                ""
                ? productTotal
                : Number(
                    form.totalEstimado
                );

        const advance =
            Number(
                form
                    .adelantoRequerido
            );

        if (
            !Number.isFinite(
                estimatedTotal
            ) ||
            estimatedTotal < 0
        ) {
            return "El total estimado no es válido.";
        }

        if (
            !Number.isFinite(
                advance
            ) ||
            advance < 0
        ) {
            return "El adelanto requerido no es válido.";
        }

        if (
            advance >
            estimatedTotal
        ) {
            return "El adelanto no puede superar el total estimado.";
        }

        return null;
    }

    async function handleCreateReservation(
        event
    ) {
        event.preventDefault();

        clearFeedback();

        const validationError =
            validateReservationForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSaving(true);

        try {
            const currentAvailability =
                await checkAvailability();

            if (
                !currentAvailability ||
                !currentAvailability
                    .disponible
            ) {
                setError(
                    currentAvailability
                        ?.motivos[0] ??
                    "El horario no se encuentra disponible."
                );

                return;
            }

            const response =
                await createReservationRequest(
                    token,
                    {
                        clienteId:
                            form.clienteId,

                        sucursalId:
                            form.sucursalId,

                        zonaId:
                            form.zonaId,

                        tipoReserva:
                            form.tipoReserva,

                        fechaReserva:
                            form.fechaReserva,

                        horaReserva:
                            form.horaReserva,

                        duracionMinutos:
                            Number(
                                form
                                    .duracionMinutos
                            ),

                        cantidadPersonas:
                            Number(
                                form
                                    .cantidadPersonas
                            ),

                        nombreEvento:
                            form.tipoReserva ===
                                "EVENTO"
                                ? form
                                    .nombreEvento
                                    .trim()
                                : null,

                        observaciones:
                            form.observaciones
                                .trim() ||
                            null,

                        totalEstimado:
                            form.totalEstimado ===
                                ""
                                ? Number(
                                    productTotal.toFixed(
                                        2
                                    )
                                )
                                : Number(
                                    form
                                        .totalEstimado
                                ),

                        adelantoRequerido:
                            Number(
                                form
                                    .adelantoRequerido
                            ),

                        detalles:
                            buildReservationDetails()
                    }
                );

            const reservation =
                response.data.reserva;

            setMessage(
                response.message
            );

            setSelectedReservation(
                reservation
            );

            initializeApprovalForm(
                reservation
            );

            setReloadKey(
                (value) =>
                    value + 1
            );

            setFormVisible(false);
            setAvailability(null);
            setSelectedProducts({});

            setForm({
                ...createEmptyForm(),

                sucursalId:
                    form.sucursalId,

                zonaId:
                    options.zonas[0]
                        ?.id ?? ""
            });

            setTimeout(
                () => {
                    document
                        .getElementById(
                            "reservation-detail"
                        )
                        ?.scrollIntoView({
                            behavior:
                                "smooth"
                        });
                },
                100
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                "No se pudo registrar la reserva."
            );
        } finally {
            setIsSaving(false);
        }
    }

    function initializeApprovalForm(
        reservation
    ) {
        setApprovalForm({
            detalles:
                reservation.detalles.map(
                    (detail) => ({
                        detalleId:
                            detail.id,

                        cantidadAprobada:
                            String(
                                Number(
                                    detail
                                        .cantidadAprobada
                                ) > 0
                                    ? detail
                                        .cantidadAprobada
                                    : detail
                                        .cantidadSolicitada
                            )
                    })
                ),

            totalEstimado:
                String(
                    reservation
                        .totalEstimado
                ),

            adelantoRequerido:
                String(
                    reservation
                        .adelantoRequerido
                ),

            observacion: ""
        });
    }

    async function openReservationDetail(
        reservationId
    ) {
        clearFeedback();
        setIsLoadingDetail(true);

        try {
            const reservation =
                await getReservationByIdRequest(
                    token,
                    reservationId
                );

            setSelectedReservation(
                reservation
            );

            initializeApprovalForm(
                reservation
            );

            setPaymentForm(
                createEmptyPaymentForm()
            );

            setTimeout(
                () => {
                    document
                        .getElementById(
                            "reservation-detail"
                        )
                        ?.scrollIntoView({
                            behavior:
                                "smooth"
                        });
                },
                100
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                "No se pudo cargar el detalle de la reserva."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    function applyMutationResponse(
        response
    ) {
        const reservation =
            response.data.reserva;

        setMessage(
            response.message
        );

        setSelectedReservation(
            reservation
        );

        initializeApprovalForm(
            reservation
        );

        setReloadKey(
            (value) =>
                value + 1
        );
    }

    async function handleReview() {
        if (
            !selectedReservation
        ) {
            return;
        }

        const observation =
            window.prompt(
                "Observación de la revisión:",
                "La reserva será revisada."
            );

        if (
            observation === null
        ) {
            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await reviewReservationRequest(
                    token,
                    selectedReservation.id,
                    {
                        observacion:
                            observation.trim() ||
                            null
                    }
                );

            applyMutationResponse(
                response
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                "No se pudo iniciar la revisión."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleReject() {
        if (
            !selectedReservation
        ) {
            return;
        }

        const reason =
            window.prompt(
                "Indica el motivo del rechazo:"
            );

        if (reason === null) {
            return;
        }

        if (
            reason.trim().length <
            3
        ) {
            setError(
                "El motivo debe tener al menos 3 caracteres."
            );

            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await rejectReservationRequest(
                    token,
                    selectedReservation.id,
                    {
                        motivo:
                            reason.trim()
                    }
                );

            applyMutationResponse(
                response
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                "No se pudo rechazar la reserva."
            );
        } finally {
            setIsSaving(false);
        }
    }

    function updateApprovedQuantity(
        detailId,
        value
    ) {
        setApprovalForm(
            (previous) => ({
                ...previous,

                detalles:
                    previous.detalles.map(
                        (detail) =>
                            detail
                                .detalleId ===
                                detailId
                                ? {
                                    ...detail,

                                    cantidadAprobada:
                                        value
                                }
                                : detail
                    )
            })
        );
    }

    async function handleApprove(
        event
    ) {
        event.preventDefault();

        if (
            !selectedReservation
        ) {
            return;
        }

        const total =
            Number(
                approvalForm
                    .totalEstimado
            );

        const advance =
            Number(
                approvalForm
                    .adelantoRequerido
            );

        if (
            !Number.isFinite(total) ||
            total < 0
        ) {
            setError(
                "El total estimado no es válido."
            );

            return;
        }

        if (
            !Number.isFinite(
                advance
            ) ||
            advance < 0 ||
            advance > total
        ) {
            setError(
                "El adelanto requerido no es válido."
            );

            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await approveReservationRequest(
                    token,
                    selectedReservation.id,
                    {
                        detalles:
                            approvalForm.detalles.map(
                                (detail) => ({
                                    detalleId:
                                        detail
                                            .detalleId,

                                    cantidadAprobada:
                                        Number(
                                            detail
                                                .cantidadAprobada
                                        )
                                })
                            ),

                        totalEstimado:
                            total,

                        adelantoRequerido:
                            advance,

                        observacion:
                            approvalForm
                                .observacion
                                .trim() ||
                            null
                    }
                );

            applyMutationResponse(
                response
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                "No se pudo aprobar la reserva."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleRegisterPayment(
        event
    ) {
        event.preventDefault();

        if (
            !selectedReservation
        ) {
            return;
        }

        const amount =
            Number(
                paymentForm.monto
            );

        if (
            !Number.isFinite(
                amount
            ) ||
            amount <= 0
        ) {
            setError(
                "Ingresa un monto válido."
            );

            return;
        }

        if (
            amount >
            selectedAdvanceRemaining +
                RESERVATION_PAYMENT_EPSILON
        ) {
            setError(
                `El pago no puede superar el adelanto pendiente de ${formatMoney(
                    selectedAdvanceRemaining
                )}.`
            );

            return;
        }

        if (
            paymentForm
                .metodoPago !==
            "EFECTIVO" &&
            paymentForm
                .numeroOperacion
                .trim().length ===
            0
        ) {
            setError(
                "Ingresa el número de operación."
            );

            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await registerReservationPaymentRequest(
                    token,
                    selectedReservation.id,
                    {
                        metodoPago:
                            paymentForm
                                .metodoPago,

                        monto: amount,

                        numeroOperacion:
                            paymentForm
                                .numeroOperacion
                                .trim() ||
                            null,

                        observaciones:
                            paymentForm
                                .observaciones
                                .trim() ||
                            null
                    }
                );

            applyMutationResponse(
                response
            );

            setPaymentForm(
                createEmptyPaymentForm()
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                "No se pudo registrar el pago."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleConfirmPayment(
        paymentId
    ) {
        if (
            !selectedReservation
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                "¿Confirmar que este pago fue recibido?"
            );

        if (!confirmed) {
            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await confirmReservationPaymentRequest(
                    token,
                    selectedReservation.id,
                    paymentId,
                    {}
                );

            applyMutationResponse(
                response
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                "No se pudo confirmar el pago."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleCancel() {
        if (
            !selectedReservation
        ) {
            return;
        }

        const reason =
            window.prompt(
                "Motivo de cancelación:"
            );

        if (reason === null) {
            return;
        }

        if (
            reason.trim().length <
            3
        ) {
            setError(
                "El motivo debe tener al menos 3 caracteres."
            );

            return;
        }

        const penaltyText =
            window.prompt(
                "Penalidad de cancelación:",
                "0"
            );

        if (
            penaltyText === null
        ) {
            return;
        }

        const penalty =
            Number(
                penaltyText
            );

        if (
            !Number.isFinite(
                penalty
            ) ||
            penalty < 0
        ) {
            setError(
                "La penalidad no es válida."
            );

            return;
        }

        const confirmed =
            window.confirm(
                "¿Confirmar la cancelación de la reserva?"
            );

        if (!confirmed) {
            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await cancelReservationRequest(
                    token,
                    selectedReservation.id,
                    {
                        motivo:
                            reason.trim(),

                        penalidadCancelacion:
                            penalty
                    }
                );

            applyMutationResponse(
                response
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                "No se pudo cancelar la reserva."
            );
        } finally {
            setIsSaving(false);
        }
    }

    function handleSearch(
        event
    ) {
        event.preventDefault();

        setPage(1);

        setAppliedSearch(
            search.trim()
        );
    }

    const canReview =
        selectedReservation
            ?.estado ===
        "SOLICITADA";

    const canApprove =
        [
            "SOLICITADA",
            "EN_REVISION"
        ].includes(
            selectedReservation
                ?.estado
        );

    const canReject =
        canApprove;

    const selectedAdvanceRemaining =
        selectedReservation
            ? getRemainingRequiredAdvance(
                selectedReservation
            )
            : 0;

    const canReceivePayment =
        [
            "ESPERANDO_ADELANTO",
            "CONFIRMADA"
        ].includes(
            selectedReservation
                ?.estado
        ) &&
        hasOutstandingRequiredAdvance(
            selectedReservation
        );

    const canCancel =
        [
            "SOLICITADA",
            "EN_REVISION",
            "ESPERANDO_ADELANTO",
            "CONFIRMADA"
        ].includes(
            selectedReservation
                ?.estado
        );

    return (
        <section className="reservations-admin admin-page">
            <header className="reservations-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        RESERVAS
                    </span>

                    <h2>
                        Gestión de reservas
                    </h2>

                    <p>
                        Registra eventos,
                        comprueba disponibilidad,
                        administra adelantos y
                        controla productos reservados.
                    </p>
                </div>

                <button
                    type="button"
                    className="reservation-primary-button"
                    disabled={
                        isLoadingOptions
                    }
                    onClick={() => {
                        clearFeedback();
                        setFormVisible(true);
                    }}
                >
                    <FaPlus />
                    Nueva reserva
                </button>
            </header>

            {message && (
                <div
                    className="reservation-feedback admin-feedback success"
                    role="status"
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    className="reservation-feedback admin-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <div
                className="admin-metric-grid"
                aria-label="Resumen de reservas"
            >
                <AdminMetricCard
                    icon={FaCalendarAlt}
                    label="Resultados"
                    value={pagination.total}
                    detail="Con los filtros actuales"
                    isLoading={isLoadingList}
                />

                <AdminMetricCard
                    icon={FaClipboardCheck}
                    label="Por revisar"
                    value={reservationMetrics.toReview}
                    detail="En esta página"
                    tone="info"
                    isLoading={isLoadingList}
                />

                <AdminMetricCard
                    icon={FaMoneyBillWave}
                    label="Esperando adelanto"
                    value={reservationMetrics.waitingPayment}
                    detail="En esta página"
                    tone="attention"
                    isLoading={isLoadingList}
                />

                <AdminMetricCard
                    icon={FaCheck}
                    label="Confirmadas"
                    value={reservationMetrics.confirmed}
                    detail="En esta página"
                    tone="success"
                    isLoading={isLoadingList}
                />
            </div>

            {formVisible && (
                <form
                    className="reservation-form-card"
                    onSubmit={
                        handleCreateReservation
                    }
                >
                    <div className="reservation-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                REGISTRO
                            </span>

                            <h3>
                                Nueva reserva
                            </h3>
                        </div>

                        <button
                            type="button"
                            className="reservation-close-button"
                            aria-label="Cerrar formulario de reserva"
                            onClick={() =>
                                setFormVisible(
                                    false
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="reservation-form-grid">
                        <div className="reservation-field">
                            <label>
                                Sucursal *
                            </label>

                            <select
                                value={
                                    form
                                        .sucursalId
                                }
                                disabled={
                                    isLoadingOptions
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleBranchChange(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="">
                                    Seleccionar
                                </option>

                                {options
                                    .sucursales
                                    .map(
                                        (
                                            branch
                                        ) => (
                                            <option
                                                key={
                                                    branch.id
                                                }
                                                value={
                                                    branch.id
                                                }
                                            >
                                                {
                                                    branch.nombre
                                                }
                                            </option>
                                        )
                                    )}
                            </select>
                        </div>

                        <div className="reservation-field">
                            <label>
                                Cliente *
                            </label>

                            <select
                                value={
                                    form
                                        .clienteId
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "clienteId",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="">
                                    Seleccionar
                                </option>

                                {options.clientes.map(
                                    (client) => (
                                        <option
                                            key={
                                                client.id
                                            }
                                            value={
                                                client.id
                                            }
                                        >
                                            {
                                                client.nombreCompleto
                                            }{" "}
                                            —{" "}
                                            {
                                                client.correo
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="reservation-field">
                            <label>
                                Tipo de reserva *
                            </label>

                            <select
                                value={
                                    form
                                        .tipoReserva
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "tipoReserva",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {options
                                    .tiposReserva
                                    .length >
                                    0
                                    ? options.tiposReserva.map(
                                        (
                                            type
                                        ) => (
                                            <option
                                                key={
                                                    type.codigo
                                                }
                                                value={
                                                    type.codigo
                                                }
                                            >
                                                {
                                                    type.nombre
                                                }
                                            </option>
                                        )
                                    )
                                    : RESERVATION_TYPES.map(
                                        (
                                            type
                                        ) => (
                                            <option
                                                key={
                                                    type
                                                }
                                                value={
                                                    type
                                                }
                                            >
                                                {formatLabel(
                                                    type
                                                )}
                                            </option>
                                        )
                                    )}
                            </select>
                        </div>

                        <div className="reservation-field">
                            <label>
                                Zona *
                            </label>

                            <select
                                value={
                                    form.zonaId
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "zonaId",
                                        event
                                            .target
                                            .value,
                                        true
                                    )
                                }
                            >
                                <option value="">
                                    Seleccionar
                                </option>

                                {options.zonas.map(
                                    (zone) => (
                                        <option
                                            key={
                                                zone.id
                                            }
                                            value={
                                                zone.id
                                            }
                                        >
                                            {
                                                zone.nombre
                                            }

                                            {zone.capacidadReferencial
                                                ? ` — ${zone.capacidadReferencial} personas`
                                                : ""}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="reservation-field">
                            <label>
                                Fecha *
                            </label>

                            <input
                                type="date"
                                value={
                                    form
                                        .fechaReserva
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "fechaReserva",
                                        event
                                            .target
                                            .value,
                                        true
                                    )
                                }
                            />
                        </div>

                        <div className="reservation-field">
                            <label>
                                Hora *
                            </label>

                            <input
                                type="time"
                                value={
                                    form
                                        .horaReserva
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "horaReserva",
                                        event
                                            .target
                                            .value,
                                        true
                                    )
                                }
                            />
                        </div>

                        <div className="reservation-field">
                            <label>
                                Duración *
                            </label>

                            <select
                                value={
                                    form
                                        .duracionMinutos
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "duracionMinutos",
                                        event
                                            .target
                                            .value,
                                        true
                                    )
                                }
                            >
                                {(
                                    options
                                        .duraciones
                                        .length >
                                        0
                                        ? options
                                            .duraciones
                                        : [
                                            60,
                                            90,
                                            120,
                                            180,
                                            240,
                                            300,
                                            360
                                        ]
                                ).map(
                                    (
                                        duration
                                    ) => (
                                        <option
                                            key={
                                                duration
                                            }
                                            value={
                                                duration
                                            }
                                        >
                                            {duration <
                                                60
                                                ? `${duration} minutos`
                                                : `${duration / 60} hora(s)`}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="reservation-field">
                            <label>
                                Cantidad de personas *
                            </label>

                            <input
                                type="number"
                                min="1"
                                max="2000"
                                value={
                                    form
                                        .cantidadPersonas
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "cantidadPersonas",
                                        event
                                            .target
                                            .value,
                                        true
                                    )
                                }
                            />
                        </div>

                        {form.tipoReserva ===
                            "EVENTO" && (
                                <div className="reservation-field reservation-field-full">
                                    <label>
                                        Nombre del evento *
                                    </label>

                                    <input
                                        type="text"
                                        maxLength={
                                            180
                                        }
                                        value={
                                            form
                                                .nombreEvento
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateFormField(
                                                "nombreEvento",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </div>
                            )}

                        <div className="reservation-field reservation-field-full">
                            <label>
                                Observaciones
                            </label>

                            <textarea
                                rows="3"
                                maxLength={
                                    2000
                                }
                                value={
                                    form
                                        .observaciones
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "observaciones",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="availability-row">
                        <button
                            type="button"
                            className="reservation-secondary-button"
                            onClick={
                                checkAvailability
                            }
                        >
                            <FaCalendarAlt />
                            Comprobar disponibilidad
                        </button>

                        {availability && (
                            <div
                                className={`availability-result ${availability.disponible
                                    ? "available"
                                    : "unavailable"
                                    }`}
                            >
                                {availability.disponible
                                    ? "Horario disponible."
                                    : availability
                                        .motivos[0]}
                            </div>
                        )}
                    </div>

                    <div className="reservation-products-section">
                        <div className="reservation-section-heading">
                            <div>
                                <h3>
                                    Productos solicitados
                                </h3>

                                <p>
                                    La reserva también
                                    puede registrarse sin
                                    productos.
                                </p>
                            </div>

                            <strong>
                                {formatMoney(
                                    productTotal
                                )}
                            </strong>
                        </div>

                        {options.productos
                            .length ===
                            0 ? (
                            <div className="reservation-empty-small">
                                <FaBoxOpen />
                                No hay productos
                                disponibles.
                            </div>
                        ) : (
                            <div className="reservation-product-grid">
                                {options.productos.map(
                                    (
                                        product
                                    ) => {
                                        const selection =
                                            selectedProducts[
                                            product
                                                .productoSucursalId
                                            ];

                                        const selected =
                                            Boolean(
                                                selection
                                                    ?.selected
                                            );

                                        return (
                                            <article
                                                key={
                                                    product
                                                        .productoSucursalId
                                                }
                                                className={
                                                    selected
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                <label className="reservation-product-title">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            selected
                                                        }
                                                        onChange={() =>
                                                            toggleProduct(
                                                                product
                                                                    .productoSucursalId
                                                            )
                                                        }
                                                    />

                                                    <span>
                                                        <strong>
                                                            {
                                                                product.nombre
                                                            }
                                                        </strong>

                                                        <small>
                                                            {
                                                                product
                                                                    .categoria
                                                                    .nombre
                                                            }
                                                            {" · "}
                                                            {formatMoney(
                                                                product
                                                                    .precioVenta
                                                            )}
                                                        </small>
                                                    </span>
                                                </label>

                                                {selected && (
                                                    <div className="reservation-product-fields">
                                                        <input
                                                            type="number"
                                                            min="0.001"
                                                            step="0.001"
                                                            value={
                                                                selection
                                                                    .cantidadSolicitada
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateProductSelection(
                                                                    product
                                                                        .productoSucursalId,
                                                                    "cantidadSolicitada",
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />

                                                        <input
                                                            type="text"
                                                            maxLength={
                                                                500
                                                            }
                                                            placeholder="Observación"
                                                            value={
                                                                selection
                                                                    .observaciones
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateProductSelection(
                                                                    product
                                                                        .productoSucursalId,
                                                                    "observaciones",
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </div>

                    <div className="reservation-form-grid reservation-money-grid">
                        <div className="reservation-field">
                            <label>
                                Total estimado
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={String(
                                    productTotal.toFixed(
                                        2
                                    )
                                )}
                                value={
                                    form
                                        .totalEstimado
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "totalEstimado",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />

                            <small>
                                Vacío: se utilizará el
                                subtotal de productos.
                            </small>
                        </div>

                        <div className="reservation-field">
                            <label>
                                Adelanto requerido
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                    form
                                        .adelantoRequerido
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "adelantoRequerido",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="reservation-form-actions">
                        <button
                            type="button"
                            className="reservation-secondary-button"
                            disabled={
                                isSaving
                            }
                            onClick={() =>
                                setFormVisible(
                                    false
                                )
                            }
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="reservation-primary-button"
                            disabled={
                                isSaving
                            }
                        >
                            <FaSave />

                            {isSaving
                                ? "Guardando..."
                                : "Registrar reserva"}
                        </button>
                    </div>
                </form>
            )}

            <form
                className="reservation-filters admin-filter-bar"
                onSubmit={handleSearch}
            >
                <div className="reservation-search">
                    <FaSearch />

                    <input
                        type="search"
                        placeholder="Código, cliente, correo o evento..."
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event
                                    .target
                                    .value
                            )
                        }
                    />
                </div>

                <select
                    value={
                        filters.sucursalId
                    }
                    onChange={(event) => {
                        setFilters(
                            (previous) => ({
                                ...previous,

                                sucursalId:
                                    event
                                        .target
                                        .value
                            })
                        );

                        setPage(1);
                    }}
                >
                    <option value="">
                        Todas las sucursales
                    </option>

                    {options.sucursales.map(
                        (branch) => (
                            <option
                                key={
                                    branch.id
                                }
                                value={
                                    branch.id
                                }
                            >
                                {
                                    branch.nombre
                                }
                            </option>
                        )
                    )}
                </select>

                <select
                    value={
                        filters.estado
                    }
                    onChange={(event) => {
                        setFilters(
                            (previous) => ({
                                ...previous,

                                estado:
                                    event
                                        .target
                                        .value
                            })
                        );

                        setPage(1);
                    }}
                >
                    <option value="TODOS">
                        Todos los estados
                    </option>

                    {RESERVATION_STATES.map(
                        (state) => (
                            <option
                                key={
                                    state
                                }
                                value={
                                    state
                                }
                            >
                                {formatLabel(
                                    state
                                )}
                            </option>
                        )
                    )}
                </select>

                <select
                    value={
                        filters
                            .tipoReserva
                    }
                    onChange={(event) => {
                        setFilters(
                            (previous) => ({
                                ...previous,

                                tipoReserva:
                                    event
                                        .target
                                        .value
                            })
                        );

                        setPage(1);
                    }}
                >
                    <option value="TODOS">
                        Todos los tipos
                    </option>

                    {RESERVATION_TYPES.map(
                        (type) => (
                            <option
                                key={
                                    type
                                }
                                value={
                                    type
                                }
                            >
                                {formatLabel(
                                    type
                                )}
                            </option>
                        )
                    )}
                </select>

                <input
                    type="date"
                    value={
                        filters.fechaDesde
                    }
                    onChange={(event) => {
                        setFilters(
                            (previous) => ({
                                ...previous,

                                fechaDesde:
                                    event
                                        .target
                                        .value
                            })
                        );

                        setPage(1);
                    }}
                />

                <input
                    type="date"
                    value={
                        filters.fechaHasta
                    }
                    onChange={(event) => {
                        setFilters(
                            (previous) => ({
                                ...previous,

                                fechaHasta:
                                    event
                                        .target
                                        .value
                            })
                        );

                        setPage(1);
                    }}
                />

                <button type="submit">
                    Buscar
                </button>
            </form>

            <div
                className="reservation-view-switch"
                role="group"
                aria-label="Vista de reservas"
            >
                <button
                    type="button"
                    className={viewMode === "LIST" ? "active" : ""}
                    onClick={() => setViewMode("LIST")}
                >
                    <FaList /> Lista
                </button>
                <button
                    type="button"
                    className={viewMode === "CALENDAR" ? "active" : ""}
                    onClick={() => setViewMode("CALENDAR")}
                >
                    <FaCalendarAlt /> Calendario
                </button>
            </div>

            {viewMode === "CALENDAR" ? (
                <ReservationCalendar
                    branchId={filters.sucursalId}
                    onOpenReservation={openReservationDetail}
                />
            ) : (
            <article className="reservation-table-card">
                <div className="reservation-section-heading">
                    <div>
                        <h3>
                            Reservas registradas
                        </h3>

                        <p>
                            {pagination.total} resultado(s)
                        </p>
                    </div>
                </div>

                {isLoadingList ? (
                    <div className="reservation-empty-state">
                        <FaCalendarAlt />
                        Cargando reservas...
                    </div>
                ) : reservations.length ===
                    0 ? (
                    <div className="reservation-empty-state">
                        <FaCalendarAlt />

                        <strong>
                            No se encontraron reservas
                        </strong>
                    </div>
                ) : (
                    <div className="reservation-table-wrapper admin-table-shell responsive-cards">
                        <table className="reservation-table admin-data-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Cliente</th>
                                    <th>Fecha</th>
                                    <th>Zona</th>
                                    <th>Tipo</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>
                                {reservations.map(
                                    (
                                        reservation
                                    ) => (
                                        <tr
                                            key={
                                                reservation.id
                                            }
                                        >
                                            <td data-label="Código">
                                                <strong>
                                                    {
                                                        reservation.codigo
                                                    }
                                                </strong>
                                            </td>

                                            <td data-label="Cliente">
                                                <div className="reservation-client-cell">
                                                    <strong>
                                                        {
                                                            reservation
                                                                .cliente
                                                                .nombreCompleto
                                                        }
                                                    </strong>

                                                    <small>
                                                        {
                                                            reservation
                                                                .cantidadPersonas
                                                        }{" "}
                                                        persona(s)
                                                    </small>
                                                </div>
                                            </td>

                                            <td data-label="Fecha">
                                                <div className="reservation-date-cell">
                                                    <span>
                                                        {formatDate(
                                                            reservation
                                                                .fechaReserva
                                                        )}
                                                    </span>

                                                    <small>
                                                        {
                                                            reservation
                                                                .horaReserva
                                                        }
                                                        {" · "}
                                                        {
                                                            reservation
                                                                .duracionMinutos
                                                        }{" "}
                                                        min
                                                    </small>
                                                </div>
                                            </td>

                                            <td data-label="Zona">
                                                {
                                                    reservation
                                                        .zona
                                                        .nombre
                                                }
                                            </td>

                                            <td data-label="Tipo">
                                                {formatLabel(
                                                    reservation
                                                        .tipoReserva
                                                )}
                                            </td>

                                            <td data-label="Total">
                                                {formatMoney(
                                                    reservation
                                                        .totalEstimado
                                                )}
                                            </td>

                                            <td data-label="Estado">
                                                <span
                                                    className={`admin-status-badge reservation-status ${reservation.estado.toLowerCase()}`}
                                                >
                                                    {formatLabel(
                                                        reservation
                                                            .estado
                                                    )}
                                                </span>
                                            </td>

                                            <td data-label="Acciones">
                                                <button
                                                    type="button"
                                                    className="reservation-icon-button"
                                                    aria-label={`Ver reserva ${reservation.codigo}`}
                                                    disabled={
                                                        isLoadingDetail
                                                    }
                                                    onClick={() =>
                                                        openReservationDetail(
                                                            reservation.id
                                                        )
                                                    }
                                                >
                                                    <FaEye />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="reservation-pagination admin-pagination">
                    <span>
                        Página {pagination.page} de{" "}
                        {pagination.totalPages}
                    </span>

                    <div>
                        <button
                            type="button"
                            disabled={
                                page <= 1 ||
                                isLoadingList
                            }
                            onClick={() =>
                                setPage(
                                    (value) =>
                                        Math.max(
                                            1,
                                            value - 1
                                        )
                                )
                            }
                        >
                            <FaChevronLeft />
                            Anterior
                        </button>

                        <button
                            type="button"
                            disabled={
                                page >=
                                pagination.totalPages ||
                                isLoadingList
                            }
                            onClick={() =>
                                setPage(
                                    (value) =>
                                        Math.min(
                                            pagination
                                                .totalPages,
                                            value + 1
                                        )
                                )
                            }
                        >
                            Siguiente
                            <FaChevronRight />
                        </button>
                    </div>
                </div>
            </article>
            )}

            {selectedReservation && (
                <article
                    id="reservation-detail"
                    className="reservation-detail-card"
                >
                    <div className="reservation-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                DETALLE
                            </span>

                            <h3>
                                Reserva{" "}
                                {
                                    selectedReservation.codigo
                                }
                            </h3>

                            <p>
                                Registrada el{" "}
                                {formatDateTime(
                                    selectedReservation
                                        .createdAt
                                )}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="reservation-close-button"
                            aria-label="Cerrar detalle de reserva"
                            onClick={() =>
                                setSelectedReservation(
                                    null
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="reservation-detail-summary">
                        <article>
                            <FaUsers />

                            <div>
                                <span>
                                    Cliente
                                </span>

                                <strong>
                                    {
                                        selectedReservation
                                            .cliente
                                            .nombreCompleto
                                    }
                                </strong>

                                <small>
                                    {
                                        selectedReservation
                                            .cliente
                                            .correo
                                    }
                                </small>
                            </div>
                        </article>

                        <article>
                            <FaCalendarAlt />

                            <div>
                                <span>
                                    Fecha y hora
                                </span>

                                <strong>
                                    {formatDate(
                                        selectedReservation
                                            .fechaReserva
                                    )}
                                </strong>

                                <small>
                                    {
                                        selectedReservation
                                            .horaReserva
                                    }{" "}
                                    ·{" "}
                                    {
                                        selectedReservation
                                            .duracionMinutos
                                    }{" "}
                                    min
                                </small>
                            </div>
                        </article>

                        <article>
                            <FaBuilding />

                            <div>
                                <span>
                                    Lugar
                                </span>

                                <strong>
                                    {
                                        selectedReservation
                                            .zona
                                            .nombre
                                    }
                                </strong>

                                <small>
                                    {
                                        selectedReservation
                                            .sucursal
                                            .nombre
                                    }
                                </small>
                            </div>
                        </article>

                        <article>
                            <FaMoneyBillWave />

                            <div>
                                <span>
                                    Saldo
                                </span>

                                <strong>
                                    {formatMoney(
                                        selectedReservation
                                            .saldoEstimado
                                    )}
                                </strong>

                                <small>
                                    Pagado:{" "}
                                    {formatMoney(
                                        selectedReservation
                                            .adelantoPagado
                                    )}
                                </small>
                            </div>
                        </article>
                    </div>

                    <div className="reservation-detail-actions">
                        {canReview && (
                            <button
                                type="button"
                                disabled={
                                    isSaving
                                }
                                onClick={
                                    handleReview
                                }
                            >
                                <FaClipboardCheck />
                                Pasar a revisión
                            </button>
                        )}

                        {canReject && (
                            <button
                                type="button"
                                className="danger"
                                disabled={
                                    isSaving
                                }
                                onClick={
                                    handleReject
                                }
                            >
                                <FaBan />
                                Rechazar
                            </button>
                        )}

                        {canCancel && (
                            <button
                                type="button"
                                className="danger-outline"
                                disabled={
                                    isSaving
                                }
                                onClick={
                                    handleCancel
                                }
                            >
                                <FaTimes />
                                Cancelar reserva
                            </button>
                        )}
                    </div>

                    <div className="reservation-detail-columns">
                        <section>
                            <h4>
                                Datos de la reserva
                            </h4>

                            <dl className="reservation-data-list">
                                <div>
                                    <dt>
                                        Estado
                                    </dt>

                                    <dd>
                                        <span
                                            className={`admin-status-badge reservation-status ${selectedReservation.estado.toLowerCase()}`}
                                        >
                                            {formatLabel(
                                                selectedReservation
                                                    .estado
                                            )}
                                        </span>
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Tipo
                                    </dt>

                                    <dd>
                                        {formatLabel(
                                            selectedReservation
                                                .tipoReserva
                                        )}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Personas
                                    </dt>

                                    <dd>
                                        {
                                            selectedReservation
                                                .cantidadPersonas
                                        }
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Evento
                                    </dt>

                                    <dd>
                                        {selectedReservation
                                            .nombreEvento ||
                                            "No corresponde"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Total
                                    </dt>

                                    <dd>
                                        {formatMoney(
                                            selectedReservation
                                                .totalEstimado
                                        )}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Adelanto requerido
                                    </dt>

                                    <dd>
                                        {formatMoney(
                                            selectedReservation
                                                .adelantoRequerido
                                        )}
                                    </dd>
                                </div>
                            </dl>

                            {selectedReservation
                                .observaciones && (
                                    <p className="reservation-notes">
                                        {
                                            selectedReservation
                                                .observaciones
                                        }
                                    </p>
                                )}
                        </section>

                        <section>
                            <h4>
                                Productos
                            </h4>

                            {selectedReservation
                                .detalles
                                .length ===
                                0 ? (
                                <div className="reservation-empty-small">
                                    Sin productos
                                    solicitados.
                                </div>
                            ) : (
                                <div className="reservation-detail-products">
                                    {selectedReservation.detalles.map(
                                        (
                                            detail
                                        ) => (
                                            <article
                                                key={
                                                    detail.id
                                                }
                                            >
                                                <div>
                                                    <strong>
                                                        {
                                                            detail
                                                                .nombreProducto
                                                        }
                                                    </strong>

                                                    <small>
                                                        {
                                                            detail.estado
                                                        }
                                                    </small>
                                                </div>

                                                <span>
                                                    Solicitado:{" "}
                                                    {
                                                        detail
                                                            .cantidadSolicitada
                                                    }
                                                    <br />
                                                    Aprobado:{" "}
                                                    {
                                                        detail
                                                            .cantidadAprobada
                                                    }
                                                    <br />
                                                    Comprometido:{" "}
                                                    {
                                                        detail
                                                            .cantidadComprometida
                                                    }
                                                </span>

                                                <strong>
                                                    {formatMoney(
                                                        detail
                                                            .subtotal
                                                    )}
                                                </strong>
                                            </article>
                                        )
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    {canApprove && (
                        <form
                            className="reservation-operation-card"
                            onSubmit={
                                handleApprove
                            }
                        >
                            <div className="reservation-section-heading">
                                <div>
                                    <h3>
                                        Aprobar reserva
                                    </h3>

                                    <p>
                                        Define cantidades,
                                        total y adelanto.
                                    </p>
                                </div>

                                <FaCheck />
                            </div>

                            {selectedReservation
                                .detalles
                                .length >
                                0 && (
                                    <div className="reservation-approval-list">
                                        {selectedReservation.detalles.map(
                                            (
                                                detail
                                            ) => {
                                                const approval =
                                                    approvalForm
                                                        .detalles
                                                        .find(
                                                            (
                                                                item
                                                            ) =>
                                                                item.detalleId ===
                                                                detail.id
                                                        );

                                                return (
                                                    <label
                                                        key={
                                                            detail.id
                                                        }
                                                    >
                                                        <span>
                                                            <strong>
                                                                {
                                                                    detail
                                                                        .nombreProducto
                                                                }
                                                            </strong>

                                                            <small>
                                                                Solicitado:{" "}
                                                                {
                                                                    detail
                                                                        .cantidadSolicitada
                                                                }
                                                            </small>
                                                        </span>

                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={
                                                                detail
                                                                    .cantidadSolicitada
                                                            }
                                                            step="0.001"
                                                            value={
                                                                approval
                                                                    ?.cantidadAprobada ??
                                                                "0"
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateApprovedQuantity(
                                                                    detail.id,
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                );
                                            }
                                        )}
                                    </div>
                                )}

                            <div className="reservation-form-grid">
                                <div className="reservation-field">
                                    <label>
                                        Total estimado
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            approvalForm
                                                .totalEstimado
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setApprovalForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    totalEstimado:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>

                                <div className="reservation-field">
                                    <label>
                                        Adelanto requerido
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            approvalForm
                                                .adelantoRequerido
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setApprovalForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    adelantoRequerido:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>

                                <div className="reservation-field reservation-field-full">
                                    <label>
                                        Observación
                                    </label>

                                    <textarea
                                        rows="2"
                                        value={
                                            approvalForm
                                                .observacion
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setApprovalForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    observacion:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="reservation-form-actions">
                                <button
                                    type="submit"
                                    className="reservation-primary-button"
                                    disabled={
                                        isSaving
                                    }
                                >
                                    <FaCheck />
                                    Aprobar reserva
                                </button>
                            </div>
                        </form>
                    )}

                    {canReceivePayment && (
                        <form
                            className="reservation-operation-card payment"
                            onSubmit={
                                handleRegisterPayment
                            }
                        >
                            <div className="reservation-section-heading">
                                <div>
                                    <h3>
                                        Registrar adelanto
                                    </h3>

                                    <p>
                                        Adelanto pendiente:{" "}
                                        {formatMoney(
                                            selectedAdvanceRemaining
                                        )}
                                    </p>
                                </div>

                                <FaMoneyBillWave />
                            </div>

                            <div className="reservation-form-grid">
                                <div className="reservation-field">
                                    <label>
                                        Método
                                    </label>

                                    <select
                                        value={
                                            paymentForm
                                                .metodoPago
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setPaymentForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    metodoPago:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    >
                                        {PAYMENT_METHODS.map(
                                            (
                                                method
                                            ) => (
                                                <option
                                                    key={
                                                        method.codigo
                                                    }
                                                    value={
                                                        method.codigo
                                                    }
                                                >
                                                    {
                                                        method.nombre
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div className="reservation-field">
                                    <label>
                                        Monto
                                    </label>

                                    <input
                                        type="number"
                                        min="0.01"
                                        max={
                                            selectedAdvanceRemaining
                                        }
                                        step="0.01"
                                        value={
                                            paymentForm
                                                .monto
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setPaymentForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    monto:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>

                                <div className="reservation-field">
                                    <label>
                                        N.º de operación
                                    </label>

                                    <input
                                        type="text"
                                        maxLength={
                                            100
                                        }
                                        disabled={
                                            paymentForm
                                                .metodoPago ===
                                            "EFECTIVO"
                                        }
                                        value={
                                            paymentForm
                                                .numeroOperacion
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setPaymentForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    numeroOperacion:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>

                                <div className="reservation-field">
                                    <label>
                                        Observaciones
                                    </label>

                                    <input
                                        type="text"
                                        maxLength={
                                            1000
                                        }
                                        value={
                                            paymentForm
                                                .observaciones
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setPaymentForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    observaciones:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="reservation-form-actions">
                                <button
                                    type="submit"
                                    className="reservation-primary-button"
                                    disabled={
                                        isSaving
                                    }
                                >
                                    <FaMoneyBillWave />
                                    Registrar pago
                                </button>
                            </div>
                        </form>
                    )}

                    <section className="reservation-history-section">
                        <h4>
                            Pagos registrados
                        </h4>

                        {selectedReservation
                            .pagos.length ===
                            0 ? (
                            <div className="reservation-empty-small">
                                No hay pagos registrados.
                            </div>
                        ) : (
                            <div className="reservation-payment-list">
                                {selectedReservation.pagos.map(
                                    (
                                        payment
                                    ) => (
                                        <article
                                            key={
                                                payment.id
                                            }
                                        >
                                            <div>
                                                <strong>
                                                    {formatMoney(
                                                        payment.monto
                                                    )}
                                                </strong>

                                                <small>
                                                    {formatLabel(
                                                        payment.metodoPago
                                                    )}
                                                    {" · "}
                                                    {formatDateTime(
                                                        payment.fechaPago
                                                    )}
                                                </small>
                                            </div>

                                            <span
                                                className={`admin-status-badge reservation-status ${payment.estado.toLowerCase()}`}
                                            >
                                                {formatLabel(
                                                    payment.estado
                                                )}
                                            </span>

                                            {payment.estado ===
                                                "PENDIENTE" && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            isSaving
                                                        }
                                                        onClick={() =>
                                                            handleConfirmPayment(
                                                                payment.id
                                                            )
                                                        }
                                                    >
                                                        <FaCheck />
                                                        Confirmar
                                                    </button>
                                                )}
                                        </article>
                                    )
                                )}
                            </div>
                        )}
                    </section>

                    <section className="reservation-history-section">
                        <h4>
                            Historial
                        </h4>

                        <div className="reservation-timeline">
                            {selectedReservation.historial.map(
                                (
                                    history
                                ) => (
                                    <article
                                        key={
                                            history.id
                                        }
                                    >
                                        <span />

                                        <div>
                                            <strong>
                                                {formatLabel(
                                                    history
                                                        .estadoNuevo
                                                )}
                                            </strong>

                                            <small>
                                                {history
                                                    .usuario
                                                    .nombreCompleto ??
                                                    "Usuario"}
                                                {" · "}
                                                {formatDateTime(
                                                    history.createdAt
                                                )}
                                            </small>

                                            {history.observacion && (
                                                <p>
                                                    {
                                                        history.observacion
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </article>
                                )
                            )}
                        </div>
                    </section>
                </article>
            )}
        </section>
    );
}

export default ReservationsAdmin;
