import {
    FaReceipt
} from "react-icons/fa";

import {
    formatMoney,
    numberValue
} from "./salesCash.utils";

function formatQuantity(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
        }
    ).format(
        numberValue(value)
    );
}

function OrderChargeSummary({
    order
}) {
    const details =
        Array.isArray(order?.detalles)
            ? order.detalles
            : [];

    return (
        <section
            className="charge-order-summary"
            aria-labelledby="charge-order-summary-title"
        >
            <div className="charge-order-summary-heading">
                <div>
                    <FaReceipt />

                    <div>
                        <h4 id="charge-order-summary-title">
                            Productos del pedido
                        </h4>

                        <p>
                            Revisa cantidades e importes antes de cobrar.
                        </p>
                    </div>
                </div>

                <span>
                    {details.length}{" "}
                    {details.length === 1
                        ? "producto"
                        : "productos"}
                </span>
            </div>

            {details.length === 0 ? (
                <div className="charge-order-summary-empty">
                    Este pedido no contiene productos para cobrar.
                </div>
            ) : (
                <div className="charge-order-products-table-wrapper">
                    <table className="charge-order-products-table">
                        <thead>
                            <tr>
                                <th>
                                    Producto
                                </th>

                                <th>
                                    Cantidad
                                </th>

                                <th>
                                    P. unitario
                                </th>

                                <th>
                                    Importe
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {details.map(
                                (
                                    detail,
                                    index
                                ) => (
                                    <tr
                                        key={
                                            detail.id ??
                                            `${detail.nombreProducto}-${index}`
                                        }
                                    >
                                        <td>
                                            <strong>
                                                {detail.nombreProducto}
                                            </strong>
                                        </td>

                                        <td>
                                            {formatQuantity(
                                                detail.cantidad
                                            )}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                detail.precioUnitario
                                            )}
                                        </td>

                                        <td>
                                            <strong>
                                                {formatMoney(
                                                    detail.subtotal
                                                )}
                                            </strong>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>

                        <tfoot>
                            <tr>
                                <th colSpan="3">
                                    Subtotal del pedido
                                </th>

                                <td>
                                    <strong>
                                        {formatMoney(
                                            order?.subtotal
                                        )}
                                    </strong>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </section>
    );
}

export default OrderChargeSummary;
