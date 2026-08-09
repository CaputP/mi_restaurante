import {
    Navigate,
    useLocation
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import {
    getHomePathByRole
} from "../utils/roleRoutes";

function ProtectedRoute({
    children,
    allowedRoles = [],
    requiredPermissions = []
}) {
    const {
        usuario,
        isAuthenticated,
        isLoadingSession
    } = useAuth();
    const location = useLocation();

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
                state={{
                    from: `${location.pathname}${location.search}${location.hash}`
                }}
            />
        );
    }

    const authorizedHomePath =
        getHomePathByRole(
            usuario.rol.codigo,
            usuario.permisos
        );

    if (usuario.requiereAceptacionLegal) {
        return (
            <Navigate
                to="/aceptar-politicas"
                replace
                state={{ from: `${location.pathname}${location.search}${location.hash}` }}
            />
        );
    }

    if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(usuario.rol.codigo)
    ) {
        return (
            <Navigate
                to={authorizedHomePath}
                replace
            />
        );
    }

    const grantedPermissions = new Set(
        usuario.permisos?.map(
            (permission) => permission.codigo
        ) ?? []
    );

    if (
        requiredPermissions.some(
            (permission) =>
                !grantedPermissions.has(permission)
        )
    ) {
        return (
            <Navigate
                to={authorizedHomePath}
                replace
            />
        );
    }

    return children;
}

export default ProtectedRoute;
