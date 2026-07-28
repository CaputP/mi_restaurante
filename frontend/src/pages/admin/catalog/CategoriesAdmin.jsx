import {
    useEffect,
    useState
} from "react";

import {
    FaEdit,
    FaFolderOpen,
    FaPlus,
    FaPowerOff,
    FaSave,
    FaSearch,
    FaTimes
} from "react-icons/fa";

import { useAuth } from "../../../context/AuthContext";
import { ApiError } from "../../../services/api";

import {
    createCategoryRequest,
    listCategoriesRequest,
    updateCategoryRequest,
    updateCategoryStatusRequest
} from "../../../services/catalog.service";

import "./catalogAdmin.css";

const initialForm = {
    nombre: "",
    descripcion: ""
};

function CategoriesAdmin() {
    const {
        token
    } = useAuth();

    const [categories, setCategories] =
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

    const [isLoading, setIsLoading] =
        useState(true);

    const [isSaving, setIsSaving] =
        useState(false);

    const [formVisible, setFormVisible] =
        useState(false);

    const [
        editingCategory,
        setEditingCategory
    ] = useState(null);

    const [form, setForm] =
        useState(initialForm);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    const [reloadKey, setReloadKey] =
        useState(0);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadCategories() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await listCategoriesRequest(
                        token,
                        {
                            search:
                                appliedSearch,
                            estado:
                                statusFilter,
                            signal:
                                controller.signal
                        }
                    );

                setCategories(
                    result.categorias
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

                if (
                    requestError instanceof
                    ApiError
                ) {
                    setError(
                        requestError.message
                    );
                    return;
                }

                console.error(
                    "Error cargando categorías:",
                    requestError
                );

                setError(
                    "No se pudieron cargar las categorías."
                );
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setIsLoading(false);
                }
            }
        }

        void loadCategories();

        return () => {
            controller.abort();
        };
    }, [
        token,
        appliedSearch,
        statusFilter,
        reloadKey
    ]);

    function openCreateForm() {
        setEditingCategory(null);
        setForm(initialForm);
        setMessage("");
        setError("");
        setFormVisible(true);
    }

    function openEditForm(category) {
        setEditingCategory(category);

        setForm({
            nombre: category.nombre,
            descripcion:
                category.descripcion ?? ""
        });

        setMessage("");
        setError("");
        setFormVisible(true);
    }

    function closeForm() {
        if (isSaving) {
            return;
        }

        setFormVisible(false);
        setEditingCategory(null);
        setForm(initialForm);
    }

    function handleSearch(event) {
        event.preventDefault();

        setAppliedSearch(
            search.trim()
        );
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage("");
        setError("");

        const nombre =
            form.nombre
                .trim()
                .replace(/\s+/g, " ");

        if (nombre.length < 2) {
            setError(
                "El nombre debe tener al menos 2 caracteres."
            );
            return;
        }

        setIsSaving(true);

        try {
            const data = {
                nombre,
                descripcion:
                    form.descripcion.trim() ||
                    null
            };

            const response =
                editingCategory
                    ? await updateCategoryRequest(
                        token,
                        editingCategory.id,
                        data
                    )
                    : await createCategoryRequest(
                        token,
                        data
                    );

            setMessage(response.message);
            setFormVisible(false);
            setEditingCategory(null);
            setForm(initialForm);

            setReloadKey(
                (value) => value + 1
            );
        } catch (requestError) {
            if (
                requestError instanceof
                ApiError
            ) {
                setError(
                    requestError.message
                );
                return;
            }

            console.error(
                "Error guardando categoría:",
                requestError
            );

            setError(
                "No se pudo guardar la categoría."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleStatusChange(
        category
    ) {
        const newStatus =
            category.estado === "ACTIVO"
                ? "INACTIVO"
                : "ACTIVO";

        const action =
            newStatus === "ACTIVO"
                ? "activar"
                : "desactivar";

        const confirmed =
            window.confirm(
                `¿Seguro que deseas ${action} la categoría "${category.nombre}"?`
            );

        if (!confirmed) {
            return;
        }

        setMessage("");
        setError("");
        setIsSaving(true);

        try {
            const response =
                await updateCategoryStatusRequest(
                    token,
                    category.id,
                    newStatus
                );

            setMessage(response.message);

            setReloadKey(
                (value) => value + 1
            );
        } catch (requestError) {
            if (
                requestError instanceof
                ApiError
            ) {
                setError(
                    requestError.message
                );
                return;
            }

            console.error(
                "Error cambiando estado:",
                requestError
            );

            setError(
                "No se pudo cambiar el estado."
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="catalog-admin">
            <header className="catalog-heading">
                <div>
                    <span className="admin-eyebrow">
                        CATÁLOGO
                    </span>

                    <h2>
                        Productos y categorías
                    </h2>

                    <p>
                        Organiza las categorías que
                        utilizarán los platos, bebidas
                        e insumos del restaurante.
                    </p>
                </div>

                <button
                    type="button"
                    className="catalog-primary-button"
                    onClick={openCreateForm}
                >
                    <FaPlus />
                    <span>Nueva categoría</span>
                </button>
            </header>

            {message && (
                <div
                    className="catalog-feedback success"
                    role="status"
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    className="catalog-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <form
                className="catalog-filters"
                onSubmit={handleSearch}
            >
                <div className="catalog-search">
                    <FaSearch />

                    <input
                        type="search"
                        value={search}
                        maxLength={120}
                        placeholder="Buscar categoría..."
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(event) =>
                        setStatusFilter(
                            event.target.value
                        )
                    }
                    aria-label="Filtrar por estado"
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
                                {editingCategory
                                    ? "Editar categoría"
                                    : "Nueva categoría"}
                            </h3>

                            <p>
                                Los campos marcados son
                                obligatorios.
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
                            <label htmlFor="category-name">
                                Nombre *
                            </label>

                            <input
                                type="text"
                                id="category-name"
                                value={form.nombre}
                                maxLength={120}
                                placeholder="Ejemplo: Platos tradicionales"
                                onChange={(event) =>
                                    setForm(
                                        (previous) => ({
                                            ...previous,
                                            nombre:
                                                event
                                                    .target
                                                    .value
                                        })
                                    )
                                }
                            />
                        </div>

                        <div className="catalog-field catalog-field-full">
                            <label htmlFor="category-description">
                                Descripción
                            </label>

                            <textarea
                                id="category-description"
                                value={
                                    form.descripcion
                                }
                                maxLength={1000}
                                rows={3}
                                placeholder="Descripción opcional de la categoría"
                                onChange={(event) =>
                                    setForm(
                                        (previous) => ({
                                            ...previous,
                                            descripcion:
                                                event
                                                    .target
                                                    .value
                                        })
                                    )
                                }
                            />
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
                                    : "Guardar categoría"}
                            </span>
                        </button>
                    </div>
                </form>
            )}

            <article className="catalog-table-card">
                <div className="catalog-table-heading">
                    <div>
                        <h3>Categorías registradas</h3>

                        <span>
                            {categories.length} resultado(s)
                        </span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="catalog-empty-state">
                        <FaFolderOpen />
                        <strong>
                            Cargando categorías...
                        </strong>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="catalog-empty-state">
                        <FaFolderOpen />

                        <strong>
                            No se encontraron categorías
                        </strong>

                        <p>
                            Registra una nueva categoría
                            o modifica los filtros.
                        </p>
                    </div>
                ) : (
                    <div className="catalog-table-wrapper">
                        <table className="catalog-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Descripción</th>
                                    <th>Productos</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {categories.map(
                                    (category) => (
                                        <tr
                                            key={
                                                category.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        category.nombre
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {category.descripcion ??
                                                    "Sin descripción"}
                                            </td>

                                            <td>
                                                {
                                                    category.cantidadProductos
                                                }
                                            </td>

                                            <td>
                                                <span
                                                    className={`catalog-status ${category.estado.toLowerCase()}`}
                                                >
                                                    {
                                                        category.estado
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                <div className="catalog-row-actions">
                                                    <button
                                                        type="button"
                                                        aria-label="Editar categoría"
                                                        title="Editar"
                                                        disabled={
                                                            isSaving
                                                        }
                                                        onClick={() =>
                                                            openEditForm(
                                                                category
                                                            )
                                                        }
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    {category.estado !==
                                                        "ARCHIVADO" && (
                                                        <button
                                                            type="button"
                                                            aria-label="Cambiar estado"
                                                            title={
                                                                category.estado ===
                                                                "ACTIVO"
                                                                    ? "Desactivar"
                                                                    : "Activar"
                                                            }
                                                            disabled={
                                                                isSaving
                                                            }
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    category
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

export default CategoriesAdmin;