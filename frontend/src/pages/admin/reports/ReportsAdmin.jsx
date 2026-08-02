import {
    useMemo,
    useState,
    useEffect
} from "react";

import {
    FaArrowDown,
    FaArrowUp,
    FaBoxOpen,
    FaCalendarAlt,
    FaCashRegister,
    FaChartBar,
    FaChartLine,
    FaCoins,
    FaEquals,
    FaFileInvoiceDollar,
    FaMoneyBillWave,
    FaPercentage,
    FaReceipt,
    FaStore,
    FaSyncAlt,
    FaTicketAlt,
    FaWallet
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";

import {
    ApiError
} from "../../../services/api";

import {
    getReportOptionsRequest,
    getReportSummaryRequest
} from "../../../services/report.service";

import "./reportsAdmin.css";

const EMPTY_OPTIONS = {
    sucursales: [],
    sucursalSeleccionadaId: null,
    fechaDesde: "",
    fechaHasta: ""
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
        error.errors?.[0]?.mensaje;

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

function formatQuantity(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            maximumFractionDigits: 3
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
        `${value}T12:00:00`
    ).toLocaleDateString(
        "es-PE",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
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

function getStatusPercentage(
    quantity,
    total
) {
    if (total <= 0) {
        return 0;
    }

    return Math.min(
        100,
        Math.max(
            0,
            (
                numberValue(quantity) /
                numberValue(total)
            ) * 100
        )
    );
}

function ReportMetricCard({
    title,
    value,
    description,
    icon: Icon,
    variation = "neutral"
}) {
    return (
        <article
            className={`report-metric-card ${variation}`}
        >
            <div className="report-metric-icon">
                <Icon />
            </div>

            <div className="report-metric-content">
                <span>
                    {title}
                </span>

                <strong>
                    {value}
                </strong>

                {description && (
                    <small>
                        {description}
                    </small>
                )}
            </div>
        </article>
    );
}

function DailyReportChart({
    series
}) {
    const chart = useMemo(
        () => {
            const width = 1000;
            const height = 300;

            const padding = {
                top: 25,
                right: 35,
                bottom: 48,
                left: 70
            };

            const chartWidth =
                width -
                padding.left -
                padding.right;

            const chartHeight =
                height -
                padding.top -
                padding.bottom;

            const maximum =
                Math.max(
                    1,
                    ...series.flatMap(
                        (item) => [
                            numberValue(
                                item.ventas
                            ),
                            numberValue(
                                item.gastos
                            )
                        ]
                    )
                );

            function getX(index) {
                if (
                    series.length <= 1
                ) {
                    return (
                        padding.left +
                        chartWidth / 2
                    );
                }

                return (
                    padding.left +
                    (
                        index /
                        (
                            series.length -
                            1
                        )
                    ) *
                        chartWidth
                );
            }

            function getY(value) {
                return (
                    padding.top +
                    chartHeight -
                    (
                        numberValue(value) /
                        maximum
                    ) *
                        chartHeight
                );
            }

            const salesPoints =
                series
                    .map(
                        (
                            item,
                            index
                        ) =>
                            `${getX(index)},${getY(
                                item.ventas
                            )}`
                    )
                    .join(" ");

            const expensePoints =
                series
                    .map(
                        (
                            item,
                            index
                        ) =>
                            `${getX(index)},${getY(
                                item.gastos
                            )}`
                    )
                    .join(" ");

            const horizontalGuides =
                Array.from(
                    {
                        length: 5
                    },
                    (
                        _value,
                        index
                    ) => {
                        const ratio =
                            index / 4;

                        return {
                            value:
                                maximum *
                                (
                                    1 -
                                    ratio
                                ),

                            y:
                                padding.top +
                                chartHeight *
                                    ratio
                        };
                    }
                );

            const labelIndexes =
                series.length <= 3
                    ? series.map(
                          (
                              _item,
                              index
                          ) => index
                      )
                    : [
                          0,
                          Math.floor(
                              (
                                  series.length -
                                  1
                              ) / 2
                          ),
                          series.length - 1
                      ];

            return {
                width,
                height,
                padding,
                chartWidth,
                chartHeight,
                maximum,
                salesPoints,
                expensePoints,
                horizontalGuides,
                labelIndexes,
                getX,
                getY
            };
        },
        [series]
    );

    if (series.length === 0) {
        return (
            <div className="reports-empty-state compact">
                <FaChartLine />

                <strong>
                    No existen movimientos para el periodo
                </strong>
            </div>
        );
    }

    return (
        <div className="report-chart-container">
            <svg
                className="report-daily-chart"
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                role="img"
                aria-label="Gráfico diario de ventas y gastos"
            >
                {chart.horizontalGuides.map(
                    (
                        guide,
                        index
                    ) => (
                        <g
                            key={
                                index
                            }
                        >
                            <line
                                className="report-chart-guide"
                                x1={
                                    chart.padding
                                        .left
                                }
                                x2={
                                    chart.padding
                                        .left +
                                    chart.chartWidth
                                }
                                y1={
                                    guide.y
                                }
                                y2={
                                    guide.y
                                }
                            />

                            <text
                                className="report-chart-y-label"
                                x={
                                    chart.padding
                                        .left -
                                    12
                                }
                                y={
                                    guide.y +
                                    4
                                }
                                textAnchor="end"
                            >
                                {new Intl.NumberFormat(
                                    "es-PE",
                                    {
                                        notation:
                                            "compact",
                                        maximumFractionDigits:
                                            1
                                    }
                                ).format(
                                    guide.value
                                )}
                            </text>
                        </g>
                    )
                )}

                <line
                    className="report-chart-axis"
                    x1={
                        chart.padding.left
                    }
                    x2={
                        chart.padding.left
                    }
                    y1={
                        chart.padding.top
                    }
                    y2={
                        chart.padding.top +
                        chart.chartHeight
                    }
                />

                <line
                    className="report-chart-axis"
                    x1={
                        chart.padding.left
                    }
                    x2={
                        chart.padding.left +
                        chart.chartWidth
                    }
                    y1={
                        chart.padding.top +
                        chart.chartHeight
                    }
                    y2={
                        chart.padding.top +
                        chart.chartHeight
                    }
                />

                <polyline
                    className="report-chart-line sales"
                    points={
                        chart.salesPoints
                    }
                />

                <polyline
                    className="report-chart-line expenses"
                    points={
                        chart.expensePoints
                    }
                />

                {series.length <= 31 &&
                    series.map(
                        (
                            item,
                            index
                        ) => (
                            <g
                                key={
                                    item.fecha
                                }
                            >
                                <circle
                                    className="report-chart-point sales"
                                    cx={
                                        chart.getX(
                                            index
                                        )
                                    }
                                    cy={
                                        chart.getY(
                                            item.ventas
                                        )
                                    }
                                    r="4"
                                >
                                    <title>
                                        {`${formatDate(
                                            item.fecha
                                        )}: ventas ${formatMoney(
                                            item.ventas
                                        )}`}
                                    </title>
                                </circle>

                                <circle
                                    className="report-chart-point expenses"
                                    cx={
                                        chart.getX(
                                            index
                                        )
                                    }
                                    cy={
                                        chart.getY(
                                            item.gastos
                                        )
                                    }
                                    r="4"
                                >
                                    <title>
                                        {`${formatDate(
                                            item.fecha
                                        )}: gastos ${formatMoney(
                                            item.gastos
                                        )}`}
                                    </title>
                                </circle>
                            </g>
                        )
                    )}

                {chart.labelIndexes.map(
                    (index) => {
                        const item =
                            series[index];

                        if (!item) {
                            return null;
                        }

                        return (
                            <text
                                key={
                                    item.fecha
                                }
                                className="report-chart-x-label"
                                x={
                                    chart.getX(
                                        index
                                    )
                                }
                                y={
                                    chart.height -
                                    14
                                }
                                textAnchor="middle"
                            >
                                {new Date(
                                    `${item.fecha}T12:00:00`
                                ).toLocaleDateString(
                                    "es-PE",
                                    {
                                        day:
                                            "2-digit",
                                        month:
                                            "short"
                                    }
                                )}
                            </text>
                        );
                    }
                )}
            </svg>
        </div>
    );
}

function ReportsAdmin() {
    const {
        token
    } = useAuth();

    const [
        options,
        setOptions
    ] = useState(
        EMPTY_OPTIONS
    );

    const [
        filters,
        setFilters
    ] = useState({
        sucursalId: "",
        fechaDesde: "",
        fechaHasta: ""
    });

    const [
        report,
        setReport
    ] = useState(null);

    const [
        isLoadingOptions,
        setIsLoadingOptions
    ] = useState(true);

    const [
        isLoadingReport,
        setIsLoadingReport
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        lastUpdate,
        setLastUpdate
    ] = useState(null);

    const totalOrders =
        useMemo(
            () =>
                report?.estadosPedidos.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        numberValue(
                            item.cantidad
                        ),
                    0
                ) ?? 0,
            [
                report
            ]
        );

    const totalReservations =
        useMemo(
            () =>
                report?.estadosReservas.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        numberValue(
                            item.cantidad
                        ),
                    0
                ) ?? 0,
            [
                report
            ]
        );

    const maximumPayment =
        useMemo(
            () =>
                Math.max(
                    1,
                    ...(
                        report?.metodosPago.map(
                            (item) =>
                                numberValue(
                                    item.total
                                )
                        ) ?? []
                    )
                ),
            [
                report
            ]
        );

    const maximumProductTotal =
        useMemo(
            () =>
                Math.max(
                    1,
                    ...(
                        report?.productosMasVendidos.map(
                            (item) =>
                                numberValue(
                                    item.total
                                )
                        ) ?? []
                    )
                ),
            [
                report
            ]
        );

    async function loadReport(
        reportFilters,
        signal
    ) {
        setIsLoadingReport(true);
        setError("");

        try {
            const result =
                await getReportSummaryRequest(
                    token,
                    {
                        ...reportFilters,
                        signal
                    }
                );

            setReport(result);
            setLastUpdate(
                new Date()
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
                    "No se pudo generar el reporte."
            );
        } finally {
            if (
                !signal?.aborted
            ) {
                setIsLoadingReport(
                    false
                );
            }
        }
    }

    useEffect(() => {
        const controller =
            new AbortController();

        async function initializeReports() {
            setIsLoadingOptions(true);
            setError("");

            try {
                const result =
                    await getReportOptionsRequest(
                        token,
                        {
                            signal:
                                controller.signal
                        }
                    );

                setOptions(result);

                const initialFilters = {
                    sucursalId:
                        result
                            .sucursalSeleccionadaId ??
                        "",

                    fechaDesde:
                        result.fechaDesde,

                    fechaHasta:
                        result.fechaHasta
                };

                setFilters(
                    initialFilters
                );

                await loadReport(
                    initialFilters,
                    controller.signal
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
                        "No se pudieron cargar las opciones de reportes."
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

        void initializeReports();

        return () =>
            controller.abort();
    }, [token]);

    async function handleGenerateReport(
        event
    ) {
        event.preventDefault();

        if (
            !filters.fechaDesde ||
            !filters.fechaHasta
        ) {
            setError(
                "Selecciona la fecha inicial y final."
            );
            return;
        }

        if (
            filters.fechaDesde >
            filters.fechaHasta
        ) {
            setError(
                "La fecha inicial no puede ser posterior a la fecha final."
            );
            return;
        }

        await loadReport(
            filters
        );
    }

    function handleResetFilters() {
        const initialFilters = {
            sucursalId:
                options
                    .sucursalSeleccionadaId ??
                "",

            fechaDesde:
                options.fechaDesde,

            fechaHasta:
                options.fechaHasta
        };

        setFilters(
            initialFilters
        );

        void loadReport(
            initialFilters
        );
    }

    const summary =
        report?.resumen;

    const balanceVariation =
        numberValue(
            summary?.balanceOperativo
        ) > 0
            ? "positive"
            : numberValue(
                  summary
                      ?.balanceOperativo
              ) < 0
              ? "negative"
              : "neutral";

    const cashDifferenceVariation =
        numberValue(
            summary?.diferenciaCaja
        ) === 0
            ? "neutral"
            : numberValue(
                  summary
                      ?.diferenciaCaja
              ) > 0
              ? "positive"
              : "negative";

    if (
        isLoadingOptions &&
        !report
    ) {
        return (
            <div className="reports-loading">
                <FaChartBar />
                Cargando reportes...
            </div>
        );
    }

    return (
        <section className="reports-admin">
            <header className="reports-heading">
                <div>
                    <span className="admin-eyebrow">
                        REPORTES
                    </span>

                    <h2>
                        Indicadores del negocio
                    </h2>

                    <p>
                        Analiza ventas, gastos,
                        productos, pedidos,
                        reservas y cajas.
                    </p>
                </div>

                <button
                    type="button"
                    className="reports-refresh-button"
                    disabled={
                        isLoadingReport
                    }
                    onClick={() =>
                        loadReport(
                            filters
                        )
                    }
                >
                    <FaSyncAlt />
                    Actualizar
                </button>
            </header>

            {error && (
                <div className="reports-feedback error">
                    {error}
                </div>
            )}

            <form
                className="reports-filter-card"
                onSubmit={
                    handleGenerateReport
                }
            >
                <label>
                    <span>
                        <FaStore />
                        Sucursal
                    </span>

                    <select
                        value={
                            filters
                                .sucursalId
                        }
                        onChange={(
                            event
                        ) =>
                            setFilters(
                                (
                                    previous
                                ) => ({
                                    ...previous,

                                    sucursalId:
                                        event
                                            .target
                                            .value
                                })
                            )
                        }
                    >
                        <option value="">
                            Todas las sucursales
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

                <label>
                    <span>
                        <FaCalendarAlt />
                        Desde
                    </span>

                    <input
                        type="date"
                        value={
                            filters
                                .fechaDesde
                        }
                        onChange={(
                            event
                        ) =>
                            setFilters(
                                (
                                    previous
                                ) => ({
                                    ...previous,

                                    fechaDesde:
                                        event
                                            .target
                                            .value
                                })
                            )
                        }
                    />
                </label>

                <label>
                    <span>
                        <FaCalendarAlt />
                        Hasta
                    </span>

                    <input
                        type="date"
                        value={
                            filters
                                .fechaHasta
                        }
                        onChange={(
                            event
                        ) =>
                            setFilters(
                                (
                                    previous
                                ) => ({
                                    ...previous,

                                    fechaHasta:
                                        event
                                            .target
                                            .value
                                })
                            )
                        }
                    />
                </label>

                <div className="reports-filter-actions">
                    <button
                        type="button"
                        className="secondary"
                        onClick={
                            handleResetFilters
                        }
                    >
                        Restablecer
                    </button>

                    <button
                        type="submit"
                        className="primary"
                        disabled={
                            isLoadingReport
                        }
                    >
                        <FaChartBar />

                        {isLoadingReport
                            ? "Generando..."
                            : "Generar reporte"}
                    </button>
                </div>
            </form>

            {report && (
                <>
                    <div className="report-period">
                        <div>
                            <FaCalendarAlt />

                            <span>
                                Periodo analizado
                            </span>

                            <strong>
                                {formatDate(
                                    report
                                        .filtros
                                        .fechaDesde
                                )}
                                {" — "}
                                {formatDate(
                                    report
                                        .filtros
                                        .fechaHasta
                                )}
                            </strong>
                        </div>

                        {lastUpdate && (
                            <small>
                                Actualizado a las{" "}
                                {lastUpdate.toLocaleTimeString(
                                    "es-PE",
                                    {
                                        hour:
                                            "2-digit",
                                        minute:
                                            "2-digit"
                                    }
                                )}
                            </small>
                        )}
                    </div>

                    <div className="report-metric-grid main">
                        <ReportMetricCard
                            title="Total vendido"
                            value={
                                formatMoney(
                                    summary
                                        .totalVendido
                                )
                            }
                            description={`${summary.ventasConfirmadas} venta(s) confirmada(s)`}
                            icon={
                                FaMoneyBillWave
                            }
                            variation="positive"
                        />

                        <ReportMetricCard
                            title="Gastos registrados"
                            value={
                                formatMoney(
                                    summary
                                        .totalGastos
                                )
                            }
                            description={`${summary.gastosRegistrados} gasto(s)`}
                            icon={
                                FaFileInvoiceDollar
                            }
                            variation="negative"
                        />

                        <ReportMetricCard
                            title="Balance operativo"
                            value={
                                formatMoney(
                                    summary
                                        .balanceOperativo
                                )
                            }
                            description="Ventas menos gastos"
                            icon={
                                balanceVariation ===
                                "positive"
                                    ? FaArrowUp
                                    : balanceVariation ===
                                      "negative"
                                      ? FaArrowDown
                                      : FaEquals
                            }
                            variation={
                                balanceVariation
                            }
                        />

                        <ReportMetricCard
                            title="Ticket promedio"
                            value={
                                formatMoney(
                                    summary
                                        .ticketPromedio
                                )
                            }
                            description="Promedio por venta"
                            icon={
                                FaTicketAlt
                            }
                        />
                    </div>

                    <div className="report-metric-grid secondary">
                        <ReportMetricCard
                            title="Subtotal"
                            value={
                                formatMoney(
                                    summary.subtotal
                                )
                            }
                            description="Antes de descuentos y propinas"
                            icon={
                                FaReceipt
                            }
                        />

                        <ReportMetricCard
                            title="Descuentos"
                            value={
                                formatMoney(
                                    summary
                                        .descuentos
                                )
                            }
                            description="Descuentos aplicados"
                            icon={
                                FaPercentage
                            }
                        />

                        <ReportMetricCard
                            title="Propinas"
                            value={
                                formatMoney(
                                    summary.propinas
                                )
                            }
                            description="Propinas registradas"
                            icon={
                                FaCoins
                            }
                        />

                        <ReportMetricCard
                            title="Adelantos aplicados"
                            value={
                                formatMoney(
                                    summary
                                        .adelantosAplicados
                                )
                            }
                            description="Pagos de reservas utilizados"
                            icon={
                                FaWallet
                            }
                        />
                    </div>

                    <div className="report-dashboard-grid">
                        <section className="report-card daily-chart-card">
                            <div className="report-card-heading">
                                <div>
                                    <h3>
                                        Ventas y gastos por día
                                    </h3>

                                    <p>
                                        Evolución económica
                                        durante el periodo.
                                    </p>
                                </div>

                                <div className="report-chart-legend">
                                    <span className="sales">
                                        Ventas
                                    </span>

                                    <span className="expenses">
                                        Gastos
                                    </span>
                                </div>
                            </div>

                            <DailyReportChart
                                series={
                                    report
                                        .serieDiaria
                                }
                            />
                        </section>

                        <section className="report-card payment-card">
                            <div className="report-card-heading">
                                <div>
                                    <h3>
                                        Métodos de pago
                                    </h3>

                                    <p>
                                        Ingresos confirmados
                                        por cada método.
                                    </p>
                                </div>
                            </div>

                            <div className="report-payment-list">
                                {report.metodosPago.map(
                                    (
                                        payment
                                    ) => {
                                        const percentage =
                                            (
                                                numberValue(
                                                    payment.total
                                                ) /
                                                maximumPayment
                                            ) *
                                            100;

                                        return (
                                            <article
                                                key={
                                                    payment.metodoPago
                                                }
                                            >
                                                <div className="report-progress-heading">
                                                    <span>
                                                        {formatLabel(
                                                            payment
                                                                .metodoPago
                                                        )}
                                                    </span>

                                                    <strong>
                                                        {formatMoney(
                                                            payment.total
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="report-progress-track">
                                                    <div
                                                        className={`report-progress-value payment-${payment.metodoPago.toLowerCase()}`}
                                                        style={{
                                                            width:
                                                                `${percentage}%`
                                                        }}
                                                    />
                                                </div>
                                            </article>
                                        );
                                    }
                                )}
                            </div>

                            <div className="report-payment-total">
                                <span>
                                    Cobrado en caja
                                </span>

                                <strong>
                                    {formatMoney(
                                        summary
                                            .cobradoEnCaja
                                    )}
                                </strong>
                            </div>
                        </section>
                    </div>

                    <div className="report-content-grid">
                        <section className="report-card">
                            <div className="report-card-heading">
                                <div>
                                    <h3>
                                        Productos más vendidos
                                    </h3>

                                    <p>
                                        Ranking por importe
                                        vendido.
                                    </p>
                                </div>

                                <FaBoxOpen />
                            </div>

                            {report.productosMasVendidos.length ===
                            0 ? (
                                <div className="reports-empty-state compact">
                                    <FaBoxOpen />

                                    <strong>
                                        No hay productos vendidos
                                    </strong>
                                </div>
                            ) : (
                                <div className="report-product-list">
                                    {report.productosMasVendidos.map(
                                        (
                                            product
                                        ) => {
                                            const percentage =
                                                (
                                                    numberValue(
                                                        product.total
                                                    ) /
                                                    maximumProductTotal
                                                ) *
                                                100;

                                            return (
                                                <article
                                                    key={
                                                        product.productoSucursalId
                                                    }
                                                >
                                                    <span className="report-product-position">
                                                        {
                                                            product.posicion
                                                        }
                                                    </span>

                                                    <div className="report-product-data">
                                                        <div>
                                                            <strong>
                                                                {
                                                                    product.nombreProducto
                                                                }
                                                            </strong>

                                                            <small>
                                                                {formatQuantity(
                                                                    product.cantidad
                                                                )}{" "}
                                                                unidad(es)
                                                            </small>
                                                        </div>

                                                        <span>
                                                            {formatMoney(
                                                                product.total
                                                            )}
                                                        </span>

                                                        <div className="report-progress-track">
                                                            <div
                                                                className="report-progress-value product"
                                                                style={{
                                                                    width:
                                                                        `${percentage}%`
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        }
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="report-card">
                            <div className="report-card-heading">
                                <div>
                                    <h3>
                                        Situación operativa
                                    </h3>

                                    <p>
                                        Estados de pedidos y
                                        reservas.
                                    </p>
                                </div>

                                <FaChartBar />
                            </div>

                            <div className="report-status-columns">
                                <section>
                                    <h4>
                                        Pedidos
                                    </h4>

                                    <strong className="report-status-total">
                                        {totalOrders}
                                    </strong>

                                    <div className="report-status-list">
                                        {report.estadosPedidos.map(
                                            (
                                                item
                                            ) => (
                                                <article
                                                    key={
                                                        item.estado
                                                    }
                                                >
                                                    <div className="report-progress-heading">
                                                        <span>
                                                            {formatLabel(
                                                                item.estado
                                                            )}
                                                        </span>

                                                        <strong>
                                                            {
                                                                item.cantidad
                                                            }
                                                        </strong>
                                                    </div>

                                                    <div className="report-progress-track">
                                                        <div
                                                            className={`report-progress-value status status-${item.estado.toLowerCase()}`}
                                                            style={{
                                                                width:
                                                                    `${getStatusPercentage(
                                                                        item.cantidad,
                                                                        totalOrders
                                                                    )}%`
                                                            }}
                                                        />
                                                    </div>
                                                </article>
                                            )
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h4>
                                        Reservas
                                    </h4>

                                    <strong className="report-status-total">
                                        {
                                            totalReservations
                                        }
                                    </strong>

                                    <div className="report-status-list">
                                        {report.estadosReservas.map(
                                            (
                                                item
                                            ) => (
                                                <article
                                                    key={
                                                        item.estado
                                                    }
                                                >
                                                    <div className="report-progress-heading">
                                                        <span>
                                                            {formatLabel(
                                                                item.estado
                                                            )}
                                                        </span>

                                                        <strong>
                                                            {
                                                                item.cantidad
                                                            }
                                                        </strong>
                                                    </div>

                                                    <div className="report-progress-track">
                                                        <div
                                                            className={`report-progress-value status status-${item.estado.toLowerCase()}`}
                                                            style={{
                                                                width:
                                                                    `${getStatusPercentage(
                                                                        item.cantidad,
                                                                        totalReservations
                                                                    )}%`
                                                            }}
                                                        />
                                                    </div>
                                                </article>
                                            )
                                        )}
                                    </div>
                                </section>
                            </div>
                        </section>
                    </div>

                    <section className="report-card cash-report-card">
                        <div className="report-card-heading">
                            <div>
                                <h3>
                                    Control de cajas
                                </h3>

                                <p>
                                    Estado y diferencias de
                                    las cajas operativas.
                                </p>
                            </div>

                            <FaCashRegister />
                        </div>

                        <div className="report-cash-grid">
                            <ReportMetricCard
                                title="Cajas abiertas"
                                value={
                                    summary
                                        .cajasAbiertas
                                }
                                description="Actualmente operativas"
                                icon={
                                    FaCashRegister
                                }
                                variation={
                                    summary
                                        .cajasAbiertas >
                                    0
                                        ? "positive"
                                        : "neutral"
                                }
                            />

                            <ReportMetricCard
                                title="Cajas cerradas"
                                value={
                                    summary
                                        .cajasCerradas
                                }
                                description="Cerradas en el periodo"
                                icon={
                                    FaReceipt
                                }
                            />

                            <ReportMetricCard
                                title="Diferencia acumulada"
                                value={
                                    formatMoney(
                                        summary
                                            .diferenciaCaja
                                    )
                                }
                                description={
                                    summary
                                        .diferenciaCaja ===
                                    0
                                        ? "Sin diferencias"
                                        : "Sobrantes o faltantes"
                                }
                                icon={
                                    summary
                                        .diferenciaCaja ===
                                    0
                                        ? FaEquals
                                        : summary
                                              .diferenciaCaja >
                                          0
                                          ? FaArrowUp
                                          : FaArrowDown
                                }
                                variation={
                                    cashDifferenceVariation
                                }
                            />

                            <ReportMetricCard
                                title="Ventas confirmadas"
                                value={
                                    summary
                                        .ventasConfirmadas
                                }
                                description="Tickets registrados"
                                icon={
                                    FaReceipt
                                }
                                variation="positive"
                            />
                        </div>
                    </section>
                </>
            )}
        </section>
    );
}

export default ReportsAdmin;