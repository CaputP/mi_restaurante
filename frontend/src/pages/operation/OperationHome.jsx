import {
    Navigate
} from "react-router-dom";

import {
    useAuth
} from "../../context/AuthContext";

import {
    getHomePathByRole
} from "../../utils/roleRoutes";

function OperationHome() {
    const {
        usuario
    } = useAuth();

    const roleCode =
        usuario?.rol?.codigo;

    return (
        <Navigate
            to={
                getHomePathByRole(
                    roleCode
                )
            }
            replace
        />
    );
}

export default OperationHome;