import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaArchive,
    FaCheckCircle,
    FaClock,
    FaDatabase,
    FaExclamationTriangle,
    FaLock,
    FaPlus,
    FaSyncAlt,
    FaTimes
} from "react-icons/fa";

import AdminDialog from "../../../components/adminDialog/AdminDialog";
import { useAuth } from "../../../context/AuthContext";
import { ApiError } from "../../../services/api";
import {
    listBackupsRequest,
    requestManualBackupRequest
} from "../../../services/backup.service";

import "./backupsAdmin.css";

function errorMessage(error) {
    if (!(error instanceof ApiError)) {
        return "No se pudo completar la operación.";
    }

    return error.errors?.[0]?.mensaje
        ? `${error.message} ${error.errors[0].mensaje}`
        : error.message;
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString(
        "es-PE",
        {
            timeZone: "America/Lima",
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}

function formatSize(value) {
    const bytes = Number(value);

    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "-";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(
        units.length - 1,
        Math.floor(
            Math.log(bytes) / Math.log(1024)
        )
    );

    return `${(
        bytes / 1024 ** index
    ).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function statusLabel(status) {
    return status
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(
            /(^|\s)\S/g,
            (letter) => letter.toUpperCase()
        );
}

const EMPTY_DATA = {
    respaldos: [],
    automatizacionActiva: false,
    intervaloHoras: 24,
    retencionDias: 30,
    pagination: {
        page: 1,
        total: 0,
        totalPages: 1
    }
};

function BackupsAdmin() {
    const { token } = useAuth();
    const [data, setData] =
        useState(EMPTY_DATA);
    const [isLoading, setIsLoading] =
        useState(true);
    const [isCreating, setIsCreating] =
        useState(false);
    const [isDialogOpen, setIsDialogOpen] =
        useState(false);
    const [password, setPassword] =
        useState("");
    const [error, setError] =
        useState("");
    const [message, setMessage] =
        useState("");

    const loadBackups = useCallback(
        async ({ signal, silent = false } = {}) => {
            if (!silent) {
                setIsLoading(true);
            }

            try {
                const result =
                    await listBackupsRequest(
                        token,
                        {
                            signal
                        }
                    );
                setData(result);
                setError("");
            } catch (requestError) {
                if (requestError?.name !== "AbortError") {
                    setError(
                        errorMessage(requestError)
                    );
                }
            } finally {
                if (!signal?.aborted && !silent) {
                    setIsLoading(false);
                }
            }
        },
        [token]
    );

    useEffect(() => {
        const controller = new AbortController();

        async function initializeBackups() {
            try {
                const result =
                    await listBackupsRequest(
                        token,
                        {
                            signal: controller.signal
                        }
                    );
                setData(result);
            } catch (requestError) {
                if (requestError?.name !== "AbortError") {
                    setError(
                        errorMessage(requestError)
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void initializeBackups();
        return () => controller.abort();
    }, [token]);

    const hasRunningBackup = useMemo(
        () => data.respaldos.some(
            (backup) =>
                ["PENDIENTE", "EN_PROCESO"].includes(
                    backup.estado
                )
        ),
        [data.respaldos]
    );

    useEffect(() => {
        if (!hasRunningBackup) {
            return undefined;
        }

        const timer = setInterval(
            () => {
                void loadBackups({
                    silent: true
                });
            },
            4000
        );

        return () => clearInterval(timer);
    }, [hasRunningBackup, loadBackups]);

    async function handleCreate(event) {
        event.preventDefault();
        setError("");
        setMessage("");
        setIsCreating(true);

        try {
            const response =
                await requestManualBackupRequest(
                    token,
                    password
                );
            setMessage(response.message);
            setPassword("");
            setIsDialogOpen(false);
            await loadBackups();
        } catch (requestError) {
            setError(errorMessage(requestError));
        } finally {
            setIsCreating(false);
        }
    }

    const completedCount =
        data.respaldos.filter(
            (backup) =>
                backup.estado === "COMPLETADO" &&
                backup.disponible
        ).length;
    const failedCount =
        data.respaldos.filter(
            (backup) => backup.estado === "FALLIDO"
        ).length;

    return (
        <section className="backups-admin admin-page">
            <header className="backups-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        CONTINUIDAD
                    </span>
                    <h2>Respaldos de base de datos</h2>
                    <p>
                        Supervisa copias automáticas, crea puntos manuales y conserva evidencia de integridad.
                    </p>
                </div>
                <div className="backups-heading-actions">
                    <button
                        type="button"
                        className="secondary"
                        onClick={() => void loadBackups()}
                        disabled={isLoading}
                    >
                        <FaSyncAlt /> Actualizar
                    </button>
                    <button
                        type="button"
                        className="primary"
                        onClick={() => {
                            setError("");
                            setMessage("");
                            setIsDialogOpen(true);
                        }}
                    >
                        <FaPlus /> Respaldo manual
                    </button>
                </div>
            </header>

            {error && (
                <div className="admin-feedback error" role="alert">
                    {error}
                </div>
            )}
            {message && (
                <div className="admin-feedback success" role="status">
                    {message}
                </div>
            )}

            <section className="backup-metric-grid" aria-label="Estado de respaldos">
                <article>
                    <FaDatabase />
                    <span>Automatización</span>
                    <strong>
                        {data.automatizacionActiva ? "Activa" : "Desactivada"}
                    </strong>
                    <small>
                        Cada {data.intervaloHoras} h
                    </small>
                </article>
                <article>
                    <FaCheckCircle />
                    <span>Disponibles</span>
                    <strong>{completedCount}</strong>
                    <small>
                        En la página actual
                    </small>
                </article>
                <article>
                    <FaArchive />
                    <span>Retención</span>
                    <strong>{data.retencionDias} días</strong>
                    <small>
                        Limpieza automática
                    </small>
                </article>
                <article className={failedCount ? "danger" : ""}>
                    <FaExclamationTriangle />
                    <span>Fallidos</span>
                    <strong>{failedCount}</strong>
                    <small>
                        Requieren revisión
                    </small>
                </article>
            </section>

            <section className="backup-table-card">
                <div className="backup-card-heading">
                    <div>
                        <span className="admin-eyebrow">HISTORIAL</span>
                        <h3>Ejecuciones recientes</h3>
                    </div>
                    {hasRunningBackup && (
                        <span className="backup-running-indicator">
                            <FaClock /> Respaldo en ejecución
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="backup-empty" aria-busy="true">
                        <FaSyncAlt />
                        Cargando respaldos...
                    </div>
                ) : data.respaldos.length === 0 ? (
                    <div className="backup-empty">
                        <FaDatabase />
                        <strong>No existen respaldos registrados</strong>
                        <p>
                            Crea el primero o activa la automatización del entorno.
                        </p>
                    </div>
                ) : (
                    <div className="backup-table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Creado</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Archivo</th>
                                    <th>Tamaño</th>
                                    <th>Integridad</th>
                                    <th>Solicitante</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.respaldos.map((backup) => (
                                    <tr key={backup.id}>
                                        <td>{formatDateTime(backup.createdAt)}</td>
                                        <td>{statusLabel(backup.tipo)}</td>
                                        <td>
                                            <span className={`backup-status status-${backup.estado.toLowerCase()}`}>
                                                {statusLabel(backup.estado)}
                                            </span>
                                            {backup.mensajeError && (
                                                <small title={backup.mensajeError}>
                                                    {backup.mensajeError}
                                                </small>
                                            )}
                                        </td>
                                        <td>
                                            {backup.fechaEliminacion
                                                ? "Eliminado por retención"
                                                : backup.nombreArchivo ?? "-"}
                                        </td>
                                        <td>{formatSize(backup.tamanoBytes)}</td>
                                        <td>
                                            {backup.checksum
                                                ? `${backup.checksum.slice(0, 12)}…`
                                                : "-"}
                                        </td>
                                        <td>
                                            {backup.solicitadoPor?.nombreCompleto ?? "Sistema"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <aside className="backup-restore-notice">
                <FaLock />
                <div>
                    <strong>Restauración protegida</strong>
                    <p>
                        Por seguridad, una restauración no se ejecuta desde el navegador. Se realiza en ventana de mantenimiento mediante el comando documentado, validando archivo, destino y preflight antes de reabrir el servicio.
                    </p>
                </div>
            </aside>

            {isDialogOpen && (
                <AdminDialog
                    className="backup-dialog"
                    labelledBy="backup-dialog-title"
                    onClose={() => setIsDialogOpen(false)}
                >
                    <header>
                        <div>
                            <span className="admin-eyebrow">ACCIÓN SENSIBLE</span>
                            <h3 id="backup-dialog-title">
                                Crear respaldo manual
                            </h3>
                        </div>
                        <button
                            type="button"
                            className="icon"
                            onClick={() => setIsDialogOpen(false)}
                            aria-label="Cerrar"
                        >
                            <FaTimes />
                        </button>
                    </header>
                    <form onSubmit={handleCreate}>
                        <p>
                            Confirma tu identidad. El proceso se ejecutará en segundo plano y podrás seguir su estado.
                        </p>
                        <label>
                            Contraseña actual
                            <input
                                type="password"
                                autoComplete="current-password"
                                minLength="8"
                                maxLength="200"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                required
                            />
                        </label>
                        <footer>
                            <button
                                type="button"
                                className="secondary"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="primary"
                                disabled={isCreating}
                            >
                                <FaDatabase />
                                {isCreating ? "Encolando..." : "Crear respaldo"}
                            </button>
                        </footer>
                    </form>
                </AdminDialog>
            )}
        </section>
    );
}

export default BackupsAdmin;
