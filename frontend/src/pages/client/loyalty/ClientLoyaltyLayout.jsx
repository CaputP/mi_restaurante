import {
    Suspense,
    useEffect
} from "react";
import {
    FaChartLine,
    FaGift,
    FaTags
} from "react-icons/fa";
import {
    NavLink,
    Outlet,
    useLocation
} from "react-router-dom";

import ClientNav from "../../../components/clientNav/ClientNav";
import SessionHeader from "../../../components/sessionHeader/SessionHeader";
import {
    useAuth
} from "../../../context/AuthContext";

import "./clientLoyalty.css";

const SECTIONS = [
    {
        label: "Mi progreso",
        path: "/fidelizacion",
        icon: FaChartLine,
        end: true
    },
    {
        label: "Programas vigentes",
        path: "/fidelizacion/programas",
        icon: FaGift
    },
    {
        label: "Promociones vigentes",
        path: "/fidelizacion/promociones",
        icon: FaTags
    }
];

function ClientLoyaltyLayout() {
    const {
        usuario
    } = useAuth();
    const location = useLocation();
    const activeSection =
        SECTIONS.find(
            (section) =>
                section.end
                    ? location.pathname === section.path
                    : location.pathname.startsWith(
                          section.path
                      )
        ) ?? SECTIONS[0];

    useEffect(() => {
        document.title = `${activeSection.label} | El Vallecito de Chocco`;
    }, [activeSection.label]);

    return (
        <div className="client-loyalty-page">
            <SessionHeader title="Mi fidelización" />

            <ClientNav />

            <main className="client-loyalty-content">
                <section className="client-loyalty-hero">
                    <div>
                        <span className="client-loyalty-eyebrow">
                            BENEFICIOS PARA TI
                        </span>

                        <h2>
                            Hola, {usuario?.nombres ?? "cliente"}
                        </h2>

                        <p>
                            Revisa tu progreso y descubre los programas
                            de fidelización y promociones que están
                            disponibles actualmente.
                        </p>
                    </div>

                    <div className="client-loyalty-hero-icon">
                        <FaGift aria-hidden="true" />
                    </div>
                </section>

                <nav
                    className="client-loyalty-tabs"
                    aria-label="Secciones de fidelización"
                >
                    {SECTIONS.map((section) => {
                        const Icon = section.icon;

                        return (
                            <NavLink
                                key={section.path}
                                to={section.path}
                                end={section.end}
                                className={({
                                    isActive
                                }) =>
                                    `client-loyalty-tab${
                                        isActive
                                            ? " active"
                                            : ""
                                    }`
                                }
                            >
                                <Icon aria-hidden="true" />
                                <span>{section.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <p
                    className="client-loyalty-route-announcer"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    Sección: {activeSection.label}
                </p>

                <Suspense
                    fallback={
                        <div
                            className="client-loyalty-inline-loader"
                            role="status"
                            aria-live="polite"
                        >
                            Cargando sección…
                        </div>
                    }
                >
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
}

export default ClientLoyaltyLayout;
