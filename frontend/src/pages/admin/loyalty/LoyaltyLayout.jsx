import {
    useState
} from "react";

import {
    FaGift,
    FaUsers
} from "react-icons/fa";

import {
    NavLink,
    Outlet
} from "react-router-dom";

import "./loyaltyLayout.css";

const LOYALTY_SECTIONS = [
    {
        label: "Programas",
        path: "/admin/fidelizacion",
        icon: FaGift
    },
    {
        label: "Clientes y premios",
        path: "/admin/fidelizacion/clientes",
        icon: FaUsers
    }
];

function LoyaltyLayout() {
    const [
        headerActions,
        setHeaderActions
    ] = useState([]);

    return (
        <section className="loyalty-module-layout admin-page">

            {/* CARD PRINCIPAL */}
            <header className="loyalty-layout-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        FIDELIZACIÓN
                    </span>

                    <h2>
                        Programas y clientes
                    </h2>

                    <p>
                        Administra programas de fidelización,
                        progreso de clientes, recompensas
                        y premios disponibles.
                    </p>
                </div>

                {/* BOTONES DE LA PESTAÑA ACTIVA */}
                {headerActions.length > 0 && (
                    <div className="loyalty-layout-actions">
                        {headerActions.map(
                            (action) => {
                                const Icon =
                                    action.icon;

                                return (
                                    <button
                                        key={action.key}
                                        type="button"
                                        className={
                                            action.variant
                                        }
                                        disabled={
                                            action.disabled
                                        }
                                        onClick={
                                            action.onClick
                                        }
                                    >
                                        {Icon && (
                                            <Icon />
                                        )}

                                        <span>
                                            {action.label}
                                        </span>
                                    </button>
                                );
                            }
                        )}
                    </div>
                )}
            </header>

            {/* PESTAÑAS */}
            <nav
                className="loyalty-module-nav admin-tabs"
                role="tablist"
                aria-label="Secciones de fidelización"
            >
                {LOYALTY_SECTIONS.map(
                    (section) => {
                        const Icon =
                            section.icon;

                        return (
                            <NavLink
                                key={
                                    section.path
                                }
                                to={
                                    section.path
                                }
                                end
                                role="tab"
                                className={({
                                    isActive
                                }) =>
                                    `loyalty-module-link admin-tab${
                                        isActive
                                            ? " active"
                                            : ""
                                    }`
                                }
                            >
                                <Icon />

                                <span>
                                    {
                                        section.label
                                    }
                                </span>
                            </NavLink>
                        );
                    }
                )}
            </nav>

            {/* CONTENIDO */}
            <div className="loyalty-module-content">
                <Outlet
                    context={{
                        setHeaderActions
                    }}
                />
            </div>

        </section>
    );
}

export default LoyaltyLayout;