import {
    FaExclamationTriangle,
    FaSyncAlt
} from "react-icons/fa";

function ClientRefreshWarning({
    message,
    onRetry,
    isRefreshing = false
}) {
    return (
        <div
            className="client-refresh-warning"
            role="status"
            aria-live="polite"
        >
            <FaExclamationTriangle aria-hidden="true" />

            <p>{message}</p>

            <button
                type="button"
                onClick={onRetry}
                disabled={isRefreshing}
            >
                <FaSyncAlt aria-hidden="true" />
                {isRefreshing
                    ? "Actualizando…"
                    : "Actualizar"}
            </button>
        </div>
    );
}

export default ClientRefreshWarning;
