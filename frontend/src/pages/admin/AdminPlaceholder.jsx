import "./admin.css";

function AdminPlaceholder({
    title,
    description
}) {
    return (
        <section className="admin-placeholder">
            <h2>{title}</h2>

            <p>
                {description}
            </p>
        </section>
    );
}

export default AdminPlaceholder;