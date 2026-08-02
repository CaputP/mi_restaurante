import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaArchive,
    FaCalendarAlt,
    FaCheck,
    FaEdit,
    FaPause,
    FaPlus,
    FaSave,
    FaSearch,
    FaSyncAlt,
    FaTags,
    FaTimes
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";

import {
    ApiError
} from "../../../services/api";

import {
    createPromotionRequest,
    getPromotionOptionsRequest,
    getPromotionRequest,
    listPromotionsRequest,
    updatePromotionRequest,
    updatePromotionStatusRequest
} from "../../../services/promotions.service";

import "./promotionsAdmin.css";

const EMPTY_OPTIONS = {
    sucursales: [],
    productos: [],
    tipos: [],
    estados: [],
    puedeCrearGlobal: false
};

const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

function toDateTimeLocal(
    value
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    const adjustedDate =
        new Date(
            date.getTime() -
                date.getTimezoneOffset() *
                    60 *
                    1000
        );

    return adjustedDate
        .toISOString()
        .slice(0, 16);
}

function getInitialDateTime() {
    return toDateTimeLocal(
        new Date()
    );
}

function getFinalDateTime() {
    const date =
        new Date();

    date.setDate(
        date.getDate() + 30
    );

    return toDateTimeLocal(
        date
    );
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
            "DESCUENTO_PORCENTAJE",

        valor:
            "10",

        consumoMinimo:
            "0",

        automatica:
            true,

        acumulable:
            false,

        maximoUsos:
            "",

        fechaInicio:
            getInitialDateTime(),

        fechaFin:
            getFinalDateTime(),

        estado:
            "BORRADOR",

        productoIds:
            []
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
            ?.mensaje ??
        error.errors?.[0]
            ?.message;

    return validationMessage
        ? `${error.message} ${validationMessage}`
        : error.message;
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

function formatPromotionValue(
    promotion
) {
    switch (
        promotion.tipo
    ) {
        case "DESCUENTO_FIJO":
            return `${formatMoney(
                promotion.valor
            )} de descuento`;

        case "DESCUENTO_PORCENTAJE":
            return `${promotion.valor}% de descuento`;

        case "PRODUCTO_GRATIS":
            return `${promotion.valor} producto(s) gratis`;

        case "COMBO":
            return `${formatMoney(
                promotion.valor
            )} precio promocional`;

        default:
            return promotion.valor;
    }
}

function PromotionsAdmin() {
    const {
        token,
        usuario
    } = useAuth();

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
        products,
        setProducts
    ] = useState([]);

    const [
        promotions,
        setPromotions
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
        estado: "TODOS",
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
        productSearch,
        setProductSearch
    ] = useState("");

    const [
        editingPromotionId,
        setEditingPromotionId
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

    const activePromotions =
        useMemo(
            () =>
                promotions.filter(
                    (promotion) =>
                        promotion.estado ===
                        "ACTIVA"
                ).length,
            [promotions]
        );

    const totalUses =
        useMemo(
            () =>
                promotions.reduce(
                    (
                        total,
                        promotion
                    ) =>
                        total +
                        Number(
                            promotion.usosActuales ??
                                0
                        ),
                    0
                ),
            [promotions]
        );

    const selectedProducts =
        useMemo(
            () =>
                products.filter(
                    (product) =>
                        form.productoIds.includes(
                            product.id
                        )
                ),
            [
                products,
                form.productoIds
            ]
        );

    const filteredProducts =
        useMemo(
            () => {
                const search =
                    productSearch
                        .trim()
                        .toLowerCase();

                if (!search) {
                    return products;
                }

                return products.filter(
                    (product) =>
                        product.nombre
                            .toLowerCase()
                            .includes(
                                search
                            ) ||
                        product.codigo
                            .toLowerCase()
                            .includes(
                                search
                            ) ||
                        product.categoria
                            ?.nombre
                            ?.toLowerCase()
                            .includes(
                                search
                            )
                );
            },
            [
                products,
                productSearch
            ]
        );

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadOptions() {
            setIsLoadingOptions(true);

            try {
                const result =
                    await getPromotionOptionsRequest(
                        token,
                        {},
                        controller.signal
                    );

                setOptions(
                    result
                );

                setProducts(
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
                        "No se pudieron cargar las opciones de promociones."
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

        async function loadPromotions() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await listPromotionsRequest(
                        token,
                        filters,
                        controller.signal
                    );

                setPromotions(
                    result.promociones ??
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
                        "No se pudieron cargar las promociones."
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

        void loadPromotions();

        return () =>
            controller.abort();
    }, [
        token,
        filters.search,
        filters.sucursalId,
        filters.tipo,
        filters.estado,
        filters.page,
        filters.limit,
        reloadKey
    ]);

    useEffect(() => {
        if (!showForm) {
            return undefined;
        }

        const controller =
            new AbortController();

        async function loadProducts() {
            setIsLoadingProducts(true);

            try {
                const result =
                    await getPromotionOptionsRequest(
                        token,
                        {
                            sucursalId:
                                form.sucursalId
                        },
                        controller.signal
                    );

                setProducts(
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
                        "No se pudieron cargar los productos."
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

        void loadProducts();

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
        if (
            field ===
            "sucursalId"
        ) {
            setForm(
                (previous) => ({
                    ...previous,
                    sucursalId:
                        value,
                    productoIds:
                        []
                })
            );

            setProductSearch("");
            return;
        }

        setForm(
            (previous) => ({
                ...previous,
                [field]: value
            })
        );
    }

    function toggleProduct(
        productId
    ) {
        setForm(
            (previous) => {
                const isSelected =
                    previous.productoIds.includes(
                        productId
                    );

                return {
                    ...previous,

                    productoIds:
                        isSelected
                            ? previous.productoIds.filter(
                                  (id) =>
                                      id !==
                                      productId
                              )
                            : [
                                  ...previous.productoIds,
                                  productId
                              ]
                };
            }
        );
    }

    function selectAllFilteredProducts() {
        const filteredIds =
            filteredProducts.map(
                (product) =>
                    product.id
            );

        setForm(
            (previous) => ({
                ...previous,

                productoIds: [
                    ...new Set([
                        ...previous.productoIds,
                        ...filteredIds
                    ])
                ]
            })
        );
    }

    function clearSelectedProducts() {
        setForm(
            (previous) => ({
                ...previous,
                productoIds: []
            })
        );
    }

    function openCreateForm() {
        clearFeedback();

        setEditingPromotionId(
            null
        );

        setProductSearch("");

        setForm(
            createEmptyForm(
                getDefaultBranchId()
            )
        );

        setShowForm(true);
    }

    async function openEditForm(
        promotionId
    ) {
        clearFeedback();
        setIsLoadingDetail(true);

        try {
            const promotion =
                await getPromotionRequest(
                    token,
                    promotionId
                );

            setEditingPromotionId(
                promotion.id
            );

            setProductSearch("");

            setForm({
                sucursalId:
                    promotion.sucursalId ??
                    "",

                nombre:
                    promotion.nombre ??
                    "",

                descripcion:
                    promotion.descripcion ??
                    "",

                tipo:
                    promotion.tipo,

                valor:
                    promotion.valor ??
                    "",

                consumoMinimo:
                    promotion.consumoMinimo ??
                    "0",

                automatica:
                    Boolean(
                        promotion.automatica
                    ),

                acumulable:
                    Boolean(
                        promotion.acumulable
                    ),

                maximoUsos:
                    promotion.maximoUsos ??
                    "",

                fechaInicio:
                    toDateTimeLocal(
                        promotion.fechaInicio
                    ),

                fechaFin:
                    toDateTimeLocal(
                        promotion.fechaFin
                    ),

                estado:
                    promotion.estado,

                productoIds:
                    promotion.productos.map(
                        (product) =>
                            product.id
                    )
            });

            setShowForm(true);
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo cargar la promoción."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    function closeForm() {
        setEditingPromotionId(
            null
        );

        setProductSearch("");

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

        if (
            Number(
                form.valor
            ) <= 0
        ) {
            return "El valor de la promoción debe ser mayor a cero.";
        }

        if (
            form.tipo ===
                "DESCUENTO_PORCENTAJE" &&
            Number(
                form.valor
            ) > 100
        ) {
            return "El descuento porcentual no puede superar el 100 %.";
        }

        if (
            Number(
                form.consumoMinimo
            ) < 0
        ) {
            return "El consumo mínimo no puede ser negativo.";
        }

        if (
            form.maximoUsos !==
                "" &&
            Number(
                form.maximoUsos
            ) <= 0
        ) {
            return "El máximo de usos debe ser mayor a cero.";
        }

        if (
            !form.fechaInicio ||
            !form.fechaFin
        ) {
            return "Debes seleccionar la fecha inicial y final.";
        }

        if (
            new Date(
                form.fechaFin
            ) <=
            new Date(
                form.fechaInicio
            )
        ) {
            return "La fecha final debe ser posterior a la fecha inicial.";
        }

        if (
            (
                form.tipo ===
                    "PRODUCTO_GRATIS" ||
                form.tipo ===
                    "COMBO"
            ) &&
            form.productoIds
                .length === 0
        ) {
            return "Selecciona al menos un producto para esta promoción.";
        }

        if (
            !isGeneralAdministrator &&
            !form.sucursalId
        ) {
            return "Selecciona una sucursal.";
        }

        return "";
    }

    function buildPayload() {
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

            valor:
                Number(
                    form.valor
                ),

            consumoMinimo:
                Number(
                    form.consumoMinimo ||
                        0
                ),

            automatica:
                form.automatica,

            acumulable:
                form.acumulable,

            maximoUsos:
                form.maximoUsos ===
                ""
                    ? null
                    : Number(
                          form.maximoUsos
                      ),

            fechaInicio:
                new Date(
                    form.fechaInicio
                ).toISOString(),

            fechaFin:
                new Date(
                    form.fechaFin
                ).toISOString(),

            estado:
                form.estado,

            productoIds:
                form.productoIds
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

            if (editingPromotionId) {
                await updatePromotionRequest(
                    token,
                    editingPromotionId,
                    payload
                );

                setMessage(
                    "Promoción actualizada correctamente."
                );
            } else {
                await createPromotionRequest(
                    token,
                    payload
                );

                setMessage(
                    "Promoción creada correctamente."
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
                    "No se pudo guardar la promoción."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleStatusChange(
        promotion,
        nextStatus
    ) {
        if (
            nextStatus ===
            promotion.estado
        ) {
            return;
        }

        clearFeedback();

        const confirmed =
            window.confirm(
                nextStatus ===
                    "ARCHIVADA"
                    ? "¿Deseas archivar esta promoción? Después no podrá reactivarse."
                    : `¿Deseas cambiar la promoción a ${formatLabel(
                          nextStatus
                      )}?`
            );

        if (!confirmed) {
            return;
        }

        setChangingStatusId(
            promotion.id
        );

        try {
            await updatePromotionStatusRequest(
                token,
                promotion.id,
                nextStatus
            );

            setMessage(
                "Estado de la promoción actualizado correctamente."
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
                    "No se pudo cambiar el estado de la promoción."
            );
        } finally {
            setChangingStatusId(
                ""
            );
        }
    }

    return (
        <section className="promotions-admin">
            <header className="promotions-heading">
                <div>
                    <span className="admin-eyebrow">
                        PROMOCIONES
                    </span>

                    <h2>
                        Campañas y descuentos
                    </h2>

                    <p>
                        Administra promociones por fecha, sucursal, producto y consumo mínimo.
                    </p>
                </div>

                <div className="promotions-heading-actions">
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
                        Nueva promoción
                    </button>
                </div>
            </header>

            {message && (
                <div className="promotions-feedback success">
                    {message}
                </div>
            )}

            {error && (
                <div className="promotions-feedback error">
                    {error}
                </div>
            )}

            <section className="promotions-stats">
                <article>
                    <FaTags />

                    <div>
                        <span>
                            Total de promociones
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
                            Activas en esta página
                        </span>

                        <strong>
                            {activePromotions}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaCalendarAlt />

                    <div>
                        <span>
                            Usos registrados
                        </span>

                        <strong>
                            {totalUses}
                        </strong>
                    </div>
                </article>
            </section>

            <section className="promotions-filters">
                <label className="promotions-search">
                    <FaSearch />

                    <input
                        type="search"
                        placeholder="Buscar promoción..."
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
                        {isGeneralAdministrator
                            ? "Todas las sucursales y globales"
                            : "Todas mis sucursales y globales"}
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

                    {options.tipos.map(
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
                        filters.estado
                    }
                    onChange={(
                        event
                    ) =>
                        handleFilterChange(
                            "estado",
                            event.target
                                .value
                        )
                    }
                >
                    <option value="TODOS">
                        Todos los estados
                    </option>

                    {options.estados.map(
                        (status) => (
                            <option
                                key={
                                    status.codigo
                                }
                                value={
                                    status.codigo
                                }
                            >
                                {
                                    status.nombre
                                }
                            </option>
                        )
                    )}
                </select>
            </section>

            {showForm && (
                <form
                    className="promotions-form-card"
                    onSubmit={
                        handleSubmit
                    }
                >
                    <div className="promotions-form-heading">
                        <div>
                            <span className="admin-eyebrow">
                                {editingPromotionId
                                    ? "EDITAR PROMOCIÓN"
                                    : "NUEVA PROMOCIÓN"}
                            </span>

                            <h3>
                                {editingPromotionId
                                    ? "Modificar promoción"
                                    : "Registrar promoción"}
                            </h3>
                        </div>

                        <button
                            type="button"
                            onClick={
                                closeForm
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="promotions-form-grid">
                        <label>
                            Alcance *

                            <select
                                value={
                                    form.sucursalId
                                }
                                disabled={
                                    !isGeneralAdministrator &&
                                    options.sucursales
                                        .length === 1
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
                            Tipo *

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
                                {options.tipos.map(
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

                        <label className="promotions-field-full">
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

                        <label>
                            {form.tipo ===
                            "DESCUENTO_PORCENTAJE"
                                ? "Porcentaje de descuento *"
                                : form.tipo ===
                                    "DESCUENTO_FIJO"
                                  ? "Monto del descuento *"
                                  : form.tipo ===
                                      "COMBO"
                                    ? "Precio del combo *"
                                    : "Cantidad gratis *"}

                            <input
                                type="number"
                                min="0.01"
                                max={
                                    form.tipo ===
                                    "DESCUENTO_PORCENTAJE"
                                        ? "100"
                                        : undefined
                                }
                                step={
                                    form.tipo ===
                                    "PRODUCTO_GRATIS"
                                        ? "1"
                                        : "0.01"
                                }
                                value={
                                    form.valor
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "valor",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Consumo mínimo

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                    form.consumoMinimo
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "consumoMinimo",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Máximo de usos

                            <input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="Sin límite"
                                value={
                                    form.maximoUsos
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "maximoUsos",
                                        event.target
                                            .value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Inicio *

                            <input
                                type="datetime-local"
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
                            Fin *

                            <input
                                type="datetime-local"
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
                            Estado inicial *

                            <select
                                value={
                                    form.estado
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "estado",
                                        event.target
                                            .value
                                    )
                                }
                            >
                                {options.estados.map(
                                    (
                                        status
                                    ) => (
                                        <option
                                            key={
                                                status.codigo
                                            }
                                            value={
                                                status.codigo
                                            }
                                        >
                                            {
                                                status.nombre
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </label>

                        <label className="promotions-checkbox-field">
                            <input
                                type="checkbox"
                                checked={
                                    form.automatica
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "automatica",
                                        event.target
                                            .checked
                                    )
                                }
                            />

                            Aplicación automática
                        </label>

                        <label className="promotions-checkbox-field">
                            <input
                                type="checkbox"
                                checked={
                                    form.acumulable
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleFormChange(
                                        "acumulable",
                                        event.target
                                            .checked
                                    )
                                }
                            />

                            Acumulable con otras promociones
                        </label>
                    </div>

                    <section className="promotions-products-section">
                        <div className="promotions-products-heading">
                            <div>
                                <h4>
                                    Productos asociados
                                </h4>

                                <p>
                                    Para producto gratis y combo es obligatorio seleccionar productos.
                                </p>
                            </div>

                            <span>
                                {
                                    form.productoIds
                                        .length
                                }{" "}
                                seleccionados
                            </span>
                        </div>

                        <div className="promotions-product-tools">
                            <label>
                                <FaSearch />

                                <input
                                    type="search"
                                    placeholder="Buscar producto..."
                                    value={
                                        productSearch
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setProductSearch(
                                            event.target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <button
                                type="button"
                                onClick={
                                    selectAllFilteredProducts
                                }
                            >
                                Seleccionar visibles
                            </button>

                            <button
                                type="button"
                                onClick={
                                    clearSelectedProducts
                                }
                            >
                                Limpiar selección
                            </button>
                        </div>

                        {selectedProducts.length >
                            0 && (
                            <div className="promotions-selected-products">
                                {selectedProducts.map(
                                    (
                                        product
                                    ) => (
                                        <button
                                            type="button"
                                            key={
                                                product.id
                                            }
                                            onClick={() =>
                                                toggleProduct(
                                                    product.id
                                                )
                                            }
                                        >
                                            {
                                                product.nombre
                                            }

                                            <FaTimes />
                                        </button>
                                    )
                                )}
                            </div>
                        )}

                        <div className="promotions-products-grid">
                            {isLoadingProducts ? (
                                <div className="promotions-products-empty">
                                    Cargando productos...
                                </div>
                            ) : filteredProducts.length ===
                              0 ? (
                                <div className="promotions-products-empty">
                                    No existen productos disponibles.
                                </div>
                            ) : (
                                filteredProducts.map(
                                    (
                                        product
                                    ) => {
                                        const isSelected =
                                            form.productoIds.includes(
                                                product.id
                                            );

                                        return (
                                            <label
                                                key={
                                                    product.id
                                                }
                                                className={`promotions-product-option ${
                                                    isSelected
                                                        ? "selected"
                                                        : ""
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        isSelected
                                                    }
                                                    onChange={() =>
                                                        toggleProduct(
                                                            product.id
                                                        )
                                                    }
                                                />

                                                <div>
                                                    <strong>
                                                        {
                                                            product.nombre
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            product.codigo
                                                        }
                                                        {" · "}
                                                        {product.categoria
                                                            ?.nombre ??
                                                            "Sin categoría"}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    }
                                )
                            )}
                        </div>
                    </section>

                    <div className="promotions-form-actions">
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
                                : editingPromotionId
                                  ? "Actualizar promoción"
                                  : "Crear promoción"}
                        </button>
                    </div>
                </form>
            )}

            <section className="promotions-list-card">
                {isLoading ? (
                    <div className="promotions-empty">
                        <FaSyncAlt />
                        Cargando promociones...
                    </div>
                ) : promotions.length ===
                  0 ? (
                    <div className="promotions-empty">
                        <FaTags />

                        <strong>
                            No existen promociones
                        </strong>

                        <span>
                            Registra la primera campaña promocional.
                        </span>
                    </div>
                ) : (
                    <div className="promotions-table-wrapper">
                        <table className="promotions-table">
                            <thead>
                                <tr>
                                    <th>
                                        Promoción
                                    </th>

                                    <th>
                                        Alcance
                                    </th>

                                    <th>
                                        Beneficio
                                    </th>

                                    <th>
                                        Consumo mínimo
                                    </th>

                                    <th>
                                        Productos
                                    </th>

                                    <th>
                                        Vigencia
                                    </th>

                                    <th>
                                        Usos
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
                                {promotions.map(
                                    (
                                        promotion
                                    ) => (
                                        <tr
                                            key={
                                                promotion.id
                                            }
                                        >
                                            <td>
                                                <div className="promotions-name">
                                                    <strong>
                                                        {
                                                            promotion.nombre
                                                        }
                                                    </strong>

                                                    <span>
                                                        {formatLabel(
                                                            promotion.tipo
                                                        )}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                {promotion.sucursal
                                                    ?.nombre ??
                                                    "Todas las sucursales"}
                                            </td>

                                            <td>
                                                {formatPromotionValue(
                                                    promotion
                                                )}
                                            </td>

                                            <td>
                                                {formatMoney(
                                                    promotion.consumoMinimo
                                                )}
                                            </td>

                                            <td>
                                                <span className="promotions-product-count">
                                                    {
                                                        promotion.productos
                                                            .length
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                <span>
                                                    {formatDateTime(
                                                        promotion.fechaInicio
                                                    )}
                                                </span>

                                                <br />

                                                <small>
                                                    hasta{" "}
                                                    {formatDateTime(
                                                        promotion.fechaFin
                                                    )}
                                                </small>
                                            </td>

                                            <td>
                                                {
                                                    promotion.usosActuales
                                                }

                                                {promotion.maximoUsos !==
                                                    null &&
                                                    ` / ${promotion.maximoUsos}`}
                                            </td>

                                            <td>
                                                <span
                                                    className={`promotions-status ${promotion.estado.toLowerCase()}`}
                                                >
                                                    {formatLabel(
                                                        promotion.estado
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="promotions-row-actions">
                                                    <button
                                                        type="button"
                                                        title="Editar promoción"
                                                        disabled={
                                                            isLoadingDetail
                                                        }
                                                        onClick={() =>
                                                            openEditForm(
                                                                promotion.id
                                                            )
                                                        }
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    {promotion.estado ===
                                                        "BORRADOR" && (
                                                        <button
                                                            type="button"
                                                            title="Activar"
                                                            disabled={
                                                                changingStatusId ===
                                                                promotion.id
                                                            }
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    promotion,
                                                                    "ACTIVA"
                                                                )
                                                            }
                                                        >
                                                            <FaCheck />
                                                        </button>
                                                    )}

                                                    {promotion.estado ===
                                                        "ACTIVA" && (
                                                        <button
                                                            type="button"
                                                            title="Pausar"
                                                            disabled={
                                                                changingStatusId ===
                                                                promotion.id
                                                            }
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    promotion,
                                                                    "PAUSADA"
                                                                )
                                                            }
                                                        >
                                                            <FaPause />
                                                        </button>
                                                    )}

                                                    {promotion.estado ===
                                                        "PAUSADA" && (
                                                        <button
                                                            type="button"
                                                            title="Reactivar"
                                                            disabled={
                                                                changingStatusId ===
                                                                promotion.id
                                                            }
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    promotion,
                                                                    "ACTIVA"
                                                                )
                                                            }
                                                        >
                                                            <FaCheck />
                                                        </button>
                                                    )}

                                                    {promotion.estado !==
                                                        "ARCHIVADA" && (
                                                        <button
                                                            type="button"
                                                            title="Archivar"
                                                            disabled={
                                                                changingStatusId ===
                                                                promotion.id
                                                            }
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    promotion,
                                                                    "ARCHIVADA"
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

                <div className="promotions-pagination">
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
                        promociones
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

export default PromotionsAdmin;