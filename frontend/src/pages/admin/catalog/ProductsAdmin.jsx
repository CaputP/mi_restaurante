import {
    useEffect,
    useState
} from "react";

import {
    FaBoxes,
    FaEdit,
    FaPlus,
    FaPowerOff,
    FaSave,
    FaSearch,
    FaTimes,
    FaUtensils
} from "react-icons/fa";

import { useAuth } from "../../../context/AuthContext";
import { useRealtimeVersion } from "../../../context/RealtimeContext";
import { ApiError } from "../../../services/api";

import {
    createProductRequest,
    getProductOptionsRequest,
    listProductsRequest,
    updateProductRequest,
    updateProductStatusRequest
} from "../../../services/catalog.service";

import "./catalogAdmin.css";

const moneyFormatter = new Intl.NumberFormat(
    "es-PE",
    {
        style: "currency",
        currency: "PEN"
    }
);

const initialOptions = {
    categorias: [],
    unidadesMedida: [],
    sucursales: [],
    tiposStock: [],
    destinosPreparacion: []
};

function createEmptyForm(branches = []) {
    return {
        codigo: "",
        nombre: "",
        descripcion: "",
        categoriaId: "",
        unidadMedidaId: "",
        tipoStock: "SIN_CONTROL",
        requierePreparacion: false,
        destinoPreparacion: "NINGUNO",
        permiteCortesia: false,

        sucursales: branches.map(
            (branch, index) => ({
                sucursalId: branch.id,
                codigo: branch.codigo,
                nombre: branch.nombre,

                seleccionada:
                    index === 0,

                bloqueada: false,

                precioVenta: "",
                stockMinimo: "0",
                disponibleVenta: true
            })
        )
    };
}

function createEditForm(
    product,
    branches
) {
    return {
        codigo: product.codigo,
        nombre: product.nombre,
        descripcion:
            product.descripcion ?? "",

        categoriaId:
            product.categoria.id,

        unidadMedidaId:
            product.unidadMedida.id,

        tipoStock:
            product.tipoStock,

        requierePreparacion:
            product.requierePreparacion,

        destinoPreparacion:
            product.destinoPreparacion,

        permiteCortesia:
            product.permiteCortesia,

        sucursales: branches.map(
            (branch) => {
                const configuration =
                    product.sucursales.find(
                        (item) =>
                            item.sucursal.id ===
                            branch.id
                    );

                return {
                    sucursalId: branch.id,
                    codigo: branch.codigo,
                    nombre: branch.nombre,

                    seleccionada:
                        Boolean(configuration),

                    /*
                     * Una configuración existente
                     * no se elimina desde este
                     * formulario. Sí se puede
                     * modificar.
                     */
                    bloqueada:
                        Boolean(configuration),

                    precioVenta:
                        configuration
                            ? String(
                                configuration
                                    .precioVenta
                            )
                            : "",

                    stockMinimo:
                        configuration
                            ? String(
                                configuration
                                    .stockMinimo
                            )
                            : "0",

                    disponibleVenta:
                        configuration
                            ? configuration
                                .disponibleVenta
                            : true
                };
            }
        )
    };
}

function getRequestErrorMessage(error) {
    if (!(error instanceof ApiError)) {
        return null;
    }

    const firstValidationError =
        error.errors?.[0]?.mensaje;

    if (firstValidationError) {
        return `${error.message} ${firstValidationError}`;
    }

    return error.message;
}

