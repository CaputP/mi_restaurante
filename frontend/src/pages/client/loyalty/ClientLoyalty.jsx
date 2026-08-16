import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    FaAward,
    FaCoins,
    FaGift,
    FaStar
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";
import {
    useRealtimeVersion
} from "../../../context/RealtimeContext";
import {
    getMyLoyaltyProfileRequest
} from "../../../services/loyalty.service";

import ClientLoyaltyState from "./ClientLoyaltyState";
import ClientProgressSection from "./ClientProgressSection";
import ClientRefreshWarning from "./ClientRefreshWarning";
import ClientRedemptionHistory from "./ClientRedemptionHistory";
import ClientRewardsSection from "./ClientRewardsSection";
import {
    formatMoney,
    formatRefreshTime,
    getErrorMessage,
    isAbortError
} from "./loyalty.utils";
import useVisibleCatalogRefresh from "./useVisibleCatalogRefresh";

function ClientLoyalty() {
    const {
        token
    } = useAuth();

    const realtimeVersion =
        useRealtimeVersion([
            "LOYALTY"
        ]);
    const timedRefreshVersion =
        useVisibleCatalogRefresh();

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
    const [
        lastUpdatedAt,
        setLastUpdatedAt
    ] = useState(null);

    useEffect(() => {
        const controller =
            new AbortController();

        async function loadProfile() {
            setIsLoading(true);

            try {
                const result =
                    await getMyLoyaltyProfileRequest(
                        token,
                        controller.signal
                    );

                if (
                    !result ||
                    typeof result !== "object" ||
                    !result.resumen
                ) {
                    throw new Error(
                        "Invalid loyalty profile response"
                    );
                }

                setProfile(result);
                setLastUpdatedAt(new Date());
                setError("");
            } catch (requestError) {
                if (isAbortError(requestError)) {
                    return;
                }

                setError(
                    getErrorMessage(requestError) ??
                        "No se pudo cargar tu información de fidelización."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadProfile();

        return () => controller.abort();
    }, [
        token,
        reloadKey,
        realtimeVersion,
        timedRefreshVersion
    ]);

    const availableRewards =
        useMemo(
            () =>
                profile?.premiosDisponibles ?? [],
            [profile]
        );
    const redemptions =
        useMemo(
            () =>
                profile?.historialCanjes ?? [],
            [profile]
        );

    if (isLoading && !profile) {
        return (
            <ClientLoyaltyState
                kind="loading"
                title="Cargando tu fidelización..."
            />
        );
    }

    if ((error && !profile) || !profile) {
        return (
            <ClientLoyaltyState
                kind="error"
                title="No pudimos cargar tus beneficios"
                message={
                    error ||
                    "No existe información disponible."
                }
                onRetry={() =>
                    setReloadKey(
                        (previous) =>
                            previous + 1
                    )
                }
            />
        );
    }

    return (
        <div
            className="client-loyalty-overview"
            aria-busy={isLoading}
        >
            {error && profile && (
                <ClientRefreshWarning
                    message={`No pudimos actualizar tus datos. Se conserva la información verificada a las ${formatRefreshTime(
                        lastUpdatedAt
                    )}.`}
                    isRefreshing={isLoading}
                    onRetry={() =>
                        setReloadKey(
                            (previous) =>
                                previous + 1
                        )
                    }
                />
            )}

            <section
                className="client-loyalty-stats"
                aria-label="Resumen de fidelización"
            >
                <article>
                    <div className="client-loyalty-stat-icon">
                        <FaStar aria-hidden="true" />
                    </div>

                    <div>
                        <span>Visitas acumuladas</span>
                        <strong>
                            {profile.resumen.visitasAcumuladas}
                        </strong>
                    </div>
                </article>

                <article>
                    <div className="client-loyalty-stat-icon">
                        <FaCoins aria-hidden="true" />
                    </div>

                    <div>
                        <span>Consumo acumulado</span>
                        <strong>
                            {formatMoney(
                                profile.resumen.montoAcumulado
                            )}
                        </strong>
                    </div>
                </article>

                <article>
                    <div className="client-loyalty-stat-icon">
                        <FaGift aria-hidden="true" />
                    </div>

                    <div>
                        <span>Premios disponibles</span>
                        <strong>
                            {profile.resumen.premiosDisponibles}
                        </strong>
                    </div>
                </article>

                <article>
                    <div className="client-loyalty-stat-icon">
                        <FaAward aria-hidden="true" />
                    </div>

                    <div>
                        <span>Ahorro por premios</span>
                        <strong>
                            {formatMoney(
                                profile.resumen.ahorroPorPremios
                            )}
                        </strong>
                    </div>
                </article>
            </section>

            <ClientProgressSection
                progresses={profile.progresos}
            />
            <ClientRewardsSection
                rewards={availableRewards}
                total={profile.resumen.premiosDisponibles}
            />
            <ClientRedemptionHistory
                redemptions={redemptions}
            />
        </div>
    );
}

export default ClientLoyalty;
