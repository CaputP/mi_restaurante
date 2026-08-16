import {
    numberValue
} from "./loyalty.utils";

function LoyaltyProgressBar({
    percentage,
    label = "Progreso del programa"
}) {
    const safePercentage = Math.max(
        0,
        Math.min(
            100,
            numberValue(percentage)
        )
    );

    return (
        <div
            className="client-loyalty-progress-bar"
            role="progressbar"
            aria-label={label}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.round(
                safePercentage
            )}
        >
            <div
                style={{
                    width: `${safePercentage}%`
                }}
            />
        </div>
    );
}

export default LoyaltyProgressBar;