function ProductsAdmin() {
    const { token } = useAuth();
    const realtimeVersion =
        useRealtimeVersion([
            "CATALOG",
            "INVENTORY"
        ]);

    const [options, setOptions] =
        useState(initialOptions);

    const [products, setProducts] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [
        appliedSearch,
        setAppliedSearch
    ] = useState("");

    const [
        statusFilter,
        setStatusFilter
    ] = useState("TODOS");

    const [
        categoryFilter,
        setCategoryFilter
    ] = useState("");

    const [
        branchFilter,
        setBranchFilter
    ] = useState("");

    const [form, setForm] =
        useState(createEmptyForm());

    const [
        editingProduct,
        setEditingProduct
    ] = useState(null);

    const [
        formVisible,
        setFormVisible
    ] = useState(false);

    const [isLoading, setIsLoading] =
        useState(true);

    const [
        optionsLoading,
        setOptionsLoading
    ] = useState(true);

    const [isSaving, setIsSaving] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    const [reloadKey, setReloadKey] =
        useState(0);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadOptions() {
            setOptionsLoading(true);

            try {
                const result =
                    await getProductOptionsRequest(
                        token,
                        controller.signal
                    );

                setOptions(result);

                setForm(
                    createEmptyForm(
                        result.sucursales
                    )
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
                    getRequestErrorMessage(
                        requestError
                    );

                setError(
                    apiMessage ??
                    "No se pudieron cargar las opciones del producto."
                );
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setOptionsLoading(false);
                }
            }
        }

        void loadOptions();

        return () => {
            controller.abort();
        };
    }, [token]);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadProducts() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await listProductsRequest(
                        token,
                        {
                            search:
                                appliedSearch,

                            estado:
                                statusFilter,

                            categoriaId:
                                categoryFilter,

                            sucursalId:
                                branchFilter,

                            signal:
                                controller.signal
                        }
                    );

                setProducts(
                    result.productos
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
                    getRequestErrorMessage(
                        requestError
                    );

                setError(
                    apiMessage ??
                    "No se pudieron cargar los productos."
                );
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setIsLoading(false);
                }
            }
        }

        void loadProducts();

        return () => {
            controller.abort();
        };
    }, [
        token,
        appliedSearch,
        statusFilter,
        categoryFilter,
        branchFilter,
        reloadKey,
        realtimeVersion
    ]);

    function openCreateForm() {
        setEditingProduct(null);

        setForm(
            createEmptyForm(
                options.sucursales
            )
        );

        setMessage("");
        setError("");
        setFormVisible(true);
    }

    function openEditForm(product) {
        setEditingProduct(product);

        setForm(
            createEditForm(
                product,
                options.sucursales
            )
        );

        setMessage("");
        setError("");
        setFormVisible(true);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function closeForm() {
        if (isSaving) {
            return;
        }

        setFormVisible(false);
        setEditingProduct(null);

        setForm(
            createEmptyForm(
                options.sucursales
            )
        );
    }

    function handleFieldChange(
        field,
        value
    ) {
        setForm((previous) => {
            const nextForm = {
                ...previous,
                [field]: value
            };

            if (
                field ===
                    "requierePreparacion" &&
                value === false
            ) {
                nextForm.destinoPreparacion =
                    "NINGUNO";
            }

            if (
                field ===
                    "requierePreparacion" &&
                value === true &&
                previous
                    .destinoPreparacion ===
                    "NINGUNO"
            ) {
                nextForm.destinoPreparacion =
                    "COCINA";
            }

            if (
                field === "tipoStock" &&
                value === "SIN_CONTROL"
            ) {
                nextForm.sucursales =
                    previous.sucursales.map(
                        (branch) => ({
                            ...branch,
                            stockMinimo: "0"
                        })
                    );
            }

            return nextForm;
        });
    }

    function handleBranchChange(
        index,
        field,
        value
    ) {
        setForm((previous) => ({
            ...previous,

            sucursales:
                previous.sucursales.map(
                    (branch, branchIndex) =>
                        branchIndex === index
                            ? {
                                ...branch,
                                [field]:
                                    value
                            }
                            : branch
                )
        }));
    }

    function handleSearch(event) {
        event.preventDefault();

        setAppliedSearch(
            search.trim()
        );
    }

    function validateForm() {
        if (
            form.codigo.trim().length < 2
        ) {
            return "Ingresa un código válido.";
        }

        if (
            form.nombre.trim().length < 2
        ) {
            return "Ingresa un nombre válido.";
        }

        if (!form.categoriaId) {
            return "Selecciona una categoría.";
        }

        if (!form.unidadMedidaId) {
            return "Selecciona una unidad de medida.";
        }

        if (
            form.requierePreparacion &&
            form.destinoPreparacion ===
                "NINGUNO"
        ) {
            return "Selecciona cocina o barra como destino.";
        }

        const selectedBranches =
            form.sucursales.filter(
                (branch) =>
                    branch.seleccionada
            );

        if (
            selectedBranches.length === 0
        ) {
            return "Selecciona al menos una sucursal.";
        }

        const invalidPrice =
            selectedBranches.some(
                (branch) =>
                    !Number.isFinite(
                        Number(
                            branch.precioVenta
                        )
                    ) ||
                    Number(
                        branch.precioVenta
                    ) <= 0
            );

        if (invalidPrice) {
            return "El precio de venta debe ser mayor que cero en todas las sucursales seleccionadas.";
        }

        const invalidMinimumStock =
            selectedBranches.some(
                (branch) =>
                    Number(
                        branch.stockMinimo
                    ) < 0
            );

        if (
            form.tipoStock !==
                "SIN_CONTROL" &&
            invalidMinimumStock
        ) {
            return "El stock mínimo no puede ser negativo.";
        }

        return null;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage("");
        setError("");

        const validationError =
            validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        const selectedBranches =
            form.sucursales.filter(
                (branch) =>
                    branch.seleccionada
            );

        const data = {
            codigo:
                form.codigo
                    .trim()
                    .toUpperCase(),

            nombre:
                form.nombre
                    .trim()
                    .replace(/\s+/g, " "),

            descripcion:
                form.descripcion.trim() ||
                null,

            categoriaId:
                form.categoriaId,

            unidadMedidaId:
                form.unidadMedidaId,

            tipoStock:
                form.tipoStock,

            requierePreparacion:
                form.requierePreparacion,

            destinoPreparacion:
                form.requierePreparacion
                    ? form
                        .destinoPreparacion
                    : "NINGUNO",

            permiteCortesia:
                form.permiteCortesia,

            sucursales:
                selectedBranches.map(
                    (branch) => ({
                        sucursalId:
                            branch.sucursalId,

                        precioVenta:
                            Number(
                                branch
                                    .precioVenta
                            ),

                        stockMinimo:
                            form.tipoStock ===
                            "SIN_CONTROL"
                                ? 0
                                : Number(
                                    branch
                                        .stockMinimo
                                ),

                        disponibleVenta:
                            branch
                                .disponibleVenta
                    })
                )
        };

        setIsSaving(true);

        try {
            const response =
                editingProduct
                    ? await updateProductRequest(
                        token,
                        editingProduct.id,
                        data
                    )
                    : await createProductRequest(
                        token,
                        data
                    );

            setMessage(response.message);

            setFormVisible(false);
            setEditingProduct(null);

            setForm(
                createEmptyForm(
                    options.sucursales
                )
            );

            setReloadKey(
                (value) => value + 1
            );
        } catch (requestError) {
            const apiMessage =
                getRequestErrorMessage(
                    requestError
                );

            setError(
                apiMessage ??
                "No se pudo guardar el producto."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleStatusChange(
        product
    ) {
        const newStatus =
            product.estado === "ACTIVO"
                ? "INACTIVO"
                : "ACTIVO";

        const action =
            newStatus === "ACTIVO"
                ? "activar"
                : "desactivar";

        const confirmed =
            window.confirm(
                `¿Seguro que deseas ${action} el producto "${product.nombre}"?`
            );

        if (!confirmed) {
            return;
        }

        setMessage("");
        setError("");
        setIsSaving(true);

        try {
            const response =
                await updateProductStatusRequest(
                    token,
                    product.id,
                    newStatus
                );

            setMessage(response.message);

            setReloadKey(
                (value) => value + 1
            );
        } catch (requestError) {
            const apiMessage =
                getRequestErrorMessage(
                    requestError
                );

            setError(
                apiMessage ??
                "No se pudo cambiar el estado del producto."
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section>
            <header className="catalog-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        PRODUCTOS
                    </span>

                    <h2>
                        Catálogo de productos
                    </h2>

                    <p>
                        Administra platos,
                        bebidas, insumos,
                        precios y disponibilidad.
                    </p>
                </div>

                <button
                    type="button"
                    className="catalog-primary-button"
                    disabled={optionsLoading}
                    onClick={openCreateForm}
                >
                    <FaPlus />
                    <span>Nuevo producto</span>
                </button>
            </header>

            {message && (
                <div
                    className="catalog-feedback admin-feedback success"
                    role="status"
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    className="catalog-feedback admin-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <form
                className="catalog-filters product-filters admin-filter-bar"
                onSubmit={handleSearch}
            >
                <div className="catalog-search">
                    <FaSearch />

                    <input
                        type="search"
                        value={search}
                        maxLength={150}
                        placeholder="Código o nombre..."
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />
                </div>

                <select
                    value={categoryFilter}
                    onChange={(event) =>
                        setCategoryFilter(
                            event.target.value
                        )
                    }
                >
                    <option value="">
                        Todas las categorías
                    </option>

                    {options.categorias.map(
                        (category) => (
                            <option
                                key={category.id}
                                value={category.id}
                            >
                                {category.nombre}
                            </option>
                        )
                    )}
                </select>

                <select
                    value={branchFilter}
                    onChange={(event) =>
                        setBranchFilter(
                            event.target.value
                        )
                    }
                >
                    <option value="">
                        Todas las sucursales
                    </option>

                    {options.sucursales.map(
                        (branch) => (
                            <option
                                key={branch.id}
                                value={branch.id}
                            >
                                {branch.nombre}
                            </option>
                        )
                    )}
                </select>

                <select
                    value={statusFilter}
                    onChange={(event) =>
                        setStatusFilter(
                            event.target.value
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

                    <option value="ARCHIVADO">
                        Archivados
                    </option>
                </select>

                <button
                    type="submit"
                    className="catalog-filter-button"
                >
                    Buscar
                </button>
            </form>

            {formVisible && (
                <form
                    className="catalog-form-card"
                    onSubmit={handleSubmit}
                >
                    <div className="catalog-form-heading">
                        <div>
                            <h3>
                                {editingProduct
                                    ? "Editar producto"
                                    : "Registrar producto"}
                            </h3>

                            <p>
                                Configura la información
                                general y su precio por
                                sucursal.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="catalog-icon-button"
                            aria-label="Cerrar formulario"
                            onClick={closeForm}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="catalog-form-grid">
                        <div className="catalog-field">
                            <label htmlFor="product-code">
                                Código *
                            </label>

                            <input
                                id="product-code"
                                type="text"
                                maxLength={40}
                                value={form.codigo}
                                placeholder="Ejemplo: CUY-001"
                                onChange={(event) =>
                                    handleFieldChange(
                                        "codigo",
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="catalog-field">
                            <label htmlFor="product-name">
                                Nombre *
                            </label>

                            <input
                                id="product-name"
                                type="text"
                                maxLength={150}
                                value={form.nombre}
                                placeholder="Ejemplo: Cuy al horno"
                                onChange={(event) =>
                                    handleFieldChange(
                                        "nombre",
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="catalog-field">
                            <label htmlFor="product-category">
                                Categoría *
                            </label>

                            <select
                                id="product-category"
                                value={
                                    form.categoriaId
                                }
                                onChange={(event) =>
                                    handleFieldChange(
                                        "categoriaId",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Seleccionar
                                </option>

                                {options.categorias.map(
                                    (category) => (
                                        <option
                                            key={
                                                category.id
                                            }
                                            value={
                                                category.id
                                            }
                                        >
                                            {
                                                category.nombre
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="catalog-field">
                            <label htmlFor="product-unit">
                                Unidad de medida *
                            </label>

                            <select
                                id="product-unit"
                                value={
                                    form.unidadMedidaId
                                }
                                onChange={(event) =>
                                    handleFieldChange(
                                        "unidadMedidaId",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Seleccionar
                                </option>

                                {options.unidadesMedida.map(
                                    (unit) => (
                                        <option
                                            key={unit.id}
                                            value={unit.id}
                                        >
                                            {unit.nombre}
                                            {" — "}
                                            {unit.abreviatura}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="catalog-field">
                            <label htmlFor="product-stock-type">
                                Tipo de stock *
                            </label>

                            <select
                                id="product-stock-type"
                                value={
                                    form.tipoStock
                                }
                                onChange={(event) =>
                                    handleFieldChange(
                                        "tipoStock",
                                        event.target.value
                                    )
                                }
                            >
                                {options.tiposStock.map(
                                    (type) => (
                                        <option
                                            key={
                                                type.codigo
                                            }
                                            value={
                                                type.codigo
                                            }
                                        >
                                            {type.nombre}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="catalog-field">
                            <label htmlFor="product-destination">
                                Destino de preparación
                            </label>

                            <select
                                id="product-destination"
                                value={
                                    form.destinoPreparacion
                                }
                                disabled={
                                    !form.requierePreparacion
                                }
                                onChange={(event) =>
                                    handleFieldChange(
                                        "destinoPreparacion",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="NINGUNO">
                                    No requiere preparación
                                </option>

                                {options.destinosPreparacion.map(
                                    (destination) => (
                                        <option
                                            key={
                                                destination.codigo
                                            }
                                            value={
                                                destination.codigo
                                            }
                                        >
                                            {
                                                destination.nombre
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="catalog-field catalog-field-full">
                            <label htmlFor="product-description">
                                Descripción
                            </label>

                            <textarea
                                id="product-description"
                                rows={3}
                                maxLength={2000}
                                value={
                                    form.descripcion
                                }
                                placeholder="Descripción opcional del producto"
                                onChange={(event) =>
                                    handleFieldChange(
                                        "descripcion",
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="product-check-options catalog-field-full">
                            <label className="product-checkbox">
                                <input
                                    type="checkbox"
                                    checked={
                                        form.requierePreparacion
                                    }
                                    onChange={(event) =>
                                        handleFieldChange(
                                            "requierePreparacion",
                                            event.target.checked
                                        )
                                    }
                                />

                                <span>
                                    Requiere preparación
                                </span>
                            </label>

                            <label className="product-checkbox">
                                <input
                                    type="checkbox"
                                    checked={
                                        form.permiteCortesia
                                    }
                                    onChange={(event) =>
                                        handleFieldChange(
                                            "permiteCortesia",
                                            event.target.checked
                                        )
                                    }
                                />

                                <span>
                                    Puede entregarse como cortesía
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="product-branch-section">
                        <div className="product-section-heading">
                            <h4>
                                Configuración por sucursal
                            </h4>

                            <p>
                                Selecciona dónde estará
                                disponible y establece su
                                precio.
                            </p>
                        </div>

                        <div className="product-branch-list">
                            {form.sucursales.map(
                                (
                                    branch,
                                    index
                                ) => (
                                    <article
                                        key={
                                            branch.sucursalId
                                        }
                                        className={`product-branch-row ${
                                            branch.seleccionada
                                                ? "selected"
                                                : ""
                                        }`}
                                    >
                                        <label className="product-branch-selector">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    branch.seleccionada
                                                }
                                                disabled={
                                                    branch.bloqueada
                                                }
                                                onChange={(event) =>
                                                    handleBranchChange(
                                                        index,
                                                        "seleccionada",
                                                        event
                                                            .target
                                                            .checked
                                                    )
                                                }
                                            />

                                            <span>
                                                <strong>
                                                    {
                                                        branch.nombre
                                                    }
                                                </strong>

                                                <small>
                                                    {
                                                        branch.codigo
                                                    }

                                                    {branch.bloqueada &&
                                                        " · Ya configurada"}
                                                </small>
                                            </span>
                                        </label>

                                        <div className="product-branch-field">
                                            <label>
                                                Precio
                                            </label>

                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={
                                                    branch.precioVenta
                                                }
                                                disabled={
                                                    !branch.seleccionada
                                                }
                                                onChange={(event) =>
                                                    handleBranchChange(
                                                        index,
                                                        "precioVenta",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="product-branch-field">
                                            <label>
                                                Stock mínimo
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.001"
                                                value={
                                                    branch.stockMinimo
                                                }
                                                disabled={
                                                    !branch.seleccionada ||
                                                    form.tipoStock ===
                                                        "SIN_CONTROL"
                                                }
                                                onChange={(event) =>
                                                    handleBranchChange(
                                                        index,
                                                        "stockMinimo",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                        </div>

                                        <label className="product-availability">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    branch.disponibleVenta
                                                }
                                                disabled={
                                                    !branch.seleccionada
                                                }
                                                onChange={(event) =>
                                                    handleBranchChange(
                                                        index,
                                                        "disponibleVenta",
                                                        event
                                                            .target
                                                            .checked
                                                    )
                                                }
                                            />

                                            <span>
                                                Disponible para venta
                                            </span>
                                        </label>
                                    </article>
                                )
                            )}
                        </div>
                    </div>

                    <div className="catalog-form-actions">
                        <button
                            type="button"
                            className="catalog-secondary-button"
                            disabled={isSaving}
                            onClick={closeForm}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="catalog-primary-button"
                            disabled={isSaving}
                        >
                            <FaSave />

                            <span>
                                {isSaving
                                    ? "Guardando..."
                                    : "Guardar producto"}
                            </span>
                        </button>
                    </div>
                </form>
            )}

            <article className="catalog-table-card">
                <div className="catalog-table-heading">
                    <div>
                        <h3>
                            Productos registrados
                        </h3>

                        <span>
                            {products.length} resultado(s)
                        </span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="catalog-empty-state">
                        <FaBoxes />

                        <strong>
                            Cargando productos...
                        </strong>
                    </div>
                ) : products.length === 0 ? (
                    <div className="catalog-empty-state">
                        <FaUtensils />

                        <strong>
                            No se encontraron productos
                        </strong>

                        <p>
                            Registra un producto o
                            modifica los filtros.
                        </p>
                    </div>
                ) : (
                    <div className="catalog-table-wrapper admin-table-shell">
                        <table className="catalog-table product-table admin-data-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Categoría</th>
                                    <th>Stock</th>
                                    <th>Sucursales y precios</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {products.map(
                                    (product) => (
                                        <tr
                                            key={
                                                product.id
                                            }
                                        >
                                            <td>
                                                <div className="product-name-cell">
                                                    <strong>
                                                        {
                                                            product.nombre
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            product.codigo
                                                        }
                                                    </span>

                                                    <small>
                                                        {
                                                            product
                                                                .unidadMedida
                                                                .abreviatura
                                                        }

                                                        {product.requierePreparacion &&
                                                            ` · ${product.destinoPreparacion}`}
                                                    </small>
                                                </div>
                                            </td>

                                            <td>
                                                {
                                                    product
                                                        .categoria
                                                        .nombre
                                                }
                                            </td>

                                            <td>
                                                <span className="product-stock-type">
                                                    {
                                                        product.tipoStock
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                <div className="product-branches-summary">
                                                    {product.sucursales.map(
                                                        (
                                                            branch
                                                        ) => (
                                                            <div
                                                                key={
                                                                    branch.id
                                                                }
                                                            >
                                                                <span>
                                                                    {
                                                                        branch
                                                                            .sucursal
                                                                            .nombre
                                                                    }
                                                                </span>

                                                                <strong>
                                                                    {moneyFormatter.format(
                                                                        branch.precioVenta
                                                                    )}
                                                                </strong>

                                                                {!branch.disponibleVenta && (
                                                                    <small>
                                                                        No disponible
                                                                    </small>
                                                                )}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-status-badge catalog-status ${product.estado.toLowerCase()}`}
                                                >
                                                    {
                                                        product.estado
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                <div className="catalog-row-actions">
                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        aria-label="Editar producto"
                                                        disabled={
                                                            isSaving
                                                        }
                                                        onClick={() =>
                                                            openEditForm(
                                                                product
                                                            )
                                                        }
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    {product.estado !==
                                                        "ARCHIVADO" && (
                                                        <button
                                                            type="button"
                                                            title={
                                                                product.estado ===
                                                                "ACTIVO"
                                                                    ? "Desactivar"
                                                                    : "Activar"
                                                            }
                                                            aria-label="Cambiar estado"
                                                            disabled={
                                                                isSaving
                                                            }
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    product
                                                                )
                                                            }
                                                        >
                                                            <FaPowerOff />
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
            </article>
        </section>
    );
}

export default ProductsAdmin;
