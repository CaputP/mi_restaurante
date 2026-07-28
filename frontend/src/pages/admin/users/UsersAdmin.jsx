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
    FaEdit,
    FaKey,
    FaLock,
    FaSave,
    FaSearch,
    FaTimes,
    FaUserPlus,
    FaUsers
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";

import {
    ApiError
} from "../../../services/api";

import {
    createUserRequest,
    getUserOptionsRequest,
    listUsersRequest,
    resetUserPasswordRequest,
    updateUserRequest,
    updateUserStatusRequest
} from "../../../services/user.service";

import "./usersAdmin.css";

const initialOptions = {
    roles: [],
    sucursales: [],
    estados: []
};

const initialPagination = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

const rolesWithBranches = new Set([
    "ADMINISTRADOR_SUCURSAL",
    "VENDEDOR",
    "MOZO",
    "COCINA"
]);

function createEmptyForm() {
    return {
        nombres: "",
        apellidos: "",
        telefono: "",
        correo: "",
        password: "",
        confirmarPassword: "",
        rolId: "",
        sucursalIds: []
    };
}

function createEditForm(user) {
    return {
        nombres: user.nombres,
        apellidos: user.apellidos,
        telefono: user.telefono ?? "",
        correo: user.correo,
        password: "",
        confirmarPassword: "",
        rolId: user.rol.id,

        sucursalIds:
            user.sucursales.map(
                (branch) => branch.id
            )
    };
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

function formatDate(date) {
    if (!date) {
        return "Nunca";
    }

    return new Date(date).toLocaleString(
        "es-PE",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}

function UsersAdmin() {
    const {
        token,
        usuario
    } = useAuth();

    const [
        options,
        setOptions
    ] = useState(initialOptions);

    const [
        users,
        setUsers
    ] = useState([]);

    const [
        pagination,
        setPagination
    ] = useState(initialPagination);

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
        roleFilter,
        setRoleFilter
    ] = useState("");

    const [
        branchFilter,
        setBranchFilter
    ] = useState("");

    const [
        page,
        setPage
    ] = useState(1);

    const [
        form,
        setForm
    ] = useState(createEmptyForm);

    const [
        formVisible,
        setFormVisible
    ] = useState(false);

    const [
        editingUser,
        setEditingUser
    ] = useState(null);

    const [
        passwordTarget,
        setPasswordTarget
    ] = useState(null);

    const [
        passwordForm,
        setPasswordForm
    ] = useState({
        password: "",
        confirmarPassword: ""
    });

    const [
        optionsLoading,
        setOptionsLoading
    ] = useState(true);

    const [
        isLoading,
        setIsLoading
    ] = useState(true);

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

    const selectedRole = useMemo(
        () =>
            options.roles.find(
                (role) =>
                    role.id === form.rolId
            ) ?? null,
        [
            options.roles,
            form.rolId
        ]
    );

    const roleRequiresBranch =
        selectedRole
            ? rolesWithBranches.has(
                selectedRole.codigo
            )
            : false;

    const visibleActiveUsers =
        users.filter(
            (user) =>
                user.estado === "ACTIVO"
        ).length;

    const visibleBlockedUsers =
        users.filter(
            (user) =>
                user.estado === "BLOQUEADO"
        ).length;

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadOptions() {
            setOptionsLoading(true);

            try {
                const result =
                    await getUserOptionsRequest(
                        token,
                        controller.signal
                    );

                setOptions(result);
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
                    "No se pudieron cargar las opciones de usuarios."
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

        async function loadUsers() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await listUsersRequest(
                        token,
                        {
                            search:
                                appliedSearch,

                            estado:
                                statusFilter,

                            rolId:
                                roleFilter,

                            sucursalId:
                                branchFilter,

                            page,
                            limit: 20,

                            signal:
                                controller.signal
                        }
                    );

                setUsers(
                    result.usuarios
                );

                setPagination(
                    result.pagination
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
                    "No se pudieron cargar los usuarios."
                );
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setIsLoading(false);
                }
            }
        }

        void loadUsers();

        return () => {
            controller.abort();
        };
    }, [
        token,
        appliedSearch,
        statusFilter,
        roleFilter,
        branchFilter,
        page,
        reloadKey
    ]);

    function handleSearch(event) {
        event.preventDefault();

        setPage(1);

        setAppliedSearch(
            search.trim()
        );
    }

    function openCreateForm() {
        setEditingUser(null);
        setPasswordTarget(null);

        setForm(
            createEmptyForm()
        );

        setMessage("");
        setError("");
        setFormVisible(true);
    }

    function openEditForm(user) {
        setEditingUser(user);
        setPasswordTarget(null);

        setForm(
            createEditForm(user)
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
        setEditingUser(null);

        setForm(
            createEmptyForm()
        );
    }

    function handleFieldChange(
        field,
        value
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value
        }));
    }

    function handleRoleChange(roleId) {
        const role =
            options.roles.find(
                (item) =>
                    item.id === roleId
            );

        const needsBranch =
            role
                ? rolesWithBranches.has(
                    role.codigo
                )
                : false;

        setForm((previous) => ({
            ...previous,

            rolId: roleId,

            sucursalIds:
                needsBranch
                    ? previous.sucursalIds
                    : []
        }));
    }

    function toggleBranch(branchId) {
        setForm((previous) => {
            const selected =
                previous.sucursalIds.includes(
                    branchId
                );

            return {
                ...previous,

                sucursalIds: selected
                    ? previous.sucursalIds.filter(
                        (id) =>
                            id !== branchId
                    )
                    : [
                        ...previous.sucursalIds,
                        branchId
                    ]
            };
        });
    }

    function validateUserForm() {
        if (
            form.nombres.trim().length < 2
        ) {
            return "Ingresa nombres válidos.";
        }

        if (
            form.apellidos.trim().length < 2
        ) {
            return "Ingresa apellidos válidos.";
        }

        if (!form.rolId) {
            return "Selecciona un rol.";
        }

        if (
            roleRequiresBranch &&
            form.sucursalIds.length === 0
        ) {
            return "Selecciona al menos una sucursal.";
        }

        if (!editingUser) {
            if (
                !form.correo.includes("@")
            ) {
                return "Ingresa un correo electrónico válido.";
            }

            if (
                form.password.length < 10
            ) {
                return "La contraseña debe tener al menos 10 caracteres.";
            }

            if (
                form.password !==
                form.confirmarPassword
            ) {
                return "Las contraseñas no coinciden.";
            }
        }

        return null;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage("");
        setError("");

        const validationError =
            validateUserForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        const commonData = {
            nombres:
                form.nombres
                    .trim()
                    .replace(/\s+/g, " "),

            apellidos:
                form.apellidos
                    .trim()
                    .replace(/\s+/g, " "),

            telefono:
                form.telefono.trim() ||
                null,

            rolId:
                form.rolId,

            sucursalIds:
                roleRequiresBranch
                    ? form.sucursalIds
                    : []
        };

        setIsSaving(true);

        try {
            const response =
                editingUser
                    ? await updateUserRequest(
                        token,
                        editingUser.id,
                        commonData
                    )
                    : await createUserRequest(
                        token,
                        {
                            ...commonData,

                            correo:
                                form.correo
                                    .trim()
                                    .toLowerCase(),

                            password:
                                form.password,

                            confirmarPassword:
                                form
                                    .confirmarPassword
                        }
                    );

            setMessage(
                response.message
            );

            setFormVisible(false);
            setEditingUser(null);

            setForm(
                createEmptyForm()
            );

            setReloadKey(
                (value) => value + 1
            );
        } catch (requestError) {
            const apiMessage =
                getApiErrorMessage(
                    requestError
                );

            setError(
                apiMessage ??
                "No se pudo guardar el usuario."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleStatusChange(
        user,
        newStatus
    ) {
        const actionLabels = {
            ACTIVO: "activar",
            INACTIVO: "inactivar",
            BLOQUEADO: "bloquear"
        };

        const confirmed =
            window.confirm(
                `¿Seguro que deseas ${actionLabels[newStatus]} la cuenta de "${user.nombreCompleto}"?`
            );

        if (!confirmed) {
            return;
        }

        setMessage("");
        setError("");
        setIsSaving(true);

        try {
            const response =
                await updateUserStatusRequest(
                    token,
                    user.id,
                    newStatus
                );

            setMessage(
                response.message
            );

            setReloadKey(
                (value) => value + 1
            );
        } catch (requestError) {
            const apiMessage =
                getApiErrorMessage(
                    requestError
                );

            setError(
                apiMessage ??
                "No se pudo cambiar el estado del usuario."
            );
        } finally {
            setIsSaving(false);
        }
    }

    function openPasswordForm(user) {
        setPasswordTarget(user);
        setFormVisible(false);
        setEditingUser(null);

        setPasswordForm({
            password: "",
            confirmarPassword: ""
        });

        setMessage("");
        setError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function closePasswordForm() {
        if (isSaving) {
            return;
        }

        setPasswordTarget(null);

        setPasswordForm({
            password: "",
            confirmarPassword: ""
        });
    }

    async function handlePasswordSubmit(
        event
    ) {
        event.preventDefault();

        if (!passwordTarget) {
            return;
        }

        setMessage("");
        setError("");

        if (
            passwordForm.password
                .length < 10
        ) {
            setError(
                "La contraseña debe tener al menos 10 caracteres."
            );

            return;
        }

        if (
            passwordForm.password !==
            passwordForm
                .confirmarPassword
        ) {
            setError(
                "Las contraseñas no coinciden."
            );

            return;
        }

        setIsSaving(true);

        try {
            const response =
                await resetUserPasswordRequest(
                    token,
                    passwordTarget.id,
                    passwordForm
                );

            setMessage(
                response.message
            );

            setPasswordTarget(null);

            setPasswordForm({
                password: "",
                confirmarPassword: ""
            });

            setReloadKey(
                (value) => value + 1
            );
        } catch (requestError) {
            const apiMessage =
                getApiErrorMessage(
                    requestError
                );

            setError(
                apiMessage ??
                "No se pudo cambiar la contraseña."
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="users-admin">
            <header className="users-heading">
                <div>
                    <span className="admin-eyebrow">
                        USUARIOS
                    </span>

                    <h2>
                        Usuarios y trabajadores
                    </h2>

                    <p>
                        Administra datos personales,
                        roles, sucursales, estados
                        y accesos al sistema.
                    </p>
                </div>

                <button
                    type="button"
                    className="users-primary-button"
                    disabled={
                        optionsLoading
                    }
                    onClick={
                        openCreateForm
                    }
                >
                    <FaUserPlus />
                    <span>
                        Nuevo usuario
                    </span>
                </button>
            </header>

            {message && (
                <div
                    className="users-feedback success"
                    role="status"
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    className="users-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <div className="users-summary-grid">
                <article>
                    <FaUsers />

                    <div>
                        <span>
                            Usuarios encontrados
                        </span>

                        <strong>
                            {pagination.total}
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
                            {visibleActiveUsers}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaLock />

                    <div>
                        <span>
                            Bloqueados en esta página
                        </span>

                        <strong>
                            {visibleBlockedUsers}
                        </strong>
                    </div>
                </article>
            </div>

            <form
                className="users-filters"
                onSubmit={handleSearch}
            >
                <div className="users-search">
                    <FaSearch />

                    <input
                        type="search"
                        value={search}
                        maxLength={160}
                        placeholder="Nombre, correo o teléfono..."
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />
                </div>

                <select
                    value={roleFilter}
                    onChange={(event) => {
                        setRoleFilter(
                            event.target.value
                        );

                        setPage(1);
                    }}
                >
                    <option value="">
                        Todos los roles
                    </option>

                    {options.roles.map(
                        (role) => (
                            <option
                                key={role.id}
                                value={role.id}
                            >
                                {role.nombre}
                            </option>
                        )
                    )}
                </select>

                <select
                    value={branchFilter}
                    onChange={(event) => {
                        setBranchFilter(
                            event.target.value
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
                    onChange={(event) => {
                        setStatusFilter(
                            event.target.value
                        );

                        setPage(1);
                    }}
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

                    <option value="BLOQUEADO">
                        Bloqueados
                    </option>

                    <option value="ARCHIVADO">
                        Archivados
                    </option>
                </select>

                <button type="submit">
                    Buscar
                </button>
            </form>

            {formVisible && (
                <form
                    className="users-form-card"
                    onSubmit={handleSubmit}
                >
                    <div className="users-form-heading">
                        <div>
                            <span className="admin-eyebrow">
                                {editingUser
                                    ? "EDICIÓN"
                                    : "REGISTRO"}
                            </span>

                            <h3>
                                {editingUser
                                    ? "Editar usuario"
                                    : "Registrar usuario"}
                            </h3>

                            <p>
                                Asigna los datos, el rol
                                y las sucursales autorizadas.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="users-close-button"
                            aria-label="Cerrar formulario"
                            onClick={closeForm}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="users-form-grid">
                        <div className="users-field">
                            <label htmlFor="user-names">
                                Nombres *
                            </label>

                            <input
                                id="user-names"
                                type="text"
                                maxLength={120}
                                value={form.nombres}
                                onChange={(event) =>
                                    handleFieldChange(
                                        "nombres",
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="users-field">
                            <label htmlFor="user-last-names">
                                Apellidos *
                            </label>

                            <input
                                id="user-last-names"
                                type="text"
                                maxLength={150}
                                value={form.apellidos}
                                onChange={(event) =>
                                    handleFieldChange(
                                        "apellidos",
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="users-field">
                            <label htmlFor="user-phone">
                                Teléfono
                            </label>

                            <input
                                id="user-phone"
                                type="tel"
                                maxLength={30}
                                value={form.telefono}
                                onChange={(event) =>
                                    handleFieldChange(
                                        "telefono",
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="users-field">
                            <label htmlFor="user-role">
                                Rol *
                            </label>

                            <select
                                id="user-role"
                                value={form.rolId}
                                onChange={(event) =>
                                    handleRoleChange(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Seleccionar
                                </option>

                                {options.roles.map(
                                    (role) => (
                                        <option
                                            key={role.id}
                                            value={role.id}
                                        >
                                            {role.nombre}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="users-field users-field-full">
                            <label htmlFor="user-email">
                                Correo electrónico *
                            </label>

                            <input
                                id="user-email"
                                type="email"
                                maxLength={160}
                                value={form.correo}
                                disabled={
                                    Boolean(editingUser)
                                }
                                onChange={(event) =>
                                    handleFieldChange(
                                        "correo",
                                        event.target.value
                                    )
                                }
                            />

                            {editingUser && (
                                <small>
                                    El correo no se modifica
                                    desde este formulario.
                                </small>
                            )}
                        </div>

                        {!editingUser && (
                            <>
                                <div className="users-field">
                                    <label htmlFor="user-password">
                                        Contraseña *
                                    </label>

                                    <input
                                        id="user-password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={form.password}
                                        onChange={(event) =>
                                            handleFieldChange(
                                                "password",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div className="users-field">
                                    <label htmlFor="user-confirm-password">
                                        Confirmar contraseña *
                                    </label>

                                    <input
                                        id="user-confirm-password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={
                                            form.confirmarPassword
                                        }
                                        onChange={(event) =>
                                            handleFieldChange(
                                                "confirmarPassword",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {roleRequiresBranch && (
                        <div className="users-branch-section">
                            <div>
                                <FaBuilding />

                                <span>
                                    Sucursales asignadas *
                                </span>
                            </div>

                            <p>
                                Selecciona las sucursales
                                donde trabajará el usuario.
                            </p>

                            <div className="users-branch-grid">
                                {options.sucursales.map(
                                    (branch) => (
                                        <label
                                            key={branch.id}
                                            className={
                                                form.sucursalIds.includes(
                                                    branch.id
                                                )
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            <input
                                                type="checkbox"
                                                checked={
                                                    form.sucursalIds.includes(
                                                        branch.id
                                                    )
                                                }
                                                onChange={() =>
                                                    toggleBranch(
                                                        branch.id
                                                    )
                                                }
                                            />

                                            <span>
                                                <strong>
                                                    {branch.nombre}
                                                </strong>

                                                <small>
                                                    {branch.codigo}
                                                </small>
                                            </span>
                                        </label>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    <div className="users-form-actions">
                        <button
                            type="button"
                            className="users-secondary-button"
                            disabled={isSaving}
                            onClick={closeForm}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="users-primary-button"
                            disabled={isSaving}
                        >
                            <FaSave />

                            <span>
                                {isSaving
                                    ? "Guardando..."
                                    : "Guardar usuario"}
                            </span>
                        </button>
                    </div>
                </form>
            )}

            {passwordTarget && (
                <form
                    className="users-form-card password-card"
                    onSubmit={
                        handlePasswordSubmit
                    }
                >
                    <div className="users-form-heading">
                        <div>
                            <span className="admin-eyebrow">
                                SEGURIDAD
                            </span>

                            <h3>
                                Restablecer contraseña
                            </h3>

                            <p>
                                Usuario:{" "}
                                <strong>
                                    {
                                        passwordTarget
                                            .nombreCompleto
                                    }
                                </strong>
                            </p>
                        </div>

                        <button
                            type="button"
                            className="users-close-button"
                            aria-label="Cerrar formulario"
                            onClick={
                                closePasswordForm
                            }
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="users-form-grid">
                        <div className="users-field">
                            <label htmlFor="new-user-password">
                                Nueva contraseña *
                            </label>

                            <input
                                id="new-user-password"
                                type="password"
                                autoComplete="new-password"
                                value={
                                    passwordForm.password
                                }
                                onChange={(event) =>
                                    setPasswordForm(
                                        (previous) => ({
                                            ...previous,

                                            password:
                                                event.target.value
                                        })
                                    )
                                }
                            />
                        </div>

                        <div className="users-field">
                            <label htmlFor="confirm-new-user-password">
                                Confirmar contraseña *
                            </label>

                            <input
                                id="confirm-new-user-password"
                                type="password"
                                autoComplete="new-password"
                                value={
                                    passwordForm
                                        .confirmarPassword
                                }
                                onChange={(event) =>
                                    setPasswordForm(
                                        (previous) => ({
                                            ...previous,

                                            confirmarPassword:
                                                event.target.value
                                        })
                                    )
                                }
                            />
                        </div>
                    </div>

                    <p className="users-security-note">
                        Al guardar, las sesiones
                        anteriores del usuario serán
                        cerradas.
                    </p>

                    <div className="users-form-actions">
                        <button
                            type="button"
                            className="users-secondary-button"
                            disabled={isSaving}
                            onClick={
                                closePasswordForm
                            }
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="users-primary-button"
                            disabled={isSaving}
                        >
                            <FaKey />

                            <span>
                                {isSaving
                                    ? "Actualizando..."
                                    : "Actualizar contraseña"}
                            </span>
                        </button>
                    </div>
                </form>
            )}

            <article className="users-table-card">
                <div className="users-table-heading">
                    <div>
                        <h3>
                            Usuarios registrados
                        </h3>

                        <span>
                            {pagination.total} usuario(s)
                        </span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="users-empty-state">
                        <FaUsers />

                        <strong>
                            Cargando usuarios...
                        </strong>
                    </div>
                ) : users.length === 0 ? (
                    <div className="users-empty-state">
                        <FaUsers />

                        <strong>
                            No se encontraron usuarios
                        </strong>

                        <p>
                            Registra un usuario o
                            modifica los filtros.
                        </p>
                    </div>
                ) : (
                    <div className="users-table-wrapper">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Contacto</th>
                                    <th>Rol</th>
                                    <th>Sucursales</th>
                                    <th>Acceso</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {users.map(
                                    (user) => {
                                        const isCurrentUser =
                                            user.id ===
                                            usuario?.id;

                                        return (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="users-name-cell">
                                                        <strong>
                                                            {
                                                                user.nombreCompleto
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                user.proveedorAuth
                                                            }
                                                        </span>

                                                        {isCurrentUser && (
                                                            <small>
                                                                Tu cuenta
                                                            </small>
                                                        )}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="users-contact-cell">
                                                        <span>
                                                            {user.correo}
                                                        </span>

                                                        <small>
                                                            {user.telefono ||
                                                                "Sin teléfono"}
                                                        </small>
                                                    </div>
                                                </td>

                                                <td>
                                                    <span className="users-role">
                                                        {
                                                            user.rol.nombre
                                                        }
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="users-branches">
                                                        {user
                                                            .sucursales
                                                            .length ===
                                                        0 ? (
                                                            <span>
                                                                Sin asignación
                                                            </span>
                                                        ) : (
                                                            user.sucursales.map(
                                                                (branch) => (
                                                                    <span
                                                                        key={
                                                                            branch.id
                                                                        }
                                                                    >
                                                                        {
                                                                            branch.nombre
                                                                        }
                                                                    </span>
                                                                )
                                                            )
                                                        )}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="users-access-cell">
                                                        <span>
                                                            Último acceso
                                                        </span>

                                                        <small>
                                                            {formatDate(
                                                                user.ultimoAcceso
                                                            )}
                                                        </small>
                                                    </div>
                                                </td>

                                                <td>
                                                    <span
                                                        className={`users-status ${user.estado.toLowerCase()}`}
                                                    >
                                                        {user.estado}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="users-row-actions">
                                                        <button
                                                            type="button"
                                                            title="Editar usuario"
                                                            aria-label="Editar usuario"
                                                            disabled={
                                                                isSaving
                                                            }
                                                            onClick={() =>
                                                                openEditForm(
                                                                    user
                                                                )
                                                            }
                                                        >
                                                            <FaEdit />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            title="Restablecer contraseña"
                                                            aria-label="Restablecer contraseña"
                                                            disabled={
                                                                isSaving ||
                                                                isCurrentUser
                                                            }
                                                            onClick={() =>
                                                                openPasswordForm(
                                                                    user
                                                                )
                                                            }
                                                        >
                                                            <FaKey />
                                                        </button>

                                                        {!isCurrentUser &&
                                                            user.estado ===
                                                                "ACTIVO" && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        title="Inactivar usuario"
                                                                        aria-label="Inactivar usuario"
                                                                        disabled={
                                                                            isSaving
                                                                        }
                                                                        onClick={() =>
                                                                            handleStatusChange(
                                                                                user,
                                                                                "INACTIVO"
                                                                            )
                                                                        }
                                                                    >
                                                                        <FaBan />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="danger"
                                                                        title="Bloquear usuario"
                                                                        aria-label="Bloquear usuario"
                                                                        disabled={
                                                                            isSaving
                                                                        }
                                                                        onClick={() =>
                                                                            handleStatusChange(
                                                                                user,
                                                                                "BLOQUEADO"
                                                                            )
                                                                        }
                                                                    >
                                                                        <FaLock />
                                                                    </button>
                                                                </>
                                                            )}

                                                        {!isCurrentUser &&
                                                            [
                                                                "INACTIVO",
                                                                "BLOQUEADO"
                                                            ].includes(
                                                                user.estado
                                                            ) && (
                                                                <button
                                                                    type="button"
                                                                    className="success"
                                                                    title="Activar usuario"
                                                                    aria-label="Activar usuario"
                                                                    disabled={
                                                                        isSaving
                                                                    }
                                                                    onClick={() =>
                                                                        handleStatusChange(
                                                                            user,
                                                                            "ACTIVO"
                                                                        )
                                                                    }
                                                                >
                                                                    <FaCheck />
                                                                </button>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="users-pagination">
                    <span>
                        Página {pagination.page} de{" "}
                        {pagination.totalPages}
                    </span>

                    <div>
                        <button
                            type="button"
                            disabled={
                                page <= 1 ||
                                isLoading
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
                            <span>Anterior</span>
                        </button>

                        <button
                            type="button"
                            disabled={
                                page >=
                                    pagination.totalPages ||
                                isLoading
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
                            <span>Siguiente</span>
                            <FaChevronRight />
                        </button>
                    </div>
                </div>
            </article>
        </section>
    );
}

export default UsersAdmin;