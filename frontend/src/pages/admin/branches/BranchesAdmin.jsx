import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaArchive,
    FaBoxes,
    FaBuilding,
    FaChevronLeft,
    FaChevronRight,
    FaEdit,
    FaEye,
    FaMapMarkerAlt,
    FaPlus,
    FaSave,
    FaSearch,
    FaStore,
    FaTimes,
    FaToggleOff,
    FaToggleOn,
    FaUsers,
    FaClock,
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";
import {
    useRealtimeVersion
} from "../../../context/RealtimeContext";

import {
    useNavigate
} from "react-router-dom";

import {
    ApiError
} from "../../../services/api";

import {
    createBranchRequest,
    createZoneRequest,
    getBranchByIdRequest,
    listBranchesRequest,
    updateBranchRequest,
    updateBranchStatusRequest,
    updateZoneRequest,
    updateZoneStatusRequest
} from "../../../services/branch.service";

import "./branchesAdmin.css";

const INITIAL_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

function createEmptyBranchForm() {
    return {
        codigo: "",
        nombre: "",
        razonSocial: "",
        ruc: "",
        direccion: "",
        telefono: "",
        correo: "",
        zonaHoraria:
            "America/Lima",
        estado:
            "ACTIVO"
    };
}

function createBranchEditForm(
    branch
) {
    return {
        codigo:
            branch.codigo,

        nombre:
            branch.nombre,

        razonSocial:
            branch.razonSocial ??
            "",

        ruc:
            branch.ruc ??
            "",

        direccion:
            branch.direccion,

        telefono:
            branch.telefono ??
            "",

        correo:
            branch.correo ??
            "",

        zonaHoraria:
            branch.zonaHoraria ??
            "America/Lima",

        estado:
            branch.estado
    };
}

function createEmptyZoneForm() {
    return {
        nombre: "",
        descripcion: "",
        capacidadReferencial: "",
        estado: "ACTIVO"
    };
}

