import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaArchive,
    FaArrowLeft,
    FaBan,
    FaCalendarAlt,
    FaCheck,
    FaClock,
    FaEdit,
    FaMapMarkerAlt,
    FaPlus,
    FaSave,
    FaStore,
    FaSyncAlt,
    FaTimes
} from "react-icons/fa";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import {
    useAuth
} from "../../../context/AuthContext";

import {
    ApiError
} from "../../../services/api";

import {
    createAvailabilityBlockRequest,
    getBranchAvailabilityRequest,
    replaceBranchSchedulesRequest,
    updateAvailabilityBlockRequest,
    updateAvailabilityBlockStatusRequest
} from "../../../services/branchAvailability.service";

import "./branchAvailabilityAdmin.css";

const DAYS = [
    {
        codigo: "LUNES",
        nombre: "Lunes"
    },
    {
        codigo: "MARTES",
        nombre: "Martes"
    },
    {
        codigo: "MIERCOLES",
        nombre: "Miércoles"
    },
    {
        codigo: "JUEVES",
        nombre: "Jueves"
    },
    {
        codigo: "VIERNES",
        nombre: "Viernes"
    },
    {
        codigo: "SABADO",
        nombre: "Sábado"
    },
    {
        codigo: "DOMINGO",
        nombre: "Domingo"
    }
];

const EMPTY_AVAILABILITY = {
    sucursal: null,
    zonas: [],
    horarios: [],
    bloqueos: []
};

function createSchedule() {
    return {
        localId:
            crypto.randomUUID(),

        diaSemana:
            "DOMINGO",

        horaInicio:
            "11:00",

        horaFin:
            "18:00",

        activo:
            true
    };
}

function createEmptyBlockForm() {
    return {
        zonaId: "",
        fechaInicio: "",
        fechaFin: "",
        motivo: ""
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
            timeStyle: "short"
        }
    );
}

