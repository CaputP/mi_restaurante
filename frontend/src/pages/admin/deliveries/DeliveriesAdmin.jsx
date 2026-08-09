import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaBoxOpen,
    FaCheck,
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaEye,
    FaPlus,
    FaRedoAlt,
    FaSave,
    FaSearch,
    FaTimes,
    FaTruck,
    FaUser
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";
import {
    useRealtimeVersion
} from "../../../context/RealtimeContext";

import {
    ApiError
} from "../../../services/api";

import {
    completeDeliveryRequest,
    createDeliveryRequest,
    getDeliveryByIdRequest,
    getDeliveryOptionsRequest,
    getReadyOrdersRequest,
    listDeliveriesRequest,
    pickupDeliveryRequest
} from "../../../services/delivery.service";

import "./deliveriesAdmin.css";

const EMPTY_OPTIONS = {
    sucursales: [],
    sucursalSeleccionadaId: null,
    mozos: [],
    estados: []
};

const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

function isAbortError(error) {
    return (
        error instanceof DOMException &&
        error.name === "AbortError"
    );
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

function formatTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(
        value
    ).toLocaleTimeString(
        "es-PE",
        {
            hour: "2-digit",
            minute: "2-digit"
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

function DeliveriesAdmin() {
    const {
        token,
        usuario
    } = useAuth();

    const realtimeVersion =
        useRealtimeVersion([
            "DELIVERIES",
            "ORDERS"
        ]);

    const [
        options,
        setOptions
    ] = useState(
        EMPTY_OPTIONS
    );

    const [
        readyOrders,
        setReadyOrders
    ] = useState([]);

    const [
        deliveries,
        setDeliveries
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
        readySearch,
        setReadySearch
    ] = useState("");

    const [
        appliedReadySearch,
        setAppliedReadySearch
    ] = useState("");

    const [
        deliverySearch,
        setDeliverySearch
    ] = useState("");

    const [
        appliedDeliverySearch,
        setAppliedDeliverySearch
    ] = useState("");

    const [
        filters,
        setFilters
    ] = useState({
        sucursalId: "",
        estado: "ACTIVAS"
    });

    const [
        selectedOrder,
        setSelectedOrder
    ] = useState(null);

    const [
        selectedDelivery,
        setSelectedDelivery
    ] = useState(null);

    const [
        deliveryForm,
        setDeliveryForm
    ] = useState({
        mozoId: "",
        observaciones: ""
    });

    const [
        selectedDetails,
        setSelectedDetails
    ] = useState({});

    const [
        isLoadingOptions,
        setIsLoadingOptions
    ] = useState(true);

    const [
        isLoadingReadyOrders,
        setIsLoadingReadyOrders
    ] = useState(true);

    const [
        isLoadingDeliveries,
        setIsLoadingDeliveries
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

    const [
        lastUpdate,
        setLastUpdate
    ] = useState(
        new Date()
    );

    const pendingCount =
        useMemo(
            () =>
                deliveries.filter(
                    (delivery) =>
                        delivery.estado ===
                        "PENDIENTE"
                ).length,
            [deliveries]
        );

    const pickedUpCount =
        useMemo(
            () =>
                deliveries.filter(
                    (delivery) =>
                        delivery.estado ===
                        "RETIRADA"
                ).length,
            [deliveries]
        );

    const availableUnits =
        useMemo(
            () =>
                selectedOrder?.detalles.reduce(
                    (
                        total,
                        detail
                    ) =>
                        total +
                        Number(
                            detail
                                .cantidadDisponible
                        ),
                    0
                ) ?? 0,
            [selectedOrder]
        );

    const selectedUnits =
        useMemo(
            () =>
                selectedOrder?.detalles.reduce(
                    (
                        total,
                        detail
                    ) => {
                        const selection =
                            selectedDetails[
                                detail.id
                            ];

                        if (
                            !selection?.selected
                        ) {
                            return total;
                        }

                        const quantity =
                            Number(
                                selection.cantidad
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
                            quantity
                        );
                    },
                    0
                ) ?? 0,
            [
                selectedOrder,
                selectedDetails
            ]
        );

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadOptions() {
            setIsLoadingOptions(true);
            setError("");

            try {
                const result =
                    await getDeliveryOptionsRequest(
                        token,
                        {
                            signal:
                                controller.signal
                        }
                    );

                const branchId =
                    result
                        .sucursalSeleccionadaId ??
                    result
                        .sucursales[0]?.id ??
                    "";

                setOptions(result);

                setFilters(
                    (previous) => ({
                        ...previous,

                        sucursalId:
                            branchId
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
                        "No se pudieron cargar las opciones de entregas."
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

        void loadOptions();

        return () =>
            controller.abort();
    }, [token]);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadReadyOrders() {
            setIsLoadingReadyOrders(true);

            try {
                const result =
                    await getReadyOrdersRequest(
                        token,
                        {
                            search:
                                appliedReadySearch,

                            sucursalId:
                                filters
                                    .sucursalId,

                            limit: 50,

                            signal:
                                controller.signal
                        }
                    );

                setReadyOrders(
                    result.pedidos
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
                        "No se pudieron cargar los pedidos listos."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingReadyOrders(
                        false
                    );
                }
            }
        }

        void loadReadyOrders();

        return () =>
            controller.abort();
    }, [
        token,
        appliedReadySearch,
        filters.sucursalId,
        reloadKey,
        realtimeVersion
    ]);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadDeliveries() {
            setIsLoadingDeliveries(true);

            try {
                const result =
                    await listDeliveriesRequest(
                        token,
                        {
                            search:
                                appliedDeliverySearch,

                            ...filters,

                            page,
                            limit: 20,

                            signal:
                                controller.signal
                        }
                    );

                setDeliveries(
                    result.entregas
                );

                setPagination(
                    result.pagination
                );

                setLastUpdate(
                    new Date()
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
                        "No se pudieron cargar las entregas."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingDeliveries(
                        false
                    );
                }
            }
        }

        void loadDeliveries();

        return () =>
            controller.abort();
    }, [
        token,
        appliedDeliverySearch,
        filters,
        page,
        reloadKey,
        realtimeVersion
    ]);

    useEffect(() => {
        if (
            realtimeVersion === 0 ||
            !selectedDelivery?.id
        ) {
            return undefined;
        }

        const controller =
            new AbortController();

        void getDeliveryByIdRequest(
            token,
            selectedDelivery.id,
            controller.signal
        )
            .then(setSelectedDelivery)
            .catch((requestError) => {
                if (!isAbortError(requestError)) {
                    console.error(
                        "No se pudo sincronizar la entrega seleccionada:",
                        requestError
                    );
                }
            });

        return () =>
            controller.abort();
    }, [
        realtimeVersion,
        selectedDelivery?.id,
        token
    ]);

    useEffect(() => {
        const intervalId =
            window.setInterval(
                () => {
                    setReloadKey(
                        (value) =>
                            value + 1
                    );
                },
                15000
            );

        return () =>
            window.clearInterval(
                intervalId
            );
    }, []);

    function clearFeedback() {
        setMessage("");
        setError("");
    }

    function refreshData() {
        clearFeedback();

        setReloadKey(
            (value) =>
                value + 1
        );
    }

    function handleReadySearch(
        event
    ) {
        event.preventDefault();

        setAppliedReadySearch(
            readySearch.trim()
        );
    }

    function handleDeliverySearch(
        event
    ) {
        event.preventDefault();

        setPage(1);

        setAppliedDeliverySearch(
            deliverySearch.trim()
        );
    }

    async function handleBranchChange(
        branchId
    ) {
        clearFeedback();
        setPage(1);

        setFilters(
            (previous) => ({
                ...previous,
                sucursalId:
                    branchId
            })
        );

        setSelectedOrder(null);
        setSelectedDelivery(null);
        setSelectedDetails({});

        try {
            const result =
                await getDeliveryOptionsRequest(
                    token,
                    {
                        sucursalId:
                            branchId
                    }
                );

            setOptions(result);
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                    "No se pudieron cargar los mozos de la sucursal."
            );
        }
    }

    async function openOrderForm(
        order
    ) {
        clearFeedback();
        setIsLoadingOptions(true);

        try {
            const result =
                await getDeliveryOptionsRequest(
                    token,
                    {
                        sucursalId:
                            order
                                .sucursal.id
                    }
                );

            setOptions(result);

            const details = {};

            for (
                const detail
                of order.detalles
            ) {
                details[
                    detail.id
                ] = {
                    selected: true,

                    cantidad:
                        String(
                            detail
                                .cantidadDisponible
                        )
                };
            }

            const defaultWaiterId =
                order.mozo?.id ??
                result.mozos.find(
                    (waiter) =>
                        waiter.id ===
                        usuario.id
                )?.id ??
                result.mozos[0]?.id ??
                "";

            setSelectedOrder(order);
            setSelectedDetails(details);

            setDeliveryForm({
                mozoId:
                    defaultWaiterId,

                observaciones: ""
            });

            setTimeout(
                () => {
                    document
                        .getElementById(
                            "delivery-form"
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
                    "No se pudo preparar la entrega."
            );
        } finally {
            setIsLoadingOptions(false);
        }
    }

    function toggleDetail(
        detailId
    ) {
        setSelectedDetails(
            (previous) => {
                const current =
                    previous[detailId];

                return {
                    ...previous,

                    [detailId]: {
                        selected:
                            !current
                                ?.selected,

                        cantidad:
                            current
                                ?.cantidad ??
                            "1"
                    }
                };
            }
        );
    }

    function updateDetailQuantity(
        detailId,
        value
    ) {
        setSelectedDetails(
            (previous) => ({
                ...previous,

                [detailId]: {
                    selected:
                        previous[detailId]
                            ?.selected ??
                        true,

                    cantidad:
                        value
                }
            })
        );
    }

    function buildDeliveryDetails() {
        if (!selectedOrder) {
            return [];
        }

        return selectedOrder.detalles
            .filter(
                (detail) =>
                    selectedDetails[
                        detail.id
                    ]?.selected
            )
            .map(
                (detail) => ({
                    detallePedidoId:
                        detail.id,

                    cantidadEntregada:
                        Number(
                            selectedDetails[
                                detail.id
                            ].cantidad
                        )
                })
            );
    }

    function validateDeliveryForm() {
        if (!selectedOrder) {
            return "Selecciona un pedido.";
        }

        if (!deliveryForm.mozoId) {
            return "Selecciona el mozo responsable.";
        }

        const details =
            buildDeliveryDetails();

        if (
            details.length === 0
        ) {
            return "Selecciona al menos un producto.";
        }

        for (
            const detail
            of details
        ) {
            const orderDetail =
                selectedOrder.detalles.find(
                    (item) =>
                        item.id ===
                        detail
                            .detallePedidoId
                );

            if (
                !orderDetail ||
                !Number.isFinite(
                    detail
                        .cantidadEntregada
                ) ||
                detail
                    .cantidadEntregada <=
                    0
            ) {
                return "Las cantidades deben ser mayores que cero.";
            }

            if (
                detail
                    .cantidadEntregada >
                Number(
                    orderDetail
                        .cantidadDisponible
                )
            ) {
                return `La cantidad de "${orderDetail.nombreProducto}" supera lo disponible.`;
            }
        }

        return null;
    }

    async function handleCreateDelivery(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        const validationError =
            validateDeliveryForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSaving(true);

        try {
            const response =
                await createDeliveryRequest(
                    token,
                    selectedOrder.id,
                    {
                        mozoId:
                            deliveryForm
                                .mozoId,

                        observaciones:
                            deliveryForm
                                .observaciones
                                .trim() ||
                            null,

                        detalles:
                            buildDeliveryDetails()
                    }
                );

            setSelectedDelivery(
                response.data.entrega
            );

            setMessage(
                response.message
            );

            setSelectedOrder(null);
            setSelectedDetails({});

            setDeliveryForm({
                mozoId: "",
                observaciones: ""
            });

            setReloadKey(
                (value) =>
                    value + 1
            );

            setTimeout(
                () => {
                    document
                        .getElementById(
                            "delivery-detail"
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
                    "No se pudo registrar la entrega."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function openDeliveryDetail(
        deliveryId
    ) {
        clearFeedback();
        setIsLoadingDetail(true);

        try {
            const delivery =
                await getDeliveryByIdRequest(
                    token,
                    deliveryId
                );

            setSelectedDelivery(
                delivery
            );

            setTimeout(
                () => {
                    document
                        .getElementById(
                            "delivery-detail"
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
                    "No se pudo cargar el detalle de la entrega."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    async function handlePickupDelivery() {
        if (!selectedDelivery) {
            return;
        }

        const confirmed =
            window.confirm(
                "¿Confirmar que el mozo retiró los productos de cocina o barra?"
            );

        if (!confirmed) {
            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await pickupDeliveryRequest(
                    token,
                    selectedDelivery.id
                );

            setSelectedDelivery(
                response.data.entrega
            );

            setMessage(
                response.message
            );

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                    "No se pudo registrar el retiro."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleCompleteDelivery() {
        if (!selectedDelivery) {
            return;
        }

        const confirmed =
            window.confirm(
                "¿Confirmar que los productos fueron entregados al cliente?"
            );

        if (!confirmed) {
            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await completeDeliveryRequest(
                    token,
                    selectedDelivery.id
                );

            setSelectedDelivery(
                response.data.entrega
            );

            setMessage(
                response.message
            );

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError
                ) ??
                    "No se pudo completar la entrega."
            );
        } finally {
            setIsSaving(false);
        }
    }

    const canPickup =
        selectedDelivery?.estado ===
        "PENDIENTE";

    const canComplete =
        selectedDelivery?.estado ===
        "RETIRADA";

    return (
        <section className="deliveries-admin admin-page">
            <header className="deliveries-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        ENTREGAS
                    </span>

                    <h2>
                        Gestión de entregas
                    </h2>

                    <p>
                        Asigna productos listos a
                        los mozos y controla su
                        entrega al cliente.
                    </p>
                </div>

                <button
                    type="button"
                    className="delivery-refresh-button"
                    disabled={
                        isLoadingReadyOrders ||
                        isLoadingDeliveries
                    }
                    onClick={
                        refreshData
                    }
                >
                    <FaRedoAlt />
                    Actualizar
                </button>
            </header>

            {message && (
                <div
                    className="delivery-feedback admin-feedback success"
                    role="status"
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    className="delivery-feedback admin-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <div className="delivery-stat-grid admin-metric-grid">
                <article>
                    <FaBoxOpen />

                    <div>
                        <span>
                            Pedidos disponibles
                        </span>

                        <strong>
                            {
                                readyOrders.length
                            }
                        </strong>
                    </div>
                </article>

                <article>
                    <FaClock />

                    <div>
                        <span>
                            Entregas pendientes
                        </span>

                        <strong>
                            {pendingCount}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaTruck />

                    <div>
                        <span>
                            Productos retirados
                        </span>

                        <strong>
                            {pickedUpCount}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaRedoAlt />

                    <div>
                        <span>
                            Última actualización
                        </span>

                        <strong className="delivery-time">
                            {formatTime(
                                lastUpdate
                            )}
                        </strong>
                    </div>
                </article>
            </div>

            <section className="ready-orders-section">
                <div className="delivery-section-heading">
                    <div>
                        <h3>
                            Pedidos listos para entregar
                        </h3>

                        <p>
                            Pedidos completos o con
                            productos pendientes de
                            entrega.
                        </p>
                    </div>
                </div>

                <form
                    className="ready-order-filters admin-filter-bar"
                    onSubmit={
                        handleReadySearch
                    }
                >
                    <div className="delivery-search">
                        <FaSearch />

                        <input
                            type="search"
                            placeholder="Buscar pedido, cliente o zona..."
                            value={
                                readySearch
                            }
                            onChange={(
                                event
                            ) =>
                                setReadySearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                        />
                    </div>

                    <select
                        value={
                            filters
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

                    <button type="submit">
                        Buscar
                    </button>
                </form>

                {isLoadingReadyOrders ? (
                    <div className="delivery-empty-state">
                        <FaBoxOpen />
                        Cargando pedidos listos...
                    </div>
                ) : readyOrders.length ===
                  0 ? (
                    <div className="delivery-empty-state">
                        <FaCheck />

                        <strong>
                            No hay pedidos pendientes
                            de entrega
                        </strong>
                    </div>
                ) : (
                    <div className="ready-order-grid">
                        {readyOrders.map(
                            (order) => (
                                <article
                                    key={
                                        order.id
                                    }
                                    className="ready-order-card"
                                >
                                    <header>
                                        <div>
                                            <span>
                                                Pedido
                                            </span>

                                            <h3>
                                                {
                                                    order.codigo
                                                }
                                            </h3>
                                        </div>

                                        <span
                                            className={`admin-status-badge delivery-status ${order.estado.toLowerCase()}`}
                                        >
                                            {formatLabel(
                                                order.estado
                                            )}
                                        </span>
                                    </header>

                                    <dl>
                                        <div>
                                            <dt>
                                                Cliente
                                            </dt>

                                            <dd>
                                                {order
                                                    .cliente
                                                    ?.nombreCompleto ??
                                                    "Público general"}
                                            </dd>
                                        </div>

                                        <div>
                                            <dt>
                                                Zona
                                            </dt>

                                            <dd>
                                                {order
                                                    .zona
                                                    ?.nombre ??
                                                    "Para llevar"}
                                            </dd>
                                        </div>

                                        <div>
                                            <dt>
                                                Mozo
                                            </dt>

                                            <dd>
                                                {order
                                                    .mozo
                                                    ?.nombreCompleto ??
                                                    "Sin asignar"}
                                            </dd>
                                        </div>

                                        <div>
                                            <dt>
                                                Productos
                                            </dt>

                                            <dd>
                                                {
                                                    order
                                                        .detalles
                                                        .length
                                                }
                                            </dd>
                                        </div>
                                    </dl>

                                    <div className="ready-order-products">
                                        {order.detalles
                                            .slice(
                                                0,
                                                3
                                            )
                                            .map(
                                                (
                                                    detail
                                                ) => (
                                                    <span
                                                        key={
                                                            detail.id
                                                        }
                                                    >
                                                        {
                                                            detail.nombreProducto
                                                        }
                                                        {" — "}
                                                        {
                                                            detail.cantidadDisponible
                                                        }{" "}
                                                        {
                                                            detail.unidadMedida
                                                        }
                                                    </span>
                                                )
                                            )}

                                        {order
                                            .detalles
                                            .length >
                                            3 && (
                                            <small>
                                                +
                                                {order
                                                    .detalles
                                                    .length -
                                                    3}{" "}
                                                producto(s)
                                            </small>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            openOrderForm(
                                                order
                                            )
                                        }
                                    >
                                        <FaPlus />
                                        Crear entrega
                                    </button>
                                </article>
                            )
                        )}
                    </div>
                )}
            </section>

            {selectedOrder && (
                <form
                    id="delivery-form"
                    className="delivery-form-card"
                    onSubmit={
                        handleCreateDelivery
                    }
                >
                    <div className="delivery-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                NUEVA ENTREGA
                            </span>

                            <h3>
                                Pedido{" "}
                                {
                                    selectedOrder.codigo
                                }
                            </h3>

                            <p>
                                Disponible:{" "}
                                {availableUnits} unidad(es)
                            </p>
                        </div>

                        <button
                            type="button"
                            className="delivery-close-button"
                            aria-label="Cerrar asignación de entrega"
                            onClick={() => {
                                setSelectedOrder(
                                    null
                                );

                                setSelectedDetails(
                                    {}
                                );
                            }}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="delivery-form-grid">
                        <div className="delivery-field">
                            <label>
                                Mozo responsable *
                            </label>

                            <select
                                value={
                                    deliveryForm
                                        .mozoId
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDeliveryForm(
                                        (
                                            previous
                                        ) => ({
                                            ...previous,

                                            mozoId:
                                                event
                                                    .target
                                                    .value
                                        })
                                    )
                                }
                            >
                                <option value="">
                                    Seleccionar
                                </option>

                                {options.mozos.map(
                                    (waiter) => (
                                        <option
                                            key={
                                                waiter.id
                                            }
                                            value={
                                                waiter.id
                                            }
                                        >
                                            {
                                                waiter
                                                    .nombreCompleto
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="delivery-field">
                            <label>
                                Unidades seleccionadas
                            </label>

                            <div className="delivery-readonly-value">
                                {selectedUnits}
                            </div>
                        </div>

                        <div className="delivery-field delivery-field-full">
                            <label>
                                Observaciones
                            </label>

                            <textarea
                                rows="3"
                                maxLength="2000"
                                value={
                                    deliveryForm
                                        .observaciones
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDeliveryForm(
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

                    <div className="delivery-product-list">
                        {selectedOrder.detalles.map(
                            (detail) => {
                                const selection =
                                    selectedDetails[
                                        detail.id
                                    ];

                                const selected =
                                    Boolean(
                                        selection
                                            ?.selected
                                    );

                                return (
                                    <article
                                        key={
                                            detail.id
                                        }
                                        className={
                                            selected
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selected
                                                }
                                                onChange={() =>
                                                    toggleDetail(
                                                        detail.id
                                                    )
                                                }
                                            />

                                            <span>
                                                <strong>
                                                    {
                                                        detail.nombreProducto
                                                    }
                                                </strong>

                                                <small>
                                                    Disponible:{" "}
                                                    {
                                                        detail.cantidadDisponible
                                                    }{" "}
                                                    {
                                                        detail.unidadMedida
                                                    }
                                                </small>
                                            </span>
                                        </label>

                                        <input
                                            type="number"
                                            min="0.001"
                                            step="0.001"
                                            max={
                                                detail
                                                    .cantidadDisponible
                                            }
                                            disabled={
                                                !selected
                                            }
                                            value={
                                                selection
                                                    ?.cantidad ??
                                                ""
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateDetailQuantity(
                                                    detail.id,
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </article>
                                );
                            }
                        )}
                    </div>

                    <div className="delivery-form-actions">
                        <button
                            type="button"
                            className="delivery-secondary-button"
                            onClick={() => {
                                setSelectedOrder(
                                    null
                                );

                                setSelectedDetails(
                                    {}
                                );
                            }}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="delivery-primary-button"
                            disabled={
                                isSaving
                            }
                        >
                            <FaSave />

                            {isSaving
                                ? "Registrando..."
                                : "Registrar entrega"}
                        </button>
                    </div>
                </form>
            )}

            <section className="deliveries-list-section">
                <div className="delivery-section-heading">
                    <div>
                        <h3>
                            Entregas registradas
                        </h3>

                        <p>
                            {pagination.total} resultado(s)
                        </p>
                    </div>
                </div>

                <form
                    className="delivery-filters admin-filter-bar"
                    onSubmit={
                        handleDeliverySearch
                    }
                >
                    <div className="delivery-search">
                        <FaSearch />

                        <input
                            type="search"
                            placeholder="Código, pedido o cliente..."
                            value={
                                deliverySearch
                            }
                            onChange={(
                                event
                            ) =>
                                setDeliverySearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                        />
                    </div>

                    <select
                        value={
                            filters.estado
                        }
                        onChange={(
                            event
                        ) => {
                            setFilters(
                                (
                                    previous
                                ) => ({
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
                        <option value="ACTIVAS">
                            Entregas activas
                        </option>

                        <option value="TODOS">
                            Todos los estados
                        </option>

                        <option value="PENDIENTE">
                            Pendientes
                        </option>

                        <option value="RETIRADA">
                            Retiradas
                        </option>

                        <option value="ENTREGADA">
                            Entregadas
                        </option>

                        <option value="ANULADA">
                            Anuladas
                        </option>
                    </select>

                    <button type="submit">
                        Buscar
                    </button>
                </form>

                {isLoadingDeliveries ? (
                    <div className="delivery-empty-state">
                        <FaTruck />
                        Cargando entregas...
                    </div>
                ) : deliveries.length ===
                  0 ? (
                    <div className="delivery-empty-state">
                        <FaTruck />

                        <strong>
                            No hay entregas con los
                            filtros seleccionados
                        </strong>
                    </div>
                ) : (
                    <div className="delivery-table-wrapper admin-table-shell">
                        <table className="delivery-table admin-data-table">
                            <thead>
                                <tr>
                                    <th>Pedido</th>
                                    <th>Cliente</th>
                                    <th>Mozo</th>
                                    <th>Tipo</th>
                                    <th>Productos</th>
                                    <th>Estado</th>
                                    <th>Registro</th>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>
                                {deliveries.map(
                                    (
                                        delivery
                                    ) => (
                                        <tr
                                            key={
                                                delivery.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        delivery
                                                            .pedido
                                                            .codigo
                                                    }
                                                </strong>

                                                <small>
                                                    Código:{" "}
                                                    {
                                                        delivery
                                                            .codigoValidacion
                                                    }
                                                </small>
                                            </td>

                                            <td>
                                                {delivery
                                                    .pedido
                                                    .cliente
                                                    ?.nombreCompleto ??
                                                    "Público general"}
                                            </td>

                                            <td>
                                                {
                                                    delivery
                                                        .mozo
                                                        .nombreCompleto
                                                }
                                            </td>

                                            <td>
                                                {formatLabel(
                                                    delivery
                                                        .tipoEntrega
                                                )}
                                            </td>

                                            <td>
                                                {
                                                    delivery
                                                        .cantidadProductos
                                                }
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-status-badge delivery-status ${delivery.estado.toLowerCase()}`}
                                                >
                                                    {formatLabel(
                                                        delivery
                                                            .estado
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    delivery
                                                        .createdAt
                                                )}
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="delivery-icon-button"
                                                    aria-label={`Ver entrega ${delivery.codigo}`}
                                                    disabled={
                                                        isLoadingDetail
                                                    }
                                                    onClick={() =>
                                                        openDeliveryDetail(
                                                            delivery.id
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

                <div className="delivery-pagination admin-pagination">
                    <span>
                        Página {pagination.page} de{" "}
                        {pagination.totalPages}
                    </span>

                    <div>
                        <button
                            type="button"
                            disabled={
                                page <= 1 ||
                                isLoadingDeliveries
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
                                isLoadingDeliveries
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
            </section>

            {selectedDelivery && (
                <article
                    id="delivery-detail"
                    className="delivery-detail-card"
                >
                    <div className="delivery-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                DETALLE
                            </span>

                            <h3>
                                Entrega del pedido{" "}
                                {
                                    selectedDelivery
                                        .pedido
                                        .codigo
                                }
                            </h3>

                            <p>
                                Código de validación:{" "}
                                <strong>
                                    {
                                        selectedDelivery
                                            .codigoValidacion
                                    }
                                </strong>
                            </p>
                        </div>

                        <button
                            type="button"
                            className="delivery-close-button"
                            aria-label="Cerrar detalle de entrega"
                            onClick={() =>
                                setSelectedDelivery(
                                    null
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="delivery-detail-summary">
                        <article>
                            <FaUser />

                            <div>
                                <span>
                                    Cliente
                                </span>

                                <strong>
                                    {selectedDelivery
                                        .pedido
                                        .cliente
                                        ?.nombreCompleto ??
                                        "Público general"}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaTruck />

                            <div>
                                <span>
                                    Mozo
                                </span>

                                <strong>
                                    {
                                        selectedDelivery
                                            .mozo
                                            .nombreCompleto
                                    }
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaClock />

                            <div>
                                <span>
                                    Estado
                                </span>

                                <strong>
                                    {formatLabel(
                                        selectedDelivery
                                            .estado
                                    )}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaBoxOpen />

                            <div>
                                <span>
                                    Tipo
                                </span>

                                <strong>
                                    {formatLabel(
                                        selectedDelivery
                                            .tipoEntrega
                                    )}
                                </strong>
                            </div>
                        </article>
                    </div>

                    <div className="delivery-detail-actions">
                        {canPickup && (
                            <button
                                type="button"
                                className="pickup"
                                disabled={
                                    isSaving
                                }
                                onClick={
                                    handlePickupDelivery
                                }
                            >
                                <FaTruck />
                                Retirar productos
                            </button>
                        )}

                        {canComplete && (
                            <button
                                type="button"
                                className="complete"
                                disabled={
                                    isSaving
                                }
                                onClick={
                                    handleCompleteDelivery
                                }
                            >
                                <FaCheck />
                                Confirmar entrega
                            </button>
                        )}
                    </div>

                    <div className="delivery-detail-columns">
                        <section>
                            <h4>
                                Información
                            </h4>

                            <dl className="delivery-data-list">
                                <div>
                                    <dt>
                                        Sucursal
                                    </dt>

                                    <dd>
                                        {
                                            selectedDelivery
                                                .pedido
                                                .sucursal
                                                .nombre
                                        }
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Zona
                                    </dt>

                                    <dd>
                                        {selectedDelivery
                                            .pedido
                                            .zona
                                            ?.nombre ??
                                            "Para llevar"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Estado del pedido
                                    </dt>

                                    <dd>
                                        {formatLabel(
                                            selectedDelivery
                                                .pedido
                                                .estado
                                        )}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Fecha de retiro
                                    </dt>

                                    <dd>
                                        {formatDateTime(
                                            selectedDelivery
                                                .fechaRetiro
                                        )}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Fecha de entrega
                                    </dt>

                                    <dd>
                                        {formatDateTime(
                                            selectedDelivery
                                                .fechaEntrega
                                        )}
                                    </dd>
                                </div>
                            </dl>

                            {selectedDelivery
                                .observaciones && (
                                <p className="delivery-notes">
                                    {
                                        selectedDelivery
                                            .observaciones
                                    }
                                </p>
                            )}
                        </section>

                        <section>
                            <h4>
                                Productos
                            </h4>

                            <div className="delivery-detail-products">
                                {selectedDelivery.detalles.map(
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
                                                            .detallePedido
                                                            .nombreProducto
                                                    }
                                                </strong>

                                                <small>
                                                    Estado:{" "}
                                                    {formatLabel(
                                                        detail
                                                            .detallePedido
                                                            .estado
                                                    )}
                                                </small>
                                            </div>

                                            <span>
                                                {
                                                    detail
                                                        .cantidadEntregada
                                                }{" "}
                                                {
                                                    detail
                                                        .detallePedido
                                                        .unidadMedida
                                                }
                                            </span>
                                        </article>
                                    )
                                )}
                            </div>
                        </section>
                    </div>
                </article>
            )}
        </section>
    );
}

export default DeliveriesAdmin;