function createZoneEditForm(
    zone
) {
    return {
        nombre:
            zone.nombre,

        descripcion:
            zone.descripcion ??
            "",

        capacidadReferencial:
            zone.capacidadReferencial ??
            "",

        estado:
            zone.estado
    };
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

function isAbortError(error) {
    return (
        error?.name ===
        "AbortError"
    );
}

function formatDate(value) {
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
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(
            /(^|\s)\S/g,
            (letter) =>
                letter.toUpperCase()
        );
}

function nullableText(value) {
    const cleanValue =
        value.trim();

    return cleanValue || null;
}

function BranchesAdmin() {
    const {
        token
    } = useAuth();

    const realtimeVersion =
        useRealtimeVersion([
            "BRANCHES"
        ]);

    const [
        branches,
        setBranches
    ] = useState([]);

    const navigate =
        useNavigate();

    const [
        pagination,
        setPagination
    ] = useState(
        INITIAL_PAGINATION
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
        statusFilter,
        setStatusFilter
    ] = useState("TODOS");

    const [
        branchForm,
        setBranchForm
    ] = useState(
        createEmptyBranchForm
    );

    const [
        branchFormVisible,
        setBranchFormVisible
    ] = useState(false);

    const [
        editingBranch,
        setEditingBranch
    ] = useState(null);

    const [
        selectedBranch,
        setSelectedBranch
    ] = useState(null);

    const [
        zoneForm,
        setZoneForm
    ] = useState(
        createEmptyZoneForm
    );

    const [
        zoneFormVisible,
        setZoneFormVisible
    ] = useState(false);

    const [
        editingZone,
        setEditingZone
    ] = useState(null);

    const [
        isLoading,
        setIsLoading
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

    const visibleStatistics =
        useMemo(
            () => ({
                activas:
                    branches.filter(
                        (branch) =>
                            branch.estado ===
                            "ACTIVO"
                    ).length,

                zonas:
                    branches.reduce(
                        (
                            total,
                            branch
                        ) =>
                            total +
                            Number(
                                branch
                                    .estadisticas
                                    .zonas
                            ),
                        0
                    ),

                usuarios:
                    branches.reduce(
                        (
                            total,
                            branch
                        ) =>
                            total +
                            Number(
                                branch
                                    .estadisticas
                                    .usuarios
                            ),
                        0
                    ),

                productos:
                    branches.reduce(
                        (
                            total,
                            branch
                        ) =>
                            total +
                            Number(
                                branch
                                    .estadisticas
                                    .productos
                            ),
                        0
                    )
            }),
            [branches]
        );

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadBranches() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await listBranchesRequest(
                        token,
                        {
                            search:
                                appliedSearch,

                            estado:
                                statusFilter,

                            page,

                            limit: 20,

                            signal:
                                controller.signal
                        }
                    );

                setBranches(
                    result.sucursales
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
                        "No se pudieron cargar las sucursales."
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

        void loadBranches();

        return () =>
            controller.abort();
    }, [
        token,
        appliedSearch,
        statusFilter,
        page,
        reloadKey,
        realtimeVersion
    ]);

    function clearFeedback() {
        setMessage("");
        setError("");
    }

    function handleBranchFieldChange(
        field,
        value
    ) {
        setBranchForm(
            (previous) => ({
                ...previous,
                [field]: value
            })
        );
    }

    function handleZoneFieldChange(
        field,
        value
    ) {
        setZoneForm(
            (previous) => ({
                ...previous,
                [field]: value
            })
        );
    }

    function openCreateBranch() {
        clearFeedback();

        setEditingBranch(null);

        setBranchForm(
            createEmptyBranchForm()
        );

        setBranchFormVisible(true);
    }

    function openEditBranch(
        branch
    ) {
        clearFeedback();

        setEditingBranch(
            branch
        );

        setBranchForm(
            createBranchEditForm(
                branch
            )
        );

        setBranchFormVisible(true);
    }

    function closeBranchForm() {
        setBranchFormVisible(false);
        setEditingBranch(null);

        setBranchForm(
            createEmptyBranchForm()
        );
    }

    async function handleBranchSubmit(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        if (
            branchForm.nombre
                .trim()
                .length < 3
        ) {
            setError(
                "El nombre debe contener al menos 3 caracteres."
            );
            return;
        }

        if (
            branchForm.direccion
                .trim()
                .length < 5
        ) {
            setError(
                "La dirección debe contener al menos 5 caracteres."
            );
            return;
        }

        if (
            !editingBranch &&
            branchForm.codigo
                .trim()
                .length < 2
        ) {
            setError(
                "El código debe contener al menos 2 caracteres."
            );
            return;
        }

        setIsSaving(true);

        try {
            let response;

            if (editingBranch) {
                response =
                    await updateBranchRequest(
                        token,
                        editingBranch.id,
                        {
                            nombre:
                                branchForm
                                    .nombre
                                    .trim(),

                            razonSocial:
                                nullableText(
                                    branchForm
                                        .razonSocial
                                ),

                            ruc:
                                nullableText(
                                    branchForm.ruc
                                ),

                            direccion:
                                branchForm
                                    .direccion
                                    .trim(),

                            telefono:
                                nullableText(
                                    branchForm
                                        .telefono
                                ),

                            correo:
                                nullableText(
                                    branchForm
                                        .correo
                                ),

                            zonaHoraria:
                                branchForm
                                    .zonaHoraria
                                    .trim()
                        }
                    );
            } else {
                response =
                    await createBranchRequest(
                        token,
                        {
                            codigo:
                                branchForm
                                    .codigo
                                    .trim(),

                            nombre:
                                branchForm
                                    .nombre
                                    .trim(),

                            razonSocial:
                                nullableText(
                                    branchForm
                                        .razonSocial
                                ),

                            ruc:
                                nullableText(
                                    branchForm.ruc
                                ),

                            direccion:
                                branchForm
                                    .direccion
                                    .trim(),

                            telefono:
                                nullableText(
                                    branchForm
                                        .telefono
                                ),

                            correo:
                                nullableText(
                                    branchForm
                                        .correo
                                ),

                            zonaHoraria:
                                branchForm
                                    .zonaHoraria
                                    .trim(),

                            estado:
                                branchForm
                                    .estado
                        }
                    );
            }

            const savedBranch =
                response.data.sucursal;

            setSelectedBranch(
                savedBranch
            );

            setMessage(
                response.message
            );

            closeBranchForm();

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo guardar la sucursal."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function openBranchDetail(
        branchId
    ) {
        clearFeedback();
        setIsLoadingDetail(true);

        try {
            const result =
                await getBranchByIdRequest(
                    token,
                    branchId
                );

            setSelectedBranch(
                result
            );

            setZoneFormVisible(
                false
            );

            setEditingZone(null);
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo cargar la sucursal."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    async function handleBranchState(
        branch,
        nextState
    ) {
        clearFeedback();

        const confirmed =
            window.confirm(
                `¿Cambiar la sucursal ${branch.nombre} al estado ${formatLabel(
                    nextState
                )}?`
            );

        if (!confirmed) {
            return;
        }

        setIsSaving(true);

        try {
            const response =
                await updateBranchStatusRequest(
                    token,
                    branch.id,
                    nextState
                );

            setMessage(
                response.message
            );

            if (
                selectedBranch?.id ===
                branch.id
            ) {
                setSelectedBranch(
                    response.data
                        .sucursal
                );
            }

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo cambiar el estado de la sucursal."
            );
        } finally {
            setIsSaving(false);
        }
    }

    function openCreateZone() {
        clearFeedback();

        setEditingZone(null);

        setZoneForm(
            createEmptyZoneForm()
        );

        setZoneFormVisible(true);
    }

    function openEditZone(
        zone
    ) {
        clearFeedback();

        setEditingZone(
            zone
        );

        setZoneForm(
            createZoneEditForm(
                zone
            )
        );

        setZoneFormVisible(true);
    }

    function closeZoneForm() {
        setZoneFormVisible(false);
        setEditingZone(null);

        setZoneForm(
            createEmptyZoneForm()
        );
    }

    async function handleZoneSubmit(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        if (!selectedBranch) {
            setError(
                "Selecciona una sucursal."
            );
            return;
        }

        if (
            zoneForm.nombre
                .trim()
                .length < 2
        ) {
            setError(
                "El nombre de la zona debe contener al menos 2 caracteres."
            );
            return;
        }

        const capacity =
            zoneForm
                .capacidadReferencial ===
            ""
                ? null
                : Number(
                      zoneForm
                          .capacidadReferencial
                  );

        if (
            capacity !== null &&
            (
                !Number.isInteger(
                    capacity
                ) ||
                capacity <= 0
            )
        ) {
            setError(
                "La capacidad debe ser un número entero mayor que cero."
            );
            return;
        }

        setIsSaving(true);

        try {
            let response;

            if (editingZone) {
                response =
                    await updateZoneRequest(
                        token,
                        selectedBranch.id,
                        editingZone.id,
                        {
                            nombre:
                                zoneForm
                                    .nombre
                                    .trim(),

                            descripcion:
                                nullableText(
                                    zoneForm
                                        .descripcion
                                ),

                            capacidadReferencial:
                                capacity
                        }
                    );
            } else {
                response =
                    await createZoneRequest(
                        token,
                        selectedBranch.id,
                        {
                            nombre:
                                zoneForm
                                    .nombre
                                    .trim(),

                            descripcion:
                                nullableText(
                                    zoneForm
                                        .descripcion
                                ),

                            capacidadReferencial:
                                capacity,

                            estado:
                                zoneForm
                                    .estado
                        }
                    );
            }

            setSelectedBranch(
                response.data.sucursal
            );

            setMessage(
                response.message
            );

            closeZoneForm();

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo guardar la zona."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleZoneState(
        zone,
        nextState
    ) {
        if (!selectedBranch) {
            return;
        }

        clearFeedback();

        const confirmed =
            window.confirm(
                `¿Cambiar la zona ${zone.nombre} al estado ${formatLabel(
                    nextState
                )}?`
            );

        if (!confirmed) {
            return;
        }

        setIsSaving(true);

        try {
            const response =
                await updateZoneStatusRequest(
                    token,
                    selectedBranch.id,
                    zone.id,
                    nextState
                );

            setSelectedBranch(
                response.data.sucursal
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
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo cambiar el estado de la zona."
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

    return (
        <section className="branches-admin admin-page">
            <header className="branches-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        SUCURSALES
                    </span>

                    <h2>
                        Sedes y zonas de atención
                    </h2>

                    <p>
                        Administra los datos de
                        cada sede y sus espacios
                        de atención.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        openCreateBranch
                    }
                >
                    <FaPlus />
                    Nueva sucursal
                </button>
            </header>

            {message && (
                <div
                    className="branches-feedback admin-feedback success"
                    role="status"
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    className="branches-feedback admin-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <div className="branch-stat-grid admin-metric-grid">
                <article>
                    <FaStore />

                    <div>
                        <span>
                            Total de sucursales
                        </span>

                        <strong>
                            {pagination.total}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaToggleOn />

                    <div>
                        <span>
                            Activas visibles
                        </span>

                        <strong>
                            {
                                visibleStatistics
                                    .activas
                            }
                        </strong>
                    </div>
                </article>

                <article>
                    <FaMapMarkerAlt />

                    <div>
                        <span>
                            Zonas visibles
                        </span>

                        <strong>
                            {
                                visibleStatistics
                                    .zonas
                            }
                        </strong>
                    </div>
                </article>

                <article>
                    <FaUsers />

                    <div>
                        <span>
                            Asignaciones visibles
                        </span>

                        <strong>
                            {
                                visibleStatistics
                                    .usuarios
                            }
                        </strong>
                    </div>
                </article>
            </div>

            <section className="branches-list-card">
                <form
                    className="branches-filters admin-filter-bar"
                    onSubmit={
                        handleSearch
                    }
                >
                    <div className="branches-search">
                        <FaSearch />

                        <input
                            type="search"
                            placeholder="Código, nombre, RUC o dirección..."
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event.target
                                        .value
                                )
                            }
                        />
                    </div>

                    <select
                        value={
                            statusFilter
                        }
                        onChange={(
                            event
                        ) => {
                            setStatusFilter(
                                event.target
                                    .value
                            );

                            setPage(1);
                        }}
                    >
                        <option value="TODOS">
                            Todos los estados
                        </option>

                        <option value="ACTIVO">
                            Activas
                        </option>

                        <option value="INACTIVO">
                            Inactivas
                        </option>

                        <option value="ARCHIVADO">
                            Archivadas
                        </option>
                    </select>

                    <button type="submit">
                        Buscar
                    </button>
                </form>

                {isLoading ? (
                    <div className="branches-empty-state">
                        <FaBuilding />
                        Cargando sucursales...
                    </div>
                ) : branches.length === 0 ? (
                    <div className="branches-empty-state">
                        <FaBuilding />

                        <strong>
                            No se encontraron sucursales
                        </strong>
                    </div>
                ) : (
                    <div className="branches-table-wrapper admin-table-shell">
                        <table className="branches-table admin-data-table">
                            <thead>
                                <tr>
                                    <th>Sucursal</th>
                                    <th>Dirección</th>
                                    <th>Zonas</th>
                                    <th>Usuarios</th>
                                    <th>Productos</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {branches.map(
                                    (branch) => (
                                        <tr
                                            key={
                                                branch.id
                                            }
                                        >
                                            <td>
                                                <div className="branch-name-cell">
                                                    <strong>
                                                        {
                                                            branch.nombre
                                                        }
                                                    </strong>

                                                    <small>
                                                        {
                                                            branch.codigo
                                                        }
                                                        {branch.ruc
                                                            ? ` · RUC ${branch.ruc}`
                                                            : ""}
                                                    </small>
                                                </div>
                                            </td>

                                            <td>
                                                {
                                                    branch.direccion
                                                }
                                            </td>

                                            <td>
                                                {
                                                    branch
                                                        .estadisticas
                                                        .zonas
                                                }
                                            </td>

                                            <td>
                                                {
                                                    branch
                                                        .estadisticas
                                                        .usuarios
                                                }
                                            </td>

                                            <td>
                                                {
                                                    branch
                                                        .estadisticas
                                                        .productos
                                                }
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-status-badge branch-status ${branch.estado.toLowerCase()}`}
                                                >
                                                    {formatLabel(
                                                        branch.estado
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="branch-actions">

                                                    <button
                                                        type="button"
                                                        title="Horarios y bloqueos"
                                                        onClick={() =>
                                                            navigate(
                                                                `/admin/sucursales/${branch.id}/disponibilidad`
                                                            )
                                                        }
                                                    >
                                                        <FaClock />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Ver detalle"
                                                        disabled={
                                                            isLoadingDetail
                                                        }
                                                        onClick={() =>
                                                            openBranchDetail(
                                                                branch.id
                                                            )
                                                        }
                                                    >
                                                        <FaEye />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        onClick={() =>
                                                            openEditBranch(
                                                                branch
                                                            )
                                                        }
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    {branch.estado ===
                                                    "ACTIVO" ? (
                                                        <button
                                                            type="button"
                                                            title="Desactivar"
                                                            disabled={
                                                                isSaving
                                                            }
                                                            onClick={() =>
                                                                handleBranchState(
                                                                    branch,
                                                                    "INACTIVO"
                                                                )
                                                            }
                                                        >
                                                            <FaToggleOff />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            title="Activar"
                                                            disabled={
                                                                isSaving
                                                            }
                                                            onClick={() =>
                                                                handleBranchState(
                                                                    branch,
                                                                    "ACTIVO"
                                                                )
                                                            }
                                                        >
                                                            <FaToggleOn />
                                                        </button>
                                                    )}

                                                    {branch.estado !==
                                                        "ARCHIVADO" && (
                                                        <button
                                                            type="button"
                                                            title="Archivar"
                                                            className="danger"
                                                            disabled={
                                                                isSaving
                                                            }
                                                            onClick={() =>
                                                                handleBranchState(
                                                                    branch,
                                                                    "ARCHIVADO"
                                                                )
                                                            }
                                                        >
                                                            <FaArchive />
                                                        </button>
                                                        
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="branches-pagination admin-pagination">
                    <span>
                        Página{" "}
                        {pagination.page} de{" "}
                        {pagination.totalPages}
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

            {branchFormVisible && (
                <form
                    className="branch-form-card"
                    onSubmit={
                        handleBranchSubmit
                    }
                >
                    <div className="branch-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                {editingBranch
                                    ? "EDITAR SUCURSAL"
                                    : "NUEVA SUCURSAL"}
                            </span>

                            <h3>
                                {editingBranch
                                    ? editingBranch.nombre
                                    : "Registrar una sede"}
                            </h3>
                        </div>

                        <button
                            type="button"
                            className="branch-close-button"
                            aria-label="Cerrar formulario de sucursal"
                            onClick={
                                closeBranchForm
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="branch-form-grid">
                        <label>
                            Código *

                            <input
                                type="text"
                                maxLength="20"
                                disabled={
                                    Boolean(
                                        editingBranch
                                    )
                                }
                                value={
                                    branchForm.codigo
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleBranchFieldChange(
                                        "codigo",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Nombre *

                            <input
                                type="text"
                                maxLength="150"
                                value={
                                    branchForm.nombre
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleBranchFieldChange(
                                        "nombre",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Razón social

                            <input
                                type="text"
                                maxLength="200"
                                value={
                                    branchForm
                                        .razonSocial
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleBranchFieldChange(
                                        "razonSocial",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            RUC

                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength="11"
                                value={
                                    branchForm.ruc
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleBranchFieldChange(
                                        "ruc",
                                        event.target
                                            .value
                                            .replace(
                                                /\D/g,
                                                ""
                                            )
                                    )
                                }
                            />
                        </label>

                        <label className="branch-field-full">
                            Dirección *

                            <input
                                type="text"
                                maxLength="250"
                                value={
                                    branchForm
                                        .direccion
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleBranchFieldChange(
                                        "direccion",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Teléfono

                            <input
                                type="text"
                                maxLength="30"
                                value={
                                    branchForm
                                        .telefono
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleBranchFieldChange(
                                        "telefono",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Correo

                            <input
                                type="email"
                                maxLength="160"
                                value={
                                    branchForm.correo
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleBranchFieldChange(
                                        "correo",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Zona horaria

                            <input
                                type="text"
                                maxLength="60"
                                value={
                                    branchForm
                                        .zonaHoraria
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleBranchFieldChange(
                                        "zonaHoraria",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        {!editingBranch && (
                            <label>
                                Estado inicial

                                <select
                                    value={
                                        branchForm
                                            .estado
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleBranchFieldChange(
                                            "estado",
                                            event.target
                                                .value
                                        )
                                    }
                                >
                                    <option value="ACTIVO">
                                        Activo
                                    </option>

                                    <option value="INACTIVO">
                                        Inactivo
                                    </option>
                                </select>
                            </label>
                        )}
                    </div>

                    <div className="branch-form-actions">
                        <button
                            type="button"
                            className="secondary"
                            onClick={
                                closeBranchForm
                            }
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="primary"
                            disabled={
                                isSaving
                            }
                        >
                            <FaSave />

                            {isSaving
                                ? "Guardando..."
                                : "Guardar sucursal"}
                        </button>
                    </div>
                </form>
            )}

            {selectedBranch && (
                <section className="branch-detail-card">
                    <div className="branch-section-heading">
                        <div>
                            <span className="admin-eyebrow">
                                DETALLE DE SUCURSAL
                            </span>

                            <h3>
                                {
                                    selectedBranch.nombre
                                }
                            </h3>

                            <p>
                                {
                                    selectedBranch.codigo
                                }
                                {" · "}
                                {
                                    selectedBranch.direccion
                                }
                            </p>
                        </div>

                        <button
                            type="button"
                            className="branch-close-button"
                            aria-label="Cerrar detalle de sucursal"
                            onClick={() =>
                                setSelectedBranch(
                                    null
                                )
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="branch-detail-statistics">
                        <article>
                            <FaMapMarkerAlt />

                            <span>
                                Zonas
                            </span>

                            <strong>
                                {
                                    selectedBranch
                                        .estadisticas
                                        .zonas
                                }
                            </strong>
                        </article>

                        <article>
                            <FaUsers />

                            <span>
                                Usuarios
                            </span>

                            <strong>
                                {
                                    selectedBranch
                                        .estadisticas
                                        .usuarios
                                }
                            </strong>
                        </article>

                        <article>
                            <FaBoxes />

                            <span>
                                Productos
                            </span>

                            <strong>
                                {
                                    selectedBranch
                                        .estadisticas
                                        .productos
                                }
                            </strong>
                        </article>

                        <article>
                            <FaStore />

                            <span>
                                Ventas
                            </span>

                            <strong>
                                {
                                    selectedBranch
                                        .estadisticas
                                        .ventas
                                }
                            </strong>
                        </article>
                    </div>

                    <dl className="branch-data-list">
                        <div>
                            <dt>Razón social</dt>

                            <dd>
                                {selectedBranch
                                    .razonSocial ??
                                    "-"}
                            </dd>
                        </div>

                        <div>
                            <dt>RUC</dt>

                            <dd>
                                {selectedBranch.ruc ??
                                    "-"}
                            </dd>
                        </div>

                        <div>
                            <dt>Teléfono</dt>

                            <dd>
                                {selectedBranch
                                    .telefono ??
                                    "-"}
                            </dd>
                        </div>

                        <div>
                            <dt>Correo</dt>

                            <dd>
                                {selectedBranch
                                    .correo ??
                                    "-"}
                            </dd>
                        </div>

                        <div>
                            <dt>Zona horaria</dt>

                            <dd>
                                {
                                    selectedBranch
                                        .zonaHoraria
                                }
                            </dd>
                        </div>

                        <div>
                            <dt>Registrada</dt>

                            <dd>
                                {formatDate(
                                    selectedBranch
                                        .createdAt
                                )}
                            </dd>
                        </div>
                    </dl>

                    <div className="zones-heading">
                        <div>
                            <h3>
                                Zonas de atención
                            </h3>

                            <p>
                                Salones, áreas naturales,
                                canchas y espacios para
                                eventos.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                openCreateZone
                            }
                            disabled={
                                selectedBranch
                                    .estado ===
                                "ARCHIVADO"
                            }
                        >
                            <FaPlus />
                            Nueva zona
                        </button>
                    </div>

                    {zoneFormVisible && (
                        <form
                            className="zone-form-card"
                            onSubmit={
                                handleZoneSubmit
                            }
                        >
                            <div className="branch-section-heading">
                                <div>
                                    <h4>
                                        {editingZone
                                            ? "Editar zona"
                                            : "Registrar zona"}
                                    </h4>
                                </div>

                                <button
                                    type="button"
                                    className="branch-close-button"
                                    aria-label="Cerrar formulario de zona"
                                    onClick={
                                        closeZoneForm
                                    }
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="zone-form-grid">
                                <label>
                                    Nombre *

                                    <input
                                        type="text"
                                        maxLength="120"
                                        value={
                                            zoneForm.nombre
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleZoneFieldChange(
                                                "nombre",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Capacidad referencial

                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={
                                            zoneForm
                                                .capacidadReferencial
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleZoneFieldChange(
                                                "capacidadReferencial",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label className="branch-field-full">
                                    Descripción

                                    <textarea
                                        rows="3"
                                        maxLength="1000"
                                        value={
                                            zoneForm
                                                .descripcion
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleZoneFieldChange(
                                                "descripcion",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                {!editingZone && (
                                    <label>
                                        Estado inicial

                                        <select
                                            value={
                                                zoneForm
                                                    .estado
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                handleZoneFieldChange(
                                                    "estado",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="ACTIVO">
                                                Activo
                                            </option>

                                            <option value="INACTIVO">
                                                Inactivo
                                            </option>
                                        </select>
                                    </label>
                                )}
                            </div>

                            <div className="branch-form-actions">
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={
                                        closeZoneForm
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="primary"
                                    disabled={
                                        isSaving
                                    }
                                >
                                    <FaSave />
                                    Guardar zona
                                </button>
                            </div>
                        </form>
                    )}

                    {selectedBranch.zonas.length ===
                    0 ? (
                        <div className="branches-empty-state compact">
                            <FaMapMarkerAlt />

                            <strong>
                                La sucursal no tiene zonas registradas
                            </strong>
                        </div>
                    ) : (
                        <div className="zones-grid">
                            {selectedBranch.zonas.map(
                                (zone) => (
                                    <article
                                        key={
                                            zone.id
                                        }
                                        className={`zone-card ${zone.estado.toLowerCase()}`}
                                    >
                                        <header>
                                            <div>
                                                <h4>
                                                    {
                                                        zone.nombre
                                                    }
                                                </h4>

                                                <span
                                                    className={`admin-status-badge branch-status ${zone.estado.toLowerCase()}`}
                                                >
                                                    {formatLabel(
                                                        zone.estado
                                                    )}
                                                </span>
                                            </div>

                                            <strong>
                                                {zone.capacidadReferencial
                                                    ? `${zone.capacidadReferencial} personas`
                                                    : "Sin capacidad definida"}
                                            </strong>
                                        </header>

                                        <p>
                                            {zone.descripcion ??
                                                "Sin descripción registrada."}
                                        </p>

                                        <dl>
                                            <div>
                                                <dt>
                                                    Reservas
                                                </dt>

                                                <dd>
                                                    {
                                                        zone
                                                            .estadisticas
                                                            .reservas
                                                    }
                                                </dd>
                                            </div>

                                            <div>
                                                <dt>
                                                    Pedidos
                                                </dt>

                                                <dd>
                                                    {
                                                        zone
                                                            .estadisticas
                                                            .pedidos
                                                    }
                                                </dd>
                                            </div>

                                            <div>
                                                <dt>
                                                    Bloqueos
                                                </dt>

                                                <dd>
                                                    {
                                                        zone
                                                            .estadisticas
                                                            .bloqueos
                                                    }
                                                </dd>
                                            </div>
                                        </dl>

                                        <footer>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEditZone(
                                                        zone
                                                    )
                                                }
                                            >
                                                <FaEdit />
                                                Editar
                                            </button>

                                            {zone.estado ===
                                            "ACTIVO" ? (
                                                <button
                                                    type="button"
                                                    disabled={
                                                        isSaving
                                                    }
                                                    onClick={() =>
                                                        handleZoneState(
                                                            zone,
                                                            "INACTIVO"
                                                        )
                                                    }
                                                >
                                                    <FaToggleOff />
                                                    Desactivar
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={
                                                        isSaving
                                                    }
                                                    onClick={() =>
                                                        handleZoneState(
                                                            zone,
                                                            "ACTIVO"
                                                        )
                                                    }
                                                >
                                                    <FaToggleOn />
                                                    Activar
                                                </button>
                                            )}

                                            {zone.estado !==
                                                "ARCHIVADO" && (
                                                <button
                                                    type="button"
                                                    className="danger"
                                                    disabled={
                                                        isSaving
                                                    }
                                                    onClick={() =>
                                                        handleZoneState(
                                                            zone,
                                                            "ARCHIVADO"
                                                        )
                                                    }
                                                >
                                                    <FaArchive />
                                                    Archivar
                                                </button>
                                            )}
                                        </footer>
                                    </article>
                                )
                            )}
                        </div>
                    )}
                </section>
            )}
        </section>
    );
}

export default BranchesAdmin;
