import { useState } from "react";
import { Outlet } from "react-router-dom";

import AdminSidebar from "../components/adminSidebar/AdminSidebar";
import SessionHeader from "../components/sessionHeader/SessionHeader";
import "./adminLayout.css";

function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] =
        useState(false);

    function openSidebar() {
        setSidebarOpen(true);
    }

    function closeSidebar() {
        setSidebarOpen(false);
    }

    return (
        <div className="admin-layout">
            <AdminSidebar
                isOpen={sidebarOpen}
                onClose={closeSidebar}
            />

            {sidebarOpen && (
                <button
                    type="button"
                    className="admin-sidebar-overlay"
                    aria-label="Cerrar menú"
                    onClick={closeSidebar}
                />
            )}

            <div className="admin-main">
                <SessionHeader
                    title="Panel administrativo"
                    onMenuToggle={openSidebar}
                />

                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;