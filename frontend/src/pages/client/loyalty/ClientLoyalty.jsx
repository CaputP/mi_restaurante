import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaAward,
    FaCoins,
    FaGift,
    FaHistory,
    FaReceipt,
    FaStar,
    FaSyncAlt,
    FaTicketAlt
} from "react-icons/fa";

import SessionHeader from "../../../components/sessionHeader/SessionHeader";
import ClientNav from "../../../components/clientNav/ClientNav";

import {
    useAuth
} from "../../../context/AuthContext";

import {
    ApiError
} from "../../../services/api";

import {
    getMyLoyaltyProfileRequest
} from "../../../services/loyalty.service";

import "./clientLoyalty.css";

function isAbortError(error) {
    return (
        error?.name ===
        "AbortError"
    );
}

function getErrorMessage(error) {
    if (
        !(error instanceof ApiError)
    ) {
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

    return Number.isFinite(
        result
    )
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
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
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

function rewardValueText(
    reward
) {
    switch (
        reward.tipoRecompensa
    ) {
        case "PRODUCTO_GRATIS":
            return reward
                .productoPremio
                ?.nombre ??
                "Producto gratis";

        case "DESCUENTO_FIJO":
            return formatMoney(
                reward
                    .valorReferencia
            );

        case "DESCUENTO_PORCENTAJE":
            return `${numberValue(
                reward
                    .valorReferencia
            )}% de descuento`;

        case "BENEFICIO":
            return "Beneficio especial";

        default:
            return "Premio";
    }
}

function programRewardText(
    program
) {
    switch (
        program.tipoRecompensa
    ) {
        case "PRODUCTO_GRATIS":
            return program
                .productoPremio
                ?.nombre
                ? `${program.productoPremio.nombre} gratis`
                : "Producto gratis";

        case "DESCUENTO_FIJO":
            return program
                .montoDescuento
                ? `${formatMoney(
                      program
                          .montoDescuento
                  )} de descuento`
                : "Descuento";

        case "DESCUENTO_PORCENTAJE":
            return program
                .porcentajeDescuento
                ? `${program.porcentajeDescuento}% de descuento`
                : "Descuento porcentual";

        case "BENEFICIO":
            return (
                program
                    .descripcionBeneficio ??
                "Beneficio especial"
            );

        default:
            return "Premio";
    }
}

function ProgressBar({
    percentage
}) {
    const safePercentage =
        Math.max(
            0,
            Math.min(
                100,
                numberValue(
                    percentage
                )
            )
        );

    return (
        <div className="client-loyalty-progress-bar">
            <div
                style={{
                    width: `${safePercentage}%`
                }}
            />
        </div>
    );
}

function ClientLoyalty() {
    const {
        token
    } = useAuth();

    const [
        profile,
        setProfile
    ] = useState(null);

    const [
        isLoading,
        setIsLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState("");

    const [
        reloadKey,
        setReloadKey
    ] = useState(0);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadProfile() {
            setIsLoading(
                true
            );

            setError("");

            try {
                const result =
                    await getMyLoyaltyProfileRequest(
                        token,
                        controller
                            .signal
                    );

                setProfile(
                    result
                );
            } catch (
                requestError
            ) {
                if (
                    isAbortError(
                        requestError
                    )
                ) {
                    return;
                }

                setProfile(
                    null
                );

                setError(
                    getErrorMessage(
                        requestError
                    ) ??
                        "No se pudo cargar tu información de fidelización."
                );
            } finally {
                if (
                    !controller
                        .signal
                        .aborted
                ) {
                    setIsLoading(
                        false
                    );
                }
            }
        }

        void loadProfile();

        return () =>
            controller.abort();
    }, [
        token,
        reloadKey
    ]);

    const availableRewards =
        useMemo(
            () =>
                profile
                    ?.premiosDisponibles ??
                [],
            [
                profile
            ]
        );

    const redemptions =
        useMemo(
            () =>
                profile
                    ?.historialCanjes ??
                [],
            [
                profile
            ]
        );

    if (isLoading) {
        return (
            <div className="client-loyalty-page">
                <SessionHeader
                    title="Mi fidelización"
                />

                <ClientNav />

                <main className="client-loyalty-loading">
                    <FaGift />

                    <span>
                        Cargando tu fidelización...
                    </span>
                </main>
            </div>
        );
    }

    if (
        error ||
        !profile
    ) {
        return (
            <div className="client-loyalty-page">
                <SessionHeader
                    title="Mi fidelización"
                />

                <ClientNav />

                <main className="client-loyalty-error">
                    <FaGift />

                    <h2>
                        No pudimos cargar tus beneficios
                    </h2>

                    <p>
                        {error ||
                            "No existe información disponible."}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            setReloadKey(
                                (
                                    previous
                                ) =>
                                    previous +
                                    1
                            )
                        }
                    >
                        <FaSyncAlt />
                        Intentar nuevamente
                    </button>
                </main>
            </div>
        );
    }

    return (
        <div className="client-loyalty-page">
            <SessionHeader
                title="Mi fidelización"
            />

            <ClientNav />

            <main className="client-loyalty-content">
                <section className="client-loyalty-hero">
                    <div>
                        <span className="client-loyalty-eyebrow">
                            MI FIDELIZACIÓN
                        </span>

                        <h2>
                            Hola,{" "}
                            {
                                profile
                                    .cliente
                                    .nombres
                            }
                        </h2>

                        <p>
                            Aquí puedes revisar tu progreso,
                            premios disponibles y beneficios
                            que ya utilizaste.
                        </p>
                    </div>

                    <div className="client-loyalty-hero-icon">
                        <FaGift />
                    </div>
                </section>

                <section className="client-loyalty-stats">
                    <article>
                        <div className="client-loyalty-stat-icon">
                            <FaStar />
                        </div>

                        <div>
                            <span>
                                Visitas acumuladas
                            </span>

                            <strong>
                                {
                                    profile
                                        .resumen
                                        .visitasAcumuladas
                                }
                            </strong>
                        </div>
                    </article>

                    <article>
                        <div className="client-loyalty-stat-icon">
                            <FaCoins />
                        </div>

                        <div>
                            <span>
                                Consumo acumulado
                            </span>

                            <strong>
                                {formatMoney(
                                    profile
                                        .resumen
                                        .montoAcumulado
                                )}
                            </strong>
                        </div>
                    </article>

                    <article>
                        <div className="client-loyalty-stat-icon">
                            <FaGift />
                        </div>

                        <div>
                            <span>
                                Premios disponibles
                            </span>

                            <strong>
                                {
                                    profile
                                        .resumen
                                        .premiosDisponibles
                                }
                            </strong>
                        </div>
                    </article>

                    <article>
                        <div className="client-loyalty-stat-icon">
                            <FaAward />
                        </div>

                        <div>
                            <span>
                                Ahorro por premios
                            </span>

                            <strong>
                                {formatMoney(
                                    profile
                                        .resumen
                                        .ahorroPorPremios
                                )}
                            </strong>
                        </div>
                    </article>
                </section>

                <section className="client-loyalty-section">
                    <div className="client-loyalty-section-heading">
                        <div>
                            <FaStar />

                            <div>
                                <h3>
                                    Mi progreso
                                </h3>

                                <p>
                                    Avance en tus programas de fidelización.
                                </p>
                            </div>
                        </div>

                        <span>
                            {
                                profile
                                    .resumen
                                    .programas
                            }{" "}
                            programa(s)
                        </span>
                    </div>

                    {profile
                        .progresos
                        .length ===
                    0 ? (
                        <div className="client-loyalty-empty">
                            <FaStar />

                            <strong>
                                Todavía no tienes progreso registrado.
                            </strong>

                            <p>
                                Tus visitas y consumos comenzarán
                                a aparecer cuando realices compras
                                identificándote como cliente.
                            </p>
                        </div>
                    ) : (
                        <div className="client-loyalty-program-grid">
                            {profile
                                .progresos
                                .map(
                                    (
                                        progress
                                    ) => (
                                        <article
                                            key={
                                                progress.id
                                            }
                                            className="client-loyalty-program-card"
                                        >
                                            <header>
                                                <div>
                                                    <span>
                                                        {formatLabel(
                                                            progress
                                                                .programa
                                                                .tipo
                                                        )}
                                                    </span>

                                                    <h4>
                                                        {
                                                            progress
                                                                .programa
                                                                .nombre
                                                        }
                                                    </h4>
                                                </div>

                                                <strong>
                                                    {Math.round(
                                                        numberValue(
                                                            progress
                                                                .porcentaje
                                                        )
                                                    )}
                                                    %
                                                </strong>
                                            </header>

                                            {progress
                                                .programa
                                                .descripcion && (
                                                <p>
                                                    {
                                                        progress
                                                            .programa
                                                            .descripcion
                                                    }
                                                </p>
                                            )}

                                            <ProgressBar
                                                percentage={
                                                    progress
                                                        .porcentaje
                                                }
                                            />

                                            <div className="client-loyalty-program-progress">
                                                {progress
                                                    .programa
                                                    .visitasRequeridas !==
                                                    null && (
                                                    <div>
                                                        <span>
                                                            Visitas
                                                        </span>

                                                        <strong>
                                                            {
                                                                progress
                                                                    .visitasAcumuladas
                                                            }
                                                            {" / "}
                                                            {
                                                                progress
                                                                    .programa
                                                                    .visitasRequeridas
                                                            }
                                                        </strong>
                                                    </div>
                                                )}

                                                {progress
                                                    .programa
                                                    .montoRequerido !==
                                                    null && (
                                                    <div>
                                                        <span>
                                                            Consumo
                                                        </span>

                                                        <strong>
                                                            {formatMoney(
                                                                progress
                                                                    .montoAcumulado
                                                            )}
                                                            {" / "}
                                                            {formatMoney(
                                                                progress
                                                                    .programa
                                                                    .montoRequerido
                                                            )}
                                                        </strong>
                                                    </div>
                                                )}
                                            </div>

                                            <footer>
                                                <span>
                                                    Próximo premio
                                                </span>

                                                <strong>
                                                    {programRewardText(
                                                        progress
                                                            .programa
                                                    )}
                                                </strong>

                                                {progress
                                                    .programa
                                                    .sucursal && (
                                                    <small>
                                                        Válido en{" "}
                                                        {
                                                            progress
                                                                .programa
                                                                .sucursal
                                                                .nombre
                                                        }
                                                    </small>
                                                )}
                                            </footer>
                                        </article>
                                    )
                                )}
                        </div>
                    )}
                </section>

                <section className="client-loyalty-section">
                    <div className="client-loyalty-section-heading">
                        <div>
                            <FaGift />

                            <div>
                                <h3>
                                    Mis premios
                                </h3>

                                <p>
                                    Beneficios que ya puedes utilizar.
                                </p>
                            </div>
                        </div>

                        <span>
                            {
                                availableRewards
                                    .length
                            }{" "}
                            disponible(s)
                        </span>
                    </div>

                    {availableRewards
                        .length ===
                    0 ? (
                        <div className="client-loyalty-empty">
                            <FaGift />

                            <strong>
                                No tienes premios disponibles por ahora.
                            </strong>

                            <p>
                                Continúa acumulando visitas o consumo
                                para conseguir nuevos beneficios.
                            </p>
                        </div>
                    ) : (
                        <div className="client-loyalty-rewards-grid">
                            {availableRewards.map(
                                (
                                    reward
                                ) => (
                                    <article
                                        key={
                                            reward.id
                                        }
                                        className="client-loyalty-reward-card"
                                    >
                                        <div className="client-loyalty-reward-icon">
                                            <FaGift />
                                        </div>

                                        <div className="client-loyalty-reward-content">
                                            <span className="available">
                                                Disponible
                                            </span>

                                            <h4>
                                                {
                                                    reward.descripcion
                                                }
                                            </h4>

                                            <strong>
                                                {rewardValueText(
                                                    reward
                                                )}
                                            </strong>

                                            <p>
                                                {
                                                    reward
                                                        .programa
                                                        .nombre
                                                }
                                            </p>

                                            {reward
                                                .programa
                                                .sucursal && (
                                                <small>
                                                    Válido en{" "}
                                                    {
                                                        reward
                                                            .programa
                                                            .sucursal
                                                            .nombre
                                                    }
                                                </small>
                                            )}

                                            <small>
                                                Vence el{" "}
                                                {formatDate(
                                                    reward
                                                        .fechaVencimiento
                                                )}
                                            </small>
                                        </div>
                                    </article>
                                )
                            )}
                        </div>
                    )}
                </section>

                <section className="client-loyalty-section">
                    <div className="client-loyalty-section-heading">
                        <div>
                            <FaHistory />

                            <div>
                                <h3>
                                    Historial de beneficios
                                </h3>

                                <p>
                                    Premios que utilizaste anteriormente.
                                </p>
                            </div>
                        </div>

                        <span>
                            {
                                redemptions
                                    .length
                            }{" "}
                            movimiento(s)
                        </span>
                    </div>

                    {redemptions
                        .length ===
                    0 ? (
                        <div className="client-loyalty-empty">
                            <FaHistory />

                            <strong>
                                Todavía no has canjeado premios.
                            </strong>
                        </div>
                    ) : (
                        <div className="client-loyalty-history">
                            {redemptions.map(
                                (
                                    redemption
                                ) => (
                                    <article
                                        key={
                                            redemption.id
                                        }
                                    >
                                        <div className="client-loyalty-history-icon">
                                            {redemption.estado ===
                                            "APLICADO" ? (
                                                <FaReceipt />
                                            ) : (
                                                <FaHistory />
                                            )}
                                        </div>

                                        <div className="client-loyalty-history-main">
                                            <div>
                                                <strong>
                                                    {
                                                        redemption
                                                            .descripcion
                                                    }
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
                                                        redemption
                                                            .estado
                                                    )}
                                                </span>
                                            </div>

                                            <p>
                                                {
                                                    redemption
                                                        .programa
                                                        .nombre
                                                }
                                            </p>

                                            <small>
                                                {formatDateTime(
                                                    redemption
                                                        .fechaCanje
                                                )}
                                            </small>

                                            {redemption.estado ===
                                                "REVERTIDO" &&
                                                redemption
                                                    .motivoReversion && (
                                                    <small className="client-loyalty-reversion-reason">
                                                        Motivo:{" "}
                                                        {
                                                            redemption
                                                                .motivoReversion
                                                        }
                                                    </small>
                                                )}
                                        </div>

                                        <div className="client-loyalty-history-sale">
                                            <FaTicketAlt />

                                            <strong>
                                                {
                                                    redemption
                                                        .venta
                                                        .numeroTicket
                                                }
                                            </strong>

                                            {numberValue(
                                                redemption
                                                    .montoAplicado
                                            ) > 0 ? (
                                                <span>
                                                    -
                                                    {formatMoney(
                                                        redemption
                                                            .montoAplicado
                                                    )}
                                                </span>
                                            ) : (
                                                <span>
                                                    Beneficio
                                                </span>
                                            )}
                                        </div>
                                    </article>
                                )
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default ClientLoyalty;