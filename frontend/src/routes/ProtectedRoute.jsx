import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function ProtectedRoute({
    children,
    allowedRoles = []
}) {
    const {
        usuario,
        isAuthenticated,
        isLoadingSession
    } = useAuth();

    if (isLoadingSession) {
        return (
            <main>
                <p>Comprobando sesión...</p>
            </main>
        );
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(usuario.rol.codigo)
    ) {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }

    return children;
}

export default ProtectedRoute;