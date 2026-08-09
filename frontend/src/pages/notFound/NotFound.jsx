import {
    Link
} from "react-router-dom";

import "./notFound.css";

function NotFound() {
    return (
        <main className="not-found-page">
            <p className="not-found-code">404</p>
            <h1>Página no encontrada</h1>
            <p>
                La dirección solicitada no existe o fue movida.
            </p>
            <Link to="/">
                Volver al inicio
            </Link>
        </main>
    );
}

export default NotFound;
