import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaBoxOpen,
    FaChevronLeft,
    FaChevronRight,
    FaClipboardList,
    FaEdit,
    FaEye,
    FaPaperPlane,
    FaPlus,
    FaSave,
    FaSearch,
    FaTimes,
    FaUser,
    FaUtensils
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";

import {
    ApiError
} from "../../../services/api";

import {
    createOrderRequest,
    getOrderByIdRequest,
    getOrderOptionsRequest,
    listOrdersRequest,
    sendOrderRequest,
    updateOrderRequest
} from "../../../services/order.service";

import "./ordersAdmin.css";

const EMPTY_OPTIONS = {
    sucursales: [],
    sucursalSeleccionadaId: null,
    clientes: [],
    zonas: [],
    productos: [],
    vendedores: [],
    mozos: [],
    tiposPedido: []
};

const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

const ORDER_STATES = [
    "ABIERTO",
    "ENVIADO",
    "EN_PREPARACION",
    "LISTO",
    "ENTREGA_PARCIAL",
    "ENTREGADO",
    "PAGADO",
    "CANCELADO"
];

const ORDER_TYPES = [
    "CONSUMO_LOCAL",
    "PARA_LLEVAR",
    "RESERVA",
    "EVENTO"
];

const PRIORITIES = [
    {
        codigo: "NORMAL",
        nombre: "Normal"
    },
    {
        codigo: "URGENTE",
        nombre: "Urgente"
    },
    {
        codigo: "EVENTO",
        nombre: "Evento"
    }
];

function createEmptyForm() {
    return {
        sucursalId: "",
        clienteId: "",
        vendedorId: "",
        mozoId: "",
        zonaId: "",
        tipoPedido: "CONSUMO_LOCAL",
        observaciones: ""
    };
}

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

