import {
    useCallback,
    useMemo,
    useState,
    useEffect,
    useRef
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
    FaFileExcel,
    FaFileInvoiceDollar,
    FaFilePdf,
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
    useRealtimeVersion
} from "../../../context/RealtimeContext";

import {
    ApiError
} from "../../../services/api";

import {
    downloadReportRequest,
    getReportDetailsRequest,
    getReportOptionsRequest,
    getReportSummaryRequest
} from "../../../services/report.service";

import ReportDetailsDialog from "./ReportDetailsDialog";
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
    variation = "neutral",
    onClick
}) {
    const Card = onClick
        ? "button"
        : "article";

    return (
        <Card
            type={onClick ? "button" : undefined}
            className={`report-metric-card ${variation}${onClick ? " clickable" : ""}`}
            onClick={onClick}
            aria-label={onClick ? `Ver detalle de ${title}` : undefined}
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
        </Card>
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

    const realtimeVersion =
        useRealtimeVersion([
            "REPORTS",
            "SALES",
            "EXPENSES",
            "RESERVATIONS",
            "CASH"
        ]);

    const handledRealtimeVersionRef =
        useRef(0);

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
        exportFormat,
        setExportFormat
    ] = useState("");

    const [
        error,
        setError
    ] = useState("");

    const [
        lastUpdate,
        setLastUpdate
    ] = useState(null);

    const [
        detailConfig,
        setDetailConfig
    ] = useState(null);

    const [
        detailData,
        setDetailData
    ] = useState(null);

    const [
        detailError,
        setDetailError
    ] = useState("");

    const [
        isLoadingDetails,
        setIsLoadingDetails
    ] = useState(false);

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

    const loadReport = useCallback(async (
        reportFilters,
        signal
    ) => {
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
    }, [token]);

    const loadReportDetails = useCallback(async (
        config,
        page = 1
    ) => {
        if (!report?.filtros) {
            return;
        }

        setDetailConfig(config);
        setDetailError("");
        setIsLoadingDetails(true);

        try {
            const result =
                await getReportDetailsRequest(
                    token,
                    {
                        ...report.filtros,
                        tipo: config.tipo,
                        filtro:
                            config.filtro ??
                            "",
                        page,
                        limit: 20
                    }
                );

            setDetailData(result);
        } catch (requestError) {
            setDetailError(
                getErrorMessage(
                    requestError
                ) ??
                    "No se pudo cargar la trazabilidad del indicador."
            );
        } finally {
            setIsLoadingDetails(false);
        }
    }, [report, token]);

    function openReportDetails(config) {
        setDetailData(null);
        void loadReportDetails(
            config,
            1
        );
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
    }, [
        token,
        loadReport
    ]);

    useEffect(() => {
        if (
            realtimeVersion === 0 ||
            handledRealtimeVersionRef.current ===
                realtimeVersion ||
            !report?.filtros
        ) {
            return undefined;
        }

        handledRealtimeVersionRef.current =
            realtimeVersion;

        const controller =
            new AbortController();

        void loadReport(
            report.filtros,
            controller.signal
        );

        if (detailConfig) {
            // La llamada responde a un evento externo del servidor.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void loadReportDetails(
                detailConfig,
                detailData
                    ?.pagination
                    ?.page ?? 1
            );
        }

        return () =>
            controller.abort();
    }, [
        realtimeVersion,
        report?.filtros,
        detailConfig,
        detailData?.pagination?.page,
        loadReport,
        loadReportDetails
    ]);

    async function handleGenerateReport(
        event
    ) {
        event.preventDefault();
        setDetailConfig(null);

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
        setDetailConfig(null);
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

    async function handleExport(format) {
        setError("");
        setExportFormat(format);

        try {
            const download =
                await downloadReportRequest(
                    token,
                    format,
                    report?.filtros ??
                        filters
                );
            const url =
                URL.createObjectURL(
                    download.blob
                );
            const link =
                document.createElement("a");

            link.href = url;
            link.download = download.filename;
            document.body.append(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (requestError) {
            setError(
                getErrorMessage(requestError) ??
                    "No se pudo exportar el reporte."
            );
        } finally {
            setExportFormat("");
        }
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
        <section className="reports-admin admin-page">
            <header className="reports-heading admin-page-header">
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

                <div className="reports-heading-actions">
                    <button
                        type="button"
                        className="reports-export-button"
                        disabled={Boolean(exportFormat) || !report}
                        onClick={() =>
                            void handleExport("xlsx")
                        }
                    >
                        <FaFileExcel />
                        {exportFormat === "xlsx"
                            ? "Generando..."
                            : "Excel"}
                    </button>
                    <button
                        type="button"
                        className="reports-export-button"
                        disabled={Boolean(exportFormat) || !report}
                        onClick={() =>
                            void handleExport("pdf")
                        }
                    >
                        <FaFilePdf />
                        {exportFormat === "pdf"
                            ? "Generando..."
                            : "PDF"}
                    </button>
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
                </div>
            </header>

            {error && (
                <div
                    className="reports-feedback admin-feedback error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <form
                className="reports-filter-card admin-filter-bar"
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

                    <div className="report-metric-grid admin-metric-grid main">
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
                            onClick={() =>
                                openReportDetails({
                                    title:
                                        "Ventas confirmadas",
                                    tipo: "VENTAS"
                                })
                            }
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
                            onClick={() =>
                                openReportDetails({
                                    title:
                                        "Gastos registrados",
                                    tipo: "GASTOS"
                                })
                            }
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
                            onClick={() =>
                                openReportDetails({
                                    title:
                                        "Movimientos del balance operativo",
                                    tipo: "BALANCE"
                                })
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
                            onClick={() =>
                                openReportDetails({
                                    title:
                                        "Ventas del ticket promedio",
                                    tipo: "VENTAS"
                                })
                            }
                        />
                    </div>

                    <div className="report-metric-grid admin-metric-grid secondary">
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
                            onClick={() =>
                                openReportDetails({
                                    title:
                                        "Composición del subtotal",
                                    tipo: "VENTAS",
                                    filtro: "SUBTOTAL"
                                })
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
                            onClick={() =>
                                openReportDetails({
                                    title:
                                        "Ventas con descuentos",
                                    tipo: "VENTAS",
                                    filtro:
                                        "CON_DESCUENTO"
                                })
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
                            onClick={() =>
                                openReportDetails({
                                    title:
                                        "Propinas por venta",
                                    tipo: "VENTAS",
                                    filtro:
                                        "CON_PROPINA"
                                })
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
                            onClick={() =>
                                openReportDetails({
                                    title:
                                        "Adelantos aplicados a ventas",
                                    tipo: "VENTAS",
                                    filtro:
                                        "CON_ADELANTO"
                                })
                            }
                        />

                        <ReportMetricCard
                            title="Adelantos recibidos"
                            value={
                                formatMoney(
                                    summary
                                        .adelantosRecibidos
                                )
                            }
                            description={`${summary.adelantosRegistrados} pago(s) de reserva confirmado(s)`}
                            icon={FaWallet}
                            variation="positive"
                            onClick={() =>
                                openReportDetails({
                                    title:
                                        "Adelantos de reservas recibidos",
                                    tipo:
                                        "ADELANTOS_RESERVA"
                                })
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
                                            <button
                                                type="button"
                                                className="report-drilldown-trigger"
                                                key={
                                                    payment.metodoPago
                                                }
                                                onClick={() =>
                                                    openReportDetails({
                                                        title:
                                                            `Pagos por ${formatLabel(payment.metodoPago)}`,
                                                        tipo: "PAGOS",
                                                        filtro:
                                                            payment.metodoPago
                                                    })
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

                                                <small className="report-payment-breakdown">
                                                    Ventas: {formatMoney(payment.ventas)} · Reservas: {formatMoney(payment.adelantos)}
                                                </small>

                                                <div className="report-progress-track">
                                                    <div
                                                        className={`report-progress-value payment-${payment.metodoPago.toLowerCase()}`}
                                                        style={{
                                                            width:
                                                                `${percentage}%`
                                                        }}
                                                    />
                                                </div>
                                            </button>
                                        );
                                    }
                                )}
                            </div>

                            <button
                                type="button"
                                className="report-payment-total report-drilldown-trigger"
                                onClick={() =>
                                    openReportDetails({
                                        title:
                                            "Cobros de ventas confirmadas",
                                        tipo: "VENTAS",
                                        filtro: "SALDO_CAJA"
                                    })
                                }
                            >
                                <span>
                                    Cobrado en caja
                                </span>

                                <strong>
                                    {formatMoney(
                                        summary
                                            .cobradoEnCaja
                                    )}
                                </strong>
                            </button>
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
                                                <button
                                                    type="button"
                                                    className="report-product-drilldown"
                                                    key={
                                                        `${product.productoSucursalId}-${product.nombreProducto}`
                                                    }
                                                    onClick={() =>
                                                        openReportDetails({
                                                            title:
                                                                `Ventas de ${product.nombreProducto}`,
                                                            tipo: "PRODUCTOS",
                                                            filtro:
                                                                product.productoSucursalId
                                                        })
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
                                                </button>
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

                                    <button
                                        type="button"
                                        className="report-status-total"
                                        onClick={() =>
                                            openReportDetails({
                                                title:
                                                    "Todos los pedidos",
                                                tipo: "PEDIDOS"
                                            })
                                        }
                                    >
                                        {totalOrders}
                                    </button>

                                    <div className="report-status-list">
                                        {report.estadosPedidos.map(
                                            (
                                                item
                                            ) => (
                                                <button
                                                    type="button"
                                                    className="report-drilldown-trigger"
                                                    key={
                                                        item.estado
                                                    }
                                                    onClick={() =>
                                                        openReportDetails({
                                                            title:
                                                                `Pedidos ${formatLabel(item.estado)}`,
                                                            tipo: "PEDIDOS",
                                                            filtro:
                                                                item.estado
                                                        })
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
                                                            className={`admin-status-badge report-progress-value status status-${item.estado.toLowerCase()}`}
                                                            style={{
                                                                width:
                                                                    `${getStatusPercentage(
                                                                        item.cantidad,
                                                                        totalOrders
                                                                    )}%`
                                                            }}
                                                        />
                                                    </div>
                                                </button>
                                            )
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h4>
                                        Reservas
                                    </h4>

                                    <button
                                        type="button"
                                        className="report-status-total"
                                        onClick={() =>
                                            openReportDetails({
                                                title:
                                                    "Todas las reservas",
                                                tipo: "RESERVAS"
                                            })
                                        }
                                    >
                                        {
                                            totalReservations
                                        }
                                    </button>

                                    <div className="report-status-list">
                                        {report.estadosReservas.map(
                                            (
                                                item
                                            ) => (
                                                <button
                                                    type="button"
                                                    className="report-drilldown-trigger"
                                                    key={
                                                        item.estado
                                                    }
                                                    onClick={() =>
                                                        openReportDetails({
                                                            title:
                                                                `Reservas ${formatLabel(item.estado)}`,
                                                            tipo: "RESERVAS",
                                                            filtro:
                                                                item.estado
                                                        })
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
                                                            className={`admin-status-badge report-progress-value status status-${item.estado.toLowerCase()}`}
                                                            style={{
                                                                width:
                                                                    `${getStatusPercentage(
                                                                        item.cantidad,
                                                                        totalReservations
                                                                    )}%`
                                                            }}
                                                        />
                                                    </div>
                                                </button>
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
                                onClick={() =>
                                    openReportDetails({
                                        title:
                                            "Cajas abiertas",
                                        tipo: "CAJAS",
                                        filtro: "ABIERTA"
                                    })
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
                                onClick={() =>
                                    openReportDetails({
                                        title:
                                            "Cajas cerradas",
                                        tipo: "CAJAS",
                                        filtro: "CERRADA"
                                    })
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
                                onClick={() =>
                                    openReportDetails({
                                        title:
                                            "Diferencias de cajas cerradas",
                                        tipo: "CAJAS",
                                        filtro: "DIFERENCIA"
                                    })
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
                                onClick={() =>
                                    openReportDetails({
                                        title:
                                            "Ventas confirmadas",
                                        tipo: "VENTAS"
                                    })
                                }
                            />
                        </div>
                    </section>
                </>
            )}

            {detailConfig && (
                <ReportDetailsDialog
                    config={detailConfig}
                    data={detailData}
                    error={detailError}
                    isLoading={isLoadingDetails}
                    onClose={() =>
                        setDetailConfig(null)
                    }
                    onPageChange={(page) =>
                        void loadReportDetails(
                            detailConfig,
                            page
                        )
                    }
                />
            )}
        </section>
    );
}

export default ReportsAdmin;
