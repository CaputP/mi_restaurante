import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaCheckCircle,
    FaCoins,
    FaEye,
    FaGift,
    FaSearch,
    FaSyncAlt,
    FaTimes,
    FaTrophy,
    FaUser
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";
import {
    useRealtimeVersion
} from "../../../context/RealtimeContext";

import AdminDialog from "../../../components/adminDialog/AdminDialog";

import {
    ApiError
} from "../../../services/api";

import {
    getLoyaltyCustomerRequest,
    getLoyaltyOptionsRequest,
    listLoyaltyCustomersRequest
} from "../../../services/loyalty.service";

import "./loyaltyCustomersAdmin.css";

const EMPTY_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
};

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

function numberValue(value) {
    const result =
        Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}

function formatMoney(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            style: "currency",
            currency: "PEN",
            minimumFractionDigits: 2
        }
    ).format(
        numberValue(value)
    );
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(
        value
    ).toLocaleDateString(
        "es-PE",
        {
            year: "numeric",
            month: "short",
            day: "2-digit"
        }
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

function getProgressPercentage(
    progress
) {
    const {
        programa
    } = progress;

    if (
        programa.tipo ===
        "VISITAS"
    ) {
        return Math.min(
            100,
            (
                progress.visitasAcumuladas /
                programa.visitasRequeridas
            ) * 100
        );
    }

    if (
        programa.tipo ===
        "MONTO_CONSUMIDO"
    ) {
        return Math.min(
            100,
            (
                numberValue(
                    progress.montoAcumulado
                ) /
                numberValue(
                    programa.montoRequerido
                )
            ) * 100
        );
    }

    const visitPercentage =
        (
            progress.visitasAcumuladas /
            programa.visitasRequeridas
        ) * 100;

    const amountPercentage =
        (
            numberValue(
                progress.montoAcumulado
            ) /
            numberValue(
                programa.montoRequerido
            )
        ) * 100;

    return Math.min(
        100,
        visitPercentage,
        amountPercentage
    );
}

function LoyaltyCustomersAdmin() {
    const {
        token
    } = useAuth();

    const realtimeVersion =
        useRealtimeVersion([
            "LOYALTY"
        ]);

    const [
        branches,
        setBranches
    ] = useState([]);

    const [
        customers,
        setCustomers
    ] = useState([]);

    const [
        selectedCustomer,
        setSelectedCustomer
    ] = useState(null);

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
        page: 1,
        limit: 20
    });

    const [
        isLoading,
        setIsLoading
    ] = useState(true);

    const [
        isLoadingDetail,
        setIsLoadingDetail
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        reloadKey,
        setReloadKey
    ] = useState(0);

    const availableRewards =
        useMemo(
            () =>
                customers.reduce(
                    (
                        total,
                        customer
                    ) =>
                        total +
                        Number(
                            customer.premiosDisponibles ??
                                0
                        ),
                    0
                ),
            [customers]
        );

    const visitsOnPage =
        useMemo(
            () =>
                customers.reduce(
                    (
                        total,
                        customer
                    ) =>
                        total +
                        Number(
                            customer.visitasAcumuladas ??
                                0
                        ),
                    0
                ),
            [customers]
        );

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadOptions() {
            try {
                const result =
                    await getLoyaltyOptionsRequest(
                        token,
                        {},
                        controller.signal
                    );

                setBranches(
                    result.sucursales ??
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
                        "No se pudieron cargar las sucursales."
                );
            }
        }

        void loadOptions();

        return () =>
            controller.abort();
    }, [
        token
    ]);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadCustomers() {
            setIsLoading(true);
            setError("");

            try {
                const result =
                    await listLoyaltyCustomersRequest(
                        token,
                        {
                            search:
                                filters.search,

                            sucursalId:
                                filters.sucursalId,

                            page:
                                filters.page,

                            limit:
                                filters.limit
                        },
                        controller.signal
                    );

                setCustomers(
                    result.clientes ??
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
                        "No se pudieron cargar los clientes."
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

        void loadCustomers();

        return () =>
            controller.abort();
    }, [
        token,
        filters.search,
        filters.sucursalId,
        filters.page,
        filters.limit,
        reloadKey,
        realtimeVersion
    ]);

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

        setSelectedCustomer(
            null
        );
    }

    async function openCustomerDetail(
        customerId
    ) {
        setIsLoadingDetail(true);
        setError("");

        try {
            const customer =
                await getLoyaltyCustomerRequest(
                    token,
                    customerId,
                    {
                        sucursalId:
                            filters.sucursalId
                    }
                );

            setSelectedCustomer(
                customer
            );
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo cargar el cliente."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    }

    return (
        <section className="loyalty-customers-admin admin-page">
            <header className="loyalty-customers-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        CLIENTES Y PREMIOS
                    </span>

                    <h2>
                        Clientes y premios
                    </h2>

                    <p>
                        Consulta visitas, consumo acumulado y beneficios obtenidos.
                    </p>
                </div>

                <button
                    type="button"
                    className="loyalty-customers-refresh"
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

            {error && (
                <div
                    className="loyalty-customers-error admin-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <section className="loyalty-customers-stats admin-metric-grid columns-3">
                <article>
                    <FaUser />

                    <div>
                        <span>
                            Clientes
                        </span>

                        <strong>
                            {
                                pagination.total
                            }
                        </strong>
                    </div>
                </article>

                <article>
                    <FaGift />

                    <div>
                        <span>
                            Premios disponibles
                        </span>

                        <strong>
                            {availableRewards}
                        </strong>
                    </div>
                </article>

                <article>
                    <FaTrophy />

                    <div>
                        <span>
                            Visitas acumuladas
                        </span>

                        <strong>
                            {visitsOnPage}
                        </strong>
                    </div>
                </article>
            </section>

            <section className="loyalty-customers-filters admin-filter-bar">
                <label>
                    <FaSearch />

                    <input
                        type="search"
                        placeholder="Buscar por nombre, correo o teléfono..."
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
                        Todas las sucursales y programas globales
                    </option>

                    {branches.map(
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
            </section>

            <section className="loyalty-customers-card">
                {isLoading ? (
                    <div className="loyalty-customers-empty">
                        <FaSyncAlt />
                        Cargando clientes...
                    </div>
                ) : customers.length ===
                  0 ? (
                    <div className="loyalty-customers-empty">
                        <FaUser />

                        <strong>
                            No existen clientes con progreso
                        </strong>

                        <span>
                            Los clientes aparecerán después de registrar ventas con fidelización.
                        </span>
                    </div>
                ) : (
                    <div className="loyalty-customers-table-wrapper admin-table-shell">
                        <table className="loyalty-customers-table admin-data-table">
                            <thead>
                                <tr>
                                    <th>
                                        Cliente
                                    </th>

                                    <th>
                                        Contacto
                                    </th>

                                    <th>
                                        Programas
                                    </th>

                                    <th>
                                        Visitas
                                    </th>

                                    <th>
                                        Consumo
                                    </th>

                                    <th>
                                        Premios disponibles
                                    </th>

                                    <th>
                                        Última actividad
                                    </th>

                                    <th>
                                        Acción
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {customers.map(
                                    (
                                        customer
                                    ) => (
                                        <tr
                                            key={
                                                customer.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        customer.nombreCompleto
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                <span>
                                                    {
                                                        customer.correo
                                                    }
                                                </span>

                                                <br />

                                                <small>
                                                    {customer.telefono ??
                                                        "Sin teléfono"}
                                                </small>
                                            </td>

                                            <td>
                                                {
                                                    customer.cantidadProgramas
                                                }
                                            </td>

                                            <td>
                                                {
                                                    customer.visitasAcumuladas
                                                }
                                            </td>

                                            <td>
                                                {formatMoney(
                                                    customer.montoAcumulado
                                                )}
                                            </td>

                                            <td>
                                                <span className="loyalty-reward-count">
                                                    {
                                                        customer.premiosDisponibles
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    customer.ultimaActualizacion
                                                )}
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="loyalty-view-button"
                                                    disabled={
                                                        isLoadingDetail
                                                    }
                                                    onClick={() =>
                                                        openCustomerDetail(
                                                            customer.id
                                                        )
                                                    }
                                                >
                                                    <FaEye />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="loyalty-customers-pagination admin-pagination">
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
                        clientes
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

            {selectedCustomer && (
                <AdminDialog
                    className="loyalty-customer-modal"
                    backdropClassName="loyalty-customer-modal-backdrop"
                    labelledBy="loyalty-customer-dialog-title"
                    onClose={() =>
                        setSelectedCustomer(
                            null
                        )
                    }
                >
                        <header>
                            <div>
                                <span className="admin-eyebrow">
                                    CLIENTE
                                </span>

                                <h3 id="loyalty-customer-dialog-title">
                                    {
                                        selectedCustomer.nombreCompleto
                                    }
                                </h3>

                                <p>
                                    {
                                        selectedCustomer.correo
                                    }
                                    {" · "}
                                    {selectedCustomer.telefono ??
                                        "Sin teléfono"}
                                </p>
                            </div>

                            <button
                                type="button"
                                aria-label="Cerrar detalle del cliente"
                                onClick={() =>
                                    setSelectedCustomer(
                                        null
                                    )
                                }
                            >
                                <FaTimes />
                            </button>
                        </header>

                        <section className="loyalty-customer-summary">
                            <article>
                                <FaCoins />

                                <div>
                                    <span>
                                        Programas
                                    </span>

                                    <strong>
                                        {
                                            selectedCustomer.resumen
                                                .cantidadProgramas
                                        }
                                    </strong>
                                </div>
                            </article>

                            <article>
                                <FaGift />

                                <div>
                                    <span>
                                        Disponibles
                                    </span>

                                    <strong>
                                        {
                                            selectedCustomer.resumen
                                                .premiosDisponibles
                                        }
                                    </strong>
                                </div>
                            </article>

                            <article>
                                <FaCheckCircle />

                                <div>
                                    <span>
                                        Canjeados
                                    </span>

                                    <strong>
                                        {
                                            selectedCustomer.resumen
                                                .premiosCanjeados
                                        }
                                    </strong>
                                </div>
                            </article>
                        </section>

                        <div className="loyalty-customer-modal-content">
                            <section>
                                <h4>
                                    Progreso
                                </h4>

                                <div className="loyalty-progress-list">
                                    {selectedCustomer.progresos.map(
                                        (
                                            progress
                                        ) => (
                                            <article
                                                key={
                                                    progress.id
                                                }
                                                className="loyalty-progress-card"
                                            >
                                                <div className="loyalty-progress-heading">
                                                    <div>
                                                        <strong>
                                                            {
                                                                progress.programa
                                                                    .nombre
                                                            }
                                                        </strong>

                                                        <span>
                                                            {progress.programa
                                                                .sucursal
                                                                ?.nombre ??
                                                                "Programa global"}
                                                        </span>
                                                    </div>

                                                    <span>
                                                        {
                                                            progress.ciclosCompletados
                                                        }{" "}
                                                        ciclos
                                                    </span>
                                                </div>

                                                <div className="loyalty-progress-bar">
                                                    <span
                                                        style={{
                                                            width: `${getProgressPercentage(
                                                                progress
                                                            )}%`
                                                        }}
                                                    />
                                                </div>

                                                <dl>
                                                    <div>
                                                        <dt>
                                                            Visitas
                                                        </dt>

                                                        <dd>
                                                            {
                                                                progress.visitasAcumuladas
                                                            }
                                                            {progress.programa
                                                                .visitasRequeridas
                                                                ? ` / ${progress.programa.visitasRequeridas}`
                                                                : ""}
                                                        </dd>
                                                    </div>

                                                    <div>
                                                        <dt>
                                                            Consumo
                                                        </dt>

                                                        <dd>
                                                            {formatMoney(
                                                                progress.montoAcumulado
                                                            )}
                                                            {progress.programa
                                                                .montoRequerido
                                                                ? ` / ${formatMoney(
                                                                      progress.programa
                                                                          .montoRequerido
                                                                  )}`
                                                                : ""}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </article>
                                        )
                                    )}
                                </div>
                            </section>

                            <section>
                                <h4>
                                    Premios
                                </h4>

                                <div className="loyalty-prize-list">
                                    {selectedCustomer.premios.length ===
                                    0 ? (
                                        <p>
                                            El cliente todavía no tiene premios.
                                        </p>
                                    ) : (
                                        selectedCustomer.premios.map(
                                            (
                                                reward
                                            ) => (
                                                <article
                                                    key={
                                                        reward.id
                                                    }
                                                    className="loyalty-prize-card"
                                                >
                                                    <div>
                                                        <strong>
                                                            {
                                                                reward.descripcion
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                reward.programa
                                                                    .nombre
                                                            }
                                                        </span>
                                                    </div>

                                                    <span
                                                        className={`admin-status-badge loyalty-prize-status ${reward.estadoEfectivo.toLowerCase()}`}
                                                    >
                                                        {formatLabel(
                                                            reward.estadoEfectivo
                                                        )}
                                                    </span>

                                                    <dl>
                                                        <div>
                                                            <dt>
                                                                Obtenido
                                                            </dt>

                                                            <dd>
                                                                {formatDate(
                                                                    reward.fechaObtencion
                                                                )}
                                                            </dd>
                                                        </div>

                                                        <div>
                                                            <dt>
                                                                Vence
                                                            </dt>

                                                            <dd>
                                                                {formatDate(
                                                                    reward.fechaVencimiento
                                                                )}
                                                            </dd>
                                                        </div>

                                                        {reward.ventaCanje && (
                                                            <div>
                                                                <dt>
                                                                    Ticket de canje
                                                                </dt>

                                                                <dd>
                                                                    {
                                                                        reward.ventaCanje
                                                                            .numeroTicket
                                                                    }
                                                                </dd>
                                                            </div>
                                                        )}
                                                    </dl>
                                                </article>
                                            )
                                        )
                                    )}
                                </div>
                            </section>
                        </div>
                </AdminDialog>
            )}
        </section>
    );
}

export default LoyaltyCustomersAdmin;
