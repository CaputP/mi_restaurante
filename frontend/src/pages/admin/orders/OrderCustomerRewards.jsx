import {
    FaGift
} from "react-icons/fa";

function formatDate(value) {
    return new Date(value).toLocaleDateString(
        "es-PE",
        {
            dateStyle: "medium"
        }
    );
}

function formatNumber(value) {
    return new Intl.NumberFormat(
        "es-PE",
        {
            maximumFractionDigits: 3
        }
    ).format(Number(value ?? 0));
}

function getRewardValue(reward) {
    switch (reward.tipoRecompensa) {
        case "PRODUCTO_GRATIS":
            return `${formatNumber(
                reward.cantidadProducto ?? 1
            )} × ${
                reward.productoPremio?.nombre ??
                "producto gratis"
            }`;
        case "DESCUENTO_FIJO":
            return `S/ ${Number(
                reward.valorReferencia ?? 0
            ).toFixed(2)} de descuento`;
        case "DESCUENTO_PORCENTAJE":
            return `${formatNumber(
                reward.valorReferencia
            )}% de descuento`;
        default:
            return "Beneficio especial";
    }
}

function OrderCustomerRewards({
    customer,
    error,
    isLoading,
    rewards,
    selectedProductIds
}) {
    return (
        <section className="order-customer-rewards">
            <header>
                <div>
                    <FaGift />
                    <div>
                        <h3>
                            Premios de fidelización
                        </h3>
                        <p>
                            Beneficios vigentes del cliente. El canje se confirmará en caja.
                        </p>
                    </div>
                </div>

                {customer && (
                    <strong>
                        {customer.nombreCompleto}
                    </strong>
                )}
            </header>

            {isLoading ? (
                <div className="order-reward-message">
                    Consultando premios disponibles...
                </div>
            ) : error ? (
                <div className="order-reward-message error">
                    {error}
                </div>
            ) : rewards.length === 0 ? (
                <div className="order-reward-message">
                    Este cliente no tiene premios disponibles para esta sucursal.
                </div>
            ) : (
                <div className="order-reward-list">
                    {rewards.map((reward) => {
                        const requiresProduct =
                            reward.tipoRecompensa ===
                                "PRODUCTO_GRATIS" &&
                            reward.productoPremio;
                        const productIncluded =
                            !requiresProduct ||
                            selectedProductIds.has(
                                reward.productoPremio.id
                            );

                        return (
                            <article
                                key={reward.id}
                                className={
                                    productIncluded
                                        ? "applicable"
                                        : "requires-product"
                                }
                            >
                                <div>
                                    <strong>
                                        {reward.descripcion}
                                    </strong>
                                    <span>
                                        {reward.programa.nombre}
                                    </span>
                                    <small>
                                        Vence {formatDate(
                                            reward.fechaVencimiento
                                        )}
                                    </small>
                                </div>

                                <div className="order-reward-value">
                                    <strong>
                                        {getRewardValue(
                                            reward
                                        )}
                                    </strong>
                                    <small>
                                        {productIncluded
                                            ? "Disponible para aplicar en caja"
                                            : `Añade ${reward.productoPremio.nombre} al pedido para aplicarlo`}
                                    </small>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default OrderCustomerRewards;
