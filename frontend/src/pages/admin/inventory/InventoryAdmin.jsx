import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaArrowDown,
    FaArrowUp,
    FaBoxes,
    FaCalendarDay,
    FaExchangeAlt,
    FaExclamationTriangle,
    FaHistory,
    FaSave,
    FaSearch,
    FaTimes
} from "react-icons/fa";

import { useAuth } from "../../../context/AuthContext";
import { useRealtimeVersion } from "../../../context/RealtimeContext";
import { ApiError } from "../../../services/api";

import {
    createDailyStockRequest,
    createInventoryMovementRequest,
    listInventoryMovementsRequest,
    listInventoryRequest
} from "../../../services/inventory.service";

import "./inventoryAdmin.css";

const initialInventory = {
    fechaOperativa: "",
    sucursales: [],
    inventario: [],
    total: 0,
    totalAlertas: 0
};

const initialDailyForm = {
    cantidadInicial: "",
    motivo: "Apertura de stock diario"
};

const initialMovementForm = {
    tipoMovimiento: "ENTRADA_COMPRA",
    cantidad: "",
    costoUnitario: "",
    motivo: ""
};

const movementTypes = [
    {
        codigo: "ENTRADA_COMPRA",
        nombre: "Entrada por compra",
        tipo: "ENTRADA"
    },
    {
        codigo: "AJUSTE_ENTRADA",
        nombre: "Ajuste de entrada",
        tipo: "ENTRADA"
    },
    {
        codigo: "AJUSTE_SALIDA",
        nombre: "Ajuste de salida",
        tipo: "SALIDA"
    },
    {
        codigo: "PERDIDA",
        nombre: "Pérdida",
        tipo: "SALIDA"
    },
    {
        codigo: "VENCIMIENTO",
        nombre: "Vencimiento",
        tipo: "SALIDA"
    },
    {
        codigo: "CONSUMO_INTERNO",
        nombre: "Consumo interno",
        tipo: "SALIDA"
    }
];

const movementLabels = {
    ENTRADA_COMPRA: "Entrada por compra",
    AJUSTE_ENTRADA: "Ajuste de entrada",
    AJUSTE_SALIDA: "Ajuste de salida",
    PERDIDA: "Pérdida",
    VENCIMIENTO: "Vencimiento",
    VENTA: "Venta",
    ANULACION_VENTA: "Anulación de venta",
    COMPROMISO_RESERVA: "Compromiso de reserva",
    LIBERACION_RESERVA: "Liberación de reserva",
    CONSUMO_INTERNO: "Consumo interno"
};

const entryMovementTypes = new Set([
    "ENTRADA_COMPRA",
    "AJUSTE_ENTRADA",
    "ANULACION_VENTA",
    "LIBERACION_RESERVA"
]);

const quantityFormatter =
    new Intl.NumberFormat(
        "es-PE",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
        }
    );

const moneyFormatter =
    new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN",
            minimumFractionDigits: 2
        }
    );

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

function InventoryAdmin() {
    const { token } = useAuth();
    const realtimeVersion =
        useRealtimeVersion([
            "INVENTORY"
        ]);

    const [
        activeTab,
        setActiveTab
    ] = useState("STOCK");

    const [
        inventory,
        setInventory
    ] = useState(initialInventory);

    const [
        movements,
        setMovements
    ] = useState([]);

    const [
        search,
        setSearch
    ] = useState("");

    const [
        appliedSearch,
        setAppliedSearch
    ] = useState("");

    const [
        branchFilter,
        setBranchFilter
    ] = useState("");

    const [
        stockTypeFilter,
        setStockTypeFilter
    ] = useState("TODOS");

    const [
        onlyAlerts,
        setOnlyAlerts
    ] = useState(false);

    const [
        movementSearch,
        setMovementSearch
    ] = useState("");

    const [
        appliedMovementSearch,
        setAppliedMovementSearch
    ] = useState("");

    const [
        movementTypeFilter,
        setMovementTypeFilter
    ] = useState("TODOS");

    const [
        isLoading,
        setIsLoading
    ] = useState(true);

    const [
        movementsLoading,
        setMovementsLoading
    ] = useState(false);

    const [
        isSaving,
        setIsSaving
    ] = useState(false);

    const [
        dailyTarget,
        setDailyTarget
    ] = useState(null);

    const [
        movementTarget,
        setMovementTarget
    ] = useState(null);

    const [
        dailyForm,
        setDailyForm
    ] = useState(initialDailyForm);

    const [
        movementForm,
        setMovementForm
    ] = useState(
        initialMovementForm
    );

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
        movementReloadKey,
        setMovementReloadKey
    ] = useState(0);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadInventory() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await listInventoryRequest(
                        token,
                        {
                            search:
                                appliedSearch,

                            sucursalId:
                                branchFilter,

                            tipoStock:
                                stockTypeFilter,

                            soloAlertas:
                                onlyAlerts,

                            signal:
                                controller.signal
                        }
                    );

                setInventory(result);
            } catch (requestError) {
                if (
                    requestError instanceof
                    DOMException &&
                    requestError.name ===
                    "AbortError"
                ) {
                    return;
                }

                const apiMessage =
                    getApiErrorMessage(
                        requestError
                    );

                setError(
                    apiMessage ??
                    "No se pudo cargar el inventario."
                );
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setIsLoading(false);
                }
            }
        }

        void loadInventory();

        return () => {
            controller.abort();
        };
    }, [
        token,
        appliedSearch,
        branchFilter,
        stockTypeFilter,
        onlyAlerts,
        reloadKey,
        realtimeVersion
    ]);

    useEffect(() => {
        if (
            activeTab !== "MOVIMIENTOS"
        ) {
            return undefined;
        }

        const controller =
            new AbortController();

        async function loadMovements() {
            setMovementsLoading(true);
            setError("");

            try {
                const result =
                    await listInventoryMovementsRequest(
                        token,
                        {
                            search:
                                appliedMovementSearch,

                            sucursalId:
                                branchFilter,

                            tipoMovimiento:
                                movementTypeFilter,

                            limit: 50,

                            signal:
                                controller.signal
                        }
                    );

                setMovements(
                    result.movimientos
                );
            } catch (requestError) {
                if (
                    requestError instanceof
                    DOMException &&
                    requestError.name ===
                    "AbortError"
                ) {
                    return;
                }

                const apiMessage =
                    getApiErrorMessage(
                        requestError
                    );

                setError(
                    apiMessage ??
                    "No se pudieron cargar los movimientos."
                );
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setMovementsLoading(false);
                }
            }
        }

        void loadMovements();

        return () => {
            controller.abort();
        };
    }, [
        token,
        activeTab,
        appliedMovementSearch,
        branchFilter,
        movementTypeFilter,
        movementReloadKey,
        realtimeVersion
    ]);

    const pendingDailyStocks =
        useMemo(
            () =>
                inventory.inventario.filter(
                    (item) =>
                        item.producto
                            .tipoStock ===
                        "DIARIO" &&
                        !item
                            .stockDiarioInicializado
                ).length,
            [inventory.inventario]
        );

    function handleInventorySearch(
        event
    ) {
        event.preventDefault();

        setAppliedSearch(
            search.trim()
        );
    }

    function handleMovementSearch(
        event
    ) {
        event.preventDefault();

        setAppliedMovementSearch(
            movementSearch.trim()
        );
    }

    function openDailyStockForm(item) {
        setDailyTarget(item);

        setDailyForm(
            initialDailyForm
        );

        setMovementTarget(null);
        setMessage("");
        setError("");
    }

    function closeDailyStockForm() {
        if (isSaving) {
            return;
        }

        setDailyTarget(null);

        setDailyForm(
            initialDailyForm
        );
    }

    function openMovementForm(item) {
        setMovementTarget(item);

        setMovementForm(
            initialMovementForm
        );

        setDailyTarget(null);
        setMessage("");
        setError("");
    }

    function closeMovementForm() {
        if (isSaving) {
            return;
        }

        setMovementTarget(null);

        setMovementForm(
            initialMovementForm
        );
    }

    async function handleDailySubmit(
        event
    ) {
        event.preventDefault();

        if (!dailyTarget) {
            return;
        }

        setMessage("");
        setError("");

        const quantity =
            Number(
                dailyForm
                    .cantidadInicial
            );

        if (
            !Number.isFinite(quantity) ||
            quantity < 0
        ) {
            setError(
                "La cantidad inicial no puede ser negativa."
            );

            return;
        }

        if (
            dailyForm.motivo
                .trim()
                .length < 3
        ) {
            setError(
                "Ingresa un motivo válido."
            );

            return;
        }

        setIsSaving(true);

        try {
            const response =
                await createDailyStockRequest(
                    token,
                    {
                        productoSucursalId:
                            dailyTarget
                                .productoSucursalId,

                        cantidadInicial:
                            quantity,

                        motivo:
                            dailyForm
                                .motivo
                                .trim()
                    }
                );

            setMessage(
                response.message
            );

            setDailyTarget(null);

            setDailyForm(
                initialDailyForm
            );

            setReloadKey(
                (value) => value + 1
            );

            setMovementReloadKey(
                (value) => value + 1
            );
        } catch (requestError) {
            const apiMessage =
                getApiErrorMessage(
                    requestError
                );

            setError(
                apiMessage ??
                "No se pudo inicializar el stock diario."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleMovementSubmit(
        event
    ) {
        event.preventDefault();

        if (!movementTarget) {
            return;
        }

        setMessage("");
        setError("");

        const quantity =
            Number(
                movementForm.cantidad
            );

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            setError(
                "La cantidad debe ser mayor que cero."
            );

            return;
        }

        if (
            movementForm.motivo
                .trim()
                .length < 3
        ) {
            setError(
                "Ingresa un motivo válido."
            );

            return;
        }

        const requestData = {
            productoSucursalId:
                movementTarget
                    .productoSucursalId,

            tipoMovimiento:
                movementForm
                    .tipoMovimiento,

            cantidad:
                quantity,

            motivo:
                movementForm
                    .motivo
                    .trim()
        };

        if (
            movementForm
                .costoUnitario !== ""
        ) {
            const unitCost =
                Number(
                    movementForm
                        .costoUnitario
                );

            if (
                !Number.isFinite(
                    unitCost
                ) ||
                unitCost < 0
            ) {
                setError(
                    "El costo unitario no puede ser negativo."
                );

                return;
            }

            requestData.costoUnitario =
                unitCost;
        }

        setIsSaving(true);

        try {
            const response =
                await createInventoryMovementRequest(
                    token,
                    requestData
                );

            setMessage(
                response.message
            );

            setMovementTarget(null);

            setMovementForm(
                initialMovementForm
            );

            setReloadKey(
                (value) => value + 1
            );

            setMovementReloadKey(
                (value) => value + 1
            );
        } catch (requestError) {
            const apiMessage =
                getApiErrorMessage(
                    requestError
                );

            setError(
                apiMessage ??
                "No se pudo registrar el movimiento."
            );
        } finally {
            setIsSaving(false);
        }
    }

    function getStockStatus(item) {
        if (
            item.producto.tipoStock ===
            "DIARIO" &&
            !item.stockDiarioInicializado
        ) {
            return {
                text: "Sin apertura",
                className: "pending"
            };
        }

        if (item.alerta) {
            return {
                text: "Stock bajo",
                className: "alert"
            };
        }

        return {
            text: "Normal",
            className: "normal"
        };
    }

    return (
        <section className="inventory-admin admin-page">
            <header className="inventory-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        INVENTARIO
                    </span>

                    <h2>
                        Control de existencias
                    </h2>

                    <p>
                        Administra entradas,
                        salidas, cantidades
                        comprometidas y alertas
                        de stock.
                    </p>
                </div>

                <div className="inventory-date">
                    <span>
                        Fecha operativa
                    </span>

                    <strong>
                        {inventory
                            .fechaOperativa ||
                            "Cargando..."}
                    </strong>
                </div>
            </header>

            <div
                className="inventory-tabs admin-tabs"
                role="tablist"
                aria-label="Secciones de inventario"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={
                        activeTab === "STOCK"
                    }
                    className={
                        activeTab === "STOCK"
                            ? "admin-tab active"
                            : "admin-tab"
                    }
                    onClick={() =>
                        setActiveTab("STOCK")
                    }
                >
                    <FaBoxes />
                    <span>
                        Control de stock
                    </span>
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={
                        activeTab ===
                        "MOVIMIENTOS"
                    }
                    className={
                        activeTab ===
                            "MOVIMIENTOS"
                            ? "admin-tab active"
                            : "admin-tab"
                    }
                    onClick={() =>
                        setActiveTab(
                            "MOVIMIENTOS"
                        )
                    }
                >
                    <FaHistory />
                    <span>
                        Historial
                    </span>
                </button>
            </div>

            {message && (
                <div
                    className="inventory-feedback admin-feedback success"
                    role="status"
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    className="inventory-feedback admin-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <div className="inventory-summary-grid admin-metric-grid columns-3">
                <article>
                    <div className="inventory-summary-icon">
                        <FaBoxes />
                    </div>

                    <div>
                        <span>
                            Registros visibles
                        </span>

                        <strong>
                            {inventory.total}
                        </strong>
                    </div>
                </article>

                <article>
                    <div className="inventory-summary-icon alert">
                        <FaExclamationTriangle />
                    </div>

                    <div>
                        <span>
                            Alertas de stock
                        </span>

                        <strong>
                            {
                                inventory
                                    .totalAlertas
                            }
                        </strong>
                    </div>
                </article>

                <article>
                    <div className="inventory-summary-icon pending">
                        <FaCalendarDay />
                    </div>

                    <div>
                        <span>
                            Aperturas pendientes
                        </span>

                        <strong>
                            {
                                pendingDailyStocks
                            }
                        </strong>
                    </div>
                </article>
            </div>

            {activeTab === "STOCK" ? (
                <>
                    <form
                        className="inventory-filters admin-filter-bar"
                        onSubmit={
                            handleInventorySearch
                        }
                    >
                        <div className="inventory-search">
                            <FaSearch />

                            <input
                                type="search"
                                value={search}
                                maxLength={150}
                                placeholder="Código o producto..."
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
                                branchFilter
                            }
                            onChange={(event) =>
                                setBranchFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="">
                                Todas las sucursales
                            </option>

                            {inventory
                                .sucursales
                                .map(
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
                                stockTypeFilter
                            }
                            onChange={(event) =>
                                setStockTypeFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="TODOS">
                                Todos los tipos
                            </option>

                            <option value="PERMANENTE">
                                Stock permanente
                            </option>

                            <option value="DIARIO">
                                Stock diario
                            </option>
                        </select>

                        <label className="inventory-alert-filter">
                            <input
                                type="checkbox"
                                checked={
                                    onlyAlerts
                                }
                                onChange={(event) =>
                                    setOnlyAlerts(
                                        event
                                            .target
                                            .checked
                                    )
                                }
                            />

                            <span>
                                Solo alertas
                            </span>
                        </label>

                        <button type="submit">
                            Buscar
                        </button>
                    </form>

                    {dailyTarget && (
                        <form
                            className="inventory-action-form"
                            onSubmit={
                                handleDailySubmit
                            }
                        >
                            <div className="inventory-form-heading">
                                <div>
                                    <span className="admin-eyebrow">
                                        APERTURA DIARIA
                                    </span>

                                    <h3>
                                        {
                                            dailyTarget
                                                .producto
                                                .nombre
                                        }
                                    </h3>

                                    <p>
                                        {
                                            dailyTarget
                                                .sucursal
                                                .nombre
                                        }
                                        {" · "}
                                        {
                                            dailyTarget
                                                .producto
                                                .unidadMedida
                                                .abreviatura
                                        }
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="inventory-close-button"
                                    aria-label="Cerrar formulario"
                                    onClick={
                                        closeDailyStockForm
                                    }
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="inventory-form-grid">
                                <div className="inventory-field">
                                    <label htmlFor="daily-quantity">
                                        Cantidad inicial *
                                    </label>

                                    <input
                                        id="daily-quantity"
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={
                                            dailyForm
                                                .cantidadInicial
                                        }
                                        onChange={(event) =>
                                            setDailyForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    cantidadInicial:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>

                                <div className="inventory-field inventory-field-wide">
                                    <label htmlFor="daily-reason">
                                        Motivo *
                                    </label>

                                    <input
                                        id="daily-reason"
                                        type="text"
                                        maxLength={500}
                                        value={
                                            dailyForm
                                                .motivo
                                        }
                                        onChange={(event) =>
                                            setDailyForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    motivo:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="inventory-form-actions">
                                <button
                                    type="button"
                                    className="inventory-secondary-button"
                                    disabled={
                                        isSaving
                                    }
                                    onClick={
                                        closeDailyStockForm
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="inventory-primary-button"
                                    disabled={
                                        isSaving
                                    }
                                >
                                    <FaSave />

                                    <span>
                                        {isSaving
                                            ? "Guardando..."
                                            : "Inicializar stock"}
                                    </span>
                                </button>
                            </div>
                        </form>
                    )}

                    {movementTarget && (
                        <form
                            className="inventory-action-form"
                            onSubmit={
                                handleMovementSubmit
                            }
                        >
                            <div className="inventory-form-heading">
                                <div>
                                    <span className="admin-eyebrow">
                                        MOVIMIENTO MANUAL
                                    </span>

                                    <h3>
                                        {
                                            movementTarget
                                                .producto
                                                .nombre
                                        }
                                    </h3>

                                    <p>
                                        {
                                            movementTarget
                                                .sucursal
                                                .nombre
                                        }
                                        {" · Disponible: "}
                                        {quantityFormatter.format(
                                            movementTarget
                                                .stockDisponible
                                        )}
                                        {" "}
                                        {
                                            movementTarget
                                                .producto
                                                .unidadMedida
                                                .abreviatura
                                        }
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="inventory-close-button"
                                    aria-label="Cerrar formulario"
                                    onClick={
                                        closeMovementForm
                                    }
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="inventory-form-grid">
                                <div className="inventory-field">
                                    <label htmlFor="movement-type">
                                        Tipo de movimiento *
                                    </label>

                                    <select
                                        id="movement-type"
                                        value={
                                            movementForm
                                                .tipoMovimiento
                                        }
                                        onChange={(event) =>
                                            setMovementForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    tipoMovimiento:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    >
                                        {movementTypes.map(
                                            (type) => (
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
                                        )}
                                    </select>
                                </div>

                                <div className="inventory-field">
                                    <label htmlFor="movement-quantity">
                                        Cantidad *
                                    </label>

                                    <input
                                        id="movement-quantity"
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={
                                            movementForm
                                                .cantidad
                                        }
                                        onChange={(event) =>
                                            setMovementForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    cantidad:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>

                                <div className="inventory-field">
                                    <label htmlFor="movement-cost">
                                        Costo unitario
                                    </label>

                                    <input
                                        id="movement-cost"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            movementForm
                                                .costoUnitario
                                        }
                                        placeholder="Opcional"
                                        onChange={(event) =>
                                            setMovementForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    costoUnitario:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>

                                <div className="inventory-field inventory-field-wide">
                                    <label htmlFor="movement-reason">
                                        Motivo *
                                    </label>

                                    <input
                                        id="movement-reason"
                                        type="text"
                                        maxLength={1000}
                                        value={
                                            movementForm
                                                .motivo
                                        }
                                        placeholder="Describe la razón del movimiento"
                                        onChange={(event) =>
                                            setMovementForm(
                                                (
                                                    previous
                                                ) => ({
                                                    ...previous,

                                                    motivo:
                                                        event
                                                            .target
                                                            .value
                                                })
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="inventory-form-actions">
                                <button
                                    type="button"
                                    className="inventory-secondary-button"
                                    disabled={
                                        isSaving
                                    }
                                    onClick={
                                        closeMovementForm
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="inventory-primary-button"
                                    disabled={
                                        isSaving
                                    }
                                >
                                    <FaExchangeAlt />

                                    <span>
                                        {isSaving
                                            ? "Registrando..."
                                            : "Registrar movimiento"}
                                    </span>
                                </button>
                            </div>
                        </form>
                    )}

                    <article className="inventory-table-card">
                        <div className="inventory-table-heading">
                            <div>
                                <h3>
                                    Existencias registradas
                                </h3>

                                <span>
                                    {
                                        inventory.total
                                    }{" "}
                                    resultado(s)
                                </span>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="inventory-empty-state">
                                <FaBoxes />

                                <strong>
                                    Cargando inventario...
                                </strong>
                            </div>
                        ) : inventory
                            .inventario
                            .length === 0 ? (
                            <div className="inventory-empty-state">
                                <FaBoxes />

                                <strong>
                                    No se encontraron registros
                                </strong>

                                <p>
                                    Registra productos con
                                    control de stock o modifica
                                    los filtros.
                                </p>
                            </div>
                        ) : (
                            <div className="inventory-table-wrapper admin-table-shell">
                                <table className="inventory-table admin-data-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                Producto
                                            </th>

                                            <th>
                                                Sucursal
                                            </th>

                                            <th>
                                                Tipo
                                            </th>

                                            <th>
                                                Actual
                                            </th>

                                            <th>
                                                Comprometido
                                            </th>

                                            <th>
                                                Disponible
                                            </th>

                                            <th>
                                                Mínimo
                                            </th>

                                            <th>
                                                Estado
                                            </th>

                                            <th>
                                                Acción
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {inventory
                                            .inventario
                                            .map(
                                                (
                                                    item
                                                ) => {
                                                    const status =
                                                        getStockStatus(
                                                            item
                                                        );

                                                    const dailyPending =
                                                        item
                                                            .producto
                                                            .tipoStock ===
                                                        "DIARIO" &&
                                                        !item
                                                            .stockDiarioInicializado;

                                                    return (
                                                        <tr
                                                            key={
                                                                item
                                                                    .productoSucursalId
                                                            }
                                                            className={
                                                                item.alerta
                                                                    ? "inventory-alert-row"
                                                                    : ""
                                                            }
                                                        >
                                                            <td>
                                                                <div className="inventory-product-cell">
                                                                    <strong>
                                                                        {
                                                                            item
                                                                                .producto
                                                                                .nombre
                                                                        }
                                                                    </strong>

                                                                    <span>
                                                                        {
                                                                            item
                                                                                .producto
                                                                                .codigo
                                                                        }
                                                                    </span>

                                                                    <small>
                                                                        {
                                                                            item
                                                                                .producto
                                                                                .unidadMedida
                                                                                .abreviatura
                                                                        }
                                                                    </small>
                                                                </div>
                                                            </td>

                                                            <td>
                                                                {
                                                                    item
                                                                        .sucursal
                                                                        .nombre
                                                                }
                                                            </td>

                                                            <td>
                                                                <span className="inventory-stock-type">
                                                                    {
                                                                        item
                                                                            .producto
                                                                            .tipoStock
                                                                    }
                                                                </span>
                                                            </td>

                                                            <td>
                                                                {quantityFormatter.format(
                                                                    item
                                                                        .stockActual
                                                                )}
                                                            </td>

                                                            <td>
                                                                {quantityFormatter.format(
                                                                    item
                                                                        .stockComprometido
                                                                )}
                                                            </td>

                                                            <td>
                                                                <strong
                                                                    className={
                                                                        item.alerta
                                                                            ? "inventory-low-value"
                                                                            : ""
                                                                    }
                                                                >
                                                                    {quantityFormatter.format(
                                                                        item
                                                                            .stockDisponible
                                                                    )}
                                                                </strong>
                                                            </td>

                                                            <td>
                                                                {quantityFormatter.format(
                                                                    item
                                                                        .stockMinimo
                                                                )}
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={`admin-status-badge inventory-status ${status.className}`}
                                                                >
                                                                    {
                                                                        status.text
                                                                    }
                                                                </span>
                                                            </td>

                                                            <td>
                                                                {dailyPending ? (
                                                                    <button
                                                                        type="button"
                                                                        className="inventory-row-button daily"
                                                                        onClick={() =>
                                                                            openDailyStockForm(
                                                                                item
                                                                            )
                                                                        }
                                                                    >
                                                                        <FaCalendarDay />
                                                                        <span>
                                                                            Inicializar
                                                                        </span>
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        className="inventory-row-button"
                                                                        onClick={() =>
                                                                            openMovementForm(
                                                                                item
                                                                            )
                                                                        }
                                                                    >
                                                                        <FaExchangeAlt />
                                                                        <span>
                                                                            Movimiento
                                                                        </span>
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </article>
                </>
            ) : (
                <>
                    <form
                        className="inventory-filters movement-filters admin-filter-bar"
                        onSubmit={
                            handleMovementSearch
                        }
                    >
                        <div className="inventory-search">
                            <FaSearch />

                            <input
                                type="search"
                                value={
                                    movementSearch
                                }
                                maxLength={150}
                                placeholder="Producto o motivo..."
                                onChange={(event) =>
                                    setMovementSearch(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </div>

                        <select
                            value={
                                branchFilter
                            }
                            onChange={(event) =>
                                setBranchFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="">
                                Todas las sucursales
                            </option>

                            {inventory
                                .sucursales
                                .map(
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
                                movementTypeFilter
                            }
                            onChange={(event) =>
                                setMovementTypeFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="TODOS">
                                Todos los movimientos
                            </option>

                            {Object.entries(
                                movementLabels
                            ).map(
                                ([
                                    code,
                                    label
                                ]) => (
                                    <option
                                        key={code}
                                        value={code}
                                    >
                                        {label}
                                    </option>
                                )
                            )}
                        </select>

                        <button type="submit">
                            Buscar
                        </button>
                    </form>

                    <article className="inventory-table-card">
                        <div className="inventory-table-heading">
                            <div>
                                <h3>
                                    Historial de movimientos
                                </h3>

                                <span>
                                    {
                                        movements.length
                                    }{" "}
                                    movimiento(s)
                                </span>
                            </div>
                        </div>

                        {movementsLoading ? (
                            <div className="inventory-empty-state">
                                <FaHistory />

                                <strong>
                                    Cargando movimientos...
                                </strong>
                            </div>
                        ) : movements.length ===
                            0 ? (
                            <div className="inventory-empty-state">
                                <FaHistory />

                                <strong>
                                    No hay movimientos
                                </strong>

                                <p>
                                    Los movimientos de
                                    inventario aparecerán
                                    aquí.
                                </p>
                            </div>
                        ) : (
                            <div className="inventory-table-wrapper admin-table-shell">
                                <table className="inventory-table movement-table admin-data-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                Movimiento
                                            </th>

                                            <th>
                                                Producto
                                            </th>

                                            <th>
                                                Sucursal
                                            </th>

                                            <th>
                                                Cantidad
                                            </th>

                                            <th>
                                                Existencia
                                            </th>

                                            <th>
                                                Costo
                                            </th>

                                            <th>
                                                Responsable
                                            </th>

                                            <th>
                                                Fecha
                                            </th>

                                            <th>
                                                Motivo
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {movements.map(
                                            (
                                                movement
                                            ) => {
                                                const isEntry =
                                                    entryMovementTypes.has(
                                                        movement
                                                            .tipoMovimiento
                                                    );

                                                return (
                                                    <tr
                                                        key={
                                                            movement.id
                                                        }
                                                    >
                                                        <td>
                                                            <span
                                                                className={`movement-type ${isEntry
                                                                        ? "entry"
                                                                        : "exit"
                                                                    }`}
                                                            >
                                                                {isEntry ? (
                                                                    <FaArrowUp />
                                                                ) : (
                                                                    <FaArrowDown />
                                                                )}

                                                                <span>
                                                                    {movementLabels[
                                                                        movement
                                                                            .tipoMovimiento
                                                                    ] ??
                                                                        movement
                                                                            .tipoMovimiento}
                                                                </span>
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div className="inventory-product-cell">
                                                                <strong>
                                                                    {
                                                                        movement
                                                                            .productoSucursal
                                                                            .producto
                                                                            .nombre
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    {
                                                                        movement
                                                                            .productoSucursal
                                                                            .producto
                                                                            .codigo
                                                                    }
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            {
                                                                movement
                                                                    .productoSucursal
                                                                    .sucursal
                                                                    .nombre
                                                            }
                                                        </td>

                                                        <td>
                                                            <strong
                                                                className={
                                                                    isEntry
                                                                        ? "movement-entry-value"
                                                                        : "movement-exit-value"
                                                                }
                                                            >
                                                                {isEntry
                                                                    ? "+"
                                                                    : "-"}
                                                                {quantityFormatter.format(
                                                                    movement
                                                                        .cantidad
                                                                )}
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            <span className="movement-stock-change">
                                                                {quantityFormatter.format(
                                                                    movement
                                                                        .cantidadAnterior
                                                                )}

                                                                {" → "}

                                                                <strong>
                                                                    {quantityFormatter.format(
                                                                        movement
                                                                            .cantidadResultante
                                                                    )}
                                                                </strong>
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {movement
                                                                .costoTotal !==
                                                                null
                                                                ? moneyFormatter.format(
                                                                    movement
                                                                        .costoTotal
                                                                )
                                                                : "—"}
                                                        </td>

                                                        <td>
                                                            {
                                                                movement
                                                                    .usuario
                                                                    .nombreCompleto
                                                            }
                                                        </td>

                                                        <td>
                                                            <time
                                                                dateTime={
                                                                    movement
                                                                        .createdAt
                                                                }
                                                            >
                                                                {new Date(
                                                                    movement
                                                                        .createdAt
                                                                ).toLocaleString(
                                                                    "es-PE",
                                                                    {
                                                                        dateStyle:
                                                                            "short",

                                                                        timeStyle:
                                                                            "short"
                                                                    }
                                                                )}
                                                            </time>
                                                        </td>

                                                        <td>
                                                            <span className="movement-reason">
                                                                {
                                                                    movement.motivo
                                                                }
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </article>
                </>
            )}
        </section>
    );
}

export default InventoryAdmin;
