import {
    useState
} from "react";

import {
    Outlet
} from "react-router-dom";

import OperationalSidebar from "../components/operationalSidebar/OperationalSidebar";
import SessionHeader from "../components/sessionHeader/SessionHeader";

import {
    useAuth
} from "../context/AuthContext";

import {
    getRoleDisplayName
} from "../utils/roleRoutes";

import "./operationalLayout.css";

function OperationalLayout() {
    const [
        sidebarOpen,
        setSidebarOpen
    ] = useState(false);

    const {
        usuario
    } = useAuth();

    const roleCode =
        usuario?.rol?.codigo;

    function openSidebar() {
        setSidebarOpen(true);
    }

    function closeSidebar() {
        setSidebarOpen(false);
    }

    return (
        <div className="operational-layout">
            <OperationalSidebar
                isOpen={
                    sidebarOpen
                }
                onClose={
                    closeSidebar
                }
            />

            {sidebarOpen && (
                <button
                    type="button"
                    className="operational-sidebar-overlay"
                    aria-label="Cerrar menú"
                    onClick={
                        closeSidebar
                    }
                />
            )}

            <div className="operational-main">
                <SessionHeader
                    title={`Área de ${getRoleDisplayName(
                        roleCode
                    )}`}
                    onMenuToggle={
                        openSidebar
                    }
                />

                <main className="operational-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default OperationalLayout;