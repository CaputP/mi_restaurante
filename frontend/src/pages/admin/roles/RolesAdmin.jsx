import {
    useEffect,
    useMemo,
    useState
} from "react";
import {
    FaCheckCircle,
    FaKey,
    FaLock,
    FaSave,
    FaShieldAlt,
    FaSyncAlt,
    FaUsers
} from "react-icons/fa";

import AdminDialog from "../../../components/adminDialog/AdminDialog";
import AdminMetricCard from "../../../components/adminMetricCard/AdminMetricCard";
import { useAuth } from "../../../context/AuthContext";
import { useRealtimeVersion } from "../../../context/RealtimeContext";
import { ApiError } from "../../../services/api";
import {
    getRolesRequest,
    updateRolePermissionsRequest
} from "../../../services/role.service";

import "./rolesAdmin.css";

const PROTECTED_PERMISSIONS = new Set([
    "ROL_GESTIONAR",
    "RESPALDO_GESTIONAR"
]);

function errorMessage(error) {
    return error instanceof ApiError
        ? error.message
        : "No se pudo completar la operación.";
}

function RolesAdmin() {
    const { token } = useAuth();
    const realtimeVersion =
        useRealtimeVersion([
            "ROLES"
        ]);
    const [data, setData] = useState({
        roles: [],
        permisos: []
    });
    const [selectedRoleId, setSelectedRoleId] =
        useState("");
    const [selectedPermissionIds, setSelectedPermissionIds] =
        useState(new Set());
    const [isLoading, setIsLoading] =
        useState(true);
    const [isSaving, setIsSaving] =
        useState(false);
    const [isConfirming, setIsConfirming] =
        useState(false);
    const [password, setPassword] =
        useState("");
    const [confirmationError, setConfirmationError] =
        useState("");
    const [error, setError] =
        useState("");
    const [message, setMessage] =
        useState("");

    const selectedRole = useMemo(
        () => data.roles.find(
            (role) => role.id === selectedRoleId
        ) ?? null,
        [data.roles, selectedRoleId]
    );

    const permissionGroups = useMemo(
        () => Object.entries(
            data.permisos.reduce(
                (groups, permission) => {
                    const current =
                        groups[permission.modulo] ?? [];

                    return {
                        ...groups,
                        [permission.modulo]: [
                            ...current,
                            permission
                        ]
                    };
                },
                {}
            )
        ),
        [data.permisos]
    );

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            try {
                const result = await getRolesRequest(
                    token,
                    controller.signal
                );
                setData(result);
                const initialRole =
                    result.roles.find(
                        (role) => role.editable
                    ) ?? result.roles[0];
                setSelectedRoleId(
                    initialRole?.id ?? ""
                );
                setSelectedPermissionIds(
                    new Set(
                        initialRole?.permisoIds ?? []
                    )
                );
            } catch (requestError) {
                if (requestError?.name !== "AbortError") {
                    setError(errorMessage(requestError));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void load();
        return () => controller.abort();
    }, [
        token,
        realtimeVersion
    ]);

    function selectRole(role) {
        setSelectedRoleId(role.id);
        setSelectedPermissionIds(
            new Set(role.permisoIds)
        );
        setError("");
        setMessage("");
    }

    function togglePermission(permission) {
        if (
            !selectedRole?.editable ||
            PROTECTED_PERMISSIONS.has(
                permission.codigo
            )
        ) {
            return;
        }

        setSelectedPermissionIds((current) => {
            const next = new Set(current);

            if (next.has(permission.id)) {
                next.delete(permission.id);
            } else {
                next.add(permission.id);
            }

            return next;
        });
    }

    function openConfirmation() {
        setPassword("");
        setConfirmationError("");
        setIsConfirming(true);
    }

    function closeConfirmation() {
        if (isSaving) {
            return;
        }

        setIsConfirming(false);
        setPassword("");
        setConfirmationError("");
    }

    async function handleSave(event) {
        event.preventDefault();

        if (!selectedRole?.editable) {
            return;
        }

        if (!password) {
            setConfirmationError(
                "Ingresa tu contraseña para confirmar el cambio."
            );
            return;
        }

        setIsSaving(true);
        setConfirmationError("");
        setMessage("");

        try {
            const response =
                await updateRolePermissionsRequest(
                    token,
                    selectedRole.id,
                    [...selectedPermissionIds],
                    password
                );
            const updated = response.data.rol;

            setData((current) => ({
                ...current,
                roles: current.roles.map(
                    (role) =>
                        role.id === updated.id
                            ? {
                                ...role,
                                permisoIds:
                                    updated.permisoIds
                            }
                            : role
                )
            }));
            setMessage(
                `${response.message} Sesiones invalidadas: ${updated.sesionesInvalidadas}.`
            );
            setPassword("");
            setIsConfirming(false);
        } catch (requestError) {
            setConfirmationError(
                errorMessage(requestError)
            );
        } finally {
            setIsSaving(false);
        }
    }

    const assignedUsers = data.roles.reduce(
        (total, role) =>
            total + role.usuariosAsignados,
        0
    );

    return (
        <section className="roles-admin-page admin-page">
            <header className="roles-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        Seguridad y responsabilidad
                    </span>
                    <h2>Roles y permisos</h2>
                    <p>
                        Aplica el principio de menor privilegio y
                        revoca las sesiones afectadas al guardar.
                    </p>
                </div>

                <button
                    type="button"
                    className="roles-refresh-button"
                    onClick={() => window.location.reload()}
                    disabled={isLoading}
                >
                    <FaSyncAlt /> Actualizar
                </button>
            </header>

            {message && (
                <div className="roles-feedback success" role="status">
                    <FaCheckCircle /> {message}
                </div>
            )}
            {error && (
                <div className="roles-feedback error" role="alert">
                    <FaLock /> {error}
                </div>
            )}

            <div className="roles-metrics">
                <AdminMetricCard
                    icon={FaShieldAlt}
                    label="Roles activos"
                    value={data.roles.length}
                    detail="Uno protegido"
                    isLoading={isLoading}
                />
                <AdminMetricCard
                    icon={FaKey}
                    label="Permisos activos"
                    value={data.permisos.length}
                    detail="Agrupados por módulo"
                    tone="info"
                    isLoading={isLoading}
                />
                <AdminMetricCard
                    icon={FaUsers}
                    label="Usuarios asignados"
                    value={assignedUsers}
                    detail="Sesiones revocables"
                    tone="success"
                    isLoading={isLoading}
                />
            </div>

            <div className="roles-workspace">
                <aside className="roles-list" aria-label="Roles activos">
                    <header>
                        <h2>Roles</h2>
                        <span>{data.roles.length}</span>
                    </header>
                    {data.roles.map((role) => (
                        <button
                            type="button"
                            key={role.id}
                            className={
                                role.id === selectedRoleId
                                    ? "active"
                                    : ""
                            }
                            onClick={() => selectRole(role)}
                        >
                            <strong>{role.nombre}</strong>
                            <span>
                                {role.usuariosAsignados} usuarios · {role.permisoIds.length} permisos
                            </span>
                        </button>
                    ))}
                </aside>

                <article className="roles-permissions-card">
                    <header>
                        <div>
                            <span className="admin-page-eyebrow">
                                Rol seleccionado
                            </span>
                            <h2>
                                {selectedRole?.nombre ?? "Selecciona un rol"}
                            </h2>
                            <p>
                                {selectedRole?.descripcion ??
                                    "Sin descripción."}
                            </p>
                        </div>
                        {selectedRole && !selectedRole.editable && (
                            <span className="roles-protected-badge">
                                <FaLock /> Protegido
                            </span>
                        )}
                    </header>

                    <div className="permission-groups">
                        {permissionGroups.map(([module, permissions]) => (
                            <fieldset key={module}>
                                <legend>{module.replaceAll("_", " ")}</legend>
                                <div>
                                    {permissions.map((permission) => {
                                        const isProtected =
                                            PROTECTED_PERMISSIONS.has(
                                                permission.codigo
                                            ) && selectedRole?.codigo !==
                                                "ADMINISTRADOR_GENERAL";

                                        return (
                                            <label key={permission.id}>
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        selectedPermissionIds.has(
                                                            permission.id
                                                        )
                                                    }
                                                    disabled={
                                                        !selectedRole?.editable ||
                                                        isProtected
                                                    }
                                                    onChange={() =>
                                                        togglePermission(permission)
                                                    }
                                                />
                                                <span>
                                                    <strong>{permission.nombre}</strong>
                                                    <small>{permission.codigo}</small>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </fieldset>
                        ))}
                    </div>

                    <footer>
                        <p>
                            Los permisos protegidos no pueden delegarse.
                        </p>
                        <button
                            type="button"
                            onClick={openConfirmation}
                            disabled={
                                !selectedRole?.editable ||
                                isSaving
                            }
                        >
                            <FaSave /> Guardar permisos
                        </button>
                    </footer>
                </article>
            </div>

            {isConfirming && (
                <AdminDialog
                    labelledBy="roles-confirm-dialog-title"
                    onClose={closeConfirmation}
                    className="roles-confirm-dialog"
                >
                    <form onSubmit={handleSave}>
                        <h2 id="roles-confirm-dialog-title">
                            Confirmar cambio de permisos
                        </h2>
                        <p>
                            Este cambio cerrará las sesiones de todos los
                            usuarios con el rol {selectedRole?.nombre}.
                        </p>
                        {confirmationError && (
                            <div
                                className="roles-feedback error roles-confirm-error"
                                role="alert"
                            >
                                <FaLock /> {confirmationError}
                            </div>
                        )}
                        <label>
                            Contraseña del administrador
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    setConfirmationError("");
                                }}
                                autoComplete="current-password"
                                aria-invalid={Boolean(confirmationError)}
                                required
                                autoFocus
                            />
                        </label>
                        <footer>
                            <button
                                type="button"
                                onClick={closeConfirmation}
                                disabled={isSaving}
                            >
                                Cancelar
                            </button>
                            <button type="submit" disabled={isSaving}>
                                <FaSave />
                                {isSaving ? "Guardando..." : "Confirmar"}
                            </button>
                        </footer>
                    </form>
                </AdminDialog>
            )}
        </section>
    );
}

export default RolesAdmin;
