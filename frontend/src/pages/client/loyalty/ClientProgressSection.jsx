import {
    FaStar
} from "react-icons/fa";

import LoyaltyProgressBar from "./LoyaltyProgressBar";
import {
    formatLabel,
    formatMoney,
    numberValue,
    programRewardText
} from "./loyalty.utils";

function ClientProgressSection({
    progresses = []
}) {
    return (
        <section className="client-loyalty-section">
            <div className="client-loyalty-section-heading">
                <div>
                    <FaStar aria-hidden="true" />

                    <div>
                        <h3>Mi progreso</h3>

                        <p>
                            Avance en tus programas de fidelización.
                        </p>
                    </div>
                </div>

                <span>
                    {progresses.length} programa(s)
                </span>
            </div>

            {progresses.length === 0 ? (
                <div className="client-loyalty-empty">
                    <FaStar aria-hidden="true" />

                    <strong>
                        Todavía no tienes progreso registrado.
                    </strong>

                    <p>
                        Consulta la pestaña Programas para conocer
                        todos los beneficios vigentes. Tu avance
                        comenzará al realizar compras identificándote
                        como cliente.
                    </p>
                </div>
            ) : (
                <div className="client-loyalty-program-grid">
                    {progresses.map((progress) => (
                        <article
                            key={progress.id}
                            className="client-loyalty-program-card"
                        >
                            <header>
                                <div>
                                    <span>
                                        {formatLabel(
                                            progress.programa.tipo
                                        )}
                                    </span>

                                    <h4>
                                        {progress.programa.nombre}
                                    </h4>
                                </div>

                                <strong>
                                    {Math.round(
                                        numberValue(
                                            progress.porcentaje
                                        )
                                    )}%
                                </strong>
                            </header>

                            {progress.programa.descripcion && (
                                <p>
                                    {progress.programa.descripcion}
                                </p>
                            )}

                            <LoyaltyProgressBar
                                percentage={progress.porcentaje}
                                label={`Progreso en ${progress.programa.nombre}`}
                            />

                            <div className="client-loyalty-program-progress">
                                {progress.programa.visitasRequeridas !==
                                    null && (
                                    <div>
                                        <span>Visitas</span>

                                        <strong>
                                            {progress.visitasCicloActual ??
                                                progress.visitasAcumuladas}
                                            {" / "}
                                            {
                                                progress.programa
                                                    .visitasRequeridas
                                            }
                                        </strong>
                                    </div>
                                )}

                                {progress.programa.montoRequerido !==
                                    null && (
                                    <div>
                                        <span>Consumo</span>

                                        <strong>
                                            {formatMoney(
                                                progress.montoCicloActual ??
                                                    progress.montoAcumulado
                                            )}
                                            {" / "}
                                            {formatMoney(
                                                progress.programa
                                                    .montoRequerido
                                            )}
                                        </strong>
                                    </div>
                                )}
                            </div>

                            <footer>
                                <span>Próximo premio</span>

                                <strong>
                                    {programRewardText(
                                        progress.programa
                                    )}
                                </strong>

                                {progress.programa.sucursal && (
                                    <small>
                                        Válido en{" "}
                                        {
                                            progress.programa.sucursal
                                                .nombre
                                        }
                                    </small>
                                )}
                            </footer>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export default ClientProgressSection;
