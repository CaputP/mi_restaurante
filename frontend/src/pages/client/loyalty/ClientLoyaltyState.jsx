import {
    FaGift,
    FaSyncAlt
} from "react-icons/fa";

function ClientLoyaltyState({
    kind = "empty",
    title,
    message,
    onRetry
}) {
    return (
        <div
            className={`client-loyalty-state ${kind}`}
            role={
                kind === "error"
                    ? "alert"
                    : "status"
            }
        >
            <FaGift aria-hidden="true" />

            {title && <strong>{title}</strong>}

            {message && <p>{message}</p>}

            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                >
                    <FaSyncAlt aria-hidden="true" />
                    Intentar nuevamente
                </button>
            )}
        </div>
    );
}

export default ClientLoyaltyState;
