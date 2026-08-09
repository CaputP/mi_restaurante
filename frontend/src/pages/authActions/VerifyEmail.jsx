import {
    useEffect,
    useRef,
    useState
} from "react";
import {
    FaCheckCircle,
    FaEnvelope,
    FaExclamationCircle
} from "react-icons/fa";
import {
    Link,
    useSearchParams
} from "react-router-dom";

import logo from "../../assets/images/logo.webp";
import { ApiError } from "../../services/api";
import {
    confirmEmailRequest
} from "../../services/auth.service";
import "./authActions.css";

function VerifyEmail() {
    const [searchParams] = useSearchParams();

    const token =
        searchParams.get("token")?.trim() ?? "";

    const requestStarted = useRef(false);

    const [status, setStatus] =
        useState("loading");

    const [message, setMessage] = useState(
        "Estamos verificando tu correo electrónico."
    );

    useEffect(() => {
        /*
         * Evita que React StrictMode envíe dos veces
         * la misma petición durante el desarrollo.
         */
        if (requestStarted.current) {
            return;
        }

        requestStarted.current = true;

        async function verifyEmail() {
            if (!token) {
                setStatus("error");
                setMessage(
                    "El enlace de verificación no contiene un token válido."
                );
                return;
            }

            try {
                const response =
                    await confirmEmailRequest(token);

                setStatus("success");
                setMessage(response.message);
            } catch (requestError) {
                setStatus("error");

                if (requestError instanceof ApiError) {
                    setMessage(requestError.message);
                    return;
                }

                console.error(
                    "Error verificando correo:",
                    requestError
                );

                setMessage(
                    "No se pudo verificar el correo electrónico."
                );
            }
        }

        void verifyEmail();
    }, [token]);

    return (
        <main className="auth-action-page">
            <section className="auth-action-card">
                <Link
                    to="/"
                    className="auth-action-logo"
                >
                    <img
                        src={logo}
                        alt="El Vallecito de Chocco"
                    />
                </Link>

                <div
                    className={
                        `auth-action-icon ${status}`
                    }
                >
                    {status === "success" ? (
                        <FaCheckCircle />
                    ) : status === "error" ? (
                        <FaExclamationCircle />
                    ) : (
                        <FaEnvelope />
                    )}
                </div>

                <h1>
                    {status === "success"
                        ? "Correo verificado"
                        : status === "error"
                            ? "No se pudo verificar"
                            : "Verificando correo"}
                </h1>

                <p className="auth-action-description">
                    {message}
                </p>

                {status === "loading" && (
                    <div
                        className="auth-action-loader"
                        aria-label="Procesando"
                    />
                )}

                {status === "success" && (
                    <Link
                        to="/login"
                        className="auth-action-primary-link"
                    >
                        Iniciar sesión
                    </Link>
                )}

                {status === "error" && (
                    <Link
                        to="/login"
                        className="auth-action-primary-link"
                    >
                        Volver al inicio de sesión
                    </Link>
                )}
            </section>
        </main>
    );
}

export default VerifyEmail;
