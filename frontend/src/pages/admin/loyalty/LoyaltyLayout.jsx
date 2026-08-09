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
        description: "Reglas y recompensas",
        path: "/admin/fidelizacion",
        icon: FaGift
    },
    {
        label: "Clientes y premios",
        description: "Progreso y beneficios",
        path: "/admin/fidelizacion/clientes",
        icon: FaUsers
    }
];

function LoyaltyLayout() {
    return (
        <div className="loyalty-module-layout">
            <nav
                className="loyalty-module-nav admin-tabs"
                aria-label="Secciones de fidelización"
            >
                {LOYALTY_SECTIONS.map(
                    (section) => {
                        const Icon =
                            section.icon;

                        return (
                            <NavLink
                                key={section.path}
                                to={section.path}
                                end
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
                                <span className="loyalty-module-link-icon">
                                    <Icon />
                                </span>

                                <span className="loyalty-module-link-copy">
                                    <strong>
                                        {section.label}
                                    </strong>

                                    <small>
                                        {section.description}
                                    </small>
                                </span>
                            </NavLink>
                        );
                    }
                )}
            </nav>

            <Outlet />
        </div>
    );
}

export default LoyaltyLayout;
