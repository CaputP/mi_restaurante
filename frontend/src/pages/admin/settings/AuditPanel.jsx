import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaCode,
    FaEye,
    FaHistory,
    FaLaptop,
    FaMapMarkerAlt,
    FaSearch,
    FaShieldAlt,
    FaStore,
    FaSyncAlt,
    FaTimes,
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
    getAuditByIdRequest,
    getAuditOptionsRequest,
    listAuditsRequest
} from "../../../services/audit.service";

import "./auditPanel.css";

const EMPTY_OPTIONS = {
    sucursales: [],
    sucursalSeleccionadaId: null,
    modulos: [],
    acciones: [],
    usuarios: []
};

const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

function createEmptyFilters() {
    return {
        search: "",
        sucursalId: "",
        usuarioId: "",
        modulo: "",
        accion: "",
        fechaDesde: "",
        fechaHasta: ""
    };
}

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
            timeStyle: "medium"
        }
    );
}

function formatJson(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "Sin información registrada.";
    }

    try {
        return JSON.stringify(
            value,
            null,
            2
        );
    } catch {
        return String(value);
    }
}

function getActionClass(action) {
    const normalizedAction =
        String(action ?? "")
            .toLowerCase();

    if (
        [
            "crear",
            "abrir",
            "completar"
        ].includes(
            normalizedAction
        )
    ) {
        return "positive";
    }

    if (
        [
            "anular",
            "cancelar",
            "eliminar"
        ].includes(
            normalizedAction
        )
    ) {
        return "negative";
    }

    if (
        normalizedAction ===
        "actualizar" ||
        normalizedAction ===
        "cambiar_estado" ||
        normalizedAction ===
        "cambiar_editabilidad"
    ) {
        return "warning";
    }

    return "neutral";
}

