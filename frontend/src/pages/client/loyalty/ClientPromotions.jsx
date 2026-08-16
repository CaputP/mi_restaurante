import {
    useEffect,
    useState
} from "react";
import {
    FaCalendarAlt,
    FaCheckCircle,
    FaInfoCircle,
    FaMapMarkerAlt,
    FaShoppingBasket,
    FaTags
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";
import {
    useRealtimeVersion
} from "../../../context/RealtimeContext";
import {
    listAvailablePromotionsRequest
} from "../../../services/promotions.service";

import ClientLoyaltyState from "./ClientLoyaltyState";
import ClientRefreshWarning from "./ClientRefreshWarning";
import {
    benefitScopeText,
    formatDateTime,
    formatMoney,
    formatRefreshTime,
    getErrorMessage,
    isAbortError,
    numberValue,
    promotionBenefitText,
    promotionProductsText
} from "./loyalty.utils";
import useVisibleCatalogRefresh from "./useVisibleCatalogRefresh";

function PromotionCard({
    promotion
}) {
    const hasMinimum =
        numberValue(
            promotion.consumoMinimo
        ) > 0;
    const isAutomatic =
        promotion.aplicacionAutomatica !== false;

    return (
        <article className="client-benefit-card promotion">
            <header className="client-benefit-card-header">
                <div className="client-benefit-icon promotion">
                    <FaTags aria-hidden="true" />
                </div>

                <div>
                    <span className="client-benefit-type">
                        Promoción vigente
                    </span>
                    <h3>{promotion.nombre}</h3>
                </div>
            </header>

            <div className="client-promotion-benefit">
                <span>Beneficio</span>
                <strong>
                    {promotionBenefitText(promotion)}
                </strong>
            </div>

            {promotion.descripcion && (
                <p className="client-benefit-description">
                    {promotion.descripcion}
                </p>
            )}

            <dl className="client-benefit-conditions">
                <div>
                    <dt>
                        <FaShoppingBasket aria-hidden="true" />
                        Productos
                    </dt>
                    <dd>
                        {promotionProductsText(
                            promotion.productos
                        )}
                    </dd>
                </div>

                <div>
                    <dt>
                        <FaCheckCircle aria-hidden="true" />
                        Consumo mínimo
                    </dt>
                    <dd>
                        {hasMinimum
                            ? formatMoney(
                                  promotion.consumoMinimo
                              )
                            : "Sin consumo mínimo"}
                    </dd>
                </div>

                <div>
                    <dt>
                        <FaMapMarkerAlt aria-hidden="true" />
                        Dónde aplica
                    </dt>
                    <dd>{benefitScopeText(promotion)}</dd>
                </div>

                <div>
                    <dt>
                        <FaCalendarAlt aria-hidden="true" />
                        Vigencia
                    </dt>
                    <dd>
                        {formatDateTime(
                            promotion.fechaInicio
                        )}
                        {" – "}
                        {formatDateTime(
                            promotion.fechaFin
                        )}
                        {" (hora Perú)"}
                    </dd>
                </div>
            </dl>

            <div className="client-promotion-notice">
                <FaInfoCircle aria-hidden="true" />
                <div>
                    <strong>
                        {isAutomatic
                            ? "Aplicación automática en caja"
                            : "Aplicación sujeta a validación en caja"}
                    </strong>
                    <p>
                        {isAutomatic
                            ? "Si el pedido cumple estas condiciones, el sistema aplicará la promoción al momento de cobrar. No necesitas ingresar ningún código."
                            : "El personal confirmará en caja si el pedido cumple todas las condiciones de la promoción."}
                    </p>
                </div>
            </div>

            <footer className="client-promotion-footer">
                <span>
                    {promotion.acumulable
                        ? "Acumulable con otras promociones compatibles"
                        : "No acumulable con otras promociones"}
                </span>

                {promotion.sujetaACupo && (
                    <strong>
                        Válida hasta agotar cupo
                    </strong>
                )}
            </footer>
        </article>
    );
}

function ClientPromotions() {
    const {
        token
    } = useAuth();
    const realtimeVersion =
        useRealtimeVersion([
            "PROMOTIONS"
        ]);
    const timedRefreshVersion =
        useVisibleCatalogRefresh();

    const [
        promotions,
        setPromotions
    ] = useState([]);
    const [
        total,
        setTotal
    ] = useState(0);
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

        async function loadPromotions() {
            setIsLoading(true);

            try {
                const result =
                    await listAvailablePromotionsRequest(
                        token,
                        controller.signal
                    );
                const availablePromotions =
                    Array.isArray(
                        result?.promociones
                    )
                        ? result.promociones
                        : null;

                if (!availablePromotions) {
                    throw new Error(
                        "Invalid promotions catalog response"
                    );
                }

                setPromotions(availablePromotions);
                setTotal(
                    result.total ??
                        availablePromotions.length
                );
                setLastUpdatedAt(new Date());
                setError("");
            } catch (requestError) {
                if (isAbortError(requestError)) {
                    return;
                }

                setError(
                    getErrorMessage(requestError) ??
                        "No se pudieron cargar las promociones vigentes."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadPromotions();

        return () => controller.abort();
    }, [
        token,
        reloadKey,
        realtimeVersion,
        timedRefreshVersion
    ]);

    return (
        <section
            className="client-benefits-view"
            aria-labelledby="client-promotions-title"
            aria-busy={isLoading}
        >
            <header className="client-benefits-view-heading">
                <div>
                    <span>AHORRA EN TU VISITA</span>
                    <h2 id="client-promotions-title">
                        Promociones vigentes
                    </h2>
                    <p>
                        Revisa el beneficio, los productos incluidos y
                        las condiciones antes de realizar tu pedido.
                    </p>
                </div>

                {!isLoading && !error && (
                    <strong>
                        {total} promoción(es) disponible(s)
                    </strong>
                )}
            </header>

            {error && promotions.length > 0 && (
                <ClientRefreshWarning
                    message={`No pudimos verificar cambios recientes. Estas promociones fueron verificadas a las ${formatRefreshTime(
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

            {isLoading && promotions.length === 0 ? (
                <ClientLoyaltyState
                    kind="loading"
                    title="Cargando promociones vigentes..."
                />
            ) : error && promotions.length === 0 ? (
                <ClientLoyaltyState
                    kind="error"
                    title="No pudimos cargar las promociones"
                    message={error}
                    onRetry={() =>
                        setReloadKey(
                            (previous) =>
                                previous + 1
                        )
                    }
                />
            ) : promotions.length === 0 ? (
                <ClientLoyaltyState
                    title="No hay promociones vigentes por ahora"
                    message="Cuando se active una promoción aparecerá aquí con todas sus condiciones."
                />
            ) : (
                <div className="client-benefits-grid">
                    {promotions.map((promotion) => (
                        <PromotionCard
                            key={promotion.id}
                            promotion={promotion}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

export default ClientPromotions;