function toDateTimeLocal(value) {
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

function toIsoDateTime(value) {
    if (!value) {
        return "";
    }

    return new Date(
        value
    ).toISOString();
}

function getBlockStatusClass(status) {
    return String(
        status ?? ""
    ).toLowerCase();
}

function BranchAvailabilityAdmin() {
    const {
        branchId
    } = useParams();

    const navigate =
        useNavigate();

    const {
        token
    } = useAuth();

    const [
        availability,
        setAvailability
    ] = useState(
        EMPTY_AVAILABILITY
    );

    const [
        schedules,
        setSchedules
    ] = useState([]);

    const [
        blockForm,
        setBlockForm
    ] = useState(
        createEmptyBlockForm
    );

    const [
        editingBlockId,
        setEditingBlockId
    ] = useState(null);

    const [
        showBlockForm,
        setShowBlockForm
    ] = useState(false);

    const [
        isLoading,
        setIsLoading
    ] = useState(true);

    const [
        isSavingSchedules,
        setIsSavingSchedules
    ] = useState(false);

    const [
        isSavingBlock,
        setIsSavingBlock
    ] = useState(false);

    const [
        changingBlockId,
        setChangingBlockId
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

    const activeBlocks =
        useMemo(
            () =>
                availability.bloqueos.filter(
                    (block) =>
                        block.estado ===
                        "ACTIVO"
                ).length,
            [availability.bloqueos]
        );

    const activeSchedules =
        useMemo(
            () =>
                schedules.filter(
                    (schedule) =>
                        schedule.activo
                ).length,
            [schedules]
        );

    useEffect(() => {
        if (!branchId) {
            return undefined;
        }

        const controller =
            new AbortController();

        async function loadAvailability() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await getBranchAvailabilityRequest(
                        token,
                        branchId,
                        controller.signal
                    );

                setAvailability(
                    result
                );

                setSchedules(
                    result.horarios.map(
                        (schedule) => ({
                            ...schedule,

                            localId:
                                schedule.id
                        })
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
                        "No se pudo cargar la disponibilidad de la sucursal."
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

        void loadAvailability();

        return () =>
            controller.abort();
    }, [
        token,
        branchId,
        reloadKey
    ]);

    function clearFeedback() {
        setMessage("");
        setError("");
    }

    function updateSchedule(
        localId,
        field,
        value
    ) {
        setSchedules(
            (previous) =>
                previous.map(
                    (schedule) =>
                        schedule.localId ===
                        localId
                            ? {
                                  ...schedule,
                                  [field]: value
                              }
                            : schedule
                )
        );
    }

    function addSchedule() {
        clearFeedback();

        setSchedules(
            (previous) => [
                ...previous,
                createSchedule()
            ]
        );
    }

    function removeSchedule(
        localId
    ) {
        clearFeedback();

        setSchedules(
            (previous) =>
                previous.filter(
                    (schedule) =>
                        schedule.localId !==
                        localId
                )
        );
    }

    async function handleSaveSchedules() {
        clearFeedback();

        const invalidSchedule =
            schedules.find(
                (schedule) =>
                    !schedule.diaSemana ||
                    !schedule.horaInicio ||
                    !schedule.horaFin
            );

        if (invalidSchedule) {
            setError(
                "Completa todos los datos de los horarios."
            );
            return;
        }

        const invalidRange =
            schedules.find(
                (schedule) =>
                    schedule.horaInicio >=
                    schedule.horaFin
            );

        if (invalidRange) {
            setError(
                "La hora de inicio debe ser anterior a la hora final."
            );
            return;
        }

        setIsSavingSchedules(true);

        try {
            const result =
                await replaceBranchSchedulesRequest(
                    token,
                    branchId,
                    schedules.map(
                        (schedule) => ({
                            diaSemana:
                                schedule.diaSemana,

                            horaInicio:
                                schedule.horaInicio,

                            horaFin:
                                schedule.horaFin,

                            activo:
                                schedule.activo
                        })
                    )
                );

            setAvailability(
                result
            );

            setSchedules(
                result.horarios.map(
                    (schedule) => ({
                        ...schedule,

                        localId:
                            schedule.id
                    })
                )
            );

            setMessage(
                "Horarios guardados correctamente."
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudieron guardar los horarios."
            );
        } finally {
            setIsSavingSchedules(false);
        }
    }

    function openCreateBlock() {
        clearFeedback();

        setEditingBlockId(null);
        setBlockForm(
            createEmptyBlockForm()
        );
        setShowBlockForm(true);
    }

    function openEditBlock(
        block
    ) {
        clearFeedback();

        setEditingBlockId(
            block.id
        );

        setBlockForm({
            zonaId:
                block.zonaId ?? "",

            fechaInicio:
                toDateTimeLocal(
                    block.fechaInicio
                ),

            fechaFin:
                toDateTimeLocal(
                    block.fechaFin
                ),

            motivo:
                block.motivo
        });

        setShowBlockForm(true);
    }

    function closeBlockForm() {
        setEditingBlockId(null);
        setBlockForm(
            createEmptyBlockForm()
        );
        setShowBlockForm(false);
    }

    function handleBlockFieldChange(
        field,
        value
    ) {
        setBlockForm(
            (previous) => ({
                ...previous,
                [field]: value
            })
        );
    }

    async function handleBlockSubmit(
        event
    ) {
        event.preventDefault();
        clearFeedback();

        if (
            !blockForm.fechaInicio ||
            !blockForm.fechaFin
        ) {
            setError(
                "Selecciona la fecha inicial y final."
            );
            return;
        }

        if (
            new Date(
                blockForm.fechaInicio
            ).getTime() >=
            new Date(
                blockForm.fechaFin
            ).getTime()
        ) {
            setError(
                "La fecha inicial debe ser anterior a la fecha final."
            );
            return;
        }

        if (
            blockForm.motivo
                .trim()
                .length < 3
        ) {
            setError(
                "El motivo debe contener al menos 3 caracteres."
            );
            return;
        }

        const data = {
            zonaId:
                blockForm.zonaId ||
                null,

            fechaInicio:
                toIsoDateTime(
                    blockForm.fechaInicio
                ),

            fechaFin:
                toIsoDateTime(
                    blockForm.fechaFin
                ),

            motivo:
                blockForm.motivo.trim()
        };

        setIsSavingBlock(true);

        try {
            let result;

            if (editingBlockId) {
                result =
                    await updateAvailabilityBlockRequest(
                        token,
                        branchId,
                        editingBlockId,
                        data
                    );
            } else {
                result =
                    await createAvailabilityBlockRequest(
                        token,
                        branchId,
                        {
                            ...data,
                            estado:
                                "ACTIVO"
                        }
                    );
            }

            setAvailability(
                result
            );

            setMessage(
                editingBlockId
                    ? "Bloqueo actualizado correctamente."
                    : "Bloqueo registrado correctamente."
            );

            closeBlockForm();
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo guardar el bloqueo."
            );
        } finally {
            setIsSavingBlock(false);
        }
    }

    async function handleBlockStatus(
        block,
        status
    ) {
        clearFeedback();

        const messages = {
            ACTIVO:
                "¿Deseas activar este bloqueo?",

            INACTIVO:
                "¿Deseas desactivar este bloqueo?",

            ARCHIVADO:
                "¿Deseas archivar este bloqueo? Esta acción no se puede revertir."
        };

        const confirmed =
            window.confirm(
                messages[status]
            );

        if (!confirmed) {
            return;
        }

        setChangingBlockId(
            block.id
        );

        try {
            const result =
                await updateAvailabilityBlockStatusRequest(
                    token,
                    branchId,
                    block.id,
                    status
                );

            setAvailability(
                result
            );

            setMessage(
                "Estado del bloqueo actualizado correctamente."
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo actualizar el estado del bloqueo."
            );
        } finally {
            setChangingBlockId("");
        }
    }

    if (isLoading) {
        return (
            <div className="branch-availability-loading">
                <FaClock />
                Cargando horarios y bloqueos...
            </div>
        );
    }

    return (
        <section className="branch-availability-admin">
            <header className="branch-availability-heading">
                <div>
                    <button
                        type="button"
                        className="branch-back-button"
                        onClick={() =>
                            navigate(
                                "/admin/sucursales"
                            )
                        }
                    >
                        <FaArrowLeft />
                        Sucursales
                    </button>

                    <span className="admin-eyebrow">
                        DISPONIBILIDAD
                    </span>

                    <h2>
                        {availability.sucursal
                            ?.nombre ??
                            "Sucursal"}
                    </h2>

                    <p>
                        {
                            availability.sucursal
                                ?.direccion
                        }
                    </p>
                </div>

                <button
                    type="button"
                    className="branch-refresh-button"
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

            {message && (
                <div className="branch-availability-feedback success">
                    {message}
                </div>
            )}

            {error && (
                <div className="branch-availability-feedback error">
                    {error}
                </div>
            )}

            <div className="branch-availability-stats">
                <article>
                    <FaStore />

                    <div>
                        <span>
                            Estado de sucursal
                        </span>

                        <strong>
                            {formatLabel(
                                availability.sucursal
                                    ?.estado
                            )}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaClock />

                    <div>
                        <span>
                            Horarios activos
                        </span>

                        <strong>
                            {activeSchedules}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaMapMarkerAlt />

                    <div>
                        <span>
                            Zonas disponibles
                        </span>

                        <strong>
                            {
                                availability.zonas
                                    .length
                            }
                        </strong>
                    </div>
                </article>

                <article>
                    <FaBan />

                    <div>
                        <span>
                            Bloqueos activos
                        </span>

                        <strong>
                            {activeBlocks}
                        </strong>
                    </div>
                </article>
            </div>

            <section className="branch-schedules-card">
                <div className="branch-section-heading">
                    <div>
                        <span className="admin-eyebrow">
                            HORARIOS
                        </span>

                        <h3>
                            Horarios de atención
                        </h3>

                        <p>
                            Registra uno o varios turnos
                            por día.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            addSchedule
                        }
                    >
                        <FaPlus />
                        Agregar horario
                    </button>
                </div>

                {schedules.length ===
                0 ? (
                    <div className="branch-availability-empty">
                        <FaClock />

                        <strong>
                            No existen horarios registrados
                        </strong>

                        <span>
                            Agrega el primer horario de atención.
                        </span>
                    </div>
                ) : (
                    <div className="branch-schedule-list">
                        {schedules.map(
                            (
                                schedule,
                                index
                            ) => (
                                <article
                                    key={
                                        schedule.localId
                                    }
                                    className="branch-schedule-row"
                                >
                                    <span className="branch-schedule-number">
                                        {index + 1}
                                    </span>

                                    <label>
                                        Día

                                        <select
                                            value={
                                                schedule.diaSemana
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateSchedule(
                                                    schedule.localId,
                                                    "diaSemana",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            {DAYS.map(
                                                (
                                                    day
                                                ) => (
                                                    <option
                                                        key={
                                                            day.codigo
                                                        }
                                                        value={
                                                            day.codigo
                                                        }
                                                    >
                                                        {
                                                            day.nombre
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </label>

                                    <label>
                                        Apertura

                                        <input
                                            type="time"
                                            value={
                                                schedule.horaInicio
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateSchedule(
                                                    schedule.localId,
                                                    "horaInicio",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </label>

                                    <label>
                                        Cierre

                                        <input
                                            type="time"
                                            value={
                                                schedule.horaFin
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateSchedule(
                                                    schedule.localId,
                                                    "horaFin",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </label>

                                    <label className="branch-schedule-active">
                                        <input
                                            type="checkbox"
                                            checked={
                                                schedule.activo
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateSchedule(
                                                    schedule.localId,
                                                    "activo",
                                                    event
                                                        .target
                                                        .checked
                                                )
                                            }
                                        />

                                        Activo
                                    </label>

                                    <button
                                        type="button"
                                        className="branch-remove-schedule"
                                        title="Eliminar horario"
                                        onClick={() =>
                                            removeSchedule(
                                                schedule.localId
                                            )
                                        }
                                    >
                                        <FaTimes />
                                    </button>
                                </article>
                            )
                        )}
                    </div>
                )}

                <div className="branch-schedule-actions">
                    <button
                        type="button"
                        disabled={
                            isSavingSchedules
                        }
                        onClick={
                            handleSaveSchedules
                        }
                    >
                        <FaSave />

                        {isSavingSchedules
                            ? "Guardando..."
                            : "Guardar horarios"}
                    </button>
                </div>
            </section>

            <section className="branch-blocks-card">
                <div className="branch-section-heading">
                    <div>
                        <span className="admin-eyebrow">
                            BLOQUEOS
                        </span>

                        <h3>
                            Cierres y restricciones
                        </h3>

                        <p>
                            Bloquea toda la sucursal o
                            solamente una zona.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            openCreateBlock
                        }
                    >
                        <FaPlus />
                        Nuevo bloqueo
                    </button>
                </div>

                {showBlockForm && (
                    <form
                        className="branch-block-form"
                        onSubmit={
                            handleBlockSubmit
                        }
                    >
                        <div className="branch-block-form-heading">
                            <div>
                                <span className="admin-eyebrow">
                                    {editingBlockId
                                        ? "EDITAR BLOQUEO"
                                        : "NUEVO BLOQUEO"}
                                </span>

                                <h4>
                                    {editingBlockId
                                        ? "Modificar periodo"
                                        : "Registrar periodo no disponible"}
                                </h4>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeBlockForm
                                }
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="branch-block-form-grid">
                            <label>
                                Alcance

                                <select
                                    value={
                                        blockForm.zonaId
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleBlockFieldChange(
                                            "zonaId",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >
                                    <option value="">
                                        Toda la sucursal
                                    </option>

                                    {availability.zonas.map(
                                        (
                                            zone
                                        ) => (
                                            <option
                                                key={
                                                    zone.id
                                                }
                                                value={
                                                    zone.id
                                                }
                                            >
                                                Solo zona:{" "}
                                                {
                                                    zone.nombre
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            <label>
                                Fecha y hora inicial *

                                <input
                                    type="datetime-local"
                                    value={
                                        blockForm.fechaInicio
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleBlockFieldChange(
                                            "fechaInicio",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label>
                                Fecha y hora final *

                                <input
                                    type="datetime-local"
                                    value={
                                        blockForm.fechaFin
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleBlockFieldChange(
                                            "fechaFin",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </label>

                            <label className="branch-block-full-field">
                                Motivo *

                                <textarea
                                    rows="3"
                                    maxLength="1000"
                                    placeholder="Ejemplo: mantenimiento, evento privado o feriado..."
                                    value={
                                        blockForm.motivo
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        handleBlockFieldChange(
                                            "motivo",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className="branch-block-form-actions">
                            <button
                                type="button"
                                className="secondary"
                                onClick={
                                    closeBlockForm
                                }
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                className="primary"
                                disabled={
                                    isSavingBlock
                                }
                            >
                                <FaSave />

                                {isSavingBlock
                                    ? "Guardando..."
                                    : editingBlockId
                                      ? "Actualizar bloqueo"
                                      : "Registrar bloqueo"}
                            </button>
                        </div>
                    </form>
                )}

                {availability.bloqueos
                    .length === 0 ? (
                    <div className="branch-availability-empty">
                        <FaCalendarAlt />

                        <strong>
                            No existen bloqueos registrados
                        </strong>

                        <span>
                            La sucursal se encuentra disponible
                            según sus horarios.
                        </span>
                    </div>
                ) : (
                    <div className="branch-block-table-wrapper">
                        <table className="branch-block-table">
                            <thead>
                                <tr>
                                    <th>Alcance</th>
                                    <th>Desde</th>
                                    <th>Hasta</th>
                                    <th>Motivo</th>
                                    <th>Registrado por</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {availability.bloqueos.map(
                                    (
                                        block
                                    ) => (
                                        <tr
                                            key={
                                                block.id
                                            }
                                        >
                                            <td>
                                                <span className="branch-block-scope">
                                                    <FaMapMarkerAlt />

                                                    {block.zona
                                                        ?.nombre ??
                                                        "Toda la sucursal"}
                                                </span>
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    block.fechaInicio
                                                )}
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    block.fechaFin
                                                )}
                                            </td>

                                            <td>
                                                <div className="branch-block-reason">
                                                    {
                                                        block.motivo
                                                    }
                                                </div>
                                            </td>

                                            <td>
                                                {
                                                    block
                                                        .creadoPor
                                                        .nombreCompleto
                                                }
                                            </td>

                                            <td>
                                                <span
                                                    className={`branch-block-status ${getBlockStatusClass(
                                                        block.estado
                                                    )}`}
                                                >
                                                    {formatLabel(
                                                        block.estado
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="branch-block-actions">
                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        disabled={
                                                            block.estado ===
                                                                "ARCHIVADO" ||
                                                            changingBlockId ===
                                                                block.id
                                                        }
                                                        onClick={() =>
                                                            openEditBlock(
                                                                block
                                                            )
                                                        }
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    {block.estado ===
                                                        "ACTIVO" && (
                                                        <button
                                                            type="button"
                                                            title="Desactivar"
                                                            disabled={
                                                                changingBlockId ===
                                                                block.id
                                                            }
                                                            onClick={() =>
                                                                handleBlockStatus(
                                                                    block,
                                                                    "INACTIVO"
                                                                )
                                                            }
                                                        >
                                                            <FaBan />
                                                        </button>
                                                    )}

                                                    {block.estado ===
                                                        "INACTIVO" && (
                                                        <button
                                                            type="button"
                                                            title="Activar"
                                                            disabled={
                                                                changingBlockId ===
                                                                block.id
                                                            }
                                                            onClick={() =>
                                                                handleBlockStatus(
                                                                    block,
                                                                    "ACTIVO"
                                                                )
                                                            }
                                                        >
                                                            <FaCheck />
                                                        </button>
                                                    )}

                                                    {block.estado !==
                                                        "ARCHIVADO" && (
                                                        <button
                                                            type="button"
                                                            title="Archivar"
                                                            disabled={
                                                                changingBlockId ===
                                                                block.id
                                                            }
                                                            onClick={() =>
                                                                handleBlockStatus(
                                                                    block,
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
            </section>
        </section>
    );
}

export default BranchAvailabilityAdmin;