function formatMoney(value) {
    return new Intl.NumberFormat(
        "es-ES",
        {
            style: "currency",
            currency: "PEN"
        }
    ).format(
        Number(value ?? 0)
    );
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(
        value
    ).toLocaleString(
        "es-ES",
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

function OrdersAdmin() {
    const {
        token,
        usuario
    } = useAuth();

    const [
        options,
        setOptions
    ] = useState(EMPTY_OPTIONS);

    const [
        orders,
        setOrders
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
        tipoPedido: "TODOS",
        fechaDesde: "",
        fechaHasta: ""
    });

    const [
        formVisible,
        setFormVisible
    ] = useState(false);

    const [
        editingOrderId,
        setEditingOrderId
    ] = useState(null);

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
        selectedOrder,
        setSelectedOrder
    ] = useState(null);

    const [
        sendPriority,
        setSendPriority
    ] = useState("NORMAL");

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
                            ) ||
                            quantity <= 0
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
        const controller =
            new AbortController();

        async function loadOptions() {
            setIsLoadingOptions(true);
            setError("");

            try {
                const initialOptions =
                    await getOrderOptionsRequest(
                        token,
                        {
                            signal:
                                controller.signal
                        }
                    );

                const branchId =
                    initialOptions
                        .sucursalSeleccionadaId ??
                    initialOptions
                        .sucursales[0]?.id ??
                    "";

                let completeOptions =
                    initialOptions;

                if (
                    branchId &&
                    initialOptions
                        .sucursalSeleccionadaId !==
                        branchId
                ) {
                    completeOptions =
                        await getOrderOptionsRequest(
                            token,
                            {
                                sucursalId:
                                    branchId,

                                signal:
                                    controller.signal
                            }
                        );
                }

                setOptions(
                    completeOptions
                );

                const defaultSeller =
                    completeOptions
                        .vendedores.find(
                            (seller) =>
                                seller.id ===
                                usuario.id
                        )?.id ??
                    completeOptions
                        .vendedores[0]?.id ??
                    "";

                setForm(
                    (previous) => ({
                        ...previous,

                        sucursalId:
                            branchId,

                        vendedorId:
                            defaultSeller,

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
                        "No se pudieron cargar las opciones de pedidos."
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
    }, [
        token,
        usuario.id
    ]);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadOrders() {
            setIsLoadingList(true);
            setError("");

            try {
                const result =
                    await listOrdersRequest(
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

                setOrders(
                    result.pedidos
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
                        "No se pudieron cargar los pedidos."
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

        void loadOrders();

        return () =>
            controller.abort();
    }, [
        token,
        appliedSearch,
        filters,
        page,
        reloadKey
    ]);

    function clearFeedback() {
        setMessage("");
        setError("");
    }

    function updateFormField(
        field,
        value
    ) {
        setForm(
            (previous) => {
                const next = {
                    ...previous,
                    [field]: value
                };

                if (
                    field ===
                        "tipoPedido" &&
                    value ===
                        "PARA_LLEVAR"
                ) {
                    next.zonaId = "";
                    next.mozoId = "";
                }

                if (
                    field ===
                        "tipoPedido" &&
                    value ===
                        "CONSUMO_LOCAL" &&
                    !next.zonaId
                ) {
                    next.zonaId =
                        options.zonas[0]
                            ?.id ?? "";
                }

                return next;
            }
        );
    }

    async function handleBranchChange(
        branchId
    ) {
        clearFeedback();
        setIsLoadingOptions(true);
        setSelectedProducts({});

        try {
            const result =
                await getOrderOptionsRequest(
                    token,
                    {
                        sucursalId:
                            branchId
                    }
                );

            setOptions(result);

            const defaultSeller =
                result.vendedores.find(
                    (seller) =>
                        seller.id ===
                        usuario.id
                )?.id ??
                result.vendedores[0]
                    ?.id ??
                "";

            setForm(
                (previous) => ({
                    ...previous,

                    sucursalId:
                        branchId,

                    vendedorId:
                        defaultSeller,

                    mozoId: "",

                    zonaId:
                        previous
                            .tipoPedido ===
                        "CONSUMO_LOCAL"
                            ? result.zonas[0]
                                  ?.id ?? ""
                            : ""
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
                    previous[productId];

                return {
                    ...previous,

                    [productId]: {
                        selected:
                            !current
                                ?.selected,

                        cantidad:
                            current
                                ?.cantidad ??
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

    function updateProduct(
        productId,
        field,
        value
    ) {
        setSelectedProducts(
            (previous) => ({
                ...previous,

                [productId]: {
                    selected:
                        previous[productId]
                            ?.selected ??
                        true,

                    cantidad:
                        previous[productId]
                            ?.cantidad ??
                        "1",

                    observaciones:
                        previous[productId]
                            ?.observaciones ??
                        "",

                    [field]: value
                }
            })
        );
    }

    function buildDetails() {
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

                        cantidad:
                            Number(
                                selection.cantidad
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

    function validateForm() {
        if (!form.sucursalId) {
            return "Selecciona una sucursal.";
        }

        if (
            !editingOrderId &&
            !form.vendedorId
        ) {
            return "Selecciona un vendedor.";
        }

        if (
            form.tipoPedido ===
                "CONSUMO_LOCAL" &&
            !form.zonaId
        ) {
            return "Selecciona una zona.";
        }

        const details =
            buildDetails();

        if (
            details.length === 0
        ) {
            return "Selecciona al menos un producto.";
        }

        const invalidQuantity =
            details.some(
                (detail) =>
                    !Number.isFinite(
                        detail.cantidad
                    ) ||
                    detail.cantidad <= 0
            );

        if (invalidQuantity) {
            return "Las cantidades deben ser mayores que cero.";
        }

        return null;
    }

    function resetForm() {
        const defaultSeller =
            options.vendedores.find(
                (seller) =>
                    seller.id ===
                    usuario.id
            )?.id ??
            options.vendedores[0]
                ?.id ??
            "";

        setEditingOrderId(null);
        setSelectedProducts({});

        setForm({
            ...createEmptyForm(),

            sucursalId:
                options
                    .sucursalSeleccionadaId ??
                options.sucursales[0]
                    ?.id ??
                "",

            vendedorId:
                defaultSeller,

            zonaId:
                options.zonas[0]
                    ?.id ?? ""
        });
    }

    function openCreateForm() {
        clearFeedback();
        resetForm();
        setFormVisible(true);
    }

    async function openOrderDetail(
        orderId
    ) {
        clearFeedback();
        setIsLoadingDetail(true);

        try {
            const order =
                await getOrderByIdRequest(
                    token,
                    orderId
                );

            setSelectedOrder(
                order
            );

            setTimeout(
                () => {
                    document
                        .getElementById(
                            "order-detail"
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
                    "No se pudo cargar el detalle del pedido."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    async function openEditForm() {
        if (!selectedOrder) {
            return;
        }

        clearFeedback();
        setIsLoadingOptions(true);

        try {
            const result =
                await getOrderOptionsRequest(
                    token,
                    {
                        sucursalId:
                            selectedOrder
                                .sucursal.id
                    }
                );

            setOptions(result);

            const selections = {};

            for (
                const detail
                of selectedOrder.detalles
            ) {
                const productBranchId =
                    detail
                        .productoSucursal
                        .id;

                selections[
                    productBranchId
                ] = {
                    selected: true,

                    cantidad:
                        String(
                            detail.cantidad
                        ),

                    observaciones:
                        detail
                            .observaciones ??
                        ""
                };
            }

            setSelectedProducts(
                selections
            );

            setForm({
                sucursalId:
                    selectedOrder
                        .sucursal.id,

                clienteId:
                    selectedOrder
                        .cliente?.id ??
                    "",

                vendedorId:
                    selectedOrder
                        .vendedor.id,

                mozoId:
                    selectedOrder
                        .mozo?.id ??
                    "",

                zonaId:
                    selectedOrder
                        .zona?.id ??
                    "",

                tipoPedido:
                    selectedOrder
                        .tipoPedido,

                observaciones:
                    selectedOrder
                        .observaciones ??
                    ""
            });

            setEditingOrderId(
                selectedOrder.id
            );

            setFormVisible(true);

            setTimeout(
                () => {
                    document
                        .getElementById(
                            "order-form"
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
                    "No se pudo preparar la edición del pedido."
            );
        } finally {
            setIsLoadingOptions(false);
        }
    }

    async function handleSubmit(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        const validationError =
            validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSaving(true);

        try {
            const commonData = {
                clienteId:
                    form.clienteId ||
                    null,

                mozoId:
                    form.tipoPedido ===
                    "CONSUMO_LOCAL"
                        ? form.mozoId ||
                          null
                        : null,

                zonaId:
                    form.tipoPedido ===
                    "CONSUMO_LOCAL"
                        ? form.zonaId
                        : null,

                tipoPedido:
                    form.tipoPedido,

                observaciones:
                    form.observaciones
                        .trim() ||
                    null,

                detalles:
                    buildDetails()
            };

            let response;

            if (editingOrderId) {
                response =
                    await updateOrderRequest(
                        token,
                        editingOrderId,
                        commonData
                    );
            } else {
                response =
                    await createOrderRequest(
                        token,
                        {
                            sucursalId:
                                form
                                    .sucursalId,

                            vendedorId:
                                form
                                    .vendedorId,

                            ...commonData
                        }
                    );
            }

            const order =
                response.data.pedido;

            setMessage(
                response.message
            );

            setSelectedOrder(
                order
            );

            setFormVisible(false);
            resetForm();

            setReloadKey(
                (value) =>
                    value + 1
            );

            setTimeout(
                () => {
                    document
                        .getElementById(
                            "order-detail"
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
                    "No se pudo guardar el pedido."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSendOrder() {
        if (!selectedOrder) {
            return;
        }

        const confirmed =
            window.confirm(
                "¿Enviar el pedido a cocina y barra? Después ya no podrá editarse."
            );

        if (!confirmed) {
            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await sendOrderRequest(
                    token,
                    selectedOrder.id,
                    {
                        prioridad:
                            sendPriority
                    }
                );

            setSelectedOrder(
                response.data.pedido
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
                    "No se pudo enviar el pedido."
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

    const canEdit =
        selectedOrder?.estado ===
        "ABIERTO";

    return (
        <section className="orders-admin">
            <header className="orders-heading">
                <div>
                    <span className="admin-eyebrow">
                        PEDIDOS
                    </span>

                    <h2>
                        Gestión de pedidos
                    </h2>

                    <p>
                        Registra pedidos,
                        selecciona productos y
                        envíalos a cocina o barra.
                    </p>
                </div>

                <button
                    type="button"
                    className="order-primary-button"
                    disabled={
                        isLoadingOptions
                    }
                    onClick={
                        openCreateForm
                    }
                >
                    <FaPlus />
                    Nuevo pedido
                </button>
            </header>

            {message && (
                <div className="order-feedback success">
                    {message}
                </div>
            )}

            {error && (
                <div className="order-feedback error">
                    {error}
                </div>
            )}

            {formVisible && (
                <form
                    id="order-form"
                    className="order-form-card"
                    onSubmit={
                        handleSubmit
                    }
                >
                    <div className="order-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                {editingOrderId
                                    ? "EDICIÓN"
                                    : "REGISTRO"}
                            </span>

                            <h3>
                                {editingOrderId
                                    ? "Editar pedido"
                                    : "Nuevo pedido"}
                            </h3>
                        </div>

                        <button
                            type="button"
                            className="order-close-button"
                            onClick={() => {
                                setFormVisible(
                                    false
                                );

                                resetForm();
                            }}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="order-form-grid">
                        <div className="order-field">
                            <label>
                                Sucursal *
                            </label>

                            <select
                                value={
                                    form
                                        .sucursalId
                                }
                                disabled={
                                    Boolean(
                                        editingOrderId
                                    ) ||
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

                        <div className="order-field">
                            <label>
                                Tipo de pedido *
                            </label>

                            <select
                                value={
                                    form
                                        .tipoPedido
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "tipoPedido",
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="CONSUMO_LOCAL">
                                    Consumo local
                                </option>

                                <option value="PARA_LLEVAR">
                                    Para llevar
                                </option>
                            </select>
                        </div>

                        <div className="order-field">
                            <label>
                                Cliente
                            </label>

                            <select
                                value={
                                    form.clienteId
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
                                    Público general
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
                                                client
                                                    .nombreCompleto
                                            }
                                            {" — "}
                                            {
                                                client.correo
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="order-field">
                            <label>
                                Vendedor *
                            </label>

                            <select
                                value={
                                    form
                                        .vendedorId
                                }
                                disabled={
                                    Boolean(
                                        editingOrderId
                                    )
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateFormField(
                                        "vendedorId",
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
                                    .vendedores
                                    .map(
                                        (
                                            seller
                                        ) => (
                                            <option
                                                key={
                                                    seller.id
                                                }
                                                value={
                                                    seller.id
                                                }
                                            >
                                                {
                                                    seller
                                                        .nombreCompleto
                                                }
                                            </option>
                                        )
                                    )}
                            </select>
                        </div>

                        {form.tipoPedido ===
                            "CONSUMO_LOCAL" && (
                            <>
                                <div className="order-field">
                                    <label>
                                        Zona *
                                    </label>

                                    <select
                                        value={
                                            form
                                                .zonaId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateFormField(
                                                "zonaId",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Seleccionar
                                        </option>

                                        {options.zonas.map(
                                            (
                                                zone
                                            ) => (
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
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div className="order-field">
                                    <label>
                                        Mozo
                                    </label>

                                    <select
                                        value={
                                            form.mozoId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateFormField(
                                                "mozoId",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Sin asignar
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
                            </>
                        )}

                        <div className="order-field order-field-full">
                            <label>
                                Observaciones
                            </label>

                            <textarea
                                rows="3"
                                maxLength="2000"
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

                    <section className="order-products-section">
                        <div className="order-section-heading">
                            <div>
                                <h3>
                                    Productos
                                </h3>

                                <p>
                                    Selecciona los
                                    productos que forman
                                    parte del pedido.
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
                            <div className="order-empty-small">
                                <FaBoxOpen />
                                No hay productos disponibles.
                            </div>
                        ) : (
                            <div className="order-product-grid">
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
                                                <label className="order-product-title">
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

                                                        <small>
                                                            {product.requierePreparacion
                                                                ? `Preparación: ${formatLabel(
                                                                      product.destinoPreparacion
                                                                  )}`
                                                                : "Entrega directa"}
                                                        </small>
                                                    </span>
                                                </label>

                                                {selected && (
                                                    <div className="order-product-fields">
                                                        <input
                                                            type="number"
                                                            min="0.001"
                                                            step="0.001"
                                                            value={
                                                                selection
                                                                    .cantidad
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateProduct(
                                                                    product
                                                                        .productoSucursalId,
                                                                    "cantidad",
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />

                                                        <input
                                                            type="text"
                                                            maxLength="500"
                                                            placeholder="Observación"
                                                            value={
                                                                selection
                                                                    .observaciones
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateProduct(
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
                    </section>

                    <div className="order-form-actions">
                        <button
                            type="button"
                            className="order-secondary-button"
                            disabled={
                                isSaving
                            }
                            onClick={() => {
                                setFormVisible(
                                    false
                                );

                                resetForm();
                            }}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="order-primary-button"
                            disabled={
                                isSaving
                            }
                        >
                            <FaSave />

                            {isSaving
                                ? "Guardando..."
                                : editingOrderId
                                  ? "Actualizar pedido"
                                  : "Registrar pedido"}
                        </button>
                    </div>
                </form>
            )}

            <form
                className="order-filters"
                onSubmit={
                    handleSearch
                }
            >
                <div className="order-search">
                    <FaSearch />

                    <input
                        type="search"
                        placeholder="Código, cliente u observación..."
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
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

                    {ORDER_STATES.map(
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
                        filters.tipoPedido
                    }
                    onChange={(event) => {
                        setFilters(
                            (previous) => ({
                                ...previous,

                                tipoPedido:
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

                    {ORDER_TYPES.map(
                        (type) => (
                            <option
                                key={type}
                                value={type}
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

            <article className="order-table-card">
                <div className="order-section-heading">
                    <div>
                        <h3>
                            Pedidos registrados
                        </h3>

                        <p>
                            {pagination.total} resultado(s)
                        </p>
                    </div>
                </div>

                {isLoadingList ? (
                    <div className="order-empty-state">
                        <FaClipboardList />
                        Cargando pedidos...
                    </div>
                ) : orders.length ===
                  0 ? (
                    <div className="order-empty-state">
                        <FaClipboardList />

                        <strong>
                            No se encontraron pedidos
                        </strong>
                    </div>
                ) : (
                    <div className="order-table-wrapper">
                        <table className="order-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Cliente</th>
                                    <th>Tipo</th>
                                    <th>Zona</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                    <th>Registro</th>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>
                                {orders.map(
                                    (order) => (
                                        <tr
                                            key={
                                                order.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        order.codigo
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {order.cliente
                                                    ?.nombreCompleto ??
                                                    "Público general"}
                                            </td>

                                            <td>
                                                {formatLabel(
                                                    order.tipoPedido
                                                )}
                                            </td>

                                            <td>
                                                {order.zona
                                                    ?.nombre ??
                                                    "-"}
                                            </td>

                                            <td>
                                                {formatMoney(
                                                    order.total
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={`order-status ${order.estado.toLowerCase()}`}
                                                >
                                                    {formatLabel(
                                                        order.estado
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    order.createdAt
                                                )}
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="order-icon-button"
                                                    disabled={
                                                        isLoadingDetail
                                                    }
                                                    onClick={() =>
                                                        openOrderDetail(
                                                            order.id
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

                <div className="order-pagination">
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

            {selectedOrder && (
                <article
                    id="order-detail"
                    className="order-detail-card"
                >
                    <div className="order-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                DETALLE
                            </span>

                            <h3>
                                Pedido{" "}
                                {
                                    selectedOrder.codigo
                                }
                            </h3>

                            <p>
                                Registrado el{" "}
                                {formatDateTime(
                                    selectedOrder
                                        .createdAt
                                )}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="order-close-button"
                            onClick={() =>
                                setSelectedOrder(
                                    null
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="order-summary">
                        <article>
                            <FaUser />

                            <div>
                                <span>
                                    Cliente
                                </span>

                                <strong>
                                    {selectedOrder
                                        .cliente
                                        ?.nombreCompleto ??
                                        "Público general"}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaUtensils />

                            <div>
                                <span>
                                    Tipo
                                </span>

                                <strong>
                                    {formatLabel(
                                        selectedOrder
                                            .tipoPedido
                                    )}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaClipboardList />

                            <div>
                                <span>
                                    Estado
                                </span>

                                <strong>
                                    {formatLabel(
                                        selectedOrder
                                            .estado
                                    )}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaBoxOpen />

                            <div>
                                <span>
                                    Total
                                </span>

                                <strong>
                                    {formatMoney(
                                        selectedOrder
                                            .total
                                    )}
                                </strong>
                            </div>
                        </article>
                    </div>

                    {canEdit && (
                        <div className="order-detail-actions">
                            <button
                                type="button"
                                disabled={
                                    isSaving
                                }
                                onClick={
                                    openEditForm
                                }
                            >
                                <FaEdit />
                                Editar pedido
                            </button>

                            <select
                                value={
                                    sendPriority
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSendPriority(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {PRIORITIES.map(
                                    (
                                        priority
                                    ) => (
                                        <option
                                            key={
                                                priority.codigo
                                            }
                                            value={
                                                priority.codigo
                                            }
                                        >
                                            Prioridad:{" "}
                                            {
                                                priority.nombre
                                            }
                                        </option>
                                    )
                                )}
                            </select>

                            <button
                                type="button"
                                className="send"
                                disabled={
                                    isSaving
                                }
                                onClick={
                                    handleSendOrder
                                }
                            >
                                <FaPaperPlane />
                                Enviar pedido
                            </button>
                        </div>
                    )}

                    <div className="order-detail-columns">
                        <section>
                            <h4>
                                Información
                            </h4>

                            <dl className="order-data-list">
                                <div>
                                    <dt>
                                        Sucursal
                                    </dt>

                                    <dd>
                                        {
                                            selectedOrder
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
                                        {selectedOrder
                                            .zona?.nombre ??
                                            "No corresponde"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Vendedor
                                    </dt>

                                    <dd>
                                        {
                                            selectedOrder
                                                .vendedor
                                                .nombreCompleto
                                        }
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Mozo
                                    </dt>

                                    <dd>
                                        {selectedOrder
                                            .mozo
                                            ?.nombreCompleto ??
                                            "Sin asignar"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Estado
                                    </dt>

                                    <dd>
                                        <span
                                            className={`order-status ${selectedOrder.estado.toLowerCase()}`}
                                        >
                                            {formatLabel(
                                                selectedOrder
                                                    .estado
                                            )}
                                        </span>
                                    </dd>
                                </div>
                            </dl>

                            {selectedOrder
                                .observaciones && (
                                <p className="order-notes">
                                    {
                                        selectedOrder
                                            .observaciones
                                    }
                                </p>
                            )}
                        </section>

                        <section>
                            <h4>
                                Productos
                            </h4>

                            <div className="order-detail-products">
                                {selectedOrder.detalles.map(
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
                                                    {formatLabel(
                                                        detail.estado
                                                    )}
                                                </small>
                                            </div>

                                            <span>
                                                {
                                                    detail.cantidad
                                                }{" "}
                                                ×{" "}
                                                {formatMoney(
                                                    detail
                                                        .precioUnitario
                                                )}
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
                        </section>
                    </div>

                    <section className="order-command-section">
                        <h4>
                            Comandas generadas
                        </h4>

                        {selectedOrder
                            .comandas.length ===
                        0 ? (
                            <div className="order-empty-small">
                                El pedido todavía no tiene comandas.
                            </div>
                        ) : (
                            <div className="order-command-list">
                                {selectedOrder.comandas.map(
                                    (
                                        command
                                    ) => (
                                        <article
                                            key={
                                                command.id
                                            }
                                        >
                                            <div>
                                                <strong>
                                                    {
                                                        command.codigo
                                                    }
                                                </strong>

                                                <small>
                                                    {formatLabel(
                                                        command.destino
                                                    )}
                                                    {" · "}
                                                    {command
                                                        .cantidadDetalles}{" "}
                                                    producto(s)
                                                </small>
                                            </div>

                                            <span
                                                className={`order-status ${command.estado.toLowerCase()}`}
                                            >
                                                {formatLabel(
                                                    command.estado
                                                )}
                                            </span>
                                        </article>
                                    )
                                )}
                            </div>
                        )}
                    </section>
                </article>
            )}
        </section>
    );
}

export default OrdersAdmin;