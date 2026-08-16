import {
    FaHistory,
    FaReceipt,
    FaTicketAlt
} from "react-icons/fa";

import {
    formatDateTime,
    formatLabel,
    formatMoney,
    numberValue
} from "./loyalty.utils";

function ClientRedemptionHistory({
    redemptions = []
}) {
    return (
        <section className="client-loyalty-section">
            <div className="client-loyalty-section-heading">
                <div>
                    <FaHistory aria-hidden="true" />

                    <div>
                        <h3>Historial de beneficios</h3>

                        <p>
                            Premios que utilizaste anteriormente.
                        </p>
                    </div>
                </div>

                <span>
                    {redemptions.length} movimiento(s)
                </span>
            </div>

            {redemptions.length === 0 ? (
                <div className="client-loyalty-empty">
                    <FaHistory aria-hidden="true" />

                    <strong>
                        Todavía no has canjeado premios.
                    </strong>
                </div>
            ) : (
                <div className="client-loyalty-history">
                    {redemptions.map((redemption) => (
                        <article key={redemption.id}>
                            <div className="client-loyalty-history-icon">
                                {redemption.estado === "APLICADO" ? (
                                    <FaReceipt aria-hidden="true" />
                                ) : (
                                    <FaHistory aria-hidden="true" />
                                )}
                            </div>

                            <div className="client-loyalty-history-main">
                                <div>
                                    <strong>
                                        {redemption.descripcion}
                                    </strong>

                                    <span
                                        className={
                                            redemption.estado ===
                                            "APLICADO"
                                                ? "applied"
                                                : "reverted"
                                        }
                                    >
                                        {formatLabel(
                                            redemption.estado
                                        )}
                                    </span>
                                </div>

                                <p>
                                    {redemption.programa.nombre}
                                </p>

                                <small>
                                    {formatDateTime(
                                        redemption.fechaCanje
                                    )}
                                </small>

                                {redemption.estado === "REVERTIDO" &&
                                    redemption.motivoReversion && (
                                    <small className="client-loyalty-reversion-reason">
                                        Motivo:{" "}
                                        {redemption.motivoReversion}
                                    </small>
                                )}
                            </div>

                            <div className="client-loyalty-history-sale">
                                <FaTicketAlt aria-hidden="true" />

                                <strong>
                                    {redemption.venta.numeroTicket}
                                </strong>

                                {numberValue(
                                    redemption.montoAplicado
                                ) > 0 ? (
                                    <span>
                                        -
                                        {formatMoney(
                                            redemption.montoAplicado
                                        )}
                                    </span>
                                ) : (
                                    <span>Beneficio</span>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export default ClientRedemptionHistory;
