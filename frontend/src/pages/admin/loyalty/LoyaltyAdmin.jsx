import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaBan,
    FaCheck,
    FaEdit,
    FaGift,
    FaPlus,
    FaSave,
    FaSearch,
    FaStar,
    FaSyncAlt,
    FaTimes,
    FaUsers
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
    createLoyaltyProgramRequest,
    getLoyaltyOptionsRequest,
    getLoyaltyProgramRequest,
    listLoyaltyProgramsRequest,
    updateLoyaltyProgramRequest,
    updateLoyaltyProgramStatusRequest
} from "../../../services/loyalty.service";

import "./loyaltyAdmin.css";

const EMPTY_OPTIONS = {
    sucursales: [],
    productos: [],
    tiposPrograma: [],
    tiposRecompensa: [],
    puedeCrearGlobal: false
};

const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

function getCurrentDate() {
    const now =
        new Date();

    const localDate =
        new Date(
            now.getTime() -
                now.getTimezoneOffset() *
                    60 *
                    1000
        );

    return localDate
        .toISOString()
        .slice(0, 10);
}

function createEmptyForm(
    defaultBranchId = ""
) {
    return {
        sucursalId:
            defaultBranchId,

        nombre: "",

        descripcion: "",

        tipo:
            "VISITAS",

        visitasRequeridas:
            "5",

        montoRequerido:
            "",

        tipoRecompensa:
            "PRODUCTO_GRATIS",

        productoPremioId:
            "",

        cantidadPremio:
            "1",

        montoDescuento:
            "",

        porcentajeDescuento:
            "",

        descripcionBeneficio:
            "",

        vigenciaDiasPremio:
            "30",

        automatico:
            true,

        activo:
            true,

        fechaInicio:
            getCurrentDate(),

        fechaFin:
            ""
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
        error.errors?.[0]
            ?.mensaje;

    return validationMessage
        ? `${error.message} ${validationMessage}`
        : error.message;
}

function formatLabel(value) {
    return String(
        value ?? ""
    )
        .toLowerCase()
        .replaceAll(
            "_",
            " "
        )
        .replace(
            /(^|\s)\S/g,
            (letter) =>
                letter.toUpperCase()
        );
}

function formatMoney(value) {
    const number =
        Number(value);

    return new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN",
            minimumFractionDigits: 2
        }
    ).format(
        Number.isFinite(number)
            ? number
            : 0
    );
}

function formatRequirement(
    program
) {
    if (
        program.tipo ===
        "VISITAS"
    ) {
        return `${program.visitasRequeridas} visitas`;
    }

    if (
        program.tipo ===
        "MONTO_CONSUMIDO"
    ) {
        return formatMoney(
            program.montoRequerido
        );
    }

    return `${program.visitasRequeridas} visitas y ${formatMoney(
        program.montoRequerido
    )}`;
}

function formatReward(
    program
) {
    switch (
        program.tipoRecompensa
    ) {
        case "PRODUCTO_GRATIS":
            return `${program.cantidadPremio} ${
                program.productoPremio
                    ?.unidadMedida
                    ?.abreviatura ?? ""
            } de ${
                program.productoPremio
                    ?.nombre ??
                "producto"
            }`.trim();

        case "DESCUENTO_FIJO":
            return `${formatMoney(
                program.montoDescuento
            )} de descuento`;

        case "DESCUENTO_PORCENTAJE":
            return `${program.porcentajeDescuento}% de descuento`;

        case "BENEFICIO":
            return (
                program.descripcionBeneficio ??
                "Beneficio especial"
            );

        default:
            return "-";
    }
}

