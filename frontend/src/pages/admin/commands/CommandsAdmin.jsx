import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaBars,
    FaCheck,
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaEye,
    FaFire,
    FaGlassMartiniAlt,
    FaPlay,
    FaRedoAlt,
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
    completeCommandRequest,
    getCommandByIdRequest,
    getCommandOptionsRequest,
    listCommandsRequest,
    startCommandRequest
} from "../../../services/command.service";

import "./commandsAdmin.css";

const EMPTY_OPTIONS = {
    sucursales: [],
    sucursalSeleccionadaId: null,
    destinos: [],
    estados: [],
    prioridades: []
};

const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

const DEFAULT_FILTERS = {
    sucursalId: "",
    destino: "TODOS",
    estado: "ACTIVAS",
    prioridad: "TODAS"
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
        "es-ES",
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
        "es-ES",
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

function getElapsedMinutes(value) {
    if (!value) {
        return 0;
    }

    const initialDate =
        new Date(value);

    const difference =
        Date.now() -
        initialDate.getTime();

    return Math.max(
        0,
        Math.floor(
            difference /
                60000
        )
    );
}

function CommandsAdmin() {
    const {
        token
    } = useAuth();

    const [
        options,
        setOptions
    ] = useState(
        EMPTY_OPTIONS
    );

    const [
        commands,
        setCommands
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
    ] = useState(
        DEFAULT_FILTERS
    );

    const [
        selectedCommand,
        setSelectedCommand
    ] = useState(null);

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

    const [
        lastUpdate,
        setLastUpdate
    ] = useState(
        new Date()
    );

    const pendingCount =
        useMemo(
            () =>
                commands.filter(
                    (command) =>
                        command.estado ===
                        "PENDIENTE"
                ).length,
            [commands]
        );

    const preparingCount =
        useMemo(
            () =>
                commands.filter(
                    (command) =>
                        command.estado ===
                        "PREPARANDO"
                ).length,
            [commands]
        );

    const kitchenCount =
        useMemo(
            () =>
                commands.filter(
                    (command) =>
                        command.destino ===
                        "COCINA"
                ).length,
            [commands]
        );

    const barCount =
        useMemo(
            () =>
                commands.filter(
                    (command) =>
                        command.destino ===
                        "BARRA"
                ).length,
            [commands]
        );

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadOptions() {
            setIsLoadingOptions(true);
            setError("");

            try {
                const result =
                    await getCommandOptionsRequest(
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
                        "No se pudieron cargar las opciones de comandas."
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

        async function loadCommands() {
            setIsLoadingList(true);

            try {
                const result =
                    await listCommandsRequest(
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

                setCommands(
                    result.comandas
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
                        "No se pudieron cargar las comandas."
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

        void loadCommands();

        return () =>
            controller.abort();
    }, [
        token,
        appliedSearch,
        filters,
        page,
        reloadKey
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

    function updateFilter(
        field,
        value
    ) {
        setFilters(
            (previous) => ({
                ...previous,
                [field]: value
            })
        );

        setPage(1);
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

    function refreshCommands() {
        clearFeedback();

        setReloadKey(
            (value) =>
                value + 1
        );
    }

    async function openCommandDetail(
        commandId
    ) {
        clearFeedback();
        setIsLoadingDetail(true);

        try {
            const command =
                await getCommandByIdRequest(
                    token,
                    commandId
                );

            setSelectedCommand(
                command
            );

            setTimeout(
                () => {
                    document
                        .getElementById(
                            "command-detail"
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
                    "No se pudo cargar el detalle de la comanda."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    async function handleStartCommand() {
        if (!selectedCommand) {
            return;
        }

        const confirmed =
            window.confirm(
                `¿Iniciar la preparación de la comanda ${selectedCommand.codigo}?`
            );

        if (!confirmed) {
            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await startCommandRequest(
                    token,
                    selectedCommand.id
                );

            setSelectedCommand(
                response.data.comanda
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
                    "No se pudo iniciar la preparación."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleCompleteCommand() {
        if (!selectedCommand) {
            return;
        }

        const confirmed =
            window.confirm(
                `¿Marcar la comanda ${selectedCommand.codigo} como lista?`
            );

        if (!confirmed) {
            return;
        }

        clearFeedback();
        setIsSaving(true);

        try {
            const response =
                await completeCommandRequest(
                    token,
                    selectedCommand.id
                );

            setSelectedCommand(
                response.data.comanda
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
                    "No se pudo finalizar la comanda."
            );
        } finally {
            setIsSaving(false);
        }
    }

    const canStart =
        selectedCommand?.estado ===
        "PENDIENTE";

    const canComplete =
        selectedCommand?.estado ===
        "PREPARANDO";

    return (
        <section className="commands-admin">
            <header className="commands-heading">
                <div>
                    <span className="admin-eyebrow">
                        COCINA Y BARRA
                    </span>

                    <h2>
                        Tablero de comandas
                    </h2>

                    <p>
                        Controla los pedidos
                        pendientes, en preparación
                        y listos.
                    </p>
                </div>

                <button
                    type="button"
                    className="command-refresh-button"
                    disabled={
                        isLoadingList
                    }
                    onClick={
                        refreshCommands
                    }
                >
                    <FaRedoAlt />

                    {isLoadingList
                        ? "Actualizando..."
                        : "Actualizar"}
                </button>
            </header>

            {message && (
                <div className="command-feedback success">
                    {message}
                </div>
            )}

            {error && (
                <div className="command-feedback error">
                    {error}
                </div>
            )}

            <div className="command-stat-grid">
                <article>
                    <div className="command-stat-icon pending">
                        <FaClock />
                    </div>

                    <div>
                        <span>
                            Pendientes
                        </span>

                        <strong>
                            {pendingCount}
                        </strong>
                    </div>
                </article>

                <article>
                    <div className="command-stat-icon preparing">
                        <FaFire />
                    </div>

                    <div>
                        <span>
                            En preparación
                        </span>

                        <strong>
                            {preparingCount}
                        </strong>
                    </div>
                </article>

                <article>
                    <div className="command-stat-icon kitchen">
                        <FaUtensils />
                    </div>

                    <div>
                        <span>
                            Cocina
                        </span>

                        <strong>
                            {kitchenCount}
                        </strong>
                    </div>
                </article>

                <article>
                    <div className="command-stat-icon bar">
                        <FaGlassMartiniAlt />
                    </div>

                    <div>
                        <span>
                            Barra
                        </span>

                        <strong>
                            {barCount}
                        </strong>
                    </div>
                </article>
            </div>

            <form
                className="command-filters"
                onSubmit={
                    handleSearch
                }
            >
                <div className="command-search">
                    <FaSearch />

                    <input
                        type="search"
                        placeholder="Código, pedido, cliente o zona..."
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
                        filters
                            .sucursalId
                    }
                    disabled={
                        isLoadingOptions
                    }
                    onChange={(event) =>
                        updateFilter(
                            "sucursalId",
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

                <select
                    value={
                        filters.destino
                    }
                    onChange={(event) =>
                        updateFilter(
                            "destino",
                            event
                                .target
                                .value
                        )
                    }
                >
                    <option value="TODOS">
                        Cocina y barra
                    </option>

                    <option value="COCINA">
                        Solo cocina
                    </option>

                    <option value="BARRA">
                        Solo barra
                    </option>
                </select>

                <select
                    value={
                        filters.estado
                    }
                    onChange={(event) =>
                        updateFilter(
                            "estado",
                            event
                                .target
                                .value
                        )
                    }
                >
                    <option value="ACTIVAS">
                        Comandas activas
                    </option>

                    <option value="TODOS">
                        Todos los estados
                    </option>

                    <option value="PENDIENTE">
                        Pendientes
                    </option>

                    <option value="PREPARANDO">
                        En preparación
                    </option>

                    <option value="LISTA">
                        Listas
                    </option>

                    <option value="RECHAZADA">
                        Rechazadas
                    </option>

                    <option value="CANCELADA">
                        Canceladas
                    </option>
                </select>

                <select
                    value={
                        filters.prioridad
                    }
                    onChange={(event) =>
                        updateFilter(
                            "prioridad",
                            event
                                .target
                                .value
                        )
                    }
                >
                    <option value="TODAS">
                        Todas las prioridades
                    </option>

                    <option value="NORMAL">
                        Normal
                    </option>

                    <option value="URGENTE">
                        Urgente
                    </option>

                    <option value="EVENTO">
                        Evento
                    </option>
                </select>

                <button type="submit">
                    Buscar
                </button>
            </form>

            <div className="command-update-info">
                <FaRedoAlt />

                Última actualización:{" "}
                {formatTime(
                    lastUpdate
                )}

                <span>
                    Se actualiza cada 15 segundos.
                </span>
            </div>

            {isLoadingList &&
            commands.length === 0 ? (
                <div className="command-empty-state">
                    <FaFire />
                    Cargando comandas...
                </div>
            ) : commands.length ===
              0 ? (
                <div className="command-empty-state">
                    <FaCheck />

                    <strong>
                        No hay comandas con los
                        filtros seleccionados
                    </strong>
                </div>
            ) : (
                <div className="command-board">
                    {commands.map(
                        (command) => {
                            const elapsedMinutes =
                                getElapsedMinutes(
                                    command
                                        .fechaInicio ??
                                        command
                                            .createdAt
                                );

                            return (
                                <article
                                    key={
                                        command.id
                                    }
                                    className={`command-card ${command.estado.toLowerCase()} ${command.prioridad.toLowerCase()}`}
                                >
                                    <header>
                                        <div>
                                            <span className="command-destination">
                                                {command.destino ===
                                                "COCINA" ? (
                                                    <FaUtensils />
                                                ) : (
                                                    <FaGlassMartiniAlt />
                                                )}

                                                {formatLabel(
                                                    command.destino
                                                )}
                                            </span>

                                            <h3>
                                                {
                                                    command.codigo
                                                }
                                            </h3>
                                        </div>

                                        <span
                                            className={`command-priority ${command.prioridad.toLowerCase()}`}
                                        >
                                            {formatLabel(
                                                command.prioridad
                                            )}
                                        </span>
                                    </header>

                                    <div className="command-card-order">
                                        <div>
                                            <span>
                                                Pedido
                                            </span>

                                            <strong>
                                                {
                                                    command
                                                        .pedido
                                                        .codigo
                                                }
                                            </strong>
                                        </div>

                                        <span
                                            className={`command-status ${command.estado.toLowerCase()}`}
                                        >
                                            {formatLabel(
                                                command.estado
                                            )}
                                        </span>
                                    </div>

                                    <dl>
                                        <div>
                                            <dt>
                                                Cliente
                                            </dt>

                                            <dd>
                                                {command
                                                    .pedido
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
                                                {command
                                                    .pedido
                                                    .zona
                                                    ?.nombre ??
                                                    "Para llevar"}
                                            </dd>
                                        </div>

                                        <div>
                                            <dt>
                                                Productos
                                            </dt>

                                            <dd>
                                                {
                                                    command
                                                        .cantidadDetalles
                                                }
                                            </dd>
                                        </div>

                                        <div>
                                            <dt>
                                                Unidades
                                            </dt>

                                            <dd>
                                                {
                                                    command
                                                        .cantidadUnidades
                                                }
                                            </dd>
                                        </div>
                                    </dl>

                                    <div className="command-card-time">
                                        <FaClock />

                                        {command.estado ===
                                        "PREPARANDO"
                                            ? `${elapsedMinutes} min preparando`
                                            : `${elapsedMinutes} min desde el envío`}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={
                                            isLoadingDetail
                                        }
                                        onClick={() =>
                                            openCommandDetail(
                                                command.id
                                            )
                                        }
                                    >
                                        <FaEye />
                                        Ver comanda
                                    </button>
                                </article>
                            );
                        }
                    )}
                </div>
            )}

            <div className="command-pagination">
                <span>
                    Página {pagination.page} de{" "}
                    {pagination.totalPages}
                    {" · "}
                    {pagination.total} resultado(s)
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
                                pagination
                                    .totalPages ||
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

            {selectedCommand && (
                <article
                    id="command-detail"
                    className="command-detail-card"
                >
                    <div className="command-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                DETALLE
                            </span>

                            <h3>
                                Comanda{" "}
                                {
                                    selectedCommand.codigo
                                }
                            </h3>

                            <p>
                                Pedido{" "}
                                {
                                    selectedCommand
                                        .pedido
                                        .codigo
                                }
                                {" · "}
                                {formatDateTime(
                                    selectedCommand
                                        .createdAt
                                )}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="command-close-button"
                            onClick={() =>
                                setSelectedCommand(
                                    null
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="command-detail-summary">
                        <article>
                            <FaBars />

                            <div>
                                <span>
                                    Destino
                                </span>

                                <strong>
                                    {formatLabel(
                                        selectedCommand
                                            .destino
                                    )}
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
                                        selectedCommand
                                            .estado
                                    )}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaUser />

                            <div>
                                <span>
                                    Cliente
                                </span>

                                <strong>
                                    {selectedCommand
                                        .pedido
                                        .cliente
                                        ?.nombreCompleto ??
                                        "Público general"}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaFire />

                            <div>
                                <span>
                                    Prioridad
                                </span>

                                <strong>
                                    {formatLabel(
                                        selectedCommand
                                            .prioridad
                                    )}
                                </strong>
                            </div>
                        </article>
                    </div>

                    <div className="command-detail-actions">
                        {canStart && (
                            <button
                                type="button"
                                className="start"
                                disabled={
                                    isSaving
                                }
                                onClick={
                                    handleStartCommand
                                }
                            >
                                <FaPlay />

                                {isSaving
                                    ? "Procesando..."
                                    : "Iniciar preparación"}
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
                                    handleCompleteCommand
                                }
                            >
                                <FaCheck />

                                {isSaving
                                    ? "Procesando..."
                                    : "Marcar como lista"}
                            </button>
                        )}
                    </div>

                    <div className="command-detail-columns">
                        <section>
                            <h4>
                                Información del pedido
                            </h4>

                            <dl className="command-data-list">
                                <div>
                                    <dt>
                                        Pedido
                                    </dt>

                                    <dd>
                                        {
                                            selectedCommand
                                                .pedido
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
                                            selectedCommand
                                                .pedido
                                                .tipoPedido
                                        )}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Zona
                                    </dt>

                                    <dd>
                                        {selectedCommand
                                            .pedido
                                            .zona
                                            ?.nombre ??
                                            "Para llevar"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Vendedor
                                    </dt>

                                    <dd>
                                        {
                                            selectedCommand
                                                .pedido
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
                                        {selectedCommand
                                            .pedido
                                            .mozo
                                            ?.nombreCompleto ??
                                            "Sin asignar"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Responsable
                                    </dt>

                                    <dd>
                                        {selectedCommand
                                            .procesadoPor
                                            ?.nombreCompleto ??
                                            "Sin iniciar"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Inicio
                                    </dt>

                                    <dd>
                                        {formatDateTime(
                                            selectedCommand
                                                .fechaInicio
                                        )}
                                    </dd>
                                </div>

                                <div>
                                    <dt>
                                        Finalización
                                    </dt>

                                    <dd>
                                        {formatDateTime(
                                            selectedCommand
                                                .fechaFinalizacion
                                        )}
                                    </dd>
                                </div>
                            </dl>

                            {selectedCommand
                                .pedido
                                .observaciones && (
                                <p className="command-notes">
                                    {
                                        selectedCommand
                                            .pedido
                                            .observaciones
                                    }
                                </p>
                            )}
                        </section>

                        <section>
                            <h4>
                                Productos a preparar
                            </h4>

                            <div className="command-detail-products">
                                {selectedCommand.detalles.map(
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
                                                    {formatLabel(
                                                        detail.estado
                                                    )}
                                                </small>
                                            </div>

                                            <span className="command-quantity">
                                                {
                                                    detail.cantidad
                                                }{" "}
                                                {
                                                    detail
                                                        .detallePedido
                                                        .productoSucursal
                                                        .producto
                                                        .unidadMedida
                                                        .abreviatura
                                                }
                                            </span>

                                            {(detail.observaciones ||
                                                detail
                                                    .detallePedido
                                                    .observaciones) && (
                                                <p>
                                                    {detail
                                                        .observaciones ??
                                                        detail
                                                            .detallePedido
                                                            .observaciones}
                                                </p>
                                            )}
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

export default CommandsAdmin;