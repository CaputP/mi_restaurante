import {
    FaBoxOpen,
    FaCalendarAlt,
    FaChevronLeft,
    FaChevronRight,
    FaMoneyBillWave,
    FaStore,
    FaTimes,
    FaUser
} from "react-icons/fa";

import AdminDialog from "../../../components/adminDialog/AdminDialog";

function numberValue(value) {
    const result = Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}

function formatMoney(value) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
        minimumFractionDigits: 2
    }).format(numberValue(value));
}

function formatQuantity(value) {
    return new Intl.NumberFormat("es-PE", {
        maximumFractionDigits: 3
    }).format(numberValue(value));
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T12:00:00`
        : value;

    return new Date(normalizedValue).toLocaleString("es-PE", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function formatLabel(value) {
    return String(value ?? "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

const MONEY_FIELDS = new Set([
    "subtotal",
    "descuento",
    "propina",
    "adelantoAplicado",
    "saldoCobrar",
    "totalEstimado",
    "adelantoRequerido",
    "adelantoPagado",
    "montoInicial",
    "totalGastos",
    "efectivoEsperado",
    "efectivoContado",
    "diferencia"
]);

function formatDetailValue(key, value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    if (MONEY_FIELDS.has(key)) {
        return formatMoney(value);
    }

    if (typeof value === "boolean") {
        return value
            ? "Sí"
            : "No";
    }

    if (key.toLowerCase().includes("fecha")) {
        return formatDateTime(value);
    }

    if (["metodoPago", "origen"].includes(key)) {
        return formatLabel(value);
    }

    return String(value);
}

function ReportRecord({ record }) {
    const extraFields = Object.entries(record.datos ?? {});

    return (
        <details className="report-detail-record">
            <summary>
                <div>
                    <strong>{record.codigo}</strong>
                    <span>{record.descripcion}</span>
                </div>

                <div className="report-detail-record-total">
                    <strong>{formatMoney(record.importe)}</strong>
                    <span>Ver trazabilidad</span>
                </div>
            </summary>

            <div className="report-detail-record-body">
                <div className="report-detail-meta-grid">
                    <span>
                        <FaCalendarAlt />
                        <small>Fecha y hora</small>
                        <strong>{formatDateTime(record.fecha)}</strong>
                    </span>
                    <span>
                        <FaUser />
                        <small>Cliente</small>
                        <strong>{record.cliente || "-"}</strong>
                    </span>
                    <span>
                        <FaUser />
                        <small>Responsable</small>
                        <strong>{record.responsable || "-"}</strong>
                    </span>
                    <span>
                        <FaStore />
                        <small>Sucursal</small>
                        <strong>{record.sucursal || "-"}</strong>
                    </span>
                </div>

                <div className="report-detail-status-row">
                    <span>Estado</span>
                    <strong>{formatLabel(record.estado)}</strong>
                </div>

                {extraFields.length > 0 && (
                    <dl className="report-detail-data-list">
                        {extraFields.map(([key, value]) => (
                            <div key={key}>
                                <dt>{formatLabel(key)}</dt>
                                <dd>{formatDetailValue(key, value)}</dd>
                            </div>
                        ))}
                    </dl>
                )}

                {record.productos?.length > 0 && (
                    <section className="report-detail-section">
                        <h3>
                            <FaBoxOpen />
                            Productos
                        </h3>

                        <div className="report-detail-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>Precio</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {record.productos.map((product) => (
                                        <tr key={product.id}>
                                            <td>{product.nombre}</td>
                                            <td>{formatQuantity(product.cantidad)}</td>
                                            <td>{formatMoney(product.precioUnitario)}</td>
                                            <td>{formatMoney(product.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {record.pagos?.length > 0 && (
                    <section className="report-detail-section">
                        <h3>
                            <FaMoneyBillWave />
                            Pagos
                        </h3>

                        <div className="report-detail-payment-list">
                            {record.pagos.map((payment) => (
                                <article key={payment.id}>
                                    <div>
                                        <strong>{formatLabel(payment.metodoPago)}</strong>
                                        <small>
                                            {payment.numeroOperacion
                                                ? `Operación ${payment.numeroOperacion}`
                                                : "Sin número de operación"}
                                        </small>
                                    </div>
                                    <strong>{formatMoney(payment.monto)}</strong>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </details>
    );
}

function ReportDetailsDialog({
    config,
    data,
    error,
    isLoading,
    onClose,
    onPageChange
}) {
    const pagination = data?.pagination;

    return (
        <AdminDialog
            className="report-details-dialog"
            labelledBy="report-details-dialog-title"
            onClose={onClose}
        >
            <header className="report-details-dialog-header">
                <div>
                    <span>TRAZABILIDAD DEL REPORTE</span>
                    <h2 id="report-details-dialog-title">{config.title}</h2>
                    <p>
                        Qué ocurrió, cuándo, con quién y quién fue responsable.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar detalle del reporte"
                >
                    <FaTimes />
                </button>
            </header>

            <div className="report-details-dialog-body">
                {error && (
                    <div className="reports-feedback admin-feedback error" role="alert">
                        {error}
                    </div>
                )}

                {isLoading && (
                    <div className="reports-loading" role="status">
                        Cargando trazabilidad...
                    </div>
                )}

                {!isLoading && !error && data?.registros.length === 0 && (
                    <div className="reports-empty-state compact">
                        <FaBoxOpen />
                        <strong>No hay registros para este total</strong>
                        <span>Prueba con otro periodo o sucursal.</span>
                    </div>
                )}

                {!isLoading && data?.registros.length > 0 && (
                    <div className="report-detail-records">
                        {data.registros.map((record) => (
                            <ReportRecord key={`${data.tipo}-${record.id}`} record={record} />
                        ))}
                    </div>
                )}
            </div>

            {pagination && pagination.total > 0 && (
                <footer className="report-details-dialog-footer">
                    <span>
                        {pagination.total} registro(s) · Página {pagination.page} de {pagination.totalPages}
                    </span>

                    <div>
                        <button
                            type="button"
                            disabled={isLoading || pagination.page <= 1}
                            onClick={() => onPageChange(pagination.page - 1)}
                        >
                            <FaChevronLeft />
                            Anterior
                        </button>
                        <button
                            type="button"
                            disabled={isLoading || pagination.page >= pagination.totalPages}
                            onClick={() => onPageChange(pagination.page + 1)}
                        >
                            Siguiente
                            <FaChevronRight />
                        </button>
                    </div>
                </footer>
            )}
        </AdminDialog>
    );
}

export default ReportDetailsDialog;