function LoyaltyAdmin() {
    const {
        token,
        usuario
    } = useAuth();

    const realtimeVersion =
        useRealtimeVersion([
            "LOYALTY"
        ]);

    const roleCode =
        usuario?.rol?.codigo ?? "";

    const isGeneralAdministrator =
        roleCode ===
        "ADMINISTRADOR_GENERAL";

    const [
        options,
        setOptions
    ] = useState(
        EMPTY_OPTIONS
    );

    const [
        rewardProducts,
        setRewardProducts
    ] = useState([]);

    const [
        programs,
        setPrograms
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
    ] = useState({
        search: "",
        sucursalId: "",
        tipo: "",
        activo: "TODOS",
        page: 1,
        limit: 20
    });

    const [
        form,
        setForm
    ] = useState(
        createEmptyForm
    );

    const [
        editingProgramId,
        setEditingProgramId
    ] = useState(null);

    const [
        showForm,
        setShowForm
    ] = useState(false);

    const [
        isLoading,
        setIsLoading
    ] = useState(true);

    const [
        isLoadingOptions,
        setIsLoadingOptions
    ] = useState(true);

    const [
        isLoadingProducts,
        setIsLoadingProducts
    ] = useState(false);

    const [
        isLoadingDetail,
        setIsLoadingDetail
    ] = useState(false);

    const [
        isSaving,
        setIsSaving
    ] = useState(false);

    const [
        changingStatusId,
        setChangingStatusId
    ] = useState("");

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

    const activePrograms =
        useMemo(
            () =>
                programs.filter(
                    (program) =>
                        program.activo
                ).length,
            [programs]
        );

    const clientsOnCurrentPage =
        useMemo(
            () =>
                programs.reduce(
                    (
                        total,
                        program
                    ) =>
                        total +
                        Number(
                            program.cantidadClientes ??
                                0
                        ),
                    0
                ),
            [programs]
        );

    const rewardsOnCurrentPage =
        useMemo(
            () =>
                programs.reduce(
                    (
                        total,
                        program
                    ) =>
                        total +
                        Number(
                            program.cantidadPremios ??
                                0
                        ),
                    0
                ),
            [programs]
        );

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadOptions() {
            setIsLoadingOptions(true);

            try {
                const result =
                    await getLoyaltyOptionsRequest(
                        token,
                        {},
                        controller.signal
                    );

                setOptions(
                    result
                );

                setRewardProducts(
                    result.productos ??
                        []
                );

                if (
                    !isGeneralAdministrator &&
                    result.sucursales
                        .length > 0
                ) {
                    const firstBranchId =
                        result.sucursales[0]
                            .id;

                    setFilters(
                        (previous) => ({
                            ...previous,
                            sucursalId:
                                previous.sucursalId ||
                                firstBranchId
                        })
                    );

                    setForm(
                        (previous) => ({
                            ...previous,
                            sucursalId:
                                previous.sucursalId ||
                                firstBranchId
                        })
                    );
                }
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
                        "No se pudieron cargar las opciones de fidelización."
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
        isGeneralAdministrator
    ]);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadPrograms() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await listLoyaltyProgramsRequest(
                        token,
                        {
                            search:
                                filters.search,

                            sucursalId:
                                filters.sucursalId,

                            tipo:
                                filters.tipo,

                            activo:
                                filters.activo,

                            page:
                                filters.page,

                            limit:
                                filters.limit
                        },
                        controller.signal
                    );

                setPrograms(
                    result.programas ??
                        []
                );

                setPagination(
                    result.pagination ??
                        EMPTY_PAGINATION
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
                        "No se pudieron cargar los programas."
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

        void loadPrograms();

        return () =>
            controller.abort();
    }, [
        token,
        filters.search,
        filters.sucursalId,
        filters.tipo,
        filters.activo,
        filters.page,
        filters.limit,
        reloadKey,
        realtimeVersion
    ]);

    useEffect(() => {
        if (!showForm) {
            return undefined;
        }

        const controller =
            new AbortController();

        async function loadRewardProducts() {
            setIsLoadingProducts(true);

            try {
                const result =
                    await getLoyaltyOptionsRequest(
                        token,
                        {
                            sucursalId:
                                form.sucursalId
                        },
                        controller.signal
                    );

                setRewardProducts(
                    result.productos ??
                        []
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
                        "No se pudieron cargar los productos para el premio."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingProducts(
                        false
                    );
                }
            }
        }

        void loadRewardProducts();

        return () =>
            controller.abort();
    }, [
        token,
        form.sucursalId,
        showForm
    ]);

    function clearFeedback() {
        setMessage("");
        setError("");
    }

    function handleFilterChange(
        field,
        value
    ) {
        setFilters(
            (previous) => ({
                ...previous,
                [field]: value,
                page: 1
            })
        );
    }

    function handleFormChange(
        field,
        value
    ) {
        setForm(
            (previous) => ({
                ...previous,
                [field]: value
            })
        );
    }

    function getDefaultBranchId() {
        if (
            isGeneralAdministrator
        ) {
            return "";
        }

        return (
            options.sucursales[0]
                ?.id ?? ""
        );
    }

    function openCreateForm() {
        clearFeedback();

        setEditingProgramId(
            null
        );

        setForm(
            createEmptyForm(
                getDefaultBranchId()
            )
        );

        setShowForm(true);
    }

    async function openEditForm(
        programId
    ) {
        clearFeedback();
        setIsLoadingDetail(true);

        try {
            const program =
                await getLoyaltyProgramRequest(
                    token,
                    programId
                );

            setEditingProgramId(
                program.id
            );

            setForm({
                sucursalId:
                    program.sucursalId ??
                    "",

                nombre:
                    program.nombre ??
                    "",

                descripcion:
                    program.descripcion ??
                    "",

                tipo:
                    program.tipo,

                visitasRequeridas:
                    program.visitasRequeridas ??
                    "",

                montoRequerido:
                    program.montoRequerido ??
                    "",

                tipoRecompensa:
                    program.tipoRecompensa,

                productoPremioId:
                    program.productoPremioId ??
                    "",

                cantidadPremio:
                    program.cantidadPremio ??
                    "",

                montoDescuento:
                    program.montoDescuento ??
                    "",

                porcentajeDescuento:
                    program.porcentajeDescuento ??
                    "",

                descripcionBeneficio:
                    program.descripcionBeneficio ??
                    "",

                vigenciaDiasPremio:
                    program.vigenciaDiasPremio ??
                    30,

                automatico:
                    Boolean(
                        program.automatico
                    ),

                activo:
                    Boolean(
                        program.activo
                    ),

                fechaInicio:
                    program.fechaInicio,

                fechaFin:
                    program.fechaFin ??
                    ""
            });

            setShowForm(true);
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo cargar el programa."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    function closeForm() {
        setEditingProgramId(
            null
        );

        setForm(
            createEmptyForm(
                getDefaultBranchId()
            )
        );

        setShowForm(false);
    }

    function validateForm() {
        if (
            form.nombre
                .trim()
                .length < 3
        ) {
            return "El nombre debe contener al menos 3 caracteres.";
        }

        if (!form.fechaInicio) {
            return "Selecciona la fecha inicial.";
        }

        if (
            form.fechaFin &&
            form.fechaFin <
                form.fechaInicio
        ) {
            return "La fecha final no puede ser anterior a la fecha inicial.";
        }

        if (
            (
                form.tipo ===
                    "VISITAS" ||
                form.tipo ===
                    "AMBOS"
            ) &&
            Number(
                form.visitasRequeridas
            ) <= 0
        ) {
            return "Indica una cantidad válida de visitas.";
        }

        if (
            (
                form.tipo ===
                    "MONTO_CONSUMIDO" ||
                form.tipo ===
                    "AMBOS"
            ) &&
            Number(
                form.montoRequerido
            ) <= 0
        ) {
            return "Indica un monto requerido válido.";
        }

        if (
            form.tipoRecompensa ===
                "PRODUCTO_GRATIS" &&
            (
                !form.productoPremioId ||
                Number(
                    form.cantidadPremio
                ) <= 0
            )
        ) {
            return "Selecciona el producto y la cantidad del premio.";
        }

        if (
            form.tipoRecompensa ===
                "DESCUENTO_FIJO" &&
            Number(
                form.montoDescuento
            ) <= 0
        ) {
            return "Indica un descuento fijo válido.";
        }

        if (
            form.tipoRecompensa ===
                "DESCUENTO_PORCENTAJE" &&
            (
                Number(
                    form.porcentajeDescuento
                ) <= 0 ||
                Number(
                    form.porcentajeDescuento
                ) > 100
            )
        ) {
            return "El porcentaje debe estar entre 1 y 100.";
        }

        if (
            form.tipoRecompensa ===
                "BENEFICIO" &&
            form.descripcionBeneficio
                .trim()
                .length < 3
        ) {
            return "Describe el beneficio del programa.";
        }

        return "";
    }

    function buildPayload() {
        const usesVisits =
            form.tipo ===
                "VISITAS" ||
            form.tipo ===
                "AMBOS";

        const usesAmount =
            form.tipo ===
                "MONTO_CONSUMIDO" ||
            form.tipo ===
                "AMBOS";

        return {
            sucursalId:
                form.sucursalId ||
                null,

            nombre:
                form.nombre.trim(),

            descripcion:
                form.descripcion
                    .trim() ||
                null,

            tipo:
                form.tipo,

            visitasRequeridas:
                usesVisits
                    ? Number(
                          form.visitasRequeridas
                      )
                    : null,

            montoRequerido:
                usesAmount
                    ? Number(
                          form.montoRequerido
                      )
                    : null,

            tipoRecompensa:
                form.tipoRecompensa,

            productoPremioId:
                form.tipoRecompensa ===
                "PRODUCTO_GRATIS"
                    ? form.productoPremioId
                    : null,

            cantidadPremio:
                form.tipoRecompensa ===
                "PRODUCTO_GRATIS"
                    ? Number(
                          form.cantidadPremio
                      )
                    : null,

            montoDescuento:
                form.tipoRecompensa ===
                "DESCUENTO_FIJO"
                    ? Number(
                          form.montoDescuento
                      )
                    : null,

            porcentajeDescuento:
                form.tipoRecompensa ===
                "DESCUENTO_PORCENTAJE"
                    ? Number(
                          form.porcentajeDescuento
                      )
                    : null,

            descripcionBeneficio:
                form.tipoRecompensa ===
                "BENEFICIO"
                    ? form.descripcionBeneficio
                          .trim()
                    : null,

            vigenciaDiasPremio:
                Number(
                    form.vigenciaDiasPremio
                ),

            automatico:
                form.automatico,

            activo:
                form.activo,

            fechaInicio:
                form.fechaInicio,

            fechaFin:
                form.fechaFin ||
                null
        };
    }

    async function handleSubmit(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        const validationMessage =
            validateForm();

        if (validationMessage) {
            setError(
                validationMessage
            );
            return;
        }

        setIsSaving(true);

        try {
            const payload =
                buildPayload();

            if (editingProgramId) {
                await updateLoyaltyProgramRequest(
                    token,
                    editingProgramId,
                    payload
                );

                setMessage(
                    "Programa actualizado correctamente."
                );
            } else {
                await createLoyaltyProgramRequest(
                    token,
                    payload
                );

                setMessage(
                    "Programa creado correctamente."
                );
            }

            closeForm();

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo guardar el programa."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleStatusChange(
        program
    ) {
        clearFeedback();

        const nextStatus =
            !program.activo;

        const confirmed =
            window.confirm(
                nextStatus
                    ? "¿Deseas activar este programa?"
                    : "¿Deseas desactivar este programa?"
            );

        if (!confirmed) {
            return;
        }

        setChangingStatusId(
            program.id
        );

        try {
            await updateLoyaltyProgramStatusRequest(
                token,
                program.id,
                nextStatus
            );

            setMessage(
                nextStatus
                    ? "Programa activado correctamente."
                    : "Programa desactivado correctamente."
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
                    "No se pudo cambiar el estado del programa."
            );
        } finally {
            setChangingStatusId(
                ""
            );
        }
    }

    return (
        <section className="loyalty-admin admin-page">
            <header className="loyalty-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        PROGRAMAS DE FIDELIZACIÓN
                    </span>

                    <h2>
                        Programas para clientes
                    </h2>

                    <p>
                        Configura recompensas por visitas y consumo acumulado.
                    </p>
                </div>

                <div className="loyalty-heading-actions">
                    <button
                        type="button"
                        className="secondary"
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

                    <button
                        type="button"
                        className="primary"
                        disabled={
                            isLoadingOptions
                        }
                        onClick={
                            openCreateForm
                        }
                    >
                        <FaPlus />
                        Nuevo programa
                    </button>
                </div>
            </header>

            {message && (
                <div
                    className="loyalty-feedback admin-feedback success"
                    role="status"
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    className="loyalty-feedback admin-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <section className="loyalty-stats admin-metric-grid">
                <article>
                    <FaGift />

                    <div>
                        <span>
                            Total de programas
                        </span>

                        <strong>
                            {
                                pagination.total
                            }
                        </strong>
                    </div>
                </article>

                <article>
                    <FaCheck />

                    <div>
                        <span>
                            Activos en esta página
                        </span>

                        <strong>
                            {activePrograms}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaUsers />

                    <div>
                        <span>
                            Clientes vinculados
                        </span>

                        <strong>
                            {clientsOnCurrentPage}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaStar />

                    <div>
                        <span>
                            Premios emitidos
                        </span>

                        <strong>
                            {rewardsOnCurrentPage}
                        </strong>
                    </div>
                </article>
            </section>

            <section className="loyalty-filters admin-filter-bar">
                <label className="loyalty-search">
                    <FaSearch />

                    <input
                        type="search"
                        placeholder="Buscar programa..."
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
                </label>

                <select
                    value={
                        filters.sucursalId
                    }
                    disabled={
                        !isGeneralAdministrator &&
                        options.sucursales
                            .length === 1
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
                    {isGeneralAdministrator && (
                        <option value="">
                            Todas las sucursales y globales
                        </option>
                    )}

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
                        filters.tipo
                    }
                    onChange={(
                        event
                    ) =>
                        handleFilterChange(
                            "tipo",
                            event.target
                                .value
                        )
                    }
                >
                    <option value="">
                        Todos los tipos
                    </option>

                    {options.tiposPrograma.map(
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

                <select
                    value={
                        filters.activo
                    }
                    onChange={(
                        event
                    ) =>
                        handleFilterChange(
                            "activo",
                            event.target
                                .value
                        )
                    }
                >
                    <option value="TODOS">
                        Todos los estados
                    </option>

                    <option value="ACTIVO">
                        Activos
                    </option>

                    <option value="INACTIVO">
                        Inactivos
                    </option>
                </select>
            </section>

            {showForm && (
                <form
                    className="loyalty-form-card"
                    onSubmit={
                        handleSubmit
                    }
                >
                    <div className="loyalty-form-heading">
                        <div>
                            <span className="admin-eyebrow">
                                {editingProgramId
                                    ? "EDITAR PROGRAMA"
                                    : "NUEVO PROGRAMA"}
                            </span>

                            <h3>
                                {editingProgramId
                                    ? "Modificar programa"
                                    : "Registrar programa"}
                            </h3>
                        </div>

                        <button
                            type="button"
                            aria-label="Cerrar formulario de programa"
                            onClick={
                                closeForm
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="loyalty-form-grid">
                        <label>
                            Alcance *

                            <select
                                value={
                                    form.sucursalId
                                }
                                disabled={
                                    !isGeneralAdministrator
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "sucursalId",
                                        event.target
                                            .value
                                    )
                                }
                            >
                                {isGeneralAdministrator && (
                                    <option value="">
                                        Todas las sucursales
                                    </option>
                                )}

                                {options.sucursales.map(
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
                        </label>

                        <label>
                            Nombre *

                            <input
                                type="text"
                                maxLength="160"
                                value={
                                    form.nombre
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "nombre",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Tipo de programa *

                            <select
                                value={
                                    form.tipo
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "tipo",
                                        event.target
                                            .value
                                    )
                                }
                            >
                                {options.tiposPrograma.map(
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
                                )}
                            </select>
                        </label>

                        <label className="loyalty-field-full">
                            Descripción

                            <textarea
                                rows="3"
                                maxLength="2000"
                                value={
                                    form.descripcion
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "descripcion",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        {(form.tipo ===
                            "VISITAS" ||
                            form.tipo ===
                                "AMBOS") && (
                            <label>
                                Visitas requeridas *

                                <input
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value={
                                        form.visitasRequeridas
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleFormChange(
                                            "visitasRequeridas",
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>
                        )}

                        {(form.tipo ===
                            "MONTO_CONSUMIDO" ||
                            form.tipo ===
                                "AMBOS") && (
                            <label>
                                Monto requerido *

                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={
                                        form.montoRequerido
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleFormChange(
                                            "montoRequerido",
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>
                        )}

                        <label>
                            Tipo de recompensa *

                            <select
                                value={
                                    form.tipoRecompensa
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "tipoRecompensa",
                                        event.target
                                            .value
                                    )
                                }
                            >
                                {options.tiposRecompensa.map(
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
                                )}
                            </select>
                        </label>

                        {form.tipoRecompensa ===
                            "PRODUCTO_GRATIS" && (
                            <>
                                <label>
                                    Producto de premio *

                                    <select
                                        value={
                                            form.productoPremioId
                                        }
                                        disabled={
                                            isLoadingProducts
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleFormChange(
                                                "productoPremioId",
                                                event.target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Seleccionar producto
                                        </option>

                                        {rewardProducts.map(
                                            (
                                                product
                                            ) => (
                                                <option
                                                    key={
                                                        product.id
                                                    }
                                                    value={
                                                        product.id
                                                    }
                                                >
                                                    {
                                                        product.codigo
                                                    }
                                                    {" — "}
                                                    {
                                                        product.nombre
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label>
                                    Cantidad del premio *

                                    <input
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        value={
                                            form.cantidadPremio
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleFormChange(
                                                "cantidadPremio",
                                                event.target
                                                    .value
                                            )
                                        }
                                    />
                                </label>
                            </>
                        )}

                        {form.tipoRecompensa ===
                            "DESCUENTO_FIJO" && (
                            <label>
                                Monto de descuento *

                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={
                                        form.montoDescuento
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleFormChange(
                                            "montoDescuento",
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>
                        )}

                        {form.tipoRecompensa ===
                            "DESCUENTO_PORCENTAJE" && (
                            <label>
                                Porcentaje de descuento *

                                <input
                                    type="number"
                                    min="0.01"
                                    max="100"
                                    step="0.01"
                                    value={
                                        form.porcentajeDescuento
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleFormChange(
                                            "porcentajeDescuento",
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>
                        )}

                        {form.tipoRecompensa ===
                            "BENEFICIO" && (
                            <label className="loyalty-field-full">
                                Descripción del beneficio *

                                <input
                                    type="text"
                                    maxLength="250"
                                    placeholder="Ejemplo: atención preferencial o zona reservada"
                                    value={
                                        form.descripcionBeneficio
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleFormChange(
                                            "descripcionBeneficio",
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>
                        )}

                        <label>
                            Fecha inicial *

                            <input
                                type="date"
                                value={
                                    form.fechaInicio
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "fechaInicio",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Fecha final

                            <input
                                type="date"
                                min={
                                    form.fechaInicio
                                }
                                value={
                                    form.fechaFin
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "fechaFin",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Vigencia del premio en días *

                            <input
                                type="number"
                                min="1"
                                max="3650"
                                value={
                                    form.vigenciaDiasPremio
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "vigenciaDiasPremio",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label className="loyalty-checkbox-field">
                            <input
                                type="checkbox"
                                checked={
                                    form.automatico
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "automatico",
                                        event.target
                                            .checked
                                    )
                                }
                            />

                            Emitir premio automáticamente
                        </label>

                        <label className="loyalty-checkbox-field">
                            <input
                                type="checkbox"
                                checked={
                                    form.activo
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "activo",
                                        event.target
                                            .checked
                                    )
                                }
                            />

                            Programa activo
                        </label>
                    </div>

                    <div className="loyalty-form-actions">
                        <button
                            type="button"
                            className="secondary"
                            onClick={
                                closeForm
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
                                : editingProgramId
                                  ? "Actualizar programa"
                                  : "Crear programa"}
                        </button>
                    </div>
                </form>
            )}

            <section className="loyalty-list-card">
                {isLoading ? (
                    <div className="loyalty-empty">
                        <FaSyncAlt />
                        Cargando programas...
                    </div>
                ) : programs.length ===
                  0 ? (
                    <div className="loyalty-empty">
                        <FaGift />

                        <strong>
                            No existen programas
                        </strong>

                        <span>
                            Registra el primer programa de fidelización.
                        </span>
                    </div>
                ) : (
                    <div className="loyalty-table-wrapper admin-table-shell">
                        <table className="loyalty-table admin-data-table">
                            <thead>
                                <tr>
                                    <th>
                                        Programa
                                    </th>

                                    <th>
                                        Alcance
                                    </th>

                                    <th>
                                        Requisito
                                    </th>

                                    <th>
                                        Recompensa
                                    </th>

                                    <th>
                                        Vigencia
                                    </th>

                                    <th>
                                        Clientes
                                    </th>

                                    <th>
                                        Premios
                                    </th>

                                    <th>
                                        Estado
                                    </th>

                                    <th>
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {programs.map(
                                    (
                                        program
                                    ) => (
                                        <tr
                                            key={
                                                program.id
                                            }
                                        >
                                            <td>
                                                <div className="loyalty-program-name">
                                                    <strong>
                                                        {
                                                            program.nombre
                                                        }
                                                    </strong>

                                                    <span>
                                                        {formatLabel(
                                                            program.tipo
                                                        )}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                {program.sucursal
                                                    ?.nombre ??
                                                    "Todas las sucursales"}
                                            </td>

                                            <td>
                                                {formatRequirement(
                                                    program
                                                )}
                                            </td>

                                            <td>
                                                <div className="loyalty-reward-description">
                                                    {formatReward(
                                                        program
                                                    )}
                                                </div>
                                            </td>

                                            <td>
                                                <span>
                                                    {
                                                        program.fechaInicio
                                                    }
                                                </span>

                                                <br />

                                                <small>
                                                    hasta{" "}
                                                    {program.fechaFin ??
                                                        "sin límite"}
                                                </small>
                                            </td>

                                            <td>
                                                {
                                                    program.cantidadClientes
                                                }
                                            </td>

                                            <td>
                                                {
                                                    program.cantidadPremios
                                                }
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-status-badge loyalty-status ${
                                                        program.activo
                                                            ? "active"
                                                            : "inactive"
                                                    }`}
                                                >
                                                    {program.activo
                                                        ? "Activo"
                                                        : "Inactivo"}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="loyalty-row-actions">
                                                    <button
                                                        type="button"
                                                        title="Editar programa"
                                                        disabled={
                                                            isLoadingDetail
                                                        }
                                                        onClick={() =>
                                                            openEditForm(
                                                                program.id
                                                            )
                                                        }
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title={
                                                            program.activo
                                                                ? "Desactivar programa"
                                                                : "Activar programa"
                                                        }
                                                        disabled={
                                                            changingStatusId ===
                                                            program.id
                                                        }
                                                        onClick={() =>
                                                            handleStatusChange(
                                                                program
                                                            )
                                                        }
                                                    >
                                                        {program.activo ? (
                                                            <FaBan />
                                                        ) : (
                                                            <FaCheck />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="loyalty-pagination admin-pagination">
                    <span>
                        Página{" "}
                        {
                            pagination.page
                        }{" "}
                        de{" "}
                        {
                            pagination.totalPages
                        }
                        {" · "}
                        {
                            pagination.total
                        }{" "}
                        programas
                    </span>

                    <div>
                        <button
                            type="button"
                            disabled={
                                pagination.page <=
                                1
                            }
                            onClick={() =>
                                setFilters(
                                    (
                                        previous
                                    ) => ({
                                        ...previous,
                                        page:
                                            previous.page -
                                            1
                                    })
                                )
                            }
                        >
                            Anterior
                        </button>

                        <button
                            type="button"
                            disabled={
                                pagination.page >=
                                pagination.totalPages
                            }
                            onClick={() =>
                                setFilters(
                                    (
                                        previous
                                    ) => ({
                                        ...previous,
                                        page:
                                            previous.page +
                                            1
                                    })
                                )
                            }
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </section>
        </section>
    );
}

export default LoyaltyAdmin;