function AuditPanel() {
    const {
        token
    } = useAuth();

    const realtimeVersion =
        useRealtimeVersion([
            "AUDIT"
        ]);

    const [
        options,
        setOptions
    ] = useState(
        EMPTY_OPTIONS
    );

    const [
        audits,
        setAudits
    ] = useState([]);

    const [
        pagination,
        setPagination
    ] = useState(
        EMPTY_PAGINATION
    );

    const [
        filters,
        setFilters
    ] = useState(
        createEmptyFilters
    );

    const [
        appliedFilters,
        setAppliedFilters
    ] = useState(
        createEmptyFilters
    );

    const [
        page,
        setPage
    ] = useState(1);

    const [
        selectedAudit,
        setSelectedAudit
    ] = useState(null);

    const [
        isLoadingOptions,
        setIsLoadingOptions
    ] = useState(true);

    const [
        isLoading,
        setIsLoading
    ] = useState(true);

    const [
        isLoadingDetail,
        setIsLoadingDetail
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        reloadKey,
        setReloadKey
    ] = useState(0);

    const visibleStatistics =
        useMemo(
            () => {
                const creations =
                    audits.filter(
                        (audit) =>
                            audit.accion ===
                            "CREAR"
                    ).length;

                const updates =
                    audits.filter(
                        (audit) =>
                            [
                                "ACTUALIZAR",
                                "CAMBIAR_ESTADO",
                                "CAMBIAR_EDITABILIDAD"
                            ].includes(
                                audit.accion
                            )
                    ).length;

                const cancellations =
                    audits.filter(
                        (audit) =>
                            [
                                "ANULAR",
                                "CANCELAR",
                                "ELIMINAR"
                            ].includes(
                                audit.accion
                            )
                    ).length;

                const users =
                    new Set(
                        audits
                            .map(
                                (audit) =>
                                    audit.usuario
                                        ?.id
                            )
                            .filter(Boolean)
                    ).size;

                return {
                    creations,
                    updates,
                    cancellations,
                    users
                };
            },
            [audits]
        );

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadOptions() {
            setIsLoadingOptions(true);
            setError("");

            try {
                const result =
                    await getAuditOptionsRequest(
                        token,
                        {
                            signal:
                                controller.signal
                        }
                    );

                setOptions(result);

                const initialBranchId =
                    result
                        .sucursales
                        .length === 1
                        ? result
                            .sucursalSeleccionadaId ??
                        result
                            .sucursales[0]
                            ?.id ??
                        ""
                        : "";

                const initialFilters = {
                    ...createEmptyFilters(),

                    sucursalId:
                        initialBranchId
                };

                setFilters(
                    initialFilters
                );

                setAppliedFilters(
                    initialFilters
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
                    getErrorMessage(
                        requestError
                    ) ??
                    "No se pudieron cargar las opciones de auditoría."
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
        if (isLoadingOptions) {
            return undefined;
        }

        const controller =
            new AbortController();

        async function loadAudits() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await listAuditsRequest(
                        token,
                        {
                            ...appliedFilters,

                            page,
                            limit: 20,

                            signal:
                                controller.signal
                        }
                    );

                setAudits(
                    result.auditorias
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
                    getErrorMessage(
                        requestError
                    ) ??
                    "No se pudo cargar el historial de auditoría."
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

        void loadAudits();

        return () =>
            controller.abort();
    }, [
        token,
        isLoadingOptions,
        appliedFilters,
        page,
        reloadKey,
        realtimeVersion
    ]);

    function handleFilterChange(
        field,
        value
    ) {
        setFilters(
            (previous) => ({
                ...previous,
                [field]: value
            })
        );
    }

    function handleSearch(
        event
    ) {
        event.preventDefault();

        if (
            filters.fechaDesde &&
            filters.fechaHasta &&
            filters.fechaDesde >
            filters.fechaHasta
        ) {
            setError(
                "La fecha inicial no puede ser posterior a la fecha final."
            );
            return;
        }

        setError("");
        setPage(1);

        setAppliedFilters({
            ...filters,

            search:
                filters.search.trim()
        });
    }

    function handleClearFilters() {
        const cleanFilters = {
            ...createEmptyFilters(),

            sucursalId:
                options.sucursales
                    .length === 1
                    ? options
                        .sucursalSeleccionadaId ??
                    options
                        .sucursales[0]
                        ?.id ??
                    ""
                    : ""
        };

        setFilters(
            cleanFilters
        );

        setAppliedFilters(
            cleanFilters
        );

        setSelectedAudit(null);
        setPage(1);
        setError("");
    }

    async function openAuditDetail(
        auditId
    ) {
        setError("");
        setIsLoadingDetail(true);

        try {
            const result =
                await getAuditByIdRequest(
                    token,
                    auditId
                );

            setSelectedAudit(
                result
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                "No se pudo cargar el detalle de auditoría."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    if (isLoadingOptions) {
        return (
            <div className="audit-loading">
                <FaHistory />
                Cargando auditoría...
            </div>
        );
    }

    return (
        <section className="audit-panel">
            <header className="audit-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        AUDITORÍA
                    </span>

                    <h2>
                        Historial de operaciones
                    </h2>

                    <p>
                        Revisa las acciones realizadas
                        por los usuarios del sistema.
                    </p>
                </div>

                <button
                    type="button"
                    disabled={
                        isLoading
                    }
                    onClick={() =>
                        setReloadKey(
                            (value) =>
                                value + 1
                        )
                    }
                >
                    <FaSyncAlt />
                    Actualizar
                </button>
            </header>

            {error && (
                <div
                    className="audit-feedback admin-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <div className="audit-stat-grid admin-metric-grid">
                <article>
                    <FaHistory />

                    <div>
                        <span>
                            Registros encontrados
                        </span>

                        <strong>
                            {pagination.total}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaShieldAlt />

                    <div>
                        <span>
                            Creaciones visibles
                        </span>

                        <strong>
                            {
                                visibleStatistics
                                    .creations
                            }
                        </strong>
                    </div>
                </article>

                <article>
                    <FaCode />

                    <div>
                        <span>
                            Cambios visibles
                        </span>

                        <strong>
                            {
                                visibleStatistics
                                    .updates
                            }
                        </strong>
                    </div>
                </article>

                <article>
                    <FaUser />

                    <div>
                        <span>
                            Usuarios visibles
                        </span>

                        <strong>
                            {
                                visibleStatistics
                                    .users
                            }
                        </strong>
                    </div>
                </article>
            </div>

            <section className="audit-list-card">
                <form
                    className="audit-filters admin-filter-bar"
                    onSubmit={
                        handleSearch
                    }
                >
                    <div className="audit-search">
                        <FaSearch />

                        <input
                            type="search"
                            placeholder="Acción, descripción, entidad, usuario o sucursal..."
                            value={
                                filters.search
                            }
                            onChange={(
                                event
                            ) =>
                                handleFilterChange(
                                    "search",
                                    event.target
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
                        onChange={(
                            event
                        ) =>
                            handleFilterChange(
                                "sucursalId",
                                event.target
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
                            filters.usuarioId
                        }
                        onChange={(
                            event
                        ) =>
                            handleFilterChange(
                                "usuarioId",
                                event.target
                                    .value
                            )
                        }
                    >
                        <option value="">
                            Todos los usuarios
                        </option>

                        {options.usuarios.map(
                            (user) => (
                                <option
                                    key={
                                        user.id
                                    }
                                    value={
                                        user.id
                                    }
                                >
                                    {
                                        user.nombreCompleto
                                    }
                                </option>
                            )
                        )}
                    </select>

                    <select
                        value={
                            filters.modulo
                        }
                        onChange={(
                            event
                        ) =>
                            handleFilterChange(
                                "modulo",
                                event.target
                                    .value
                            )
                        }
                    >
                        <option value="">
                            Todos los módulos
                        </option>

                        {options.modulos.map(
                            (moduleName) => (
                                <option
                                    key={
                                        moduleName
                                    }
                                    value={
                                        moduleName
                                    }
                                >
                                    {formatLabel(
                                        moduleName
                                    )}
                                </option>
                            )
                        )}
                    </select>

                    <select
                        value={
                            filters.accion
                        }
                        onChange={(
                            event
                        ) =>
                            handleFilterChange(
                                "accion",
                                event.target
                                    .value
                            )
                        }
                    >
                        <option value="">
                            Todas las acciones
                        </option>

                        {options.acciones.map(
                            (action) => (
                                <option
                                    key={
                                        action
                                    }
                                    value={
                                        action
                                    }
                                >
                                    {formatLabel(
                                        action
                                    )}
                                </option>
                            )
                        )}
                    </select>

                    <label>
                        <span>
                            Desde
                        </span>

                        <input
                            type="date"
                            value={
                                filters
                                    .fechaDesde
                            }
                            onChange={(
                                event
                            ) =>
                                handleFilterChange(
                                    "fechaDesde",
                                    event.target
                                        .value
                                )
                            }
                        />
                    </label>

                    <label>
                        <span>
                            Hasta
                        </span>

                        <input
                            type="date"
                            value={
                                filters
                                    .fechaHasta
                            }
                            onChange={(
                                event
                            ) =>
                                handleFilterChange(
                                    "fechaHasta",
                                    event.target
                                        .value
                                )
                            }
                        />
                    </label>

                    <div className="audit-filter-actions">
                        <button
                            type="button"
                            aria-label="Cerrar detalle de auditoría"
                            className="secondary"
                            onClick={
                                handleClearFilters
                            }
                        >
                            Limpiar
                        </button>

                        <button
                            type="submit"
                            className="primary"
                        >
                            <FaSearch />
                            Buscar
                        </button>
                    </div>
                </form>

                {isLoading ? (
                    <div className="audit-empty-state">
                        <FaHistory />
                        Cargando registros...
                    </div>
                ) : audits.length === 0 ? (
                    <div className="audit-empty-state">
                        <FaHistory />

                        <strong>
                            No existen registros con los filtros seleccionados
                        </strong>
                    </div>
                ) : (
                    <div className="audit-table-wrapper admin-table-shell">
                        <table className="audit-table admin-data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Usuario</th>
                                    <th>Módulo</th>
                                    <th>Acción</th>
                                    <th>Entidad</th>
                                    <th>Sucursal</th>
                                    <th>IP</th>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>
                                {audits.map(
                                    (audit) => (
                                        <tr
                                            key={
                                                audit.id
                                            }
                                        >
                                            <td>
                                                <div className="audit-date-cell">
                                                    <FaClock />

                                                    <span>
                                                        {formatDateTime(
                                                            audit.createdAt
                                                        )}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="audit-user-cell">
                                                    <strong>
                                                        {audit.usuario
                                                            ?.nombreCompleto ??
                                                            "Sistema"}
                                                    </strong>

                                                    <small>
                                                        {audit.usuario
                                                            ?.correo ??
                                                            "Sin usuario"}
                                                    </small>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="audit-module">
                                                    {formatLabel(
                                                        audit.modulo
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={`audit-action ${getActionClass(
                                                        audit.accion
                                                    )}`}
                                                >
                                                    {formatLabel(
                                                        audit.accion
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="audit-entity-cell">
                                                    <strong>
                                                        {formatLabel(
                                                            audit.entidad
                                                        )}
                                                    </strong>

                                                    <small>
                                                        {audit.entidadId
                                                            ? audit.entidadId.slice(
                                                                0,
                                                                8
                                                            )
                                                            : "-"}
                                                    </small>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="audit-branch-cell">
                                                    <FaStore />

                                                    <span>
                                                        {audit.sucursal
                                                            ?.nombre ??
                                                            "Global"}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <code>
                                                    {audit.direccionIp ??
                                                        "-"}
                                                </code>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="audit-view-button"
                                                    disabled={
                                                        isLoadingDetail
                                                    }
                                                    title="Ver detalle"
                                                    onClick={() =>
                                                        openAuditDetail(
                                                            audit.id
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

                <div className="audit-pagination admin-pagination">
                    <span>
                        Página{" "}
                        {pagination.page} de{" "}
                        {
                            pagination.totalPages
                        }
                    </span>

                    <div>
                        <button
                            type="button"
                            disabled={
                                page <= 1
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
                                    .totalPages
                            }
                            onClick={() =>
                                setPage(
                                    (value) =>
                                        value + 1
                                )
                            }
                        >
                            Siguiente
                            <FaChevronRight />
                        </button>
                    </div>
                </div>
            </section>

            {selectedAudit && (
                <section className="audit-detail-card">
                    <div className="audit-detail-heading">
                        <div>
                            <span className="admin-eyebrow">
                                DETALLE DE AUDITORÍA
                            </span>

                            <h3>
                                {formatLabel(
                                    selectedAudit.accion
                                )}
                                {" · "}
                                {formatLabel(
                                    selectedAudit.entidad
                                )}
                            </h3>

                            <p>
                                {
                                    selectedAudit.descripcion
                                }
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setSelectedAudit(
                                    null
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="audit-detail-summary">
                        <article>
                            <FaUser />

                            <div>
                                <span>
                                    Responsable
                                </span>

                                <strong>
                                    {selectedAudit
                                        .usuario
                                        ?.nombreCompleto ??
                                        "Sistema"}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaStore />

                            <div>
                                <span>
                                    Sucursal
                                </span>

                                <strong>
                                    {selectedAudit
                                        .sucursal
                                        ?.nombre ??
                                        "Global"}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaMapMarkerAlt />

                            <div>
                                <span>
                                    Dirección IP
                                </span>

                                <strong>
                                    {selectedAudit
                                        .direccionIp ??
                                        "-"}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaClock />

                            <div>
                                <span>
                                    Fecha
                                </span>

                                <strong>
                                    {formatDateTime(
                                        selectedAudit
                                            .createdAt
                                    )}
                                </strong>
                            </div>
                        </article>
                    </div>

                    <dl className="audit-data-list">
                        <div>
                            <dt>
                                Módulo
                            </dt>

                            <dd>
                                {formatLabel(
                                    selectedAudit.modulo
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                Entidad
                            </dt>

                            <dd>
                                {formatLabel(
                                    selectedAudit.entidad
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                Identificador
                            </dt>

                            <dd>
                                {selectedAudit
                                    .entidadId ??
                                    "-"}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                Rol
                            </dt>

                            <dd>
                                {selectedAudit
                                    .usuario?.rol
                                    ?.nombre ??
                                    "-"}
                            </dd>
                        </div>
                    </dl>

                    <div className="audit-json-grid">
                        <article>
                            <header>
                                <FaCode />
                                Datos anteriores
                            </header>

                            <pre>
                                {formatJson(
                                    selectedAudit
                                        .datosAnteriores
                                )}
                            </pre>
                        </article>

                        <article>
                            <header>
                                <FaCode />
                                Datos nuevos
                            </header>

                            <pre>
                                {formatJson(
                                    selectedAudit
                                        .datosNuevos
                                )}
                            </pre>
                        </article>
                    </div>

                    <div className="audit-agent-card">
                        <FaLaptop />

                        <div>
                            <span>
                                Navegador o dispositivo
                            </span>

                            <code>
                                {selectedAudit
                                    .userAgent ??
                                    "No registrado"}
                            </code>
                        </div>
                    </div>
                </section>
            )}
        </section>
    );
}

export default AuditPanel;
