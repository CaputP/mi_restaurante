import {
    FaGift
} from "react-icons/fa";

import {
    formatDate,
    rewardValueText
} from "./loyalty.utils";

function ClientRewardsSection({
    rewards = [],
    total = rewards.length
}) {
    return (
        <section className="client-loyalty-section">
            <div className="client-loyalty-section-heading">
                <div>
                    <FaGift aria-hidden="true" />

                    <div>
                        <h3>Mis premios</h3>

                        <p>
                            Beneficios que ya puedes utilizar.
                        </p>
                    </div>
                </div>

                <span>
                    {total} disponible(s)
                </span>
            </div>

            {rewards.length === 0 ? (
                <div className="client-loyalty-empty">
                    <FaGift aria-hidden="true" />

                    <strong>
                        No tienes premios disponibles por ahora.
                    </strong>

                    <p>
                        Continúa acumulando visitas o consumo para
                        conseguir nuevos beneficios.
                    </p>
                </div>
            ) : (
                <div className="client-loyalty-rewards-grid">
                    {rewards.map((reward) => (
                        <article
                            key={reward.id}
                            className="client-loyalty-reward-card"
                        >
                            <div className="client-loyalty-reward-icon">
                                <FaGift aria-hidden="true" />
                            </div>

                            <div className="client-loyalty-reward-content">
                                <span className="available">
                                    Disponible
                                </span>

                                <h4>{reward.descripcion}</h4>

                                <strong>
                                    {rewardValueText(reward)}
                                </strong>

                                <p>{reward.programa.nombre}</p>

                                {reward.programa.sucursal && (
                                    <small>
                                        Válido en{" "}
                                        {
                                            reward.programa.sucursal
                                                .nombre
                                        }
                                    </small>
                                )}

                                <small>
                                    Vence el{" "}
                                    {formatDate(
                                        reward.fechaVencimiento
                                    )}
                                </small>
                            </div>
                        </article>
                    ))}

                    {total > rewards.length && (
                        <p className="client-loyalty-list-limit">
                            Se muestran los próximos {rewards.length} premios
                            por vencer de un total de {total}.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}

export default ClientRewardsSection;
