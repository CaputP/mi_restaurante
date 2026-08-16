import {
    useEffect,
    useState
} from "react";
import {
    FaCalendarAlt,
    FaClock,
    FaGift,
    FaMapMarkerAlt,
    FaStar,
    FaTrophy
} from "react-icons/fa";

import {
    useAuth
} from "../../../context/AuthContext";
import {
    useRealtimeVersion
} from "../../../context/RealtimeContext";
import {
    listAvailableLoyaltyProgramsRequest
} from "../../../services/loyalty.service";

import ClientLoyaltyState from "./ClientLoyaltyState";
import ClientRefreshWarning from "./ClientRefreshWarning";
import LoyaltyProgressBar from "./LoyaltyProgressBar";
import {
    benefitScopeText,
    formatDate,
    formatMoney,
    formatRefreshTime,
    getErrorMessage,
    isAbortError,
    numberValue,
    programRequirementText,
    programRewardText
} from "./loyalty.utils";
import useVisibleCatalogRefresh from "./useVisibleCatalogRefresh";

function ProgramProgress({
    program
}) {
    const progress = program.progreso ?? {
        iniciado: false,
        visitasAcumuladas: 0,
        montoAcumulado: 0,
        ciclosCompletados: 0,
        porcentaje: 0
    };

    return (
        <div className="client-program-progress">
            <div className="client-program-progress-heading">
                <div>
                    <span>Tu progreso</span>
                    <strong>
                        {progress.iniciado
                            ? `${Math.round(
                                  numberValue(
                                      progress.porcentaje
                                  )
                              )}% completado`
                            : "Aún no iniciado"}
                    </strong>
                </div>

                {progress.ciclosCompletados > 0 && (
                    <span className="client-program-cycles">
                        {progress.ciclosCompletados} premio(s)
                        conseguido(s)
                    </span>
                )}
            </div>

            <LoyaltyProgressBar
                percentage={progress.porcentaje}
                label={`Progreso en ${program.nombre}`}
            />

            <div className="client-program-progress-values">
                {program.visitasRequeridas !== null && (
                    <span>
                        {progress.visitasCicloActual ??
                            progress.visitasAcumuladas ??
                            0}
                        {" / "}
                        {program.visitasRequeridas} visitas
                    </span>
                )}

                {program.montoRequerido !== null && (
                    <span>
                        {formatMoney(
                            progress.montoCicloActual ??
                                progress.montoAcumulado
                        )}
                        {" / "}
                        {formatMoney(
                            program.montoRequerido
                        )}
                    </span>
                )}
            </div>

            {!progress.iniciado && (
                <p>
                    Identifícate como cliente en tu próxima compra
                    para comenzar a acumular.
                </p>
            )}
        </div>
    );
}

function ProgramCard({
    program
}) {
    return (
        <article className="client-benefit-card program">
            <header className="client-benefit-card-header">
                <div className="client-benefit-icon program">
                    <FaGift aria-hidden="true" />
                </div>

                <div>
                    <span className="client-benefit-type">
                        Programa de fidelización
                    </span>
                    <h3>{program.nombre}</h3>
                </div>
            </header>

            {program.descripcion && (
                <p className="client-benefit-description">
                    {program.descripcion}
                </p>
            )}

            <dl className="client-benefit-conditions">
                <div>
                    <dt>
                        <FaStar aria-hidden="true" />
                        Requisito
                    </dt>
                    <dd>
                        {programRequirementText(program)}
                    </dd>
                </div>

                <div>
                    <dt>
                        <FaTrophy aria-hidden="true" />
                        Premio
                    </dt>
                    <dd>{programRewardText(program)}</dd>
                </div>

                <div>
                    <dt>
                        <FaMapMarkerAlt aria-hidden="true" />
                        Dónde aplica
                    </dt>
                    <dd>{benefitScopeText(program)}</dd>
                </div>

                <div>
                    <dt>
                        <FaCalendarAlt aria-hidden="true" />
                        Vigencia
                    </dt>
                    <dd>
                        Desde {formatDate(program.fechaInicio)}
                        {program.fechaFin
                            ? ` hasta ${formatDate(
                                  program.fechaFin
                              )}`
                            : ", sin fecha de finalización"}
                    </dd>
                </div>

                {numberValue(
                    program.vigenciaDiasPremio
                ) > 0 && (
                    <div>
                        <dt>
                            <FaClock aria-hidden="true" />
                            Vigencia del premio
                        </dt>
                        <dd>
                            {numberValue(
                                program.vigenciaDiasPremio
                            )} día(s) desde que lo obtienes
                        </dd>
                    </div>
                )}
            </dl>

            <ProgramProgress program={program} />
        </article>
    );
}

function ClientLoyaltyPrograms() {
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
        programs,
        setPrograms
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

        async function loadPrograms() {
            setIsLoading(true);

            try {
                const result =
                    await listAvailableLoyaltyProgramsRequest(
                        token,
                        controller.signal
                    );
                const availablePrograms =
                    Array.isArray(
                        result?.programas
                    )
                        ? result.programas
                        : null;

                if (!availablePrograms) {
                    throw new Error(
                        "Invalid loyalty catalog response"
                    );
                }

                setPrograms(availablePrograms);
                setTotal(
                    result.total ??
                        availablePrograms.length
                );
                setLastUpdatedAt(new Date());
                setError("");
            } catch (requestError) {
                if (isAbortError(requestError)) {
                    return;
                }

                setError(
                    getErrorMessage(requestError) ??
                        "No se pudieron cargar los programas vigentes."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadPrograms();

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
            aria-labelledby="client-programs-title"
            aria-busy={isLoading}
        >
            <header className="client-benefits-view-heading">
                <div>
                    <span>ACUMULA Y GANA</span>
                    <h2 id="client-programs-title">
                        Programas vigentes
                    </h2>
                    <p>
                        Conoce desde el inicio qué debes acumular y
                        qué premio recibirás al completar cada meta.
                    </p>
                </div>

                {!isLoading && !error && (
                    <strong>
                        {total} programa(s) disponible(s)
                    </strong>
                )}
            </header>

            {error && programs.length > 0 && (
                <ClientRefreshWarning
                    message={`No pudimos verificar cambios recientes. Estos programas fueron verificados a las ${formatRefreshTime(
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

            {isLoading && programs.length === 0 ? (
                <ClientLoyaltyState
                    kind="loading"
                    title="Cargando programas vigentes..."
                />
            ) : error && programs.length === 0 ? (
                <ClientLoyaltyState
                    kind="error"
                    title="No pudimos cargar los programas"
                    message={error}
                    onRetry={() =>
                        setReloadKey(
                            (previous) =>
                                previous + 1
                        )
                    }
                />
            ) : programs.length === 0 ? (
                <ClientLoyaltyState
                    title="No hay programas vigentes por ahora"
                    message="Cuando se active un nuevo programa aparecerá aquí con sus requisitos y premios."
                />
            ) : (
                <div className="client-benefits-grid">
                    {programs.map((program) => (
                        <ProgramCard
                            key={program.id}
                            program={program}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

export default ClientLoyaltyPrograms;
