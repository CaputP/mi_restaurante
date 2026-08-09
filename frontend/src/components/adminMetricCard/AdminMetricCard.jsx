import "./adminMetricCard.css";

function AdminMetricCard({
    icon: Icon,
    label,
    value,
    detail,
    tone = "brand",
    isLoading = false
}) {
    return (
        <article
            className={`admin-metric-card admin-metric-card--${tone}`}
            aria-busy={isLoading}
        >
            <span
                className="admin-metric-card__icon"
                aria-hidden="true"
            >
                <Icon />
            </span>

            <div className="admin-metric-card__content">
                <span className="admin-metric-card__label">
                    {label}
                </span>

                <strong className="admin-metric-card__value">
                    {isLoading ? "—" : value}
                </strong>

                {detail && (
                    <small className="admin-metric-card__detail">
                        {detail}
                    </small>
                )}
            </div>
        </article>
    );
}

export default AdminMetricCard;
