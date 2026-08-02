import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaBan,
    FaBuilding,
    FaCheck,
    FaChevronLeft,
    FaChevronRight,
    FaCog,
    FaEdit,
    FaFileAlt,
    FaGlobe,
    FaHashtag,
    FaKey,
    FaLock,
    FaPlus,
    FaSave,
    FaSearch,
    FaStore,
    FaSyncAlt,
    FaTimes,
    FaToggleOn,
    FaHistory,  
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";

import {
    ApiError
} from "../../../services/api";

import AuditPanel from "./AuditPanel";

import {
    createSettingRequest,
    getSettingOptionsRequest,
    listCorrelativesRequest,
    listSettingsRequest,
    updateCorrelativeRequest,
    updateSettingEditabilityRequest,
    updateSettingRequest
} from "../../../services/setting.service";

import "./settingsAdmin.css";

const EMPTY_OPTIONS = {
    sucursales: [],
    tiposDato: [],
    tiposDocumento: [],
    sucursalSeleccionadaId: null,
    puedeCrearGlobal: false
};

const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

function createEmptySettingForm(
    canCreateGlobal = false,
    defaultBranchId = ""
) {
    return {
        alcance:
            canCreateGlobal
                ? "GLOBAL"
                : "SUCURSAL",

        sucursalId:
            defaultBranchId,

        clave: "",
        tipoDato: "TEXTO",
        valor: "",
        descripcion: "",
        editable: true
    };
}

function getDefaultValueByType(
    dataType
) {
    if (
        dataType ===
        "BOOLEANO"
    ) {
        return "true";
    }

    if (
        dataType ===
        "JSON"
    ) {
        return "{}";
    }

    return "";
}

function convertSettingValueToInput(
    value,
    dataType
) {
    if (
        dataType ===
        "JSON"
    ) {
        try {
            return JSON.stringify(
                value,
                null,
                2
            );
        } catch {
            return "{}";
        }
    }

    if (
        dataType ===
        "BOOLEANO"
    ) {
        return value
            ? "true"
            : "false";
    }

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);
}

function parseSettingValue(
    value,
    dataType
) {
    if (
        dataType ===
        "ENTERO"
    ) {
        const result =
            Number(value);

        if (
            !Number.isInteger(
                result
            )
        ) {
            throw new Error(
                "El valor debe ser un número entero."
            );
        }

        return result;
    }

    if (
        dataType ===
        "DECIMAL"
    ) {
        const result =
            Number(value);

        if (
            !Number.isFinite(
                result
            )
        ) {
            throw new Error(
                "El valor debe ser un número decimal válido."
            );
        }

        return result;
    }

    if (
        dataType ===
        "BOOLEANO"
    ) {
        return value === "true";
    }

    if (
        dataType ===
        "JSON"
    ) {
        let result;

        try {
            result =
                JSON.parse(value);
        } catch {
            throw new Error(
                "El contenido JSON no es válido."
            );
        }

        if (
            result === null ||
            typeof result !==
                "object"
        ) {
            throw new Error(
                "El valor JSON debe ser un objeto o una lista."
            );
        }

        return result;
    }

    if (
        String(value).trim() ===
        ""
    ) {
        throw new Error(
            "El valor de la configuración es obligatorio."
        );
    }

    return String(value).trim();
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
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(
            /(^|\s)\S/g,
            (letter) =>
                letter.toUpperCase()
        );
}

function formatSettingValue(
    setting
) {
    if (
        setting.tipoDato ===
        "BOOLEANO"
    ) {
        return setting.valor
            ? "Sí"
            : "No";
    }

    if (
        setting.tipoDato ===
        "JSON"
    ) {
        try {
            const text =
                JSON.stringify(
                    setting.valor
                );

            return text.length > 100
                ? `${text.slice(
                      0,
                      100
                  )}...`
                : text;
        } catch {
            return "JSON";
        }
    }

    return String(
        setting.valor
    );
}

function SettingsAdmin() {
    const {
        token,
        usuario
    } = useAuth();

    const roleCode =
        usuario?.rol?.codigo ??
        "";

    const isGeneralAdmin =
        roleCode ===
        "ADMINISTRADOR_GENERAL";

    const [
        activeTab,
        setActiveTab
    ] = useState(
        "PARAMETROS"
    );

    const [
        options,
        setOptions
    ] = useState(
        EMPTY_OPTIONS
    );

    const [
        settings,
        setSettings
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
        scopeFilter,
        setScopeFilter
    ] = useState("TODOS");

    const [
        typeFilter,
        setTypeFilter
    ] = useState("");

    const [
        branchFilter,
        setBranchFilter
    ] = useState("");

    const [
        settingForm,
        setSettingForm
    ] = useState(
        () =>
            createEmptySettingForm()
    );

    const [
        settingFormVisible,
        setSettingFormVisible
    ] = useState(false);

    const [
        editingSetting,
        setEditingSetting
    ] = useState(null);

    const [
        correlativeBranchId,
        setCorrelativeBranchId
    ] = useState("");

    const [
        correlatives,
        setCorrelatives
    ] = useState([]);

    const [
        correlativeDrafts,
        setCorrelativeDrafts
    ] = useState({});

    const [
        isLoadingOptions,
        setIsLoadingOptions
    ] = useState(true);

    const [
        isLoadingSettings,
        setIsLoadingSettings
    ] = useState(true);

    const [
        isLoadingCorrelatives,
        setIsLoadingCorrelatives
    ] = useState(false);

    const [
        isSaving,
        setIsSaving
    ] = useState(false);

    const [
        savingCorrelative,
        setSavingCorrelative
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

    const visibleStatistics =
        useMemo(
            () => ({
                globales:
                    settings.filter(
                        (setting) =>
                            setting.alcance ===
                            "GLOBAL"
                    ).length,

                sucursales:
                    settings.filter(
                        (setting) =>
                            setting.alcance ===
                            "SUCURSAL"
                    ).length,

                editables:
                    settings.filter(
                        (setting) =>
                            setting.editable
                    ).length,

                protegidas:
                    settings.filter(
                        (setting) =>
                            !setting.editable
                    ).length
            }),
            [settings]
        );

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadOptions() {
            setIsLoadingOptions(true);
            setError("");

            try {
                const result =
                    await getSettingOptionsRequest(
                        token,
                        {
                            signal:
                                controller.signal
                        }
                    );

                setOptions(result);

                const defaultBranchId =
                    result
                        .sucursalSeleccionadaId ??
                    result
                        .sucursales[0]?.id ??
                    "";

                setBranchFilter(
                    result.sucursales.length ===
                    1
                        ? defaultBranchId
                        : ""
                );

                setCorrelativeBranchId(
                    defaultBranchId
                );

                setSettingForm(
                    createEmptySettingForm(
                        result.puedeCrearGlobal,
                        defaultBranchId
                    )
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
                        "No se pudieron cargar las opciones de configuración."
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

        async function loadSettings() {
            setIsLoadingSettings(true);
            setError("");

            try {
                const result =
                    await listSettingsRequest(
                        token,
                        {
                            search:
                                appliedSearch,

                            sucursalId:
                                branchFilter,

                            alcance:
                                scopeFilter,

                            tipoDato:
                                typeFilter,

                            page,
                            limit: 20,

                            signal:
                                controller.signal
                        }
                    );

                setSettings(
                    result.configuraciones
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
                        "No se pudieron cargar las configuraciones."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingSettings(
                        false
                    );
                }
            }
        }

        void loadSettings();

        return () =>
            controller.abort();
    }, [
        token,
        isLoadingOptions,
        appliedSearch,
        branchFilter,
        scopeFilter,
        typeFilter,
        page,
        reloadKey
    ]);

    useEffect(() => {
        if (
            !correlativeBranchId ||
            activeTab !==
                "CORRELATIVOS"
        ) {
            setCorrelatives([]);
            setCorrelativeDrafts({});
            return undefined;
        }

        const controller =
            new AbortController();

        async function loadCorrelatives() {
            setIsLoadingCorrelatives(
                true
            );

            setError("");

            try {
                const result =
                    await listCorrelativesRequest(
                        token,
                        {
                            sucursalId:
                                correlativeBranchId,

                            signal:
                                controller.signal
                        }
                    );

                setCorrelatives(
                    result.correlativos
                );

                setCorrelativeDrafts(
                    Object.fromEntries(
                        result.correlativos.map(
                            (item) => [
                                item.tipoDocumento,
                                {
                                    prefijo:
                                        item.prefijo,

                                    longitudNumero:
                                        String(
                                            item.longitudNumero
                                        )
                                }
                            ]
                        )
                    )
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
                        "No se pudieron cargar los correlativos."
                );
            } finally {
                if (
                    !controller.signal
                        .aborted
                ) {
                    setIsLoadingCorrelatives(
                        false
                    );
                }
            }
        }

        void loadCorrelatives();

        return () =>
            controller.abort();
    }, [
        token,
        correlativeBranchId,
        activeTab,
        reloadKey
    ]);

    function clearFeedback() {
        setMessage("");
        setError("");
    }

    function resetSettingForm() {
        const defaultBranchId =
            options
                .sucursalSeleccionadaId ??
            options.sucursales[0]?.id ??
            "";

        setSettingForm(
            createEmptySettingForm(
                options.puedeCrearGlobal,
                defaultBranchId
            )
        );
    }

    function openCreateSetting() {
        clearFeedback();

        setEditingSetting(null);
        resetSettingForm();
        setSettingFormVisible(true);
    }

    function openEditSetting(
        setting
    ) {
        clearFeedback();

        setEditingSetting(
            setting
        );

        setSettingForm({
            alcance:
                setting.alcance,

            sucursalId:
                setting.sucursalId ??
                "",

            clave:
                setting.clave,

            tipoDato:
                setting.tipoDato,

            valor:
                convertSettingValueToInput(
                    setting.valor,
                    setting.tipoDato
                ),

            descripcion:
                setting.descripcion ??
                "",

            editable:
                setting.editable
        });

        setSettingFormVisible(true);
    }

    function closeSettingForm() {
        setSettingFormVisible(false);
        setEditingSetting(null);
        resetSettingForm();
    }

    function handleSettingFieldChange(
        field,
        value
    ) {
        setSettingForm(
            (previous) => {
                if (
                    field ===
                    "tipoDato"
                ) {
                    return {
                        ...previous,

                        tipoDato:
                            value,

                        valor:
                            getDefaultValueByType(
                                value
                            )
                    };
                }

                if (
                    field ===
                    "alcance"
                ) {
                    return {
                        ...previous,

                        alcance:
                            value,

                        sucursalId:
                            value ===
                            "GLOBAL"
                                ? ""
                                : previous
                                      .sucursalId ||
                                  options
                                      .sucursales[0]
                                      ?.id ||
                                  ""
                    };
                }

                return {
                    ...previous,
                    [field]: value
                };
            }
        );
    }

    async function handleSettingSubmit(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        if (
            !editingSetting &&
            settingForm.clave
                .trim()
                .length < 2
        ) {
            setError(
                "La clave debe contener al menos 2 caracteres."
            );
            return;
        }

        if (
            settingForm.alcance ===
                "SUCURSAL" &&
            !settingForm.sucursalId
        ) {
            setError(
                "Selecciona la sucursal de la configuración."
            );
            return;
        }

        let parsedValue;

        try {
            parsedValue =
                parseSettingValue(
                    settingForm.valor,
                    settingForm.tipoDato
                );
        } catch (
            validationError
        ) {
            setError(
                validationError.message
            );
            return;
        }

        setIsSaving(true);

        try {
            let response;

            if (editingSetting) {
                response =
                    await updateSettingRequest(
                        token,
                        editingSetting.id,
                        {
                            valor:
                                parsedValue,

                            descripcion:
                                settingForm
                                    .descripcion
                                    .trim() ||
                                null
                        }
                    );
            } else {
                response =
                    await createSettingRequest(
                        token,
                        {
                            sucursalId:
                                settingForm
                                    .alcance ===
                                "GLOBAL"
                                    ? null
                                    : settingForm
                                          .sucursalId,

                            clave:
                                settingForm
                                    .clave
                                    .trim(),

                            valor:
                                parsedValue,

                            tipoDato:
                                settingForm
                                    .tipoDato,

                            descripcion:
                                settingForm
                                    .descripcion
                                    .trim() ||
                                null,

                            editable:
                                settingForm
                                    .editable
                        }
                    );
            }

            setMessage(
                response.message
            );

            closeSettingForm();

            setReloadKey(
                (value) =>
                    value + 1
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo guardar la configuración."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleEditabilityChange(
        setting
    ) {
        clearFeedback();

        const nextEditable =
            !setting.editable;

        const confirmed =
            window.confirm(
                nextEditable
                    ? `¿Permitir la edición de ${setting.clave}?`
                    : `¿Proteger ${setting.clave} contra modificaciones?`
            );

        if (!confirmed) {
            return;
        }

        setIsSaving(true);

        try {
            const response =
                await updateSettingEditabilityRequest(
                    token,
                    setting.id,
                    nextEditable
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
                    "No se pudo cambiar la editabilidad."
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

    function handleCorrelativeDraft(
        documentType,
        field,
        value
    ) {
        setCorrelativeDrafts(
            (previous) => ({
                ...previous,

                [documentType]: {
                    ...previous[
                        documentType
                    ],

                    [field]: value
                }
            })
        );
    }

    async function handleSaveCorrelative(
        correlative
    ) {
        clearFeedback();

        const draft =
            correlativeDrafts[
                correlative
                    .tipoDocumento
            ];

        if (!draft) {
            return;
        }

        const prefix =
            draft.prefijo
                .trim()
                .toUpperCase();

        const length =
            Number(
                draft.longitudNumero
            );

        if (
            prefix.length < 1 ||
            prefix.length > 15
        ) {
            setError(
                "El prefijo debe contener entre 1 y 15 caracteres."
            );
            return;
        }

        if (
            !/^[A-Z0-9_-]+$/.test(
                prefix
            )
        ) {
            setError(
                "El prefijo solo puede contener letras, números y guiones."
            );
            return;
        }

        if (
            !Number.isInteger(
                length
            ) ||
            length < 3 ||
            length > 12
        ) {
            setError(
                "La longitud debe ser un número entero entre 3 y 12."
            );
            return;
        }

        setSavingCorrelative(
            correlative
                .tipoDocumento
        );

        try {
            const response =
                await updateCorrelativeRequest(
                    token,
                    correlative
                        .tipoDocumento,
                    {
                        sucursalId:
                            correlativeBranchId,

                        prefijo:
                            prefix,

                        longitudNumero:
                            length
                    }
                );

            setCorrelatives(
                response.data
                    .correlativos
            );

            setCorrelativeDrafts(
                Object.fromEntries(
                    response.data
                        .correlativos
                        .map(
                            (item) => [
                                item.tipoDocumento,
                                {
                                    prefijo:
                                        item.prefijo,

                                    longitudNumero:
                                        String(
                                            item.longitudNumero
                                        )
                                }
                            ]
                        )
                )
            );

            setMessage(
                response.message
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo actualizar el correlativo."
            );
        } finally {
            setSavingCorrelative("");
        }
    }

    if (isLoadingOptions) {
        return (
            <div className="settings-loading">
                <FaCog />
                Cargando configuración...
            </div>
        );
    }

    return (
        <section className="settings-admin">
            <header className="settings-heading">
                <div>
                    <span className="admin-eyebrow">
                        CONFIGURACIÓN
                    </span>

                    <h2>
                        Parámetros del sistema
                    </h2>

                    <p>
                        Administra el comportamiento
                        del sistema y la numeración
                        de documentos.
                    </p>
                </div>

                {activeTab ===
                    "PARAMETROS" && (
                    <button
                        type="button"
                        onClick={
                            openCreateSetting
                        }
                    >
                        <FaPlus />
                        Nueva configuración
                    </button>
                )}

                {activeTab ===
                    "CORRELATIVOS" && (
                    <button
                        type="button"
                        disabled={
                            !correlativeBranchId ||
                            isLoadingCorrelatives
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
                )}

                {activeTab ===
                    "AUDITORIA" && (
                    <AuditPanel />
                )}
            </header>

            {message && (
                <div className="settings-feedback success">
                    {message}
                </div>
            )}

            {error && (
                <div className="settings-feedback error">
                    {error}
                </div>
            )}

            <nav className="settings-tabs">
                <button
                    type="button"
                    className={
                        activeTab ===
                        "PARAMETROS"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveTab(
                            "PARAMETROS"
                        )
                    }
                >
                    <FaCog />
                    Parámetros
                </button>

                <button
                    type="button"
                    className={
                        activeTab ===
                        "CORRELATIVOS"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveTab(
                            "CORRELATIVOS"
                        )
                    }
                >
                    <FaHashtag />
                    Correlativos
                </button>

                <button
                    type="button"
                    className={
                        activeTab ===
                        "AUDITORIA"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveTab(
                            "AUDITORIA"
                        )
                    }
                >
                    <FaHistory />
                    Auditoría
                </button>

            </nav>

            {activeTab ===
                "PARAMETROS" && (
                <>
                    <div className="setting-stat-grid">
                        <article>
                            <FaFileAlt />

                            <div>
                                <span>
                                    Configuraciones
                                </span>

                                <strong>
                                    {
                                        pagination.total
                                    }
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaGlobe />

                            <div>
                                <span>
                                    Globales visibles
                                </span>

                                <strong>
                                    {
                                        visibleStatistics
                                            .globales
                                    }
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaStore />

                            <div>
                                <span>
                                    Por sucursal
                                </span>

                                <strong>
                                    {
                                        visibleStatistics
                                            .sucursales
                                    }
                                </strong>
                            </div>
                        </article>

                        <article>
                            <FaLock />

                            <div>
                                <span>
                                    Protegidas visibles
                                </span>

                                <strong>
                                    {
                                        visibleStatistics
                                            .protegidas
                                    }
                                </strong>
                            </div>
                        </article>
                    </div>

                    {settingFormVisible && (
                        <form
                            className="setting-form-card"
                            onSubmit={
                                handleSettingSubmit
                            }
                        >
                            <div className="settings-section-heading">
                                <div>
                                    <span className="admin-eyebrow">
                                        {editingSetting
                                            ? "EDITAR CONFIGURACIÓN"
                                            : "NUEVA CONFIGURACIÓN"}
                                    </span>

                                    <h3>
                                        {editingSetting
                                            ? editingSetting.clave
                                            : "Registrar parámetro"}
                                    </h3>
                                </div>

                                <button
                                    type="button"
                                    className="setting-close-button"
                                    onClick={
                                        closeSettingForm
                                    }
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="setting-form-grid">
                                <label>
                                    Alcance *

                                    <select
                                        disabled={
                                            Boolean(
                                                editingSetting
                                            )
                                        }
                                        value={
                                            settingForm
                                                .alcance
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleSettingFieldChange(
                                                "alcance",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {options.puedeCrearGlobal && (
                                            <option value="GLOBAL">
                                                Global
                                            </option>
                                        )}

                                        <option value="SUCURSAL">
                                            Por sucursal
                                        </option>
                                    </select>
                                </label>

                                {settingForm.alcance ===
                                    "SUCURSAL" && (
                                    <label>
                                        Sucursal *

                                        <select
                                            disabled={
                                                Boolean(
                                                    editingSetting
                                                )
                                            }
                                            value={
                                                settingForm
                                                    .sucursalId
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                handleSettingFieldChange(
                                                    "sucursalId",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Seleccionar
                                            </option>

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
                                )}

                                <label>
                                    Clave *

                                    <input
                                        type="text"
                                        maxLength="120"
                                        disabled={
                                            Boolean(
                                                editingSetting
                                            )
                                        }
                                        placeholder="EJEMPLO.CONFIGURACION"
                                        value={
                                            settingForm
                                                .clave
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleSettingFieldChange(
                                                "clave",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Tipo de dato *

                                    <select
                                        disabled={
                                            Boolean(
                                                editingSetting
                                            )
                                        }
                                        value={
                                            settingForm
                                                .tipoDato
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleSettingFieldChange(
                                                "tipoDato",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        {options.tiposDato.map(
                                            (
                                                dataType
                                            ) => (
                                                <option
                                                    key={
                                                        dataType.codigo
                                                    }
                                                    value={
                                                        dataType.codigo
                                                    }
                                                >
                                                    {
                                                        dataType.nombre
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label className="setting-field-full">
                                    Valor *

                                    {settingForm.tipoDato ===
                                    "BOOLEANO" ? (
                                        <select
                                            value={
                                                settingForm
                                                    .valor
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                handleSettingFieldChange(
                                                    "valor",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="true">
                                                Verdadero
                                            </option>

                                            <option value="false">
                                                Falso
                                            </option>
                                        </select>
                                    ) : settingForm.tipoDato ===
                                      "JSON" ? (
                                        <textarea
                                            rows="8"
                                            spellCheck="false"
                                            value={
                                                settingForm
                                                    .valor
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                handleSettingFieldChange(
                                                    "valor",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    ) : (
                                        <input
                                            type={
                                                settingForm.tipoDato ===
                                                "FECHA"
                                                    ? "date"
                                                    : settingForm.tipoDato ===
                                                      "HORA"
                                                      ? "time"
                                                      : settingForm.tipoDato ===
                                                            "ENTERO" ||
                                                        settingForm.tipoDato ===
                                                            "DECIMAL"
                                                        ? "number"
                                                        : "text"
                                            }
                                            step={
                                                settingForm.tipoDato ===
                                                "ENTERO"
                                                    ? "1"
                                                    : settingForm.tipoDato ===
                                                      "DECIMAL"
                                                      ? "any"
                                                      : undefined
                                            }
                                            value={
                                                settingForm
                                                    .valor
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                handleSettingFieldChange(
                                                    "valor",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    )}
                                </label>

                                <label className="setting-field-full">
                                    Descripción

                                    <textarea
                                        rows="3"
                                        maxLength="1000"
                                        value={
                                            settingForm
                                                .descripcion
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            handleSettingFieldChange(
                                                "descripcion",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />
                                </label>

                                {!editingSetting &&
                                    isGeneralAdmin && (
                                    <label className="setting-checkbox-field setting-field-full">
                                        <input
                                            type="checkbox"
                                            checked={
                                                settingForm
                                                    .editable
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                handleSettingFieldChange(
                                                    "editable",
                                                    event
                                                        .target
                                                        .checked
                                                )
                                            }
                                        />

                                        Permitir que esta configuración sea editada
                                    </label>
                                )}
                            </div>

                            <div className="setting-form-actions">
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={
                                        closeSettingForm
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="primary"
                                    disabled={
                                        isSaving ||
                                        (
                                            editingSetting &&
                                            !editingSetting
                                                .editable
                                        )
                                    }
                                >
                                    <FaSave />

                                    {isSaving
                                        ? "Guardando..."
                                        : "Guardar configuración"}
                                </button>
                            </div>
                        </form>
                    )}

                    <section className="settings-list-card">
                        <form
                            className="settings-filters"
                            onSubmit={
                                handleSearch
                            }
                        >
                            <div className="settings-search">
                                <FaSearch />

                                <input
                                    type="search"
                                    placeholder="Clave, descripción o sucursal..."
                                    value={
                                        search
                                    }
                                    onChange={(
                                        event
                                    ) =>
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
                                onChange={(
                                    event
                                ) => {
                                    setBranchFilter(
                                        event
                                            .target
                                            .value
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
                                    scopeFilter
                                }
                                onChange={(
                                    event
                                ) => {
                                    setScopeFilter(
                                        event
                                            .target
                                            .value
                                    );

                                    setPage(1);
                                }}
                            >
                                <option value="TODOS">
                                    Todos los alcances
                                </option>

                                <option value="GLOBAL">
                                    Globales
                                </option>

                                <option value="SUCURSAL">
                                    Por sucursal
                                </option>
                            </select>

                            <select
                                value={
                                    typeFilter
                                }
                                onChange={(
                                    event
                                ) => {
                                    setTypeFilter(
                                        event
                                            .target
                                            .value
                                    );

                                    setPage(1);
                                }}
                            >
                                <option value="">
                                    Todos los tipos
                                </option>

                                {options.tiposDato.map(
                                    (
                                        dataType
                                    ) => (
                                        <option
                                            key={
                                                dataType.codigo
                                            }
                                            value={
                                                dataType.codigo
                                            }
                                        >
                                            {
                                                dataType.nombre
                                            }
                                        </option>
                                    )
                                )}
                            </select>

                            <button type="submit">
                                Buscar
                            </button>
                        </form>

                        {isLoadingSettings ? (
                            <div className="settings-empty-state">
                                <FaCog />
                                Cargando configuraciones...
                            </div>
                        ) : settings.length ===
                          0 ? (
                            <div className="settings-empty-state">
                                <FaCog />

                                <strong>
                                    No se encontraron configuraciones
                                </strong>
                            </div>
                        ) : (
                            <div className="settings-table-wrapper">
                                <table className="settings-table">
                                    <thead>
                                        <tr>
                                            <th>Clave</th>
                                            <th>Alcance</th>
                                            <th>Tipo</th>
                                            <th>Valor</th>
                                            <th>Actualizado por</th>
                                            <th>Editable</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {settings.map(
                                            (
                                                setting
                                            ) => (
                                                <tr
                                                    key={
                                                        setting.id
                                                    }
                                                >
                                                    <td>
                                                        <div className="setting-key-cell">
                                                            <FaKey />

                                                            <div>
                                                                <strong>
                                                                    {
                                                                        setting.clave
                                                                    }
                                                                </strong>

                                                                <small>
                                                                    {setting.descripcion ??
                                                                        "Sin descripción"}
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`setting-scope ${setting.alcance.toLowerCase()}`}
                                                        >
                                                            {setting.alcance ===
                                                            "GLOBAL"
                                                                ? "Global"
                                                                : setting
                                                                      .sucursal
                                                                      ?.nombre ??
                                                                  "Sucursal"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {formatLabel(
                                                            setting.tipoDato
                                                        )}
                                                    </td>

                                                    <td>
                                                        <code className="setting-value">
                                                            {formatSettingValue(
                                                                setting
                                                            )}
                                                        </code>
                                                    </td>

                                                    <td>
                                                        <div className="setting-update-cell">
                                                            <strong>
                                                                {
                                                                    setting
                                                                        .actualizadoPor
                                                                        .nombreCompleto
                                                                }
                                                            </strong>

                                                            <small>
                                                                {formatDateTime(
                                                                    setting.updatedAt
                                                                )}
                                                            </small>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`setting-editable ${setting.editable ? "yes" : "no"}`}
                                                        >
                                                            {setting.editable ? (
                                                                <>
                                                                    <FaCheck />
                                                                    Sí
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FaLock />
                                                                    No
                                                                </>
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="setting-actions">
                                                            <button
                                                                type="button"
                                                                title="Editar"
                                                                disabled={
                                                                    !setting.editable
                                                                }
                                                                onClick={() =>
                                                                    openEditSetting(
                                                                        setting
                                                                    )
                                                                }
                                                            >
                                                                <FaEdit />
                                                            </button>

                                                            {isGeneralAdmin && (
                                                                <button
                                                                    type="button"
                                                                    title={
                                                                        setting.editable
                                                                            ? "Proteger"
                                                                            : "Permitir edición"
                                                                    }
                                                                    disabled={
                                                                        isSaving
                                                                    }
                                                                    onClick={() =>
                                                                        handleEditabilityChange(
                                                                            setting
                                                                        )
                                                                    }
                                                                >
                                                                    {setting.editable ? (
                                                                        <FaBan />
                                                                    ) : (
                                                                        <FaToggleOn />
                                                                    )}
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

                        <div className="settings-pagination">
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
                                                    value -
                                                        1
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
                                                value +
                                                1
                                        )
                                    }
                                >
                                    Siguiente
                                    <FaChevronRight />
                                </button>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {activeTab ===
                "CORRELATIVOS" && (
                <>
                    <section className="correlative-branch-card">
                        <label>
                            <span>
                                <FaBuilding />
                                Sucursal
                            </span>

                            <select
                                value={
                                    correlativeBranchId
                                }
                                onChange={(
                                    event
                                ) =>
                                    setCorrelativeBranchId(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="">
                                    Seleccionar sucursal
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
                        </label>

                        <div>
                            <FaHashtag />

                            <p>
                                El último número utilizado
                                no se modifica desde esta
                                pantalla. Solo se actualiza
                                el prefijo y la longitud.
                            </p>
                        </div>
                    </section>

                    {!correlativeBranchId ? (
                        <div className="settings-empty-state">
                            <FaStore />

                            <strong>
                                Selecciona una sucursal
                            </strong>
                        </div>
                    ) : isLoadingCorrelatives ? (
                        <div className="settings-empty-state">
                            <FaHashtag />
                            Cargando correlativos...
                        </div>
                    ) : (
                        <div className="correlative-grid">
                            {correlatives.map(
                                (
                                    correlative
                                ) => {
                                    const draft =
                                        correlativeDrafts[
                                            correlative
                                                .tipoDocumento
                                        ] ?? {
                                            prefijo:
                                                correlative.prefijo,

                                            longitudNumero:
                                                String(
                                                    correlative.longitudNumero
                                                )
                                        };

                                    const isSavingCurrent =
                                        savingCorrelative ===
                                        correlative
                                            .tipoDocumento;

                                    return (
                                        <article
                                            key={
                                                correlative.tipoDocumento
                                            }
                                            className="correlative-card"
                                        >
                                            <header>
                                                <div className="correlative-icon">
                                                    <FaFileAlt />
                                                </div>

                                                <div>
                                                    <span>
                                                        {
                                                            correlative.tipoDocumento
                                                        }
                                                    </span>

                                                    <h3>
                                                        {
                                                            correlative.nombre
                                                        }
                                                    </h3>
                                                </div>

                                                <span
                                                    className={`correlative-status ${
                                                        correlative.configurado
                                                            ? "configured"
                                                            : "pending"
                                                    }`}
                                                >
                                                    {correlative.configurado
                                                        ? "Configurado"
                                                        : "Pendiente"}
                                                </span>
                                            </header>

                                            <div className="correlative-preview">
                                                <span>
                                                    Próximo número
                                                </span>

                                                <strong>
                                                    {
                                                        correlative.proximoNumero
                                                    }
                                                </strong>
                                            </div>

                                            <div className="correlative-data">
                                                <div>
                                                    <span>
                                                        Último número
                                                    </span>

                                                    <strong>
                                                        {
                                                            correlative.ultimoNumero
                                                        }
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        Longitud actual
                                                    </span>

                                                    <strong>
                                                        {
                                                            correlative.longitudNumero
                                                        }
                                                    </strong>
                                                </div>
                                            </div>

                                            <label>
                                                Prefijo

                                                <input
                                                    type="text"
                                                    maxLength="15"
                                                    value={
                                                        draft.prefijo
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleCorrelativeDraft(
                                                            correlative.tipoDocumento,
                                                            "prefijo",
                                                            event
                                                                .target
                                                                .value
                                                                .toUpperCase()
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label>
                                                Cantidad de dígitos

                                                <input
                                                    type="number"
                                                    min="3"
                                                    max="12"
                                                    step="1"
                                                    value={
                                                        draft.longitudNumero
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleCorrelativeDraft(
                                                            correlative.tipoDocumento,
                                                            "longitudNumero",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                disabled={
                                                    isSavingCurrent
                                                }
                                                onClick={() =>
                                                    handleSaveCorrelative(
                                                        correlative
                                                    )
                                                }
                                            >
                                                <FaSave />

                                                {isSavingCurrent
                                                    ? "Guardando..."
                                                    : "Guardar correlativo"}
                                            </button>
                                        </article>
                                    );
                                }
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

export default SettingsAdmin